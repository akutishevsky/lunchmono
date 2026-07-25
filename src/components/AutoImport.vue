<template>
    <div class="block">
        <div class="box">
            <!-- Idle State -->
            <div v-if="currentPhase === 'idle'">
                <div class="content mb-4">
                    <p>
                        Sync transactions from your <strong>mapped accounts</strong> for the selected date range.
                    </p>
                    <p class="has-text-grey is-size-7">
                        Monobank allows one request per 60 seconds, so every extra
                        account adds about a minute to the run. Import only the
                        accounts you need.
                    </p>
                </div>

                <button
                    v-if="!accountsLoaded"
                    class="button is-primary is-fullwidth"
                    :class="{ 'is-loading': isLoadingAccounts }"
                    :disabled="isLoadingAccounts"
                    @click="loadAccounts"
                >
                    📋 Load accounts
                </button>

                <div v-else>
                    <!-- Mappings that cannot be imported at all -->
                    <div
                        v-if="accountProblems.length > 0"
                        class="notification is-danger is-light py-3"
                    >
                        <p class="has-text-weight-semibold mb-2">
                            Cannot be imported:
                        </p>
                        <p
                            v-for="problem in accountProblems"
                            :key="problem.accountId"
                            class="is-size-7"
                        >
                            {{ problem.accountName }} — {{ problem.message }}
                        </p>
                    </div>

                    <div v-if="availableAccounts.length > 0">
                        <div
                            class="is-flex is-justify-content-space-between is-align-items-center mb-2"
                        >
                            <span class="has-text-weight-semibold">
                                Accounts to import
                            </span>
                            <span class="is-size-7">
                                <a @click="selectAllAccounts">All</a> ·
                                <a @click="selectNoAccounts">None</a> ·
                                <a @click="loadAccounts">Reload</a>
                            </span>
                        </div>

                        <label
                            v-for="account in availableAccounts"
                            :key="account.monobankId"
                            class="panel-block"
                        >
                            <input
                                v-model="selectedAccountIds"
                                type="checkbox"
                                :value="account.monobankId"
                            />
                            <span class="ml-2">{{ account.accountName }}</span>
                            <span class="tag is-light ml-2">
                                {{ account.currency.toUpperCase() }}
                            </span>
                            <span class="has-text-grey is-size-7 ml-2">
                                → {{ account.assetName }}
                            </span>
                        </label>

                        <p class="has-text-grey is-size-7 mt-3">
                            {{ selectedAccountIds.length }} of
                            {{ availableAccounts.length }} selected ·
                            estimated {{ estimatedDuration }}
                        </p>

                        <button
                            class="button is-primary is-fullwidth mt-3"
                            :disabled="selectedAccountIds.length === 0"
                            @click="startAutoImport"
                        >
                            🚀 Start Auto Import
                        </button>
                    </div>
                    <p v-else class="has-text-grey">
                        No account can be imported. Check your Accounts mapping.
                    </p>
                </div>
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
                        :value="countdownTotal - countdownSeconds"
                        :max="countdownTotal"
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

// Monobank allows one statement request per 60 seconds
const MONOBANK_RATE_LIMIT_SECONDS = 60;

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
const countdownTotal = ref(MONOBANK_RATE_LIMIT_SECONDS);
// When the last Monobank statement request went out, so the cooldown can be
// measured from it rather than restarted after every account
const lastMonobankRequestAt = ref(0);
const results = ref([]);
const lunchMoneyAssets = ref([]);
const monobankAccounts = ref([]);

// Account picker. Loaded once and reused across runs so that repeating an
// import does not spend another rate-limited client-info request.
const accountsLoaded = ref(false);
const isLoadingAccounts = ref(false);
const availableAccounts = ref([]);
const accountProblems = ref([]); // mappings that cannot be imported at all
const selectedAccountIds = ref([]);

// Computed
const currentAccountName = computed(() => {
    if (accountQueue.value.length === 0) return "";
    return accountQueue.value[currentIndex.value]?.accountName || "";
});

// Each account after the first costs one rate-limit window
const estimatedDuration = computed(() => {
    const count = selectedAccountIds.value.length;
    if (count <= 1) return "under a minute";
    const minutes = Math.round(
        ((count - 1) * MONOBANK_RATE_LIMIT_SECONDS) / 60
    );
    return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
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

/**
 * Turn the saved mappings into importable accounts.
 * @returns {{importable: Array, problems: Array}} importable accounts, and
 *   mappings that cannot be imported at all with the reason why
 */
function buildAccountQueue(mappings) {
    log.debug("Building account queue from", Object.keys(mappings).length, "mapping(s)");
    const queue = [];
    const problems = [];

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
        const assetName =
            lunchMoneyAsset.display_name || lunchMoneyAsset.name || lunchMoneyAsset.id;

        // A currency mismatch is an actionable configuration error, not a
        // missing mapping: surface it instead of syncing amounts that would
        // corrupt the asset balance.
        let currency;
        try {
            currency = getAccountCurrency(monobankAccount);
            assertAssetCurrencyMatches(currency, lunchMoneyAsset);
        } catch (error) {
            log.warn("Skipping mapping - monobankId:", monobankId, "-", error.message);
            problems.push({
                accountId: monobankId,
                accountName,
                message: error.message,
            });
            continue;
        }

        queue.push({
            monobankId,
            lunchMoneyAssetId,
            accountName,
            assetName,
            currency,
            monobankAccount,
            lunchMoneyAsset,
        });
    }

    log.debug(
        "Account queue built:",
        queue.length, "importable,",
        problems.length, "unusable"
    );
    return { importable: queue, problems };
}

// Fetch transactions for a specific account
async function fetchTransactionsForAccount(accountId) {
    log.debug("Fetching transactions for account:", accountId);
    const baseUrl = await getBaseUrl();
    const fromTimestamp = dateToUnixTimestamp(props.dateFrom);
    const toTimestamp = dateToUnixTimestamp(props.dateTo, 1);
    const url = `${baseUrl}/monobank/transactions/${accountId}/${fromTimestamp}/${toTimestamp}`;

    // Stamp before the request: the rate limit counts attempts, so a failed
    // fetch still owes the full cooldown
    lastMonobankRequestAt.value = Date.now();

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
        countdownTotal.value = seconds;
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

/**
 * Wait out whatever is left of Monobank's rate limit, measured from the last
 * statement request. Time already spent syncing to Lunch Money counts towards
 * it, so this is usually shorter than a flat 60s — and is skipped entirely
 * when the cooldown has already elapsed.
 */
async function waitForRateLimit() {
    const elapsed = (Date.now() - lastMonobankRequestAt.value) / 1000;
    const remaining = Math.ceil(MONOBANK_RATE_LIMIT_SECONDS - elapsed);

    if (!lastMonobankRequestAt.value || remaining <= 0) {
        log.debug("Rate-limit cooldown already elapsed, continuing immediately");
        return;
    }

    currentPhase.value = "waiting";
    log.debug("Phase: WAITING -", remaining, "s cooldown before next account");
    await waitWithCountdown(remaining);
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

        // Waiting before the request rather than after it means the last
        // account costs nothing, a previous run's cooldown is still honoured,
        // and time spent syncing to Lunch Money counts towards the window
        await waitForRateLimit();
        if (isCancelled.value) break;

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
        } catch (error) {
            log.error("Error processing", account.accountName, ":", error);
            results.value.push({
                accountId: account.monobankId,
                accountName: account.accountName,
                status: "error",
                transactionCount: null,
                message: error.message,
            });
        }
    }

    log.debug("Queue processing complete. Results:", results.value.length, "account(s)");
    currentPhase.value = "completed";
    isRunning.value = false;
}

// Load the mapped accounts so the user can choose which ones to import
async function loadAccounts() {
    log.debug("loadAccounts called");
    isLoadingAccounts.value = true;

    try {
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

        const { importable, problems } = buildAccountQueue(mappings);
        availableAccounts.value = importable;
        accountProblems.value = problems;
        // Default to importing everything; the user unchecks what they skip
        selectedAccountIds.value = importable.map((account) => account.monobankId);
        accountsLoaded.value = true;

        if (importable.length === 0) {
            showNotification(
                problems.length > 0
                    ? "No account can be imported. See the details below."
                    : "No valid account mappings found. Please verify your mappings.",
                true
            );
        }
    } catch (error) {
        log.error("loadAccounts error:", error);
        showNotification(`Error: ${error.message}`, true);
    } finally {
        isLoadingAccounts.value = false;
    }
}

function selectAllAccounts() {
    selectedAccountIds.value = availableAccounts.value.map(
        (account) => account.monobankId
    );
}

function selectNoAccounts() {
    selectedAccountIds.value = [];
}

// Start auto import for the selected accounts
async function startAutoImport() {
    log.debug("startAutoImport called - dates:", props.dateFrom, "to", props.dateTo);

    // Validate dates
    if (!props.dateFrom || !props.dateTo) {
        showNotification("Please select a date range first", true);
        return;
    }

    if (!accountsLoaded.value) {
        await loadAccounts();
        if (!accountsLoaded.value) return;
    }

    const queue = availableAccounts.value.filter((account) =>
        selectedAccountIds.value.includes(account.monobankId)
    );

    if (queue.length === 0) {
        showNotification("Please select at least one account to import", true);
        return;
    }

    try {
        // Carry the unusable mappings into the results so the final table
        // still explains why they were left out
        results.value = accountProblems.value.map((problem) => ({
            accountId: problem.accountId,
            accountName: problem.accountName,
            status: "error",
            transactionCount: null,
            message: problem.message,
        }));

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
    // The loaded accounts and the selection are kept on purpose: reloading
    // them would spend another rate-limited client-info request
}

// Expose methods for parent component
defineExpose({
    startAutoImport,
});
</script>
