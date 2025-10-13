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
            <ControlPanel @open-settings="openSettings" />
            <SelectDates
                v-model:date-from="dateFrom"
                v-model:date-to="dateTo"
            />
            <SelectAccount v-model="selectedAccount" />
            <Sync
                :selected-account="selectedAccount"
                :date-from="dateFrom"
                :date-to="dateTo"
            />
        </div>
        <Settings :is-open="isSettingsOpen" @close="closeSettings" />
    </div>
</template>

<script setup>
import ControlPanel from "./ControlPanel.vue";
import SelectDates from "./SelectDates.vue";
import SelectAccount from "./SelectAccount.vue";
import Sync from "./Sync.vue";
import Settings from "./Settings.vue";
import Notification from "./Notification.vue";

import { ref, provide } from "vue";

const isSettingsOpen = ref(false);
const selectedAccount = ref("");
const dateFrom = ref("");
const dateTo = ref("");

// Notification state
const notificationVisible = ref(false);
const notificationMessage = ref("");
const notificationIsError = ref(false);

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

// Provide notification function to all child components
provide("showNotification", showNotification);
</script>
