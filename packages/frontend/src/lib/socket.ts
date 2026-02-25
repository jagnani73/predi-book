"use client";

import { io, type Socket } from "socket.io-client";

// One socket per namespace, shared across the app lifetime
const sockets = new Map<string, Socket>();

export function getSocket(namespace: string): Socket {
    if (!sockets.has(namespace)) {
        const base = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8000";
        sockets.set(
            namespace,
            io(`${base}/${namespace}`, {
                transports: ["websocket"],
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: Infinity,
            }),
        );
    }
    return sockets.get(namespace)!;
}
