/**
 * Shared transaction utilities for Sync and AutoImport components
 */

// Currency code mapping (ISO 4217 numeric codes to lowercase alphabetic codes)
export const CURRENCY_CODES = {
    36: "aud",
    124: "cad",
    156: "cny",
    203: "czk",
    208: "dkk",
    348: "huf",
    352: "isk",
    356: "inr",
    376: "ils",
    392: "jpy",
    398: "kzt",
    498: "mdl",
    578: "nok",
    702: "sgd",
    752: "sek",
    756: "chf",
    764: "thb",
    784: "aed",
    818: "egp",
    826: "gbp",
    840: "usd",
    933: "byn",
    941: "rsd",
    944: "azn",
    946: "ron",
    949: "try",
    975: "bgn",
    978: "eur",
    980: "uah",
    981: "gel",
    985: "pln",
    986: "brl",
};

/**
 * Resolve an ISO 4217 numeric code to its lowercase alphabetic code
 * @param {number} currencyCode - ISO 4217 numeric code (e.g. 980)
 * @returns {string|null} Lowercase code (e.g. "uah"), or null if unsupported
 */
export function currencyFromCode(currencyCode) {
    return CURRENCY_CODES[currencyCode] ?? null;
}

/**
 * Get the currency a Monobank account is denominated in.
 *
 * This is the currency that `transaction.amount` and `transaction.balance` are
 * expressed in, and therefore the only currency a Lunch Money transaction for
 * this account may be labelled with.
 *
 * @param {Object} monobankAccount - Monobank account object from /personal/client-info
 * @returns {string} Currency code in lowercase (e.g. "uah")
 * @throws {Error} If the account is missing or its currency is unsupported
 */
export function getAccountCurrency(monobankAccount) {
    if (!monobankAccount) {
        throw new Error(
            "Monobank account details are unavailable. Please reload accounts and try again.",
        );
    }
    if (!monobankAccount.currencyCode) {
        throw new Error("Monobank account currencyCode is missing");
    }
    const currency = currencyFromCode(monobankAccount.currencyCode);
    if (!currency) {
        throw new Error(
            `Unsupported account currency code: ${monobankAccount.currencyCode}`,
        );
    }
    return currency;
}

/**
 * Get the currency a transaction was *operated* in.
 *
 * Monobank's `currencyCode` describes `operationAmount` — the merchant's
 * currency for a card purchase, or the counterparty's currency for a transfer.
 * It is NOT the account currency (the official docs mislabel this field).
 * Returns null rather than throwing: this is only used for informational notes.
 *
 * @param {Object} transaction - Monobank transaction object
 * @returns {string|null} Currency code in lowercase, or null if unknown
 */
export function getOperationCurrency(transaction) {
    return currencyFromCode(transaction?.currencyCode);
}

// Minor units per major unit. Everything Monobank deals in is 2-decimal; the
// exceptions can only ever show up as an *operation* currency (a purchase
// abroad), never as an account currency.
const MINOR_UNITS = { jpy: 1, isk: 1 };

function minorUnits(currency) {
    return MINOR_UNITS[currency] ?? 100;
}

/**
 * Format amount from minor units to a decimal string
 * @param {number} amount - Amount in minor units (kopiyky, cents)
 * @param {string} [currency] - Lowercase currency code; only needed for
 *   currencies without minor units (e.g. "jpy")
 * @returns {string} Formatted amount
 */
export function formatAmount(amount, currency) {
    const units = minorUnits(currency);
    return (amount / units).toFixed(units === 1 ? 0 : 2);
}

/**
 * Convert a date string to a Unix timestamp at **local** midnight.
 *
 * `new Date("2026-07-25")` is parsed as UTC midnight, which in Kyiv is 03:00
 * local — so a range starting on the 25th silently skipped everything the user
 * spent between midnight and 03:00 that morning. Building the date from its
 * parts keeps it in the same time base the user picked it in.
 *
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} offsetDays - Days to add to the date (default: 0)
 * @returns {number} Unix timestamp in seconds
 * @throws {Error} If the date is not in YYYY-MM-DD format
 */
export function dateToUnixTimestamp(dateString, offsetDays = 0) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString ?? "");
    if (!match) {
        throw new Error(`Expected a YYYY-MM-DD date, got "${dateString}"`);
    }

    const [, year, month, day] = match.map(Number);
    // Day overflow rolls into the next month on its own
    const date = new Date(year, month - 1, day + offsetDays);
    return Math.floor(date.getTime() / 1000);
}

/**
 * Format a Unix timestamp as a YYYY-MM-DD date in the **local** timezone.
 *
 * `toISOString()` formats in UTC, which moved transactions made between
 * midnight and 03:00 Kyiv back onto the previous day in Lunch Money.
 *
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Date in YYYY-MM-DD format
 * @throws {Error} If the timestamp is not a usable number
 */
export function formatLocalDate(timestamp) {
    const date = new Date(timestamp * 1000);
    if (typeof timestamp !== "number" || Number.isNaN(date.getTime())) {
        throw new Error(`Invalid transaction time: ${timestamp}`);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Calculate the amount to post to Lunch Money.
 *
 * Always `transaction.amount`, which Monobank documents as "Сума у валюті
 * рахунку" — the amount in the *account's* currency, already converted at
 * Monobank's real rate. `operationAmount` is the foreign leg and must never be
 * posted, otherwise Lunch Money re-converts it with its own daily FX rate and
 * the account balance drifts.
 *
 * @param {Object} transaction - Monobank transaction object
 * @param {string} [accountCurrency] - Monobank account currency (lowercase)
 * @returns {string} Formatted amount in the account's currency
 * @throws {Error} If the transaction has no numeric amount
 */
export function calculateAmount(transaction, accountCurrency) {
    if (typeof transaction?.amount !== "number") {
        throw new Error(
            `Transaction ${transaction?.id ?? "(unknown)"} has no numeric amount`,
        );
    }
    return formatAmount(transaction.amount, accountCurrency);
}

/**
 * Verify the mapped Lunch Money asset is denominated in the same currency as
 * the Monobank account. A mismatch means the mapping is wrong, and syncing it
 * would silently corrupt the asset's balance.
 *
 * @param {string} accountCurrency - Monobank account currency (lowercase)
 * @param {Object} lunchMoneyAsset - Lunch Money asset object
 * @throws {Error} If the asset is missing or its currency differs
 */
export function assertAssetCurrencyMatches(accountCurrency, lunchMoneyAsset) {
    if (!accountCurrency) {
        throw new Error("Monobank account currency is unknown, cannot verify the mapping");
    }
    if (!lunchMoneyAsset) {
        throw new Error(
            "Lunch Money asset not found for selected account. Please add it in the Accounts Mapping.",
        );
    }

    const assetCurrency = lunchMoneyAsset.currency?.toLowerCase();
    if (assetCurrency !== accountCurrency) {
        const assetName =
            lunchMoneyAsset.display_name || lunchMoneyAsset.name || lunchMoneyAsset.id;
        throw new Error(
            `Currency mismatch: Monobank account is in ${accountCurrency.toUpperCase()} but ` +
                `it is mapped to Lunch Money asset "${assetName}" in ${(assetCurrency || "unknown").toUpperCase()}. ` +
                "Fix this in the Accounts Mapping before syncing.",
        );
    }
}

// Lunch Money truncates notes beyond this length
const MAX_NOTES_LENGTH = 350;

/**
 * Build the notes field, appending the original foreign-currency leg when the
 * operation happened in a currency other than the account's. Lunch Money has no
 * field for this, so it would otherwise be lost.
 *
 * @param {Object} transaction - Monobank transaction object
 * @param {string} accountCurrency - Monobank account currency (lowercase)
 * @returns {string} Notes, truncated to Lunch Money's limit
 */
export function buildNotes(transaction, accountCurrency) {
    const description = transaction.description || "";
    const { currencyCode, operationAmount, amount } = transaction;

    const isForeignOperation =
        currencyCode != null && currencyFromCode(currencyCode) !== accountCurrency;

    if (!isForeignOperation || typeof operationAmount !== "number") {
        return description.slice(0, MAX_NOTES_LENGTH);
    }

    const operationCurrency = getOperationCurrency(transaction);
    const label = operationCurrency || `code ${currencyCode}`;
    let fx = `FX ${formatAmount(operationAmount, operationCurrency)} ${label}`;

    // Monobank exposes no rate field; derive it from the two legs, comparing
    // major units so currencies with different exponents still line up
    if (amount && operationAmount) {
        const rate = Math.abs(
            amount / minorUnits(accountCurrency) / (operationAmount / minorUnits(operationCurrency)),
        ).toFixed(6);
        fx += ` @ ${rate} ${accountCurrency}/${label}`;
    }

    // Truncate the description, not the FX leg — preserving the original
    // amount is the whole point of the suffix
    const suffix = ` [${fx}]`;
    const room = Math.max(0, MAX_NOTES_LENGTH - suffix.length);
    return `${description.slice(0, room)}${suffix}`.slice(0, MAX_NOTES_LENGTH);
}

/**
 * Build Lunch Money transaction payload from Monobank transaction
 * @param {Object} transaction - Monobank transaction object
 * @param {Object} lunchMoneyAsset - Lunch Money asset object
 * @param {Object} monobankAccount - Monobank account object
 * @returns {Object} Lunch Money transaction payload
 */
export function buildTransactionPayload(transaction, lunchMoneyAsset, monobankAccount) {
    // `amount` and `currency` must describe the same money: Lunch Money reads
    // the amount as being denominated in the currency we send and never
    // rescales it. Both are therefore taken from the account, never from the
    // operation.
    const accountCurrency = getAccountCurrency(monobankAccount);
    assertAssetCurrencyMatches(accountCurrency, lunchMoneyAsset);

    return {
        date: formatLocalDate(transaction.time),
        amount: calculateAmount(transaction, accountCurrency),
        payee: transaction.description?.slice(0, 140) || "",
        currency: accountCurrency,
        asset_id: lunchMoneyAsset.id,
        notes: buildNotes(transaction, accountCurrency),
        category_id: null,
        external_id: transaction.id || null,
        recurring_id: null,
        status: "uncleared",
        tags: null,
    };
}
