import type { CorsOptions } from "cors";
import "dotenv/config";

export const CORS_CONFIG = (): CorsOptions => {
    const origins: (string | RegExp)[] = [];
    const allowedHeaders: string[] = [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
    ];

    // * INFO: add production url
    // origins.push("*");

    if (process.env.NODE_ENV !== "production") {
        origins.push("http://localhost:3000");
        origins.push("http://127.0.0.1:3000");
        origins.push(/^https:\/\/.*\.ngrok\.io$/);
        origins.push(/^https:\/\/.*\.ngrok-free\.app$/);
        origins.push(/^https:\/\/.*\.ngrok\.app$/);

        allowedHeaders.push("ngrok-skip-browser-warning");
    }

    return {
        origin: origins,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders,
        exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
        preflightContinue: false,
        optionsSuccessStatus: 200,
    };
};
