"use client";

import { getSocket } from "@/lib/socket";
import type { AggregatedBook } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

export type VenueStatus =
    | "connecting"
    | "live"
    | "stale"
    | "reconnecting"
    | "offline";
export type SocketStatus = "connecting" | "connected" | "disconnected";

export type OrderbookState = {
    book: AggregatedBook | null;
    polyStatus: VenueStatus;
    kalshiStatus: VenueStatus;
    socketStatus: SocketStatus;
    polyLastUpdated: number;
    kalshiLastUpdated: number;
    polyMessageCount: number;
    kalshiMessageCount: number;
    updatesPerSec: number;
    snapshotAt: string | null;
};

const STALE_MS = 5000;
const RATE_WINDOW_S = 10;

export function useOrderbook(
    conditionId: string,
    kalshiTicker: string,
): OrderbookState {
    const [book, setBook] = useState<AggregatedBook | null>(null);
    const [polyStatus, setPolyStatus] = useState<VenueStatus>("connecting");
    const [kalshiStatus, setKalshiStatus] = useState<VenueStatus>("connecting");
    const [socketStatus, setSocketStatus] =
        useState<SocketStatus>("connecting");
    const [polyLastUpdated, setPolyLastUpdated] = useState<number>(0);
    const [kalshiLastUpdated, setKalshiLastUpdated] = useState<number>(0);
    const [polyMessageCount, setPolyMessageCount] = useState<number>(0);
    const [kalshiMessageCount, setKalshiMessageCount] = useState<number>(0);
    const [updatesPerSec, setUpdatesPerSec] = useState<number>(0);
    const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

    // Refs for stale-detection interval (no re-render needed on every update)
    const prevPolyStr = useRef<string>("");
    const prevKalshiStr = useRef<string>("");
    const polyLastUpdatedRef = useRef<number>(0);
    const kalshiLastUpdatedRef = useRef<number>(0);
    const polyEverLive = useRef(false);
    const kalshiEverLive = useRef(false);
    const socketStatusRef = useRef<SocketStatus>("connecting");

    // Rolling window of message timestamps for update rate
    const msgTimestamps = useRef<number[]>([]);

    useEffect(() => {
        const socket = getSocket("orderbook");

        function subscribe() {
            socket.emit("subscribe", { conditionId, kalshiTicker });
        }

        function onConnect() {
            socketStatusRef.current = "connected";
            setSocketStatus("connected");
            subscribe();
        }

        function onData(data: AggregatedBook) {
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

            // Persist first snapshot timestamp
            if (data.snapshotAt) {
                setSnapshotAt((prev) => prev ?? data.snapshotAt!);
            }

            // Rolling rate window
            const now = Date.now();
            msgTimestamps.current.push(now);
            if (msgTimestamps.current.length > 50) {
                msgTimestamps.current.shift();
            }

            // Per-venue change detection
            const polyStr = JSON.stringify(data.polymarket);
            const kalshiStr = JSON.stringify(data.kalshi);

            if (polyStr !== prevPolyStr.current) {
                prevPolyStr.current = polyStr;
                polyLastUpdatedRef.current = now;
                polyEverLive.current = true;
                setPolyLastUpdated(now);
                setPolyStatus("live");
                setPolyMessageCount((c) => c + 1);
            }

            if (kalshiStr !== prevKalshiStr.current) {
                prevKalshiStr.current = kalshiStr;
                kalshiLastUpdatedRef.current = now;
                kalshiEverLive.current = true;
                setKalshiLastUpdated(now);
                setKalshiStatus("live");
                setKalshiMessageCount((c) => c + 1);
            }
        }

        function onDisconnect() {
            socketStatusRef.current = "disconnected";
            setSocketStatus("disconnected");
            setPolyStatus("offline");
            setKalshiStatus("offline");
        }

        socket.on("connect", onConnect);
        socket.on("data", onData);
        socket.on("disconnect", onDisconnect);

        if (socket.connected) {
            socketStatusRef.current = "connected";
            // Defer so we're not calling setState synchronously in effect body
            queueMicrotask(() => setSocketStatus("connected"));
            subscribe();
        }

        return () => {
            socket.emit("unsubscribe", { conditionId, kalshiTicker });
            socket.off("connect", onConnect);
            socket.off("data", onData);
            socket.off("disconnect", onDisconnect);
        };
    }, [conditionId, kalshiTicker]);

    // Stale detection + rate calculation — runs every second
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();

            if (
                polyEverLive.current &&
                now - polyLastUpdatedRef.current > STALE_MS
            ) {
                const nextStatus =
                    socketStatusRef.current === "connecting"
                        ? "reconnecting"
                        : "stale";
                setPolyStatus((s) => (s === "live" ? nextStatus : s));
            }
            if (
                kalshiEverLive.current &&
                now - kalshiLastUpdatedRef.current > STALE_MS
            ) {
                const nextStatus =
                    socketStatusRef.current === "connecting"
                        ? "reconnecting"
                        : "stale";
                setKalshiStatus((s) => (s === "live" ? nextStatus : s));
            }

            // Rolling update rate over last RATE_WINDOW_S seconds
            const cutoff = now - RATE_WINDOW_S * 1000;
            msgTimestamps.current = msgTimestamps.current.filter(
                (t) => t > cutoff,
            );
            setUpdatesPerSec(
                parseFloat(
                    (msgTimestamps.current.length / RATE_WINDOW_S).toFixed(1),
                ),
            );
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return {
        book,
        polyStatus,
        kalshiStatus,
        socketStatus,
        polyLastUpdated,
        kalshiLastUpdated,
        polyMessageCount,
        kalshiMessageCount,
        updatesPerSec,
        snapshotAt,
    };
}
