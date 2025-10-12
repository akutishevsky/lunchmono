<template>
    <div class="block">
        <h3 class="title is-5">2️⃣ Select account to sync</h3>
        <div class="box">
            <div class="columns">
                <div class="column">
                    <div class="label">Account</div>
                    <div class="control">
                        <div class="select is-fullwidth is-primary">
                            <select>
                                <option value="null">
                                    Select Account to sync
                                </option>
                                <option
                                    v-for="account in accounts"
                                    :key="account.id"
                                    :value="account.id"
                                >
                                    {{ account.type }} • {{ account.iban }} •
                                    {{
                                        account.maskedPan[0] || "No masked pan"
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

const accounts = ref();

onMounted(async () => {
    await setMonobankAccounts();
});

const setMonobankAccounts = async () => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/monobank/client-info`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
            `getMonobankAccounts error: ${errorData.error}` ||
                "Failed to fetch client info",
        );
    }

    const result = await response.json();

    // Sort accounts by type in ascending order
    accounts.value = (result.accounts || []).sort((a, b) =>
        a.type.localeCompare(b.type),
    );
};
</script>
