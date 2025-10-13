<template>
    <div class="modal" :class="{ 'is-active': isOpen }">
        <div class="modal-background" @click="close"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Accounts Mapping</p>
                <button
                    class="delete"
                    aria-label="close"
                    @click="close"
                ></button>
            </header>
            <section class="modal-card-body">
                <div
                    class="columns card mb-5"
                    v-for="monobankAccount in monobankAccounts"
                    :key="monobankAccount.id"
                >
                    <div class="column">
                        <div class="label">Monobank Account</div>
                        <div>
                            <span class="has-text-weight-bold">Id: </span>
                            <span class="is-family-monospace">
                                {{ monobankAccount.id }}
                            </span>
                        </div>
                        <div>
                            <span class="has-text-weight-bold">IBAN: </span>
                            <span class="is-family-monospace">
                                {{ monobankAccount.iban }}
                            </span>
                        </div>
                        <div>
                            <span class="has-text-weight-bold"
                                >Masket Pan:
                            </span>
                            <span class="is-family-monospace">
                                {{ monobankAccount.maskedPan?.[0] || "🤷" }}
                            </span>
                        </div>
                        <div>
                            <span class="has-text-weight-bold">Balance: </span>
                            <span class="is-family-monospace">
                                {{ monobankAccount.balance / 100 }}
                            </span>
                        </div>
                    </div>
                    <div class="column">
                        <div class="label">Lunch Money Asset</div>
                        <div class="control">
                            <div class="select is-fullwidth is-primary">
                                <select>
                                    <option value="">
                                        Select Account to sync
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <footer class="modal-card-foot">
                <div class="buttons">
                    <button
                        class="button is-success"
                        @click="saveTokens"
                        :disabled="isSaving"
                    >
                        {{ isSaving ? "Saving..." : "Save changes" }}
                    </button>
                    <button class="button" @click="close">Cancel</button>
                </div>
            </footer>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, inject } from "vue";
import { getBaseUrl } from "../scripts/utils";

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
});

const isSaving = ref(false);
const monobankAccounts = ref([]);

const emit = defineEmits(["close"]);
const showNotification = inject("showNotification");

watch(
    () => props.isOpen,
    (isNowOpen) => {
        if (isNowOpen) {
            // loadTokens();
            setMonobankAccounts();
        }
    },
);

const setMonobankAccounts = async () => {
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            showNotification("Base URL is not available", true);
            return;
        }

        const response = await fetch(`${baseUrl}/monobank/client-info`);

        if (!response.ok) {
            const errorData = await response.json();
            showNotification(
                errorData.error || "Failed to fetch client info",
                true,
            );
        }

        const result = await response.json();

        // Ensure accounts exist and have valid data
        const accountsData = result.accounts || [];

        // Sort accounts by type in ascending order (with null safety)
        monobankAccounts.value = accountsData.sort((a, b) => {
            const typeA = a?.type || "";
            const typeB = b?.type || "";
            return typeA.localeCompare(typeB);
        });
    } catch (error) {
        showNotification(`Error fetching accounts: + ${error}`, true);
        monobankAccounts.value = [];
    }
};

// const loadTokens = async () => {
//     try {
//         const result = await window.electronAPI.loadTokens();

//         monobankToken.value = result.tokens.monobankToken;
//         lunchMoneyToken.value = result.tokens.lunchMoneyToken;
//     } catch (error) {
//         errorMessage.value = `Error: ${error.message}`;
//     }
// };

// const saveTokens = async () => {
//     isSaving.value = true;
//     errorMessage.value = "";
//     successMessage.value = "";

//     try {
//         const result = await window.electronAPI.saveTokens({
//             monobankToken: monobankToken.value,
//             lunchMoneyToken: lunchMoneyToken.value,
//         });

//         if (result.success) {
//             successMessage.value = "Tokens saved successfully!";
//             setTimeout(() => {
//                 successMessage.value = "";
//             }, 3000);
//         } else {
//             errorMessage.value = result.error || "Failed to save tokens";
//         }
//     } catch (error) {
//         errorMessage.value = `Error: ${error.message}`;
//     } finally {
//         isSaving.value = false;
//     }
// };

const close = () => {
    emit("close");
};
</script>
