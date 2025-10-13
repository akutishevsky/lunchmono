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
                    <button class="button is-fullwidth">
                        🔄 Sync transactions
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
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

const showTransactions = async () => {
    // Convert dates to Unix timestamps (add 1 day to end date for inclusive range)
    const fromTimestamp = dateToUnixTimestamp(props.dateFrom);
    const toTimestamp = dateToUnixTimestamp(props.dateTo, 1);

    const transactions = await fetchTransactions(
        props.selectedAccount,
        fromTimestamp,
        toTimestamp,
    );

    if (transactions) {
        console.log("Transactions:", transactions);
    }
};
</script>
