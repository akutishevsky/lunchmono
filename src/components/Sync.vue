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

            <div v-if="transactions.length > 0" class="mt-5">
                <h4 class="title is-6 has-text-centered">
                    Monobank transactions for {{ props.dateFrom }} -
                    {{ props.dateTo }}
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
import { ref } from "vue";
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

const showTransactions = async () => {
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
    }
};
</script>
