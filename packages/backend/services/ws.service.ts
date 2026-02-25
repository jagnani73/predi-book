import { LoggerService, StreamService } from ".";
import { CORS_CONFIG } from "../utils/constants";
import type {
    NamespaceName,
    SocketRoutes,
} from "../utils/types/services.types";
import type { Server } from "node:http";
import type { Namespace, Socket } from "socket.io";
import { Server as WSServer } from "socket.io";

export class WSService {
    private static WSS_ROOMS_DELIMITER = ":";
    private static logger = LoggerService.scoped("WSService");
    private static ioConnection: WSServer;
    private static namespaceMap = new Map<NamespaceName, Namespace>();

    public static async init(server: Server, socketRoutes: SocketRoutes[]) {
        this.ioConnection = new WSServer(server, {
            cors: CORS_CONFIG(),
            allowEIO3: true,
            transports: ["polling", "websocket"],
        });

        this.ioConnection.engine.on("connection_error", (err) => {
            this.logger.error("connection-error", {
                url: err.req?.url,
                code: err.code,
                message: err.message,
                context: err.context,
            });
        });

        for (const { namespace, routes } of socketRoutes) {
            const scopedIO = this.ioConnection.of(`/${namespace}`);
            this.namespaceMap.set(namespace, scopedIO);
            this.logger.info("namespace-created", { namespace });

            StreamService.initNamespace(namespace);

            scopedIO.on("connection", (socket: Socket) => {
                this.logger.info("connected", {
                    namespace,
                    origin: socket.handshake.headers.origin,
                });
                routes(socket, scopedIO);
            });

            scopedIO.on("connect_error", (error) => {
                this.logger.error("connect-error", { namespace, error });
            });
        }

        this.logger.info("init-success");
    }

    public static getNamespace(name: NamespaceName): Namespace | undefined {
        return this.namespaceMap.get(name);
    }

    public static buildWSSRoomName = (
        namespace: NamespaceName,
        parts: string[],
    ) => {
        return `${namespace}${this.WSS_ROOMS_DELIMITER}${parts.join(this.WSS_ROOMS_DELIMITER)}`;
    };

    public static parseWSSRoomName<T = string[]>(
        room: string,
    ): { namespace: NamespaceName; parts: T } {
        const [namespace, ...parts] = room.split(this.WSS_ROOMS_DELIMITER);
        return {
            namespace: namespace as NamespaceName,
            parts: parts as T,
        };
    }
}
