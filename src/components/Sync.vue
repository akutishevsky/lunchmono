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
import { ref, inject, onMounted, computed } from "vue";
import { getBaseUrl } from "../scripts/utils.js";

const props = defineProps({
    selectedAccount: { type: String, default: "" },
    dateFrom: { type: String, default: "" },
    dateTo: { type: String, default: "" },
});

// State
const transactions = ref([]);
const lunchMoneyAssets = ref([]);
const monobankAccounts = ref([]);
const showNotification = inject("showNotification");

// Computed
const selectedLMAsset = computed(() => {
    const mappings = accountMappings.value;
    if (!mappings) return null;
    return lunchMoneyAssets.value.find(
        (asset) => asset.id === mappings[props.selectedAccount],
    );
});

const selectedMonobankAccount = computed(() =>
    monobankAccounts.value.find((acc) => acc.id === props.selectedAccount),
);

const accountMappings = ref(null);

// Currency mapping
const CURRENCY_CODES = {
    980: "uah",
    840: "usd",
    978: "eur",
};

// Initialize
onMounted(async () => {
    await Promise.all([
        fetchData("/lunchmoney/assets", lunchMoneyAssets, "assets"),
        fetchData("/monobank/client-info", monobankAccounts, "accounts"),
        loadAccountMappings(),
    ]);
});

// Generic API fetch with error handling
async function fetchData(endpoint, targetRef, dataKey = null) {
    try {
        const baseUrl = await getBaseUrl();
        if (!baseUrl) {
            showNotification("Base URL is not available", true);
            return;
        }

        const response = await fetch(`${baseUrl}${endpoint}`);
        const result = await response.json();

        if (!response.ok) {
            showNotification(
                result.error || `Failed to fetch ${endpoint}`,
                true,
            );
            return;
        }

        targetRef.value = dataKey ? result[dataKey] || [] : result;
    } catch (error) {
        showNotification(`Error fetching ${endpoint}: ${error.message}`, true);
        targetRef.value = [];
    }
}

// Load account mappings
async function loadAccountMappings() {
    try {
        const result = await window.electronAPI.loadAccountMappings();
        if (result.success) {
            accountMappings.value = result.mappings;
        } else {
            showNotification(result.error || "Failed to load mappings", true);
        }
    } catch (error) {
        showNotification(`Error loading mappings: ${error.message}`, true);
    }
}

// Formatters
const formatDate = (timestamp) =>
    new Date(timestamp * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const formatAmount = (amount) => (amount / 100).toFixed(2);

const dateToUnixTimestamp = (dateString, offsetDays = 0) => {
    const date = new Date(dateString);
    if (offsetDays) date.setDate(date.getDate() + offsetDays);
    return Math.floor(date.getTime() / 1000);
};

// Currency helpers
const getCurrency = (transaction) => {
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
};

const isFopAccount = () => selectedMonobankAccount.value?.type === "fop";

// Transaction amount calculation
const calculateAmount = (transaction) => {
    const asset = selectedLMAsset.value;
    if (!asset) {
        throw new Error("Lunch Money asset not found for selected account");
    }

    const transactionCurrency = getCurrency(transaction);
    const useOperationAmount = asset.currency !== transactionCurrency;

    // For FOP accounts, check if asset currency is USD
    if (isFopAccount()) {
        return formatAmount(
            asset.currency === "usd"
                ? transaction.amount
                : transaction.operationAmount,
        );
    }

    return formatAmount(
        useOperationAmount ? transaction.operationAmount : transaction.amount,
    );
};

// Fetch and display Monobank transactions
async function showTransactions() {
    if (!props.selectedAccount) {
        showNotification("Please select an account first", true);
        return;
    }

    if (!props.dateFrom || !props.dateTo) {
        showNotification("Please select date range", true);
        return;
    }

    try {
        const baseUrl = await getBaseUrl();
        const fromTimestamp = dateToUnixTimestamp(props.dateFrom);
        const toTimestamp = dateToUnixTimestamp(props.dateTo, 1);
        const url = `${baseUrl}/monobank/transactions/${props.selectedAccount}/${fromTimestamp}/${toTimestamp}`;

        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error fetching transactions:", errorData);
            showNotification("Failed to fetch transactions", true);
            return;
        }

        transactions.value = await response.json();
        showNotification(
            `Successfully loaded ${transactions.value.length} transactions`,
            false,
        );
    } catch (error) {
        showNotification(`Error: ${error.message}`, true);
    }
}

// Build Lunch Money transaction payload
function buildTransactionPayload(transaction) {
    return {
        date: new Date(transaction.time * 1000).toISOString(),
        amount: calculateAmount(transaction),
        payee: transaction.description?.slice(0, 140) || "",
        currency: getCurrency(transaction),
        asset_id: selectedLMAsset.value?.id,
        notes: transaction.description,
        category_id: null,
        external_id: null,
        recurring_id: null,
        status: "uncleared",
        tags: null,
    };
}

// Sync transactions to Lunch Money
async function syncTransactions() {
    if (transactions.value.length === 0) {
        showNotification("Please load transactions first", true);
        return;
    }

    try {
        const baseUrl = await getBaseUrl();
        if (!baseUrl) {
            showNotification("Base URL is not available", true);
            return;
        }

        // Build payload for all transactions
        const payload = transactions.value.map(buildTransactionPayload);

        const response = await fetch(`${baseUrl}/lunchmoney/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactions: payload }),
        });

        const responseText = await response.text();
        console.log("Sync response:", responseText);

        if (!response.ok) {
            let errorMessage = "Failed to sync transactions";
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = responseText || errorMessage;
            }
            showNotification(errorMessage, true);
            return;
        }

        showNotification(
            `Successfully synced ${payload.length} transactions`,
            false,
        );
    } catch (error) {
        showNotification(`Error syncing: ${error.message}`, true);
    }
}
</script>
