import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import monobank from "./routes/monobank.js";
import lunchMoney from "./routes/lunchMoney.js";

const app = new Hono();

// Enable CORS for Electron renderer
app.use("/*", cors());

app.route("/monobank", monobank);
app.route("/lunchmoney", lunchMoney);

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

            resolve(server);
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Stop the Hono server
 */
export const stopServer = () => {
    if (server) {
        server.close();
        server = null;
    }
};

export default app;
