import { LoggerService, StreamService, WSService } from "../../services";
import { OrderbookService } from "../../services/orderbook.service";
import type {
    AggregatedBook,
    EmitOrderbookEvent,
} from "../../utils/types/services.types";
import type { Socket } from "socket.io";

const logger = LoggerService.scoped("orderbookMicroservice");

// conditionId:kalshiTicker -> OrderbookService instance
const activeServices = new Map<string, OrderbookService>();

function roomKey(conditionId: string, kalshiTicker: string): string {
    return `${conditionId}:${kalshiTicker}`;
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

        // Start a new service if this is the first subscriber for this room
        if (!activeServices.has(room)) {
            const svc = new OrderbookService(
                conditionId,
                kalshiTicker,
                (book: AggregatedBook) => {
                    const io = WSService.getNamespace("orderbook");
                    io?.to(room).emit<EmitOrderbookEvent["type"]>("data", book);
                },
            );

            activeServices.set(room, svc);

            // Register cleanup: stop service when last subscriber leaves
            StreamService.setRoomCleanup("orderbook", room, () => {
                svc.stop();
                activeServices.delete(room);
                log.info("room-cleaned-up", { room });
            });

            await svc.start();
        } else {
            // New subscriber joining an existing room — send current snapshot
            const current = activeServices.get(room)!.getAggregatedBook();
            socket.emit<EmitOrderbookEvent["type"]>("data", current);
        }

        socket.emit("subscribed", { success: true, room });
        log.info("subscribed", { socketId: socket.id, room });
    } catch (error) {
        log.error("subscribe-error", { error, socketId: socket.id, room });
        socket.emit("subscribed", {
            success: false,
            message: error instanceof Error ? error.message : "Subscribe failed",
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
    const cleaned = StreamService.removeAllSubscriptions("orderbook", socket.id);
    logger.scoped("disconnect").info("disconnected", {
        socketId: socket.id,
        cleanedRooms: cleaned,
    });
};
