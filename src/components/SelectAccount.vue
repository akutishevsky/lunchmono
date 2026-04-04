<template>
    <div class="block">
        <h3 class="title is-5">2️⃣ Select account to sync</h3>
        <div class="box">
            <div class="columns">
                <div class="column">
                    <div class="label">Account</div>
                    <div class="control">
                        <div class="select is-fullwidth is-primary">
                            <select v-model="selectedAccount">
                                <option value="">Select Account to sync</option>
                                <option
                                    v-for="account in accounts"
                                    :key="account.id"
                                    :value="account.id"
                                >
                                    {{ account.type }} • {{ account.iban }} •
                                    {{
                                        account.maskedPan?.[0] ||
                                        "No masked pan"
                                    }}
                                    •
                                    {{ account.balance / 100 }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, onMounted } from "vue";
import { getBaseUrl } from "../scripts/utils";
import { createLogger } from "../scripts/logger.js";

const log = createLogger("SelectAccount");

const selectedAccount = defineModel({ type: String, default: "" });
const showNotification = inject("showNotification");

const accounts = ref([]);

const setMonobankAccounts = async () => {
    log.debug("Fetching Monobank accounts...");
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            return;
        }

        const response = await fetch(`${baseUrl}/monobank/client-info`);

        if (!response.ok) {
            const errorData = await response.json();
            log.error("GET /monobank/client-info failed:", errorData);
            throw new Error(errorData.error || "Failed to fetch client info");
        }

        const result = await response.json();
        log.debug("GET /monobank/client-info response:", result);

        // Ensure accounts exist and have valid data
        const accountsData = result.accounts || [];

        // Sort accounts by type in ascending order (with null safety)
        accounts.value = accountsData.sort((a, b) => {
            const typeA = a?.type || "";
            const typeB = b?.type || "";
            return typeA.localeCompare(typeB);
        });
        log.debug("Loaded", accountsData.length, "Monobank accounts");
    } catch (error) {
        log.error("Failed to fetch accounts:", error);
        accounts.value = [];
        // Silently fail - tokens might not be configured yet
    }
};

// Check if tokens exist on mount and fetch accounts if they do
onMounted(async () => {
    log.debug("Component mounted, checking for tokens...");
    try {
        const result = await window.electronAPI.loadTokens();
        if (result.tokens?.monobankToken) {
            log.debug("Monobank token found, fetching accounts");
            await setMonobankAccounts();
        } else {
            log.debug("No Monobank token configured, skipping account fetch");
        }
    } catch (error) {
        log.warn("Could not load tokens:", error);
    }
});

// Expose method so parent can trigger refresh
defineExpose({
    refreshAccounts: setMonobankAccounts,
});
</script>
