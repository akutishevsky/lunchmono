<style scoped>
.main-container {
    height: 100vh;
}
</style>

<template>
    <div class="main-container has-background">
        <div class="container">
            <ControlPanel />
            <SelectDates />
            <SelectAccount />
            <Sync />
        </div>
    </div>
</template>

<script setup>
import ControlPanel from "./ControlPanel.vue";
import SelectDates from "./SelectDates.vue";
import SelectAccount from "./SelectAccount.vue";
import Sync from "./Sync.vue";
</script>
