<template>
    <div class="block">
        <div class="box">
            <!-- Idle State -->
            <div v-if="currentPhase === 'idle'">
                <div class="content mb-4">
                    <p>
                        Automatically sync transactions from <strong>all mapped accounts</strong> for the selected date range.
                    </p>
                    <p class="has-text-grey is-size-7">
                        Due to Monobank API rate limits, there will be a 60-second wait between each account.
                    </p>
                </div>
                <button
                    class="button is-primary is-fullwidth"
                    @click="startAutoImport"
                >
                    🚀 Start Auto Import
                </button>
            </div>

            <!-- Running State -->
            <div v-else-if="currentPhase !== 'completed'">
                <div class="mb-4">
                    <p class="has-text-weight-semibold">
                        Processing account {{ currentIndex + 1 }} of {{ accountQueue.length }}
                    </p>
                    <p class="has-text-grey">
                        {{ currentAccountName }}
                    </p>
                </div>

                <!-- Phase Tags -->
                <div class="tags mb-4">
                    <span
                        class="tag"
                        :class="currentPhase === 'fetching' ? 'is-info' : 'is-light'"
                    >
                        Fetching
                    </span>
                    <span
                        class="tag"
                        :class="currentPhase === 'syncing' ? 'is-info' : 'is-light'"
                    >
                        Syncing
                    </span>
                    <span
                        class="tag"
                        :class="currentPhase === 'waiting' ? 'is-warning' : 'is-light'"
                    >
                        Waiting
                    </span>
                </div>

                <!-- Countdown Progress -->
                <div v-if="currentPhase === 'waiting'" class="mb-4">
                    <progress
                        class="progress is-warning"
                        :value="60 - countdownSeconds"
                        max="60"
                    ></progress>
                    <p class="has-text-grey is-size-7">
                        Waiting {{ countdownSeconds }} seconds (Monobank rate limit)
                    </p>
                </div>

                <!-- Cancel Button -->
                <button
                    class="button is-danger is-outlined is-fullwidth"
                    @click="cancelAutoImport"
                >
                    ❌ Cancel Import
                </button>
            </div>

            <!-- Completed State -->
            <div v-else>
                <h4 class="title is-6 mb-4">Import Results</h4>
                <div class="table-container">
                    <table class="table is-fullwidth is-striped is-bordered">
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th>Status</th>
                                <th>Transactions</th>
                                <th>Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="result in results" :key="result.accountId">
                                <td>{{ result.accountName }}</td>
                                <td>
                                    <span
                                        class="tag"
                                        :class="getStatusClass(result.status)"
                                    >
                                        {{ getStatusIcon(result.status) }} {{ result.status }}
                                    </span>
                                </td>
                                <td>{{ result.transactionCount ?? '-' }}</td>
                                <td>{{ result.message }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <button
                    class="button is-primary is-fullwidth mt-4"
                    @click="resetAutoImport"
                >
                    Start New Import
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, computed } from "vue";
import { getBaseUrl } from "../scripts/utils.js";
import {
    dateToUnixTimestamp,
    buildTransactionPayload,
    getAccountCurrency,
    assertAssetCurrencyMatches,
} from "../scripts/transactionUtils.js";
import { createLogger } from "../scripts/logger.js";

const log = createLogger("AutoImport");

const props = defineProps({
    dateFrom: { type: String, default: "" },
    dateTo: { type: String, default: "" },
});

const showNotification = inject("showNotification");

// State
const isRunning = ref(false);
const isCancelled = ref(false);
const accountQueue = ref([]); // Array of {monobankId, lunchMoneyAssetId, accountName, monobankAccount, lunchMoneyAsset}
const currentIndex = ref(0);
const currentPhase = ref("idle"); // 'idle'|'fetching'|'syncing'|'waiting'|'completed'
const countdownSeconds = ref(0);
const results = ref([]);
const lunchMoneyAssets = ref([]);
const monobankAccounts = ref([]);

// Computed
const currentAccountName = computed(() => {
    if (accountQueue.value.length === 0) return "";
    return accountQueue.value[currentIndex.value]?.accountName || "";
});

// Status helpers
function getStatusClass(status) {
    switch (status) {
        case "ok":
            return "is-success";
        case "skip":
            return "is-warning";
        case "error":
            return "is-danger";
        default:
            return "is-light";
    }
}

function getStatusIcon(status) {
    switch (status) {
        case "ok":
            return "✓";
        case "skip":
            return "⚠";
        case "error":
            return "✗";
        default:
            return "";
    }
}

// Generic API fetch with error handling
async function fetchData(endpoint, dataKey = null) {
    log.debug("fetchData:", endpoint);
    const baseUrl = await getBaseUrl();
    if (!baseUrl) {
        throw new Error("Base URL is not available");
    }

    const response = await fetch(`${baseUrl}${endpoint}`);
    const result = await response.json();

    if (!response.ok) {
        log.error("fetchData failed:", endpoint, result);
        throw new Error(result.error || `Failed to fetch ${endpoint}`);
    }

    log.debug("GET", endpoint, "response:", result);
    return dataKey ? result[dataKey] || [] : result;
}

// Load account mappings
async function loadAccountMappings() {
    log.debug("Loading account mappings via IPC...");
    const result = await window.electronAPI.loadAccountMappings();
    if (!result.success) {
        log.error("Failed to load mappings:", result.error);
        throw new Error(result.error || "Failed to load mappings");
    }
    log.debug("Account mappings loaded:", Object.keys(result.mappings || {}).length, "mapping(s)");
    return result.mappings || {};
}

// Build queue from mappings
function buildAccountQueue(mappings) {
    log.debug("Building account queue from", Object.keys(mappings).length, "mapping(s)");
    const queue = [];

    for (const [monobankId, lunchMoneyAssetId] of Object.entries(mappings)) {
        const monobankAccount = monobankAccounts.value.find(
            (acc) => acc.id === monobankId
        );
        const lunchMoneyAsset = lunchMoneyAssets.value.find(
            (asset) => String(asset.id) === String(lunchMoneyAssetId)
        );

        if (!monobankAccount || !lunchMoneyAsset) {
            log.warn("Skipping mapping - monobankId:", monobankId, "- account or asset not found");
            continue; // Skip if either account not found
        }

        // Build account name from Monobank account info
        const maskedPan = monobankAccount.maskedPan?.[0] || "";
        const lastFour = maskedPan.slice(-4);
        const accountName = `${monobankAccount.type?.toUpperCase() || "Account"} (****${lastFour})`;

        // A currency mismatch is an actionable configuration error, not a
        // missing mapping: report it in the results table instead of syncing
        // amounts that would corrupt the asset balance.
        try {
            assertAssetCurrencyMatches(
                getAccountCurrency(monobankAccount),
                lunchMoneyAsset
            );
        } catch (error) {
            log.warn("Skipping mapping - monobankId:", monobankId, "-", error.message);
            results.value.push({
                accountId: monobankId,
                accountName,
                status: "error",
                transactionCount: null,
                message: error.message,
            });
            continue;
        }

        queue.push({
            monobankId,
            lunchMoneyAssetId,
            accountName,
            monobankAccount,
            lunchMoneyAsset,
        });
    }

    log.debug("Account queue built:", queue.length, "account(s)");
    return queue;
}

// Fetch transactions for a specific account
async function fetchTransactionsForAccount(accountId) {
    log.debug("Fetching transactions for account:", accountId);
    const baseUrl = await getBaseUrl();
    const fromTimestamp = dateToUnixTimestamp(props.dateFrom);
    const toTimestamp = dateToUnixTimestamp(props.dateTo, 1);
    const url = `${baseUrl}/monobank/transactions/${accountId}/${fromTimestamp}/${toTimestamp}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json();
        log.error("GET /monobank/transactions failed for", accountId, ":", errorData);
        throw new Error(errorData.error || "Failed to fetch transactions");
    }

    const result = await response.json();
    log.debug("GET /monobank/transactions response for", accountId, ":", result);
    log.debug("Fetched", result.length, "transactions for account:", accountId);
    return result;
}

// Sync transactions to Lunch Money
async function syncTransactionsToLunchMoney(transactions, lunchMoneyAsset, monobankAccount) {
    log.debug("Syncing", transactions.length, "transactions for asset:", lunchMoneyAsset.display_name);
    const baseUrl = await getBaseUrl();
    if (!baseUrl) {
        throw new Error("Base URL is not available");
    }

    const payload = transactions.map((tx) =>
        buildTransactionPayload(tx, lunchMoneyAsset, monobankAccount)
    );
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
        throw new Error(errorMessage);
    }

    let responseData;
    try {
        responseData = JSON.parse(responseText);
    } catch {
        responseData = responseText;
    }
    log.debug("POST /lunchmoney/transactions response:", responseData);

    // Lunch Money may return 200 with error array in the body
    if (responseData?.error) {
        const errorMsg = Array.isArray(responseData.error)
            ? responseData.error.join("; ")
            : responseData.error;
        throw new Error(errorMsg);
    }

    log.debug("Synced", payload.length, "transactions successfully");
    return payload.length;
}

// Wait with countdown (supports cancellation)
function waitWithCountdown(seconds) {
    return new Promise((resolve) => {
        countdownSeconds.value = seconds;

        const interval = setInterval(() => {
            if (isCancelled.value) {
                clearInterval(interval);
                resolve();
                return;
            }

            countdownSeconds.value--;

            if (countdownSeconds.value <= 0) {
                clearInterval(interval);
                resolve();
            }
        }, 1000);
    });
}

// Main processing loop
async function processQueue() {
    for (let i = currentIndex.value; i < accountQueue.value.length; i++) {
        if (isCancelled.value) {
            break;
        }

        currentIndex.value = i;
        const account = accountQueue.value[i];
        log.debug("Processing queue: account", i + 1, "of", accountQueue.value.length);

        try {
            // Phase: Fetching
            currentPhase.value = "fetching";
            log.debug("Phase: FETCHING -", account.accountName);
            const transactions = await fetchTransactionsForAccount(account.monobankId);

            if (isCancelled.value) break;

            // Check if no transactions
            if (!transactions || transactions.length === 0) {
                log.warn("No transactions for", account.accountName, "- skipping");
                results.value.push({
                    accountId: account.monobankId,
                    accountName: account.accountName,
                    status: "skip",
                    transactionCount: 0,
                    message: "No transactions found",
                });

                // Still need to wait for rate limit before next account
                if (i < accountQueue.value.length - 1 && !isCancelled.value) {
                    currentPhase.value = "waiting";
                    log.debug("Phase: WAITING - 60s cooldown before next account");
                    await waitWithCountdown(60);
                }
                continue;
            }

            // Phase: Syncing
            currentPhase.value = "syncing";
            log.debug("Phase: SYNCING -", account.accountName);
            const syncedCount = await syncTransactionsToLunchMoney(
                transactions,
                account.lunchMoneyAsset,
                account.monobankAccount
            );

            results.value.push({
                accountId: account.monobankId,
                accountName: account.accountName,
                status: "ok",
                transactionCount: syncedCount,
                message: "Synced successfully",
            });

            // Phase: Waiting (if not last account)
            if (i < accountQueue.value.length - 1 && !isCancelled.value) {
                currentPhase.value = "waiting";
                log.debug("Phase: WAITING - 60s cooldown before next account");
                await waitWithCountdown(60);
            }
        } catch (error) {
            log.error("Error processing", account.accountName, ":", error);
            results.value.push({
                accountId: account.monobankId,
                accountName: account.accountName,
                status: "error",
                transactionCount: null,
                message: error.message,
            });

            // Still need to wait for rate limit before next account (if fetch was made)
            if (i < accountQueue.value.length - 1 && !isCancelled.value) {
                currentPhase.value = "waiting";
                log.debug("Phase: WAITING - 60s cooldown before next account");
                await waitWithCountdown(60);
            }
        }
    }

    log.debug("Queue processing complete. Results:", results.value.length, "account(s)");
    currentPhase.value = "completed";
    isRunning.value = false;
}

// Start auto import
async function startAutoImport() {
    log.debug("startAutoImport called - dates:", props.dateFrom, "to", props.dateTo);

    // Validate dates
    if (!props.dateFrom || !props.dateTo) {
        showNotification("Please select a date range first", true);
        return;
    }

    try {
        // Load mappings
        const mappings = await loadAccountMappings();
        if (!mappings || Object.keys(mappings).length === 0) {
            log.warn("No account mappings configured");
            showNotification(
                "No account mappings configured. Please set up mappings in Accounts Mapping first.",
                true
            );
            return;
        }

        // Fetch Monobank accounts and Lunch Money assets
        const [accounts, assets] = await Promise.all([
            fetchData("/monobank/client-info", "accounts"),
            fetchData("/lunchmoney/assets", "assets"),
        ]);

        monobankAccounts.value = accounts;
        lunchMoneyAssets.value = assets;

        // Reset results before building the queue: buildAccountQueue reports
        // unsyncable mappings (currency mismatches) into it
        results.value = [];

        // Build queue
        const queue = buildAccountQueue(mappings);
        if (queue.length === 0) {
            log.warn("No valid account mappings found after building queue");
            showNotification(
                results.value.length > 0
                    ? "No account could be synced. See the details below."
                    : "No valid account mappings found. Please verify your mappings.",
                true
            );
            // Show the results table when there is something to explain
            currentPhase.value = results.value.length > 0 ? "completed" : "idle";
            return;
        }

        // Initialize state
        accountQueue.value = queue;
        currentIndex.value = 0;
        isCancelled.value = false;
        isRunning.value = true;

        log.debug("Starting auto import for", queue.length, "account(s)");
        showNotification(`Starting auto import for ${queue.length} account(s)`, false);

        // Start processing
        await processQueue();
    } catch (error) {
        log.error("startAutoImport error:", error);
        showNotification(`Error: ${error.message}`, true);
        currentPhase.value = "idle";
        isRunning.value = false;
    }
}

// Cancel auto import
function cancelAutoImport() {
    log.debug("Auto import cancelled by user");
    isCancelled.value = true;
    showNotification("Import cancelled. Showing partial results.", false);
}

// Reset for new import
function resetAutoImport() {
    log.debug("Auto import state reset");
    currentPhase.value = "idle";
    isRunning.value = false;
    isCancelled.value = false;
    accountQueue.value = [];
    currentIndex.value = 0;
    countdownSeconds.value = 0;
    results.value = [];
}

// Expose methods for parent component
defineExpose({
    startAutoImport,
});
</script>
