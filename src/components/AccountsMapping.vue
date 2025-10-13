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
                                <select
                                    v-model="
                                        accountMappings[monobankAccount.id]
                                    "
                                >
                                    <option value="">None</option>
                                    <option
                                        v-for="lunchMoneyAsset in lunchMoneyAssets"
                                        :key="lunchMoneyAsset.id"
                                        :value="lunchMoneyAsset.id"
                                    >
                                        {{ lunchMoneyAsset.display_name }} •
                                        {{ lunchMoneyAsset.currency }} •
                                        {{ lunchMoneyAsset.institution_name }} •
                                        {{ lunchMoneyAsset.balance }}
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
                        @click="saveMappings"
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
const lunchMoneyAssets = ref([]);
const accountMappings = ref({});

const emit = defineEmits(["close"]);
const showNotification = inject("showNotification");

watch(
    () => props.isOpen,
    async (isNowOpen) => {
        if (isNowOpen) {
            await loadMappings();
            await setMonobankAccounts();
            await setLunchMoneyAssets();
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
        const result = await response.json();

        if (!response.ok) {
            showNotification(
                result.error || "Failed to fetch client info",
                true,
            );
            return;
        }

        // Ensure accounts exist and have valid data
        const accountsData = result.accounts || [];

        // Sort accounts by type in ascending order (with null safety)
        monobankAccounts.value = accountsData.sort((a, b) => {
            const typeA = a?.type || "";
            const typeB = b?.type || "";
            return typeA.localeCompare(typeB);
        });
    } catch (error) {
        showNotification(`Error fetching accounts: ${error}`, true);
        monobankAccounts.value = [];
    }
};

const setLunchMoneyAssets = async () => {
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            showNotification("Base URL is not available", true);
            return;
        }

        const response = await fetch(`${baseUrl}/lunchmoney/assets`);
        const result = await response.json();

        if (!response.ok) {
            showNotification(
                result.error || "Failed to fetch Lunch Money Assets",
                true,
            );
            return;
        }

        const assets = result.assets || [];

        lunchMoneyAssets.value = assets;
    } catch (error) {
        showNotification(`Error fetching assets: ${error}`, true);
        lunchMoneyAssets.value = [];
    }
};

/**
 * Load account mappings from electron storage
 */
const loadMappings = async () => {
    try {
        const result = await window.electronAPI.loadAccountMappings();

        if (result.success) {
            accountMappings.value = result.mappings;
        } else {
            showNotification(
                result.error || "Failed to load account mappings",
                true,
            );
        }
    } catch (error) {
        showNotification(`Error loading mappings: ${error.message}`, true);
    }
};

/**
 * Save account mappings to electron storage
 */
const saveMappings = async () => {
    isSaving.value = true;

    try {
        // Convert reactive proxy to plain object for IPC transmission
        const plainMappings = JSON.parse(JSON.stringify(accountMappings.value));

        const result =
            await window.electronAPI.saveAccountMappings(plainMappings);

        if (result.success) {
            showNotification("Account mappings saved successfully!", false);
        } else {
            showNotification(
                result.error || "Failed to save account mappings",
                true,
            );
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, true);
    } finally {
        isSaving.value = false;
    }
};

const close = () => {
    emit("close");
};
</script>
