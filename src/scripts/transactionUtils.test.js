import { describe, it, expect } from "vitest";
import {
    CURRENCY_CODES,
    currencyFromCode,
    getAccountCurrency,
    getOperationCurrency,
    formatAmount,
    dateToUnixTimestamp,
    calculateAmount,
    assertAssetCurrencyMatches,
    buildNotes,
    buildTransactionPayload,
} from "./transactionUtils.js";

/**
 * Monobank statement contract (verified against real data):
 *  - `transaction.amount` is ALWAYS in the account's currency, signed minor units.
 *  - `transaction.operationAmount` + `transaction.currencyCode` describe the
 *    OTHER currency (merchant's, or the transfer counterparty's).
 *  - The account's own currency comes only from `monobankAccount.currencyCode`.
 *
 * Expected values in this file are hard-coded literals on purpose: computing
 * them with the production helpers would only assert that the implementation
 * agrees with itself.
 */

// --- Fixtures ---------------------------------------------------------------

const UAH = 980;
const USD = 840;
const EUR = 978;
const JPY = 392;

// 2026-07-25T00:00:00Z and 2026-07-25T10:30:00Z, as Unix seconds
const JUL_25_2026_UTC = 1784937600;
const JUL_25_2026_1030_UTC = 1784975400;

const accounts = {
    uahCard: { id: "card-uah", type: "white", currencyCode: UAH },
    usdCard: { id: "card-usd", type: "black", currencyCode: USD },
    uahFop: { id: "fop-uah", type: "fop", currencyCode: UAH },
    usdFop: { id: "fop-usd", type: "fop", currencyCode: USD },
};

const assets = {
    uah: { id: 101, display_name: "Mono UAH", currency: "uah" },
    usd: { id: 102, display_name: "Mono USD", currency: "usd" },
    uahUpper: { id: 103, display_name: "Mono UAH (upper)", currency: "UAH" },
    usdUpper: { id: 104, display_name: "Mono USD (upper)", currency: "USD" },
};

/** Build a Monobank-shaped transaction with sane defaults. */
function tx(overrides = {}) {
    return {
        id: "tx-1",
        time: JUL_25_2026_1030_UTC,
        description: "Test operation",
        amount: -10000,
        operationAmount: -10000,
        currencyCode: UAH,
        ...overrides,
    };
}

// --- currencyFromCode / CURRENCY_CODES --------------------------------------

describe("currencyFromCode", () => {
    it.each([
        [980, "uah"],
        [840, "usd"],
        [978, "eur"],
        [392, "jpy"],
        [352, "isk"],
        [826, "gbp"],
        [985, "pln"],
    ])("maps ISO numeric %i to %s", (code, expected) => {
        expect(currencyFromCode(code)).toBe(expected);
    });

    it.each([[999], [0], [null], [undefined], ["980x"]])(
        "returns null for unsupported code %s",
        (code) => {
            expect(currencyFromCode(code)).toBeNull();
        },
    );

    it("exposes lowercase alphabetic codes only", () => {
        for (const value of Object.values(CURRENCY_CODES)) {
            expect(value).toMatch(/^[a-z]{3}$/);
        }
    });
});

// --- getAccountCurrency -----------------------------------------------------

describe("getAccountCurrency", () => {
    it.each([
        ["UAH card", accounts.uahCard, "uah"],
        ["USD card", accounts.usdCard, "usd"],
        ["UAH FOP", accounts.uahFop, "uah"],
        ["USD FOP", accounts.usdFop, "usd"],
    ])("resolves the account currency for %s", (_label, account, expected) => {
        expect(getAccountCurrency(account)).toBe(expected);
    });

    it.each([
        ["null account", null, /account details are unavailable/i],
        ["undefined account", undefined, /account details are unavailable/i],
        ["missing currencyCode", { id: "a", type: "black" }, /currencyCode is missing/i],
        [
            "unsupported currencyCode",
            { id: "a", type: "black", currencyCode: 999 },
            /Unsupported account currency code: 999/,
        ],
    ])("throws for %s", (_label, account, matcher) => {
        expect(() => getAccountCurrency(account)).toThrow(matcher);
    });
});

// --- getOperationCurrency ---------------------------------------------------

describe("getOperationCurrency", () => {
    it.each([
        ["USD merchant leg", tx({ currencyCode: USD }), "usd"],
        ["UAH leg", tx({ currencyCode: UAH }), "uah"],
        ["JPY leg", tx({ currencyCode: JPY }), "jpy"],
        ["unsupported code", tx({ currencyCode: 999 }), null],
        ["missing transaction", undefined, null],
    ])("returns %s -> %s", (_label, transaction, expected) => {
        expect(getOperationCurrency(transaction)).toBe(expected);
    });
});

// --- formatAmount -----------------------------------------------------------

describe("formatAmount", () => {
    it.each([
        [0, "0.00"],
        [1, "0.01"],
        [-1, "-0.01"],
        [12345, "123.45"],
        [-8324, "-83.24"],
        [-50000, "-500.00"],
        [2190000, "21900.00"],
        [-2190000, "-21900.00"],
        [100, "1.00"],
    ])("formats %i minor units as %s when no currency is given", (minor, expected) => {
        expect(formatAmount(minor)).toBe(expected);
    });

    it.each([
        ["uah", -8324, "-83.24"],
        ["usd", -199, "-1.99"],
        ["eur", -1000, "-10.00"],
        // Unknown / unmapped currencies keep the 2-decimal default
        ["zzz", -8324, "-83.24"],
        [undefined, -8324, "-83.24"],
        [null, -8324, "-83.24"],
    ])("uses 2 decimals for %s", (currency, minor, expected) => {
        expect(formatAmount(minor, currency)).toBe(expected);
    });

    it.each([
        // Currencies with no minor unit: 1 minor unit == 1 major unit, 0 decimals
        ["jpy", -15990, "-15990"],
        ["jpy", -1599000, "-1599000"],
        ["jpy", 0, "0"],
        ["jpy", 1, "1"],
        ["isk", 123456, "123456"],
        ["isk", -750, "-750"],
    ])("renders %s with 0 decimals and no division", (currency, minor, expected) => {
        expect(formatAmount(minor, currency)).toBe(expected);
    });

    it("does not divide zero-decimal currencies by 100", () => {
        expect(formatAmount(15990, "jpy")).not.toBe("159.90");
        expect(formatAmount(15990, "isk")).not.toBe("159.90");
    });
});

// --- dateToUnixTimestamp ----------------------------------------------------

describe("dateToUnixTimestamp", () => {
    it("converts a YYYY-MM-DD date to a Unix timestamp in seconds", () => {
        expect(dateToUnixTimestamp("2026-07-25")).toBe(JUL_25_2026_UTC);
    });

    it("treats a zero offset as no shift", () => {
        expect(dateToUnixTimestamp("2026-07-25", 0)).toBe(JUL_25_2026_UTC);
    });

    it.each([
        [1, JUL_25_2026_UTC + 86400],
        [-1, JUL_25_2026_UTC - 86400],
        [7, JUL_25_2026_UTC + 7 * 86400],
        [-30, JUL_25_2026_UTC - 30 * 86400],
    ])("shifts by %i day(s)", (offsetDays, expected) => {
        expect(dateToUnixTimestamp("2026-07-25", offsetDays)).toBe(expected);
    });
});

// --- calculateAmount --------------------------------------------------------

describe("calculateAmount", () => {
    it.each([
        [
            "same-currency purchase",
            tx({ amount: -8324, operationAmount: -8324, currencyCode: UAH }),
            "-83.24",
        ],
        [
            "cross-currency purchase uses the account leg, never the foreign leg",
            tx({ amount: -8324, operationAmount: -199, currencyCode: USD }),
            "-83.24",
        ],
        [
            "USD FOP sell leg uses the USD account leg",
            tx({ amount: -50000, operationAmount: -2190000, currencyCode: UAH }),
            "-500.00",
        ],
        [
            "JPY purchase still posts the UAH account leg",
            tx({ amount: -600000, operationAmount: -15990, currencyCode: JPY }),
            "-6000.00",
        ],
    ])("returns %s -> %s", (_label, transaction, expected) => {
        expect(calculateAmount(transaction)).toBe(expected);
    });

    it.each([
        ["undefined amount", tx({ amount: undefined })],
        ["missing amount key", { id: "tx-9", description: "x" }],
        ["null amount", tx({ amount: null })],
        ["string amount", tx({ amount: "-8324" })],
        ["undefined transaction", undefined],
    ])("throws for %s", (_label, transaction) => {
        expect(() => calculateAmount(transaction)).toThrow(/no numeric amount/i);
    });

    it("names the offending transaction id in the error", () => {
        expect(() => calculateAmount({ id: "tx-42" })).toThrow(/tx-42/);
    });

    it("names an unknown transaction when the id is missing too", () => {
        expect(() => calculateAmount({})).toThrow(/\(unknown\)/);
    });
});

// --- assertAssetCurrencyMatches --------------------------------------------

describe("assertAssetCurrencyMatches", () => {
    it.each([
        ["exact lowercase match", "uah", assets.uah],
        ["exact lowercase match (usd)", "usd", assets.usd],
        ["uppercase asset currency", "uah", assets.uahUpper],
        ["uppercase asset currency (USD vs usd)", "usd", assets.usdUpper],
        ["mixed case asset currency", "eur", { id: 9, currency: "EuR" }],
    ])("passes on %s", (_label, accountCurrency, asset) => {
        expect(() =>
            assertAssetCurrencyMatches(accountCurrency, asset),
        ).not.toThrow();
    });

    it.each([
        ["undefined account currency", undefined, { id: 7 }],
        ["null account currency", null, assets.uah],
        ["empty account currency", "", assets.uah],
    ])(
        "throws for %s instead of passing silently",
        (_label, accountCurrency, asset) => {
            expect(() =>
                assertAssetCurrencyMatches(accountCurrency, asset),
            ).toThrow(/account currency is unknown, cannot verify the mapping/i);
        },
    );

    it("reports the unknown account currency before the missing asset", () => {
        expect(() => assertAssetCurrencyMatches(undefined, null)).toThrow(
            /account currency is unknown/i,
        );
    });

    it.each([
        ["null asset", "uah", null],
        ["undefined asset", "uah", undefined],
    ])("throws for %s", (_label, accountCurrency, asset) => {
        expect(() => assertAssetCurrencyMatches(accountCurrency, asset)).toThrow(
            /asset not found/i,
        );
    });

    it("throws on a currency mismatch and names both currencies", () => {
        let error;
        try {
            assertAssetCurrencyMatches("uah", assets.usd);
        } catch (e) {
            error = e;
        }
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/Currency mismatch/i);
        expect(error.message).toContain("UAH");
        expect(error.message).toContain("USD");
        expect(error.message).toContain("Mono USD");
    });

    it("is case-insensitive on the asset side when detecting mismatches", () => {
        expect(() => assertAssetCurrencyMatches("uah", assets.usdUpper)).toThrow(
            /USD/,
        );
    });

    it("reports UNKNOWN when the asset has no currency at all", () => {
        expect(() =>
            assertAssetCurrencyMatches("uah", { id: 7, name: "No currency" }),
        ).toThrow(/UNKNOWN/);
    });

    it("falls back to name, then id, when display_name is absent", () => {
        expect(() =>
            assertAssetCurrencyMatches("uah", { id: 7, name: "Named", currency: "usd" }),
        ).toThrow(/"Named"/);
        expect(() =>
            assertAssetCurrencyMatches("uah", { id: 7, currency: "usd" }),
        ).toThrow(/"7"/);
    });
});

// --- buildNotes -------------------------------------------------------------

describe("buildNotes", () => {
    it.each([
        [
            "same currency (UAH account, UAH operation)",
            tx({ description: "Silpo", amount: -8324, operationAmount: -8324, currencyCode: UAH }),
            "uah",
            "Silpo",
        ],
        [
            "same currency (USD account, USD operation)",
            tx({ description: "Netflix", amount: -1599, operationAmount: -1599, currencyCode: USD }),
            "usd",
            "Netflix",
        ],
        [
            "missing currencyCode",
            tx({ description: "Cash", currencyCode: undefined }),
            "uah",
            "Cash",
        ],
        [
            "foreign code but non-numeric operationAmount",
            tx({ description: "Odd", currencyCode: USD, operationAmount: undefined }),
            "uah",
            "Odd",
        ],
        [
            "missing description",
            tx({ description: undefined, currencyCode: UAH }),
            "uah",
            "",
        ],
    ])("emits no FX suffix for %s", (_label, transaction, accountCurrency, expected) => {
        expect(buildNotes(transaction, accountCurrency)).toBe(expected);
    });

    it.each([
        [
            "UAH account, USD merchant",
            tx({
                description: "Amazon",
                amount: -8324,
                operationAmount: -199,
                currencyCode: USD,
            }),
            "uah",
            "Amazon [FX -1.99 usd @ 41.829146 uah/usd]",
        ],
        [
            "UAH account, EUR merchant",
            tx({
                description: "Booking",
                amount: -50000,
                operationAmount: -1000,
                currencyCode: EUR,
            }),
            "uah",
            "Booking [FX -10.00 eur @ 50.000000 uah/eur]",
        ],
        [
            "USD FOP account, UAH counterparty",
            tx({
                description: "Sale of currency",
                amount: -50000,
                operationAmount: -2190000,
                currencyCode: UAH,
            }),
            "usd",
            "Sale of currency [FX -21900.00 uah @ 0.022831 usd/uah]",
        ],
    ])("emits the FX leg for %s", (_label, transaction, accountCurrency, expected) => {
        expect(buildNotes(transaction, accountCurrency)).toBe(expected);
    });

    // JPY has no minor unit (ISO 4217 exponent 0), so Monobank reports whole yen
    // in `operationAmount`: a 15 990 yen purchase arrives as 15990, not 1599000.
    it("renders a JPY purchase on a UAH account with 0 decimals and a sane rate", () => {
        const notes = buildNotes(
            tx({
                description: "Don Quijote",
                amount: -600000, // -6 000.00 UAH
                operationAmount: -15990, // -15 990 JPY
                currencyCode: JPY,
            }),
            "uah",
        );

        expect(notes).toBe("Don Quijote [FX -15990 jpy @ 0.375235 uah/jpy]");
        // The yen leg is whole units, never rescaled by 100
        expect(notes).toContain("FX -15990 jpy");
        expect(notes).not.toContain("-159.90");
        // ~0.37 uah/jpy: mixed exponents were reconciled before dividing. The
        // pre-fix code divided both legs by 100 and produced 37.52 here.
        const rate = Number(notes.match(/@ ([\d.]+) uah\/jpy/)[1]);
        expect(rate).toBeGreaterThan(0.3);
        expect(rate).toBeLessThan(0.5);
    });

    // Same shape with a yen leg two orders of magnitude larger. Under the ISO
    // exponent-0 convention this is 1 599 000 JPY, so ~0.0038 uah/jpy is the
    // arithmetically correct rate for the pair that was printed.
    it("keeps the JPY rate consistent with the yen leg it printed", () => {
        const notes = buildNotes(
            tx({
                description: "Bulk order",
                amount: -600000, // -6 000.00 UAH
                operationAmount: -1599000, // -1 599 000 JPY
                currencyCode: JPY,
            }),
            "uah",
        );

        expect(notes).toBe("Bulk order [FX -1599000 jpy @ 0.003752 uah/jpy]");

        // Invariant: rate * |foreign leg| must reproduce the account leg, up to
        // the rounding of the rate to 6 decimals (relative, not absolute: the
        // yen leg is large enough that 1e-6 of rate is ~1.6 uah)
        const [, printedAmount, printedRate] = notes.match(
            /FX (-?[\d.]+) jpy @ ([\d.]+) uah\/jpy/,
        );
        const reconstructed = Number(printedRate) * Math.abs(Number(printedAmount));
        expect(Math.abs(reconstructed - 6000) / 6000).toBeLessThan(0.001);
    });

    it("falls back to `code NNN` for an unsupported operation currency", () => {
        const notes = buildNotes(
            tx({
                description: "Exotic",
                amount: -10000,
                operationAmount: -500,
                currencyCode: 999,
            }),
            "uah",
        );
        expect(notes).toContain("code 999");
        expect(notes).toBe("Exotic [FX -5.00 code 999 @ 20.000000 uah/code 999]");
    });

    it.each([
        ["zero operationAmount", tx({ description: "Zero op", amount: -10000, operationAmount: 0, currencyCode: USD })],
        ["zero amount", tx({ description: "Zero amt", amount: 0, operationAmount: -199, currencyCode: USD })],
        ["both zero", tx({ description: "Both zero", amount: 0, operationAmount: 0, currencyCode: USD })],
    ])("emits no rate (and no Infinity/NaN) for %s", (_label, transaction) => {
        const notes = buildNotes(transaction, "uah");
        expect(notes).not.toContain("@");
        expect(notes).not.toContain("Infinity");
        expect(notes).not.toContain("NaN");
        expect(notes).toMatch(/\[FX -?\d+\.\d{2} usd\]$/);
    });

    describe("truncation to Lunch Money's 350 character limit", () => {
        const longDescription = "Very long merchant description ".repeat(40);
        // " [FX -1.99 usd @ 41.829146 uah/usd]" is 35 chars, leaving 315
        const FX_SUFFIX = " [FX -1.99 usd @ 41.829146 uah/usd]";
        const ROOM_FOR_DESCRIPTION = 315;

        it("uses a description long enough to force truncation", () => {
            expect(longDescription.length).toBeGreaterThan(350);
            expect(FX_SUFFIX).toHaveLength(35);
        });

        it("truncates a plain description at 350 characters", () => {
            const plain = buildNotes(
                tx({ description: longDescription, currencyCode: UAH }),
                "uah",
            );
            expect(plain).toHaveLength(350);
            expect(plain).toBe(longDescription.slice(0, 350));
        });

        it("keeps the whole FX suffix and truncates the description instead", () => {
            const foreign = buildNotes(
                tx({
                    description: longDescription,
                    amount: -8324,
                    operationAmount: -199,
                    currencyCode: USD,
                }),
                "uah",
            );

            expect(foreign.length).toBeLessThanOrEqual(350);
            // The FX leg is the whole point of the suffix: it must survive intact
            expect(foreign).toContain("FX -1.99 usd");
            expect(foreign).toContain("@ 41.829146 uah/usd");
            expect(foreign.endsWith("]")).toBe(true);
            // ...and the description is what got cut
            expect(foreign.startsWith(
                longDescription.slice(0, ROOM_FOR_DESCRIPTION),
            )).toBe(true);
            expect(foreign).toBe(
                longDescription.slice(0, ROOM_FOR_DESCRIPTION) + FX_SUFFIX,
            );
            // Regression: naive tail-truncation would have dropped the FX leg
            expect(foreign).not.toBe(longDescription.slice(0, 350));
        });

        it("still emits the FX suffix when there is no room left for a description", () => {
            const suffixOnly = buildNotes(
                tx({
                    description: "x".repeat(2000),
                    amount: -8324,
                    operationAmount: -199,
                    currencyCode: USD,
                }),
                "uah",
            );
            expect(suffixOnly.length).toBeLessThanOrEqual(350);
            expect(suffixOnly).toContain("FX -1.99 usd @ 41.829146 uah/usd");
            expect(suffixOnly.endsWith("]")).toBe(true);
        });
    });
});

// --- buildTransactionPayload ------------------------------------------------

describe("buildTransactionPayload", () => {
    it("builds a full payload for a same-currency purchase", () => {
        const transaction = tx({
            id: "mono-1",
            description: "Silpo",
            amount: -8324,
            operationAmount: -8324,
            currencyCode: UAH,
        });

        expect(
            buildTransactionPayload(transaction, assets.uah, accounts.uahCard),
        ).toEqual({
            date: "2026-07-25",
            amount: "-83.24",
            payee: "Silpo",
            currency: "uah",
            asset_id: 101,
            notes: "Silpo",
            category_id: null,
            external_id: "mono-1",
            recurring_id: null,
            status: "uncleared",
            tags: null,
        });
    });

    it("posts the UAH account leg (not the USD operation leg) for a cross-currency purchase", () => {
        // Real regression data: UAH account, USD merchant.
        const transaction = tx({
            id: "mono-2",
            description: "Amazon",
            amount: -8324,
            operationAmount: -199,
            currencyCode: USD,
        });

        const payload = buildTransactionPayload(
            transaction,
            assets.uah,
            accounts.uahCard,
        );

        expect(payload.amount).toBe("-83.24");
        expect(payload.currency).toBe("uah");
        // The bug: posting the foreign leg / labelling it with the foreign currency.
        expect(payload.amount).not.toBe("-1.99");
        expect(payload.currency).not.toBe("usd");
        // The FX leg must survive in the notes, with a derived rate ~41.83 uah/usd.
        expect(payload.notes).toBe("Amazon [FX -1.99 usd @ 41.829146 uah/usd]");
    });

    it("labels the USD FOP sell leg as USD (regression: it used to say uah)", () => {
        const transaction = tx({
            id: "mono-3",
            description: "Sale of currency",
            amount: -50000,
            operationAmount: -2190000,
            currencyCode: UAH,
        });

        const payload = buildTransactionPayload(
            transaction,
            assets.usd,
            accounts.usdFop,
        );

        expect(payload.amount).toBe("-500.00");
        expect(payload.currency).toBe("usd");
        expect(payload.notes).toContain("FX -21900.00 uah");
    });

    it("posts the UAH FOP receive leg in UAH", () => {
        const transaction = tx({
            id: "mono-4",
            description: "Purchase of currency",
            amount: 2190000,
            operationAmount: 2190000,
            currencyCode: UAH,
        });

        const payload = buildTransactionPayload(
            transaction,
            assets.uah,
            accounts.uahFop,
        );

        expect(payload.amount).toBe("21900.00");
        expect(payload.currency).toBe("uah");
        expect(payload.notes).toBe("Purchase of currency");
    });

    it("posts the UAH FOP send leg and the card receive leg in UAH", () => {
        const sendLeg = buildTransactionPayload(
            tx({
                id: "mono-5",
                description: "To own card",
                amount: -2190000,
                operationAmount: -2190000,
                currencyCode: UAH,
            }),
            assets.uah,
            accounts.uahFop,
        );
        const receiveLeg = buildTransactionPayload(
            tx({
                id: "mono-6",
                description: "From FOP",
                amount: 2190000,
                operationAmount: 2190000,
                currencyCode: UAH,
            }),
            assets.uahUpper,
            accounts.uahCard,
        );

        expect(sendLeg.amount).toBe("-21900.00");
        expect(sendLeg.currency).toBe("uah");
        expect(receiveLeg.amount).toBe("21900.00");
        expect(receiveLeg.currency).toBe("uah");
    });

    it("uses the UAH `amount` even when Monobank stamps a UAH leg with the USD side", () => {
        // Monobank sometimes reports the counterparty (USD) leg on a UAH account.
        const transaction = tx({
            id: "mono-7",
            description: "Purchase of currency",
            amount: 2190000, // UAH, account currency
            operationAmount: 50000, // USD, counterparty currency
            currencyCode: USD,
        });

        const payload = buildTransactionPayload(
            transaction,
            assets.uah,
            accounts.uahFop,
        );

        expect(payload.amount).toBe("21900.00");
        expect(payload.currency).toBe("uah");
        expect(payload.amount).not.toBe("500.00");
        expect(payload.notes).toBe(
            "Purchase of currency [FX 500.00 usd @ 43.800000 uah/usd]",
        );
    });

    it("truncates the payee to 140 characters and defaults it to an empty string", () => {
        expect(
            buildTransactionPayload(
                tx({ description: "x".repeat(200) }),
                assets.uah,
                accounts.uahCard,
            ).payee,
        ).toBe("x".repeat(140));

        expect(
            buildTransactionPayload(
                tx({ description: undefined }),
                assets.uah,
                accounts.uahCard,
            ).payee,
        ).toBe("");
    });

    it("derives the date from the transaction time in UTC", () => {
        expect(
            buildTransactionPayload(
                tx({ time: JUL_25_2026_UTC }),
                assets.uah,
                accounts.uahCard,
            ).date,
        ).toBe("2026-07-25");
        expect(
            buildTransactionPayload(
                tx({ time: JUL_25_2026_UTC + 86399 }),
                assets.uah,
                accounts.uahCard,
            ).date,
        ).toBe("2026-07-25");
    });

    it("falls back to a null external_id when Monobank sends no id", () => {
        expect(
            buildTransactionPayload(
                tx({ id: undefined }),
                assets.uah,
                accounts.uahCard,
            ).external_id,
        ).toBeNull();
    });

    it.each([
        [
            "asset currency mismatch",
            accounts.uahCard,
            assets.usd,
            /Currency mismatch/i,
        ],
        ["missing asset", accounts.uahCard, null, /asset not found/i],
        [
            "unsupported account currency",
            { id: "x", type: "black", currencyCode: 999 },
            assets.uah,
            /Unsupported account currency code/i,
        ],
        [
            "missing account",
            null,
            assets.uah,
            /account details are unavailable/i,
        ],
    ])("refuses to build a payload on %s", (_label, account, asset, matcher) => {
        expect(() => buildTransactionPayload(tx(), asset, account)).toThrow(
            matcher,
        );
    });
});

// --- End-to-end: the 4-leg currency exchange chain --------------------------

describe("USD FOP -> UAH FOP -> white card exchange chain", () => {
    // Real-world shape of the bug report: selling 500 USD from the FOP USD
    // account at 43.80 yields 21 900 UAH, which is then moved to the white card.
    const legs = [
        {
            label: "USD FOP: sell 500 USD",
            account: accounts.usdFop,
            asset: assets.usd,
            transaction: tx({
                id: "chain-1",
                description: "Sale of currency",
                amount: -50000, // USD minor units (account currency)
                operationAmount: -2190000, // UAH minor units (counterparty)
                currencyCode: UAH,
            }),
            expected: { amount: "-500.00", currency: "usd" },
        },
        {
            label: "UAH FOP: receive 21 900 UAH",
            account: accounts.uahFop,
            asset: assets.uah,
            transaction: tx({
                id: "chain-2",
                description: "Purchase of currency",
                amount: 2190000,
                operationAmount: 50000,
                currencyCode: USD, // stamped with the USD side
            }),
            expected: { amount: "21900.00", currency: "uah" },
        },
        {
            label: "UAH FOP: send 21 900 UAH to card",
            account: accounts.uahFop,
            asset: assets.uah,
            transaction: tx({
                id: "chain-3",
                description: "To own card",
                amount: -2190000,
                operationAmount: -2190000,
                currencyCode: UAH,
            }),
            expected: { amount: "-21900.00", currency: "uah" },
        },
        {
            label: "White card: receive 21 900 UAH",
            account: accounts.uahCard,
            asset: assets.uahUpper,
            transaction: tx({
                id: "chain-4",
                description: "From FOP",
                amount: 2190000,
                operationAmount: 2190000,
                currencyCode: UAH,
            }),
            expected: { amount: "21900.00", currency: "uah" },
        },
    ];

    /**
     * Build every leg's payload. Called inside test bodies (never in the
     * describe body) so that a throw fails a test rather than test collection.
     */
    const buildChain = () =>
        legs.map((leg) => ({
            ...leg,
            payload: buildTransactionPayload(leg.transaction, leg.asset, leg.account),
        }));

    it.each(legs.map((leg) => [leg.label, leg]))(
        "%s posts the account leg",
        (_label, leg) => {
            const payload = buildTransactionPayload(
                leg.transaction,
                leg.asset,
                leg.account,
            );
            expect(payload.amount).toBe(leg.expected.amount);
            expect(payload.currency).toBe(leg.expected.currency);
        },
    );

    it("nets the UAH FOP legs to exactly 0 (no leftover balance on FOP UAH)", () => {
        const uahFopTotal = buildChain()
            .filter((p) => p.account.id === "fop-uah")
            .reduce((sum, p) => sum + Number(p.payload.amount), 0);

        // The user-visible bug: a stray balance left on the FOP UAH account
        // because one leg was posted with the foreign (USD) amount.
        expect(uahFopTotal).toBe(0);
    });

    it("moves the full UAH amount onto the white card", () => {
        const card = buildChain().find((p) => p.account.id === "card-uah");
        expect(Number(card.payload.amount)).toBe(21900);
        expect(card.payload.currency).toBe("uah");
    });

    it("debits exactly 500 USD from the USD FOP account", () => {
        const usdFop = buildChain().find((p) => p.account.id === "fop-usd");
        expect(Number(usdFop.payload.amount)).toBe(-500);
        expect(usdFop.payload.currency).toBe("usd");
    });

    it("labels every leg with its own account's currency", () => {
        expect(buildChain().map((p) => p.payload.currency)).toEqual([
            "usd",
            "uah",
            "uah",
            "uah",
        ]);
    });
});
