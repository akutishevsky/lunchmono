import { getDecryptedToken, TOKENS } from "./tokenStorage.js";

const BASE_URL = "https://api.monobank.ua";
const ENDPOINTS = {
    GET_CLIENT_INFO: `${BASE_URL}/personal/client-info`,
    TRANSACTIONS: `${BASE_URL}/personal/statement`,
};

export const getClientInfo = async () => {
    const token = getDecryptedToken(TOKENS.MONO);

    if (!token) {
        throw new Error("Monobank token not configured. Please add your token in Settings.");
    }

    const response = await fetch(ENDPOINTS.GET_CLIENT_INFO, {
        headers: {
            "X-Token": token,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Monobank API error (${response.status}): ${errorText}`);
    }

    return response.json();
};

/**
 * @param {String} account
 * Ідентифікатор рахунку або банки з переліків Statement list
 * або 0 - дефолтний рахунок.
 * @param {String} from — Початок часу виписки.
 * @example
 * 1546304461
 * @param {String} to — Останній час виписки (якщо відсутній, буде використовуватись поточний час).
 * @example
 * 1546306461
 */
export const getTransactions = async (account, from, to) => {
    const params = `/${account}/${from}/${to}`;
    const token = getDecryptedToken(TOKENS.MONO);

    if (!token) {
        throw new Error("Monobank token not configured. Please add your token in Settings.");
    }

    const response = await fetch(`${ENDPOINTS.TRANSACTIONS}${params}`, {
        headers: {
            "X-Token": token,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Monobank API error (${response.status}): ${errorText}`);
    }

    return response.json();
};
