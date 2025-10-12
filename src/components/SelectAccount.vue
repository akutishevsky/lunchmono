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
import { ref, onMounted } from "vue";
import { getBaseUrl } from "../scripts/utils";

const selectedAccount = defineModel({ type: String, default: "" });

const accounts = ref([]);

onMounted(async () => {
    await setMonobankAccounts();
});

const setMonobankAccounts = async () => {
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            console.error("Base URL is not available");
            return;
        }

        const response = await fetch(`${baseUrl}/monobank/client-info`);

        if (!response.ok) {
            const errorData = await response.json();
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

        console.log("Sorted accounts:", accounts.value);
    } catch (error) {
        console.error("Error fetching accounts:", error);
        accounts.value = [];
    }
};
</script>
