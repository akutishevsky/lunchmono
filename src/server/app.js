import { Hono } from "hono";
import { serve } from "@hono/node-server";
import monobank from "./routes/monobank.js";

const app = new Hono();

app.route("/monobank", monobank);

// Root endpoint
app.get("/", (c) => {
    return c.json({
        status: "ok",
        message: "Hono server is running",
        version: "1.0.0",
    });
});

let server = null;

/**
 * Start the Hono server
 * @param {number} port - Port number to listen on
 * @returns {Promise<Object>} Server instance
 */
export const startServer = (port = 3000) => {
    return new Promise((resolve, reject) => {
        try {
            server = serve({
                fetch: app.fetch,
                port: port,
            });

            console.log(
                `🚀 Hono server is running on http://localhost:${port}`,
            );
            resolve(server);
        } catch (error) {
            console.error("Failed to start Hono server:", error);
            reject(error);
        }
    });
};

/**
 * Stop the Hono server
 */
export const stopServer = () => {
    if (server) {
        console.log("Stopping Hono server...");
        server.close();
        server = null;
    }
};

export default app;
