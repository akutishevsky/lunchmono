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
import { ref, inject } from "vue";
import { getBaseUrl } from "../scripts/utils";

const selectedAccount = defineModel({ type: String, default: "" });
const showNotification = inject("showNotification");

const accounts = ref([]);

const setMonobankAccounts = async () => {
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            return;
        }

        const response = await fetch(`${baseUrl}/monobank/client-info`);

        if (!response.ok) {
            const errorData = await response.json();
            // Only show error if we're explicitly trying to fetch (not on initial mount)
            throw new Error(errorData.error || "Failed to fetch client info");
        }

        const result = await response.json();

        // Ensure accounts exist and have valid data
        const accountsData = result.accounts || [];

        // Sort accounts by type in ascending order (with null safety)
        accounts.value = accountsData.sort((a, b) => {
            const typeA = a?.type || "";
            const typeB = b?.type || "";
            return typeA.localeCompare(typeB);
        });
    } catch (error) {
        accounts.value = [];
        // Silently fail - tokens might not be configured yet
    }
};

// Expose method so parent can trigger refresh
defineExpose({
    refreshAccounts: setMonobankAccounts,
});
</script>
