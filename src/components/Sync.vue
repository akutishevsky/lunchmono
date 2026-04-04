<template>
    <div class="block">
        <h3 class="title is-5">3️⃣ Sync</h3>
        <div class="box">
            <progress
                v-if="isProgressBarVisible"
                class="progress is-black"
                :value="progressValue"
                max="100"
            ></progress>
            <div class="columns">
                <div class="column">
                    <div
                        class="tooltip-wrapper"
                        :class="{ 'has-tooltip': isProgressBarVisible }"
                        :data-tooltip="tooltipMessage"
                    >
                        <button
                            class="button is-fullwidth"
                            :disabled="isProgressBarVisible"
                            @click="showTransactions"
                        >
                            📋 Show transactions
                        </button>
                    </div>
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
import { ref, inject, onMounted, computed, onBeforeUnmount } from "vue";
import { getBaseUrl } from "../scripts/utils.js";
import {
    formatAmount,
    dateToUnixTimestamp,
    buildTransactionPayload,
} from "../scripts/transactionUtils.js";
import { createLogger } from "../scripts/logger.js";

const log = createLogger("Sync");

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
const isProgressBarVisible = ref(false);
const progressValue = ref(0);
const progressBarInterval = ref(null);
const remainingSeconds = ref(60);

// Computed
const selectedLMAsset = computed(() => {
    const mappings = accountMappings.value;
    if (!mappings) return null;
    const mappedAssetId = mappings[props.selectedAccount];
    if (!mappedAssetId) return null;

    // Handle both string and number comparison for asset IDs
    return lunchMoneyAssets.value.find(
        (asset) => String(asset.id) === String(mappedAssetId),
    );
});

const selectedMonobankAccount = computed(() =>
    monobankAccounts.value.find((acc) => acc.id === props.selectedAccount),
);

const tooltipMessage = computed(() =>
    `Monobank API allows only 1 request per 60 seconds, please wait ${remainingSeconds.value} seconds`
);

const accountMappings = ref(null);

// Initialize - removed onMounted data fetching to avoid errors when tokens are missing
// Data will be fetched when user explicitly requests transactions

// Generic API fetch with error handling
async function fetchData(endpoint, targetRef, dataKey = null, silent = false) {
    log.debug("fetchData:", endpoint);
    try {
        const baseUrl = await getBaseUrl();
        if (!baseUrl) {
            if (!silent) showNotification("Base URL is not available", true);
            return;
        }

        const response = await fetch(`${baseUrl}${endpoint}`);
        const result = await response.json();

        if (!response.ok) {
            log.error("fetchData failed:", endpoint, result);
            if (!silent) {
                showNotification(
                    result.error || `Failed to fetch ${endpoint}`,
                    true,
                );
            }
            return;
        }

        log.debug("GET", endpoint, "response:", result);
        targetRef.value = dataKey ? result[dataKey] || [] : result;
    } catch (error) {
        log.error("fetchData error:", endpoint, error);
        if (!silent) {
            showNotification(`Error fetching ${endpoint}: ${error.message}`, true);
        }
        targetRef.value = [];
    }
}

// Load account mappings
async function loadAccountMappings() {
    log.debug("Loading account mappings via IPC...");
    try {
        const result = await window.electronAPI.loadAccountMappings();
        if (result.success) {
            accountMappings.value = result.mappings;
            log.debug("Account mappings loaded:", Object.keys(result.mappings).length, "mapping(s)");
        } else {
            log.error("Failed to load mappings:", result.error);
            showNotification(result.error || "Failed to load mappings", true);
        }
    } catch (error) {
        log.error("Failed to load mappings:", error);
        showNotification(`Error loading mappings: ${error.message}`, true);
    }
}

// Expose method so parent can trigger refresh
defineExpose({
    refreshMappings: loadAccountMappings,
});

// Cleanup interval on component unmount
onBeforeUnmount(() => {
    if (progressBarInterval.value) {
        clearInterval(progressBarInterval.value);
    }
});

// Formatters
const formatDate = (timestamp) =>
    new Date(timestamp * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

// Fetch and display Monobank transactions
async function showTransactions() {
    log.debug("showTransactions called - account:", props.selectedAccount, "dates:", props.dateFrom, "to", props.dateTo);

    if (!props.selectedAccount) {
        showNotification("Please select an account first", true);
        return;
    }

    if (!props.dateFrom || !props.dateTo) {
        showNotification("Please select date range", true);
        return;
    }

    try {
        // Fetch necessary data if not already loaded
        await Promise.all([
            fetchData("/lunchmoney/assets", lunchMoneyAssets, "assets"),
            fetchData("/monobank/client-info", monobankAccounts, "accounts"),
            loadAccountMappings(),
        ]);

        const baseUrl = await getBaseUrl();
        const fromTimestamp = dateToUnixTimestamp(props.dateFrom);
        const toTimestamp = dateToUnixTimestamp(props.dateTo, 1);
        const url = `${baseUrl}/monobank/transactions/${props.selectedAccount}/${fromTimestamp}/${toTimestamp}`;

        log.debug("GET", url);
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            log.error("GET /monobank/transactions failed:", errorData);
            showNotification("Failed to fetch transactions", true);
            return;
        }

        transactions.value = await response.json();
        log.debug("GET /monobank/transactions response:", transactions.value);
        log.debug("Fetched", transactions.value.length, "transactions");
        showNotification(
            `Successfully loaded ${transactions.value.length} transactions`,
            false,
        );

        // Show progress bar and disable button for 60 seconds
        if (progressBarInterval.value) {
            clearInterval(progressBarInterval.value);
        }

        log.debug("Starting 60s rate-limit cooldown");
        isProgressBarVisible.value = true;
        progressValue.value = 0;
        remainingSeconds.value = 60;

        const totalDuration = 60000; // 60 seconds in milliseconds
        const intervalDuration = 1000; // Update every second
        const increment = 100 / (totalDuration / intervalDuration); // ~1.67 per second

        progressBarInterval.value = setInterval(() => {
            progressValue.value += increment;
            remainingSeconds.value = Math.max(0, Math.ceil(60 - (progressValue.value / 100 * 60)));

            if (progressValue.value >= 100) {
                progressValue.value = 100;
                remainingSeconds.value = 0;
                clearInterval(progressBarInterval.value);
                progressBarInterval.value = null;
                log.debug("Rate-limit cooldown complete");
                isProgressBarVisible.value = false;
            }
        }, intervalDuration);
    } catch (error) {
        log.error("showTransactions error:", error);
        showNotification(`Error: ${error.message}`, true);
    }
}

// Local wrapper for buildTransactionPayload that uses component state
function buildTransactionPayloadLocal(transaction) {
    return buildTransactionPayload(
        transaction,
        selectedLMAsset.value,
        selectedMonobankAccount.value,
    );
}

// Sync transactions to Lunch Money
async function syncTransactions() {
    log.debug("syncTransactions called -", transactions.value.length, "transactions");

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
        const payload = transactions.value.map(buildTransactionPayloadLocal);
        log.debug("POST /lunchmoney/transactions payload:", payload);

        const response = await fetch(`${baseUrl}/lunchmoney/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactions: payload }),
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = "Failed to sync transactions";
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = responseText || errorMessage;
            }
            log.error("POST /lunchmoney/transactions failed:", errorMessage);
            showNotification(errorMessage, true);
            return;
        }

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }
        log.debug("POST /lunchmoney/transactions response:", responseData);
        log.debug("Successfully synced", payload.length, "transactions to Lunch Money");

        showNotification(
            `Successfully synced ${payload.length} transactions`,
            false,
        );
    } catch (error) {
        log.error("syncTransactions error:", error);
        showNotification(`Error syncing: ${error.message}`, true);
    }
}
</script>

<style scoped>
.tooltip-wrapper {
    position: relative;
    display: block;
}

.tooltip-wrapper.has-tooltip::before {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    padding: 8px 12px;
    background-color: #363636;
    color: #fff;
    font-size: 0.875rem;
    line-height: 1.4;
    white-space: normal;
    max-width: 250px;
    border-radius: 4px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 10;
}

.tooltip-wrapper.has-tooltip::after {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 2px;
    border: 6px solid transparent;
    border-top-color: #363636;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 10;
}

.tooltip-wrapper.has-tooltip:hover::before,
.tooltip-wrapper.has-tooltip:hover::after {
    opacity: 1;
}
</style>
