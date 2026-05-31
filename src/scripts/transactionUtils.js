/**
 * Shared transaction utilities for Sync and AutoImport components
 */

// Currency code mapping (ISO 4217 numeric codes to lowercase strings)
export const CURRENCY_CODES = {
    980: "uah",
    840: "usd",
    978: "eur",
    826: "gbp",
};

/**
 * Get currency string from transaction's numeric currency code
 * @param {Object} transaction - Monobank transaction object
 * @returns {string} Currency code in lowercase (e.g., "uah", "usd")
 * @throws {Error} If currencyCode is missing or unsupported
 */
export function getCurrency(transaction) {
    if (!transaction?.currencyCode) {
        throw new Error("Transaction currencyCode is missing");
    }
    const currency = CURRENCY_CODES[transaction.currencyCode];
    if (!currency) {
        throw new Error(
            `Unsupported currency code: ${transaction.currencyCode}`,
        );
    }
    return currency;
}

/**
 * Format amount from cents to decimal string
 * @param {number} amount - Amount in cents (smallest currency unit)
 * @returns {string} Formatted amount with 2 decimal places
 */
export function formatAmount(amount) {
    return (amount / 100).toFixed(2);
}

/**
 * Convert date string to Unix timestamp
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} offsetDays - Days to add to the date (default: 0)
 * @returns {number} Unix timestamp in seconds
 */
export function dateToUnixTimestamp(dateString, offsetDays = 0) {
    const date = new Date(dateString);
    if (offsetDays) date.setDate(date.getDate() + offsetDays);
    return Math.floor(date.getTime() / 1000);
}

/**
 * Check if a Monobank account is a FOP (entrepreneur) account
 * @param {Object} monobankAccount - Monobank account object
 * @returns {boolean} True if FOP account
 */
export function isFopAccount(monobankAccount) {
    return monobankAccount?.type === "fop";
}

/**
 * Calculate the correct amount for a transaction based on currencies and account type
 * @param {Object} transaction - Monobank transaction object
 * @param {Object} lunchMoneyAsset - Lunch Money asset object
 * @param {Object} monobankAccount - Monobank account object
 * @returns {string} Formatted amount
 * @throws {Error} If Lunch Money asset is not found
 */
export function calculateAmount(transaction, lunchMoneyAsset, monobankAccount) {
    if (!lunchMoneyAsset) {
        throw new Error(
            "Lunch Money asset not found for selected account. Please add it in the Accounts Mapping.",
        );
    }

    const transactionCurrency = getCurrency(transaction);
    const useOperationAmount = lunchMoneyAsset.currency !== transactionCurrency;

    // For FOP accounts, check if asset currency is USD
    if (isFopAccount(monobankAccount)) {
        return formatAmount(
            lunchMoneyAsset.currency === "usd"
                ? transaction.amount
                : transaction.operationAmount,
        );
    }

    return formatAmount(
        useOperationAmount ? transaction.operationAmount : transaction.amount,
    );
}

/**
 * Build Lunch Money transaction payload from Monobank transaction
 * @param {Object} transaction - Monobank transaction object
 * @param {Object} lunchMoneyAsset - Lunch Money asset object
 * @param {Object} monobankAccount - Monobank account object
 * @returns {Object} Lunch Money transaction payload
 */
export function buildTransactionPayload(transaction, lunchMoneyAsset, monobankAccount) {
    return {
        date: new Date(transaction.time * 1000).toISOString().split("T")[0],
        amount: calculateAmount(transaction, lunchMoneyAsset, monobankAccount),
        payee: transaction.description?.slice(0, 140) || "",
        currency: getCurrency(transaction),
        asset_id: lunchMoneyAsset?.id,
        notes: transaction.description,
        category_id: null,
        external_id: transaction.id || null,
        recurring_id: null,
        status: "uncleared",
        tags: null,
    };
}
