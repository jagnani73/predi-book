import { OrderbookRoutes } from "./microservices/orderbook/orderbook.routes";
import { LoggerService, StreamService, WSService } from "./services";
import { CORS_CONFIG } from "./utils/constants";
import { type AppError, convertToAppError, ErrorScope } from "./utils/errors";
import cors from "cors";
import "dotenv/config";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { createServer } from "node:http";

const app: Express = express();
const server = createServer(app);

const logger = LoggerService.scoped("server");

app.use(cors(CORS_CONFIG()));
app.use(express.json());

app.get("/healthcheck", (_req: Request, res: Response) => {
    res.json({
        success: true as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        stream: StreamService.getStats(),
    });
});

app.use("/*splat", (_req: Request, res: Response) => {
    logger.scoped("not-found").info("not-found", { path: _req.path });
    res.status(404).json({ success: false as const, message: "Not Found" });
});

app.use(
    (
        error: Error | unknown,
        _req: Request,
        res: Response,
        _next: NextFunction,
    ) => {
        const appError: AppError = convertToAppError(error, ErrorScope.HTTP);
        LoggerService.scoped("http:error").error("unhandled-error", {
            error: appError.toLog(),
        });
        res.status(appError.code).json({
            success: false as const,
            data: appError.toPublic(),
        });
    },
);

(async () => {
    const log = logger.scoped("init");
    try {
        await WSService.init(server, [
            { namespace: "orderbook", routes: OrderbookRoutes },
        ]);

        const env: string = process.env.NODE_ENV || "development";
        if (env !== "test") {
            const port: number = +(process.env.PORT || 8000);
            server.listen(port, () => log.info("listening", { port, env }));
        }
    } catch (error) {
        log.error("fatal-startup-error", { error });
        process.exit(1);
    }
})();

process.on("SIGINT", () => {
    LoggerService.scoped("shutdown").info("shutting-down");
    process.exit(0);
});
process.on("SIGHUP", () => {
    LoggerService.scoped("shutdown").info("shutting-down");
    process.exit(0);
});

export default app;
