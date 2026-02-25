import {
    subscribeEvent,
    unsubscribeEvent,
    disconnectEvent,
} from "./orderbook.service";
import { validateQuery } from "../../middlewares/ws/validate-query";
import type { SubscribeOrderbookEvent } from "../../utils/types/services.types";
import type { Namespace, Socket } from "socket.io";
import * as yup from "yup";

const subscribeSchema = yup.object({
    conditionId: yup.string().required(),
    kalshiTicker: yup.string().required(),
});

export const OrderbookRoutes = (socket: Socket, _io: Namespace): void => {
    socket.on<SubscribeOrderbookEvent["type"]>(
        "subscribe",
        async (payload: unknown) => {
            try {
                const { conditionId, kalshiTicker } =
                    await validateQuery<SubscribeOrderbookEvent["payload"]>(
                        payload,
                        subscribeSchema,
                    );
                await subscribeEvent(socket, conditionId, kalshiTicker);
            } catch (error) {
                socket.emit("subscribed", {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : "Invalid payload",
                });
            }
        },
    );

    socket.on("unsubscribe", async (payload: unknown) => {
        try {
            const { conditionId, kalshiTicker } =
                await validateQuery<SubscribeOrderbookEvent["payload"]>(
                    payload,
                    subscribeSchema,
                );
            unsubscribeEvent(socket, conditionId, kalshiTicker);
        } catch (error) {
            socket.emit("unsubscribed", {
                success: false,
                message:
                    error instanceof Error ? error.message : "Invalid payload",
            });
        }
    });

    socket.on("disconnect", () => disconnectEvent(socket));
};
