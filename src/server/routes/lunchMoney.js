import { Hono } from "hono";
import * as lunchMoney from "../../lunchMoney.js";

const router = new Hono();

router.get("/assets", async (c) => {
    const response = await lunchMoney.getAssets();
    return c.json(response, 200);
});

router.post("/transactions/:transactions", async (c) => {
    const response = await lunchMoney.insertTransactions(
        c.req.param("transactions"),
    );
    return c.json(response);
});

export default router;
