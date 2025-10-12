<style scoped>
.main-container {
    height: 100vh;
}
</style>

<template>
    <div class="main-container has-background">
        <div class="container">
            <ControlPanel @open-settings="openSettings" />
            <SelectDates />
            <SelectAccount v-model="selectedAccount" />
            <Sync />
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

import { ref } from "vue";

const isSettingsOpen = ref(false);
const selectedAccount = ref("");

const openSettings = () => {
    isSettingsOpen.value = true;
};

const closeSettings = () => {
    isSettingsOpen.value = false;
};
</script>
