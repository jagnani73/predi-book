"use client";

import { getSocket } from "@/lib/socket";
import type { AggregatedBook } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

export type VenueStatus = "connecting" | "live" | "stale" | "offline";
export type SocketStatus = "connecting" | "connected" | "disconnected";

export type OrderbookState = {
    book: AggregatedBook | null;
    polyStatus: VenueStatus;
    kalshiStatus: VenueStatus;
    socketStatus: SocketStatus;
};

export function useOrderbook(
    conditionId: string,
    kalshiTicker: string,
): OrderbookState {
    const [book, setBook] = useState<AggregatedBook | null>(null);
    const [polyStatus, setPolyStatus] = useState<VenueStatus>("connecting");
    const [kalshiStatus, setKalshiStatus] = useState<VenueStatus>("connecting");
    const [socketStatus, setSocketStatus] =
        useState<SocketStatus>("connecting");

    // Stale detection refs — no re-render needed, checked on interval
    const prevPolyStr = useRef<string>("");
    const prevKalshiStr = useRef<string>("");
    const polyLastUpdated = useRef<number>(0);
    const kalshiLastUpdated = useRef<number>(0);
    const polyEverLive = useRef(false);
    const kalshiEverLive = useRef(false);

    useEffect(() => {
        const socket = getSocket("orderbook");

        function subscribe() {
            socket.emit("subscribe", { conditionId, kalshiTicker });
        }

        function onConnect() {
            setSocketStatus("connected");
            subscribe();
        }

        function onData(data: AggregatedBook) {
            // Sort defensively — BE already sorts, but guard against edge cases
            const sorted: AggregatedBook = {
                ...data,
                asks: [...data.asks].sort(
                    (a, b) => parseFloat(a.price) - parseFloat(b.price),
                ),
                bids: [...data.bids].sort(
                    (a, b) => parseFloat(b.price) - parseFloat(a.price),
                ),
            };
            setBook(sorted);

            // Venue stale detection: check if sub-books changed
            const polyStr = JSON.stringify(data.polymarket);
            const kalshiStr = JSON.stringify(data.kalshi);

            if (polyStr !== prevPolyStr.current) {
                prevPolyStr.current = polyStr;
                polyLastUpdated.current = Date.now();
                polyEverLive.current = true;
                setPolyStatus("live");
            }

            if (kalshiStr !== prevKalshiStr.current) {
                prevKalshiStr.current = kalshiStr;
                kalshiLastUpdated.current = Date.now();
                kalshiEverLive.current = true;
                setKalshiStatus("live");
            }
        }

        function onDisconnect() {
            setSocketStatus("disconnected");
            setPolyStatus("offline");
            setKalshiStatus("offline");
        }

        socket.on("connect", onConnect);
        socket.on("data", onData);
        socket.on("disconnect", onDisconnect);

        // Socket may already be connected (singleton reuse)
        if (socket.connected) {
            setSocketStatus("connected");
            subscribe();
        }

        return () => {
            socket.emit("unsubscribe", { conditionId, kalshiTicker });
            socket.off("connect", onConnect);
            socket.off("data", onData);
            socket.off("disconnect", onDisconnect);
        };
    }, [conditionId, kalshiTicker]);

    // Stale detection: check every second if a venue has gone quiet
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            if (polyEverLive.current && now - polyLastUpdated.current > 5000) {
                setPolyStatus((s) => (s === "live" ? "stale" : s));
            }
            if (
                kalshiEverLive.current &&
                now - kalshiLastUpdated.current > 5000
            ) {
                setKalshiStatus((s) => (s === "live" ? "stale" : s));
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return { book, polyStatus, kalshiStatus, socketStatus };
}
