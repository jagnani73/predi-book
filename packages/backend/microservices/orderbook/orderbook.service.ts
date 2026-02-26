import { LoggerService, StreamService, WSService } from "../../services";
import { KalshiService } from "../../services/kalshi.service";
import { PolymarketService } from "../../services/polymarket.service";
import type {
    AggregatedBook,
    AggregatedLevel,
    EmitOrderbookEvent,
    PriceLevel,
    VenueBook,
} from "../../utils/types/services.types";
import { generateMockBooks, isMockMarket } from "./mock-markets";
import type { Socket } from "socket.io";

const logger = LoggerService.scoped("orderbookMicroservice");

type RoomState = {
    polyBook: VenueBook;
    kalshiBook: VenueBook;
    polyListener: (book: VenueBook) => void;
    kalshiListener: (book: VenueBook) => void;
    polySvc?: PolymarketService;
    kalshiSvc?: KalshiService;
};

const activeRooms = new Map<string, RoomState>();

function roomKey(conditionId: string, kalshiTicker: string): string {
    return `${conditionId}:${kalshiTicker}`;
}

function mergeLevels(
    polyLevels: PriceLevel[],
    kalshiLevels: PriceLevel[],
    dir: "asc" | "desc",
): AggregatedLevel[] {
    const merged = new Map<string, { polySize: number; kalshiSize: number }>();

    for (const l of polyLevels) {
        const entry = merged.get(l.price) ?? { polySize: 0, kalshiSize: 0 };
        entry.polySize += parseFloat(l.size);
        merged.set(l.price, entry);
    }

    for (const l of kalshiLevels) {
        const entry = merged.get(l.price) ?? { polySize: 0, kalshiSize: 0 };
        entry.kalshiSize += parseFloat(l.size);
        merged.set(l.price, entry);
    }

    return Array.from(merged.entries())
        .map(([price, { polySize, kalshiSize }]) => ({
            price,
            size: (polySize + kalshiSize).toFixed(2),
            venue: (polySize > 0 && kalshiSize > 0
                ? "both"
                : polySize > 0
                  ? "polymarket"
                  : "kalshi") as AggregatedLevel["venue"],
        }))
        .sort((a, b) =>
            dir === "desc"
                ? parseFloat(b.price) - parseFloat(a.price)
                : parseFloat(a.price) - parseFloat(b.price),
        );
}

function buildAggregatedBook(state: RoomState): AggregatedBook {
    return {
        bids: mergeLevels(state.polyBook.bids, state.kalshiBook.bids, "desc"),
        asks: mergeLevels(state.polyBook.asks, state.kalshiBook.asks, "asc"),
        polymarket: state.polyBook,
        kalshi: state.kalshiBook,
        updatedAt: new Date().toISOString(),
    };
}

export const subscribeEvent = async (
    socket: Socket,
    conditionId: string,
    kalshiTicker: string,
): Promise<void> => {
    const log = logger.scoped("subscribe");
    const room = roomKey(conditionId, kalshiTicker);

    try {
        socket.join(room);
        StreamService.addSubscription("orderbook", room, socket.id);

        if (activeRooms.has(room)) {
            const current = buildAggregatedBook(activeRooms.get(room)!);
            socket.emit<EmitOrderbookEvent["type"]>("data", current);
            socket.emit("subscribed", { success: true, room });
            log.info("subscribed-existing-room", { socketId: socket.id, room });
            return;
        }

        // Mock market path — no real venue connections
        if (isMockMarket(conditionId)) {
            const state: RoomState = {
                polyBook: { bids: [], asks: [] },
                kalshiBook: { bids: [], asks: [] },
                polyListener: () => {},
                kalshiListener: () => {},
            };

            const interval = setInterval(() => {
                const { polyBook, kalshiBook } = generateMockBooks();
                state.polyBook = polyBook;
                state.kalshiBook = kalshiBook;
                const io = WSService.getNamespace("orderbook");
                io?.to(room).emit<EmitOrderbookEvent["type"]>(
                    "data",
                    buildAggregatedBook(state),
                );
            }, 600);

            StreamService.setRoomCleanup("orderbook", room, () => {
                clearInterval(interval);
                activeRooms.delete(room);
                log.info("mock-room-cleaned-up", { room });
            });

            activeRooms.set(room, state);
            socket.emit("subscribed", { success: true, room });
            log.info("subscribed-mock", { socketId: socket.id, room });
            return;
        }

        // Fetch singletons first so we can store refs in state
        const [polySvc, kalshiSvc] = await Promise.all([
            PolymarketService.getOrCreate(conditionId),
            Promise.resolve(KalshiService.getOrCreate(kalshiTicker)),
        ]);

        const state: RoomState = {
            polyBook: { bids: [], asks: [] },
            kalshiBook: { bids: [], asks: [] },
            polyListener: () => {},
            kalshiListener: () => {},
            polySvc,
            kalshiSvc,
        };

        const emitUpdate = () => {
            const io = WSService.getNamespace("orderbook");
            io?.to(room).emit<EmitOrderbookEvent["type"]>(
                "data",
                buildAggregatedBook(state),
            );
        };

        state.polyListener = (book) => {
            state.polyBook = book;
            emitUpdate();
        };
        state.kalshiListener = (book) => {
            state.kalshiBook = book;
            emitUpdate();
        };

        polySvc.addListener(state.polyListener);
        kalshiSvc.addListener(state.kalshiListener);

        activeRooms.set(room, state);

        StreamService.setRoomCleanup("orderbook", room, () => {
            const s = activeRooms.get(room);
            if (s) {
                s.polySvc?.removeListener(s.polyListener);
                s.kalshiSvc?.removeListener(s.kalshiListener);
                activeRooms.delete(room);
            }
            log.info("room-cleaned-up", { room });
        });

        socket.emit("subscribed", { success: true, room });
        log.info("subscribed", { socketId: socket.id, room });
    } catch (error) {
        log.error("subscribe-error", { error, socketId: socket.id, room });
        socket.emit("subscribed", {
            success: false,
            message:
                error instanceof Error ? error.message : "Subscribe failed",
        });
    }
};

export const unsubscribeEvent = (
    socket: Socket,
    conditionId: string,
    kalshiTicker: string,
): void => {
    const log = logger.scoped("unsubscribe");
    const room = roomKey(conditionId, kalshiTicker);

    socket.leave(room);
    StreamService.removeSubscription("orderbook", room, socket.id);

    socket.emit("unsubscribed", { success: true, room });
    log.info("unsubscribed", { socketId: socket.id, room });
};

export const disconnectEvent = (socket: Socket): void => {
    const cleaned = StreamService.removeAllSubscriptions(
        "orderbook",
        socket.id,
    );
    logger.scoped("disconnect").info("disconnected", {
        socketId: socket.id,
        cleanedRooms: cleaned,
    });
};
