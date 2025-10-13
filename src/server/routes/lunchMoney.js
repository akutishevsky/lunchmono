import { Hono } from "hono";
import * as lunchMoney from "../lunchmoney.js";

const router = new Hono();

router.get("/lm-get-assets", async (c) => {
    const response = await lunchMoney.getAssets();
    return c.json(response, 200);
});

router.post("/lm-insert-transactions/:transactions", async (c) => {
    const response = await lunchMoney.insertTransactions(
        c.req.param("transactions"),
    );
    return c.json(response);
});

export default router;
