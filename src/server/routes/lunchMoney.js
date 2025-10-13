import { Hono } from "hono";
import * as lunchMoney from "../../lunchMoney.js";

const router = new Hono();

router.get("/assets", async (c) => {
    const response = await lunchMoney.getAssets();
    return c.json(response, 200);
});

router.post("/transactions", async (c) => {
    try {
        const body = await c.req.json();
        const { transactions } = body;

        if (!transactions || !Array.isArray(transactions)) {
            return c.json(
                { error: "Invalid request: transactions array required" },
                400,
            );
        }

        const response = await lunchMoney.insertTransactions(transactions);
        return c.json(response, 200);
    } catch (error) {
        console.error("Error inserting transactions:", error);
        return c.json({ error: error.message }, 500);
    }
});

export default router;
