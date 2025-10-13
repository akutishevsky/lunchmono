import { getDecryptedToken, TOKENS } from "./tokenStorage.js";

const BASE_URL = "https://dev.lunchmoney.app/v1";
const ENDPOINTS = {
    ASSETS: `${BASE_URL}/assets`,
    INSERT: `${BASE_URL}/transactions`,
};

export const getAssets = async () => {
    const token = getDecryptedToken(TOKENS.LM);
    const response = await fetch(ENDPOINTS.ASSETS, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return response.json();
};

export const insertTransactions = async (transactions) => {
    const token = getDecryptedToken(TOKENS.LM);

    const body = JSON.stringify({
        transactions: transactions,
        apply_rules: true,
        skip_duplicates: true,
        check_for_recurring: true,
        debit_as_negative: true,
        skip_balance_update: false,
    });

    console.log("Inserting transactions:", body);

    const response = await fetch(ENDPOINTS.INSERT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: body,
    });

    const responseBody = await response.json();
    console.log("Lunch Money response:", responseBody);
    return responseBody;
};
