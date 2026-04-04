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
import { createLogger } from "../scripts/logger.js";

const log = createLogger("AccountsMapping");

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

const emit = defineEmits(["close", "mappings-saved"]);
const showNotification = inject("showNotification");

watch(
    () => props.isOpen,
    async (isNowOpen) => {
        if (isNowOpen) {
            log.debug("Modal opened, loading data...");
            await loadMappings();
            await setMonobankAccounts();
            await setLunchMoneyAssets();
        }
    },
);

const setMonobankAccounts = async () => {
    log.debug("Fetching Monobank accounts...");
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            showNotification("Base URL is not available", true);
            return;
        }

        const response = await fetch(`${baseUrl}/monobank/client-info`);
        const result = await response.json();

        if (!response.ok) {
            log.error("GET /monobank/client-info failed:", result);
            showNotification(
                result.error || "Failed to fetch client info",
                true,
            );
            return;
        }

        log.debug("GET /monobank/client-info response:", result);

        // Ensure accounts exist and have valid data
        const accountsData = result.accounts || [];

        // Sort accounts by type in ascending order (with null safety)
        monobankAccounts.value = accountsData.sort((a, b) => {
            const typeA = a?.type || "";
            const typeB = b?.type || "";
            return typeA.localeCompare(typeB);
        });
        log.debug("Loaded", accountsData.length, "Monobank accounts");
    } catch (error) {
        log.error("Error fetching accounts:", error);
        showNotification(`Error fetching accounts: ${error}`, true);
        monobankAccounts.value = [];
    }
};

const setLunchMoneyAssets = async () => {
    log.debug("Fetching Lunch Money assets...");
    try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
            showNotification("Base URL is not available", true);
            return;
        }

        const response = await fetch(`${baseUrl}/lunchmoney/assets`);
        const result = await response.json();

        if (!response.ok) {
            log.error("GET /lunchmoney/assets failed:", result);
            showNotification(
                result.error || "Failed to fetch Lunch Money Assets",
                true,
            );
            return;
        }

        log.debug("GET /lunchmoney/assets response:", result);

        const assets = result.assets || [];

        lunchMoneyAssets.value = assets;
        log.debug("Loaded", assets.length, "Lunch Money assets");
    } catch (error) {
        log.error("Error fetching assets:", error);
        showNotification(`Error fetching assets: ${error}`, true);
        lunchMoneyAssets.value = [];
    }
};

/**
 * Load account mappings from electron storage
 */
const loadMappings = async () => {
    log.debug("Loading account mappings...");
    try {
        const result = await window.electronAPI.loadAccountMappings();

        if (result.success) {
            accountMappings.value = result.mappings;
            log.debug("Loaded mappings:", Object.keys(result.mappings).length, "mapping(s)");
        } else {
            log.error("Failed to load mappings:", result.error);
            showNotification(
                result.error || "Failed to load account mappings",
                true,
            );
        }
    } catch (error) {
        log.error("Error loading mappings:", error);
        showNotification(`Error loading mappings: ${error.message}`, true);
    }
};

/**
 * Save account mappings to electron storage
 */
const saveMappings = async () => {
    log.debug("Saving account mappings...");
    isSaving.value = true;

    try {
        // Convert reactive proxy to plain object for IPC transmission
        const plainMappings = JSON.parse(JSON.stringify(accountMappings.value));

        const result =
            await window.electronAPI.saveAccountMappings(plainMappings);

        if (result.success) {
            log.debug("Mappings saved successfully");
            showNotification("Account mappings saved successfully!", false);
            emit("mappings-saved"); // Notify parent that mappings were saved
        } else {
            log.error("Failed to save mappings:", result.error);
            showNotification(
                result.error || "Failed to save account mappings",
                true,
            );
        }
    } catch (error) {
        log.error("Error saving mappings:", error);
        showNotification(`Error: ${error.message}`, true);
    } finally {
        isSaving.value = false;
    }
};

const close = () => {
    emit("close");
};
</script>
