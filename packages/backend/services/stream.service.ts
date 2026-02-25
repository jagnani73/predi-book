import type {
    NamespaceName,
    NamespaceRooms,
} from "../utils/types/services.types";
import { LoggerService } from "./logger.service";

/**
 * StreamService - Pure connection/subscription metadata manager
 * No intervals, no callbacks, no data emission
 * Just tracks which rooms are active and who's in them
 */
export class StreamService {
    private static logger = LoggerService.scoped("StreamService");
    private static namespaces = new Map<NamespaceName, NamespaceRooms>();

    /**
     * Initialize tracking for a namespace
     */
    public static initNamespace(namespaceName: NamespaceName) {
        if (this.namespaces.has(namespaceName)) {
            this.logger.warn("namespace-already-initialized", {
                namespaceName,
            });
            return;
        }

        this.namespaces.set(namespaceName, {
            rooms: new Map(),
            socketRooms: new Map(),
            roomCleanups: new Map(),
        });

        this.logger.info("namespace-initialized", { namespaceName });
    }

    /**
     * Add a subscription to a room
     */
    public static addSubscription(
        namespaceName: NamespaceName,
        room: string,
        socketId: string,
    ) {
        const namespace = this.namespaces.get(namespaceName);
        if (!namespace) {
            this.logger.error("namespace-not-found", { namespaceName, room });
            return;
        }

        // Track room -> socket
        if (!namespace.rooms.has(room)) {
            namespace.rooms.set(room, new Set());
        }
        namespace.rooms.get(room)!.add(socketId);

        // Track socket -> rooms
        if (!namespace.socketRooms.has(socketId)) {
            namespace.socketRooms.set(socketId, new Set());
        }
        namespace.socketRooms.get(socketId)!.add(room);
    }

    /**
     * Remove a subscription from a room
     */
    public static removeSubscription(
        namespaceName: NamespaceName,
        room: string,
        socketId: string,
    ) {
        const namespace = this.namespaces.get(namespaceName);
        if (!namespace) return;

        // Remove from room -> socket mapping
        const subscribers = namespace.rooms.get(room);
        if (subscribers) {
            subscribers.delete(socketId);

            if (subscribers.size === 0) {
                namespace.rooms.delete(room);

                const cleanup = namespace.roomCleanups.get(room);
                if (cleanup) {
                    cleanup();
                    namespace.roomCleanups.delete(room);
                    this.logger.debug("room-cleanup-invoked", {
                        namespaceName,
                        room,
                    });
                }
            } else {
                this.logger.info("subscription-removed", {
                    namespaceName,
                    room,
                    socketId,
                    remainingSubscribers: subscribers.size,
                });
            }
        }

        // Remove from socket -> rooms mapping
        const socketRoomSet = namespace.socketRooms.get(socketId);
        if (socketRoomSet) {
            socketRoomSet.delete(room);
            if (socketRoomSet.size === 0) {
                namespace.socketRooms.delete(socketId);
            }
        }
    }

    /**
     * Remove all subscriptions for a socket (used on disconnect)
     */
    public static removeAllSubscriptions(
        namespaceName: NamespaceName,
        socketId: string,
    ): number {
        const namespace = this.namespaces.get(namespaceName);
        if (!namespace) return 0;

        const socketRoomSet = namespace.socketRooms.get(socketId);
        if (!socketRoomSet) return 0;

        const rooms = Array.from(socketRoomSet);

        // Remove socket from all rooms
        for (const room of rooms) {
            this.removeSubscription(namespaceName, room, socketId);
        }

        this.logger.info("all-subscriptions-removed", {
            namespaceName,
            socketId,
            roomCount: rooms.length,
        });

        return rooms.length;
    }

    /**
     * Register a cleanup callback for a room (called when last subscriber leaves)
     */
    public static setRoomCleanup(
        namespaceName: NamespaceName,
        room: string,
        cleanup: () => void,
    ) {
        const namespace = this.namespaces.get(namespaceName);
        if (!namespace) {
            this.logger.error("namespace-not-found", { namespaceName, room });
            return;
        }

        namespace.roomCleanups.set(room, cleanup);
    }

    /**
     * Get all active rooms for a namespace
     */
    public static getActiveRooms(namespaceName: NamespaceName): string[] {
        const namespace = this.namespaces.get(namespaceName);
        return namespace ? Array.from(namespace.rooms.keys()) : [];
    }

    /**
     * Get subscriber count for a room
     */
    public static getSubscriberCount(
        namespaceName: NamespaceName,
        room: string,
    ): number {
        const namespace = this.namespaces.get(namespaceName);
        return namespace?.rooms.get(room)?.size ?? 0;
    }

    /**
     * Check if a room has any subscribers
     */
    public static isRoomActive(
        namespaceName: NamespaceName,
        room: string,
    ): boolean {
        return this.getSubscriberCount(namespaceName, room) > 0;
    }

    /**
     * Get total number of active rooms for a namespace
     */
    public static getActiveRoomCount(namespaceName: NamespaceName): number {
        return this.getActiveRooms(namespaceName).length;
    }

    /**
     * Destroy tracking for a namespace
     */
    public static destroyNamespace(namespaceName: NamespaceName) {
        const namespace = this.namespaces.get(namespaceName);
        if (namespace) {
            for (const cleanup of namespace.roomCleanups.values()) {
                cleanup();
            }
            namespace.roomCleanups.clear();
            namespace.rooms.clear();
            this.namespaces.delete(namespaceName);
            this.logger.info("namespace-destroyed", { namespaceName });
        }
    }

    /**
     * Get stats for all namespaces
     */
    public static getStats() {
        const stats = new Map<
            NamespaceName,
            { activeRooms: number; totalSubscribers: number }
        >();

        for (const [
            namespaceName,
            namespace,
        ] of this.namespaces.entries() as unknown as [
            NamespaceName,
            NamespaceRooms,
        ][]) {
            const totalSubscribers = Array.from(
                namespace.rooms.values(),
            ).reduce((sum, subs) => sum + subs.size, 0);

            stats.set(namespaceName, {
                activeRooms: namespace.rooms.size,
                totalSubscribers,
            });
        }

        return Object.fromEntries(stats.entries());
    }
}
