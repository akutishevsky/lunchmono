<style scoped>
.main-container {
    min-height: 100vh;
}
</style>

<template>
    <div class="main-container has-background pb-5">
        <div class="container">
            <Notification
                v-if="notificationVisible"
                :message="notificationMessage"
                :is-error="notificationIsError"
                @close="hideNotification"
            />
            <ControlPanel
                @open-settings="openSettings"
                @open-accounts-mapping="openAccountsMapping"
            />
            <SelectDates
                v-model:date-from="dateFrom"
                v-model:date-to="dateTo"
            />
            <SelectAccount ref="selectAccountRef" v-model="selectedAccount" />
            <Sync
                ref="syncRef"
                :selected-account="selectedAccount"
                :date-from="dateFrom"
                :date-to="dateTo"
            />
        </div>
        <AccountsMapping
            :is-open="isAccountsMappingOpen"
            @close="closeAccountsMapping"
            @mappings-saved="onMappingsSaved"
        />
        <Settings
            :is-open="isSettingsOpen"
            @close="closeSettings"
            @tokens-saved="onTokensSaved"
        />
    </div>
</template>

<script setup>
import ControlPanel from "./ControlPanel.vue";
import SelectDates from "./SelectDates.vue";
import SelectAccount from "./SelectAccount.vue";
import Sync from "./Sync.vue";
import AccountsMapping from "./AccountsMapping.vue";
import Settings from "./Settings.vue";
import Notification from "./Notification.vue";

import { ref, provide } from "vue";

const isAccountsMappingOpen = ref(false);
const isSettingsOpen = ref(false);
const selectedAccount = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const selectAccountRef = ref(null);
const syncRef = ref(null);

// Notification state
const notificationVisible = ref(false);
const notificationMessage = ref("");
const notificationIsError = ref(false);

const openAccountsMapping = () => {
    isAccountsMappingOpen.value = true;
};

const closeAccountsMapping = () => {
    isAccountsMappingOpen.value = false;
};

const openSettings = () => {
    isSettingsOpen.value = true;
};

const closeSettings = () => {
    isSettingsOpen.value = false;
};

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {boolean} isError - Whether this is an error (red) or success (green) notification
 */
const showNotification = (message, isError = false) => {
    notificationMessage.value = message;
    notificationIsError.value = isError;
    notificationVisible.value = true;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        notificationVisible.value = false;
    }, 10000);
};

const hideNotification = () => {
    notificationVisible.value = false;
};

const onTokensSaved = async () => {
    // Refresh accounts after tokens are saved
    if (selectAccountRef.value) {
        await selectAccountRef.value.refreshAccounts();
    }
};

const onMappingsSaved = async () => {
    // Refresh mappings in Sync component after saving
    if (syncRef.value) {
        await syncRef.value.refreshMappings();
    }
};

// Provide notification function to all child components
provide("showNotification", showNotification);
</script>
