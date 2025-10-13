import { Hono } from "hono";
import * as monobank from "../../monobank.js";

const router = new Hono();

router.get("/client-info", async (c) => {
    try {
        const result = await monobank.getClientInfo();
        return c.json(result, 200);
    } catch (error) {
        return c.json(
            {
                error: error.message || "Failed to fetch client info",
                timestamp: new Date().toISOString(),
            },
            400,
        );
    }
});

router.get("/transactions/:account/:from/:to", async (c) => {
    try {
        const { account, from, to } = c.req.param();
        const result = await monobank.getTransactions(account, from, to);
        return c.json(result, 200);
    } catch (error) {
        return c.json(
            {
                error: error.message || "Failed to fetch transactions",
                timestamp: new Date().toISOString(),
            },
            400,
        );
    }
});

export default router;
