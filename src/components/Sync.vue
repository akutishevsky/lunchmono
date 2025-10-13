<template>
    <div class="block">
        <h3 class="title is-5">3️⃣ Sync</h3>
        <div class="box">
            <div class="columns">
                <div class="column">
                    <button
                        class="button is-fullwidth"
                        @click="showTransactions"
                    >
                        📋 Show transactions
                    </button>
                </div>
                <div class="column">
                    <button
                        class="button is-fullwidth"
                        @click="syncTransactions"
                    >
                        🔄 Sync transactions
                    </button>
                </div>
            </div>

            <div v-if="transactions.length > 0" class="mt-5">
                <h4 class="title is-6 has-text-centered">
                    Monobank transactions for
                    <span class="tag is-primary">{{ props.dateFrom }}</span> -
                    <span class="tag is-primary">{{ props.dateTo }}</span>
                </h4>
                <div class="table-container">
                    <table
                        class="table is-fullwidth is-striped is-hoverable is-bordered"
                    >
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="transaction in transactions"
                                :key="transaction.id"
                            >
                                <td>{{ formatDate(transaction.time) }}</td>
                                <td>{{ transaction.description }}</td>
                                <td
                                    :class="
                                        transaction.amount > 0
                                            ? 'has-text-success'
                                            : 'has-text-danger'
                                    "
                                >
                                    {{ transaction.amount > 0 ? "+" : "" }}
                                    {{ formatAmount(transaction.amount) }}
                                </td>
                                <td>{{ formatAmount(transaction.balance) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, onMounted } from "vue";
import { getBaseUrl } from "../scripts/utils.js";

const props = defineProps({
    selectedAccount: {
        type: String,
        default: "",
    },
    dateFrom: {
        type: String,
        default: "",
    },
    dateTo: {
        type: String,
        default: "",
    },
});

const transactions = ref([]);
const lunchMoneyAssets = ref([]);
const showNotification = inject("showNotification");

onMounted(async () => {
    await setLunchMoneyAssets();
});

/**
 * Convert date string to Unix timestamp (seconds)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {number} offsetDays - Number of days to add/subtract
 * @returns {number} Unix timestamp in seconds
 */
const dateToUnixTimestamp = (dateString, offsetDays = 0) => {
    const dateObj = new Date(dateString);
    if (offsetDays !== 0) {
        dateObj.setDate(dateObj.getDate() + offsetDays);
    }
    return Math.floor(dateObj.getTime() / 1000);
};

/**
 * Fetch transactions from Monobank API
 * @param {string} accountId - Account identifier
 * @param {number} fromTimestamp - Start date Unix timestamp
 * @param {number} toTimestamp - End date Unix timestamp
 * @returns {Promise<Object|null>} Transaction data or null on error
 */
const fetchTransactions = async (accountId, fromTimestamp, toTimestamp) => {
    const baseUrl = await getBaseUrl();
    const url = `${baseUrl}/monobank/transactions/${accountId}/${fromTimestamp}/${toTimestamp}`;

    const response = await fetch(url);

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching transactions:", errorData);
        return null;
    }

    return await response.json();
};

/**
 * Format Unix timestamp to readable date string
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date string
 */
const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

/**
 * Format amount from cents to currency
 * @param {number} amount - Amount in cents
 * @returns {string} Formatted amount
 */
const formatAmount = (amount) => {
    return (amount / 100).toFixed(2);
};

const getAccountMappings = async () => {
    try {
        const result = await window.electronAPI.loadAccountMappings();

        if (result.success) {
            return result.mappings;
        } else {
            showNotification(
                result.error || "Failed to load account mappings",
                true,
            );
        }
    } catch (error) {
        showNotification(`Error loading mappings: ${error.message}`, true);
    }
};

const setLunchMoneyAssets = async () => {
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            showNotification("Base URL is not available", true);
            return;
        }

        const response = await fetch(`${baseUrl}/lunchmoney/assets`);
        const result = await response.json();

        if (!response.ok) {
            showNotification(
                result.error || "Failed to fetch Lunch Money Assets",
                true,
            );
            return;
        }

        const assets = result.assets || [];

        lunchMoneyAssets.value = assets;
    } catch (error) {
        showNotification(`Error fetching assets: ${error}`, true);
        lunchMoneyAssets.value = [];
    }
};

const showTransactions = async () => {
    // Validate inputs
    if (!props.selectedAccount) {
        showNotification("Please select an account first", true);
        return;
    }

    if (!props.dateFrom || !props.dateTo) {
        showNotification("Please select date range", true);
        return;
    }

    // Convert dates to Unix timestamps (add 1 day to end date for inclusive range)
    const fromTimestamp = dateToUnixTimestamp(props.dateFrom);
    const toTimestamp = dateToUnixTimestamp(props.dateTo, 1);

    const fetchedTransactions = await fetchTransactions(
        props.selectedAccount,
        fromTimestamp,
        toTimestamp,
    );

    if (fetchedTransactions) {
        transactions.value = fetchedTransactions;
        showNotification(
            `Successfully loaded ${fetchedTransactions.length} transactions`,
            false,
        );
    } else {
        showNotification(
            "Failed to fetch transactions. Please try again.",
            true,
        );
    }
};

const syncTransactions = async () => {
    try {
        if (transactions.value.length === 0) {
            showNotification("Select the dates and Account first.", true);
        }

        const payload = [];
        transactions.value.forEach(async (trx) => {
            console.log(await getAmount(trx));
            // payload.push({
            //     date: new Date(t.time * 1000).toISOString(),
            //     amount: getAmount(cmp, t),
            //     payee: t.description ? t.description.slice(0, 140) : "",
            //     currency: getCurrency(cmp, t),
            //     asset_id: getAssetId(cmp),
            //     notes: t.description,
            //     category_id: null,
            //     external_id: null,
            //     recurring_id: null,
            //     status: "uncleared",
            //     tags: null,
            // });
        });
    } catch (error) {
        showNotification(error, true);
    }
};

const getAmount = async (t) => {
    const accountMappings = await getAccountMappings();

    const lunchMoneyAsset = lunchMoneyAssets.value.filter(
        (asset) => asset.id === accountMappings[props.selectedAccount.id],
    );

    if (!isFop()) {
        return lunchMoneyAsset.currency === getCurrency(t)
            ? (t.amount / 100).toFixed(2)
            : (t.operationAmount / 100).toFixed(2);
    } else {
        return getLMAccountCurrency() === "usd"
            ? (t.amount / 100).toFixed(2)
            : (t.operationAmount / 100).toFixed(2);
    }
};

const getCurrency = (t) => {
    if (!t || !t.currencyCode) {
        throw new Error("Transaction object or currencyCode is undefined.");
    }

    if (isFop() && getLMAccountCurrency() === "usd") {
        return "usd";
    }

    let currency;
    switch (t.currencyCode) {
        case 980:
            currency = "uah";
            break;
        case 840:
            currency = "usd";
            break;
        case 978:
            currency = "eur";
            break;
        default:
            throw new Error(`Unsupported currency code: ${t.currencyCode}`);
    }
    return currency;
};

const getLMAccountCurrency = () => {
    const lunchMoneyAsset = lunchMoneyAssets.value.filter(
        (asset) => asset.id === accountMappings[props.selectedAccount.id],
    );

    return lunchMoneyAsset?.currency;
};

const isFop = () => {
    try {
        return props.selectedAccount?.type === "fop";
    } catch (error) {
        throw new Error(error.message);
    }
};
</script>
