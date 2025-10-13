<style scoped>
img {
    width: 5rem;
    height: auto;
}
</style>

<template>
    <div class="block pt-5">
        <div class="box is-flex is-justify-content-space-between">
            <div><img src="/icon.png" alt="Lunch Mono icon" /></div>
            <div class="buttons is-right">
                <button class="button" @click="openAccountsMapping">
                    💳 Accounts mapping
                </button>
                <button @click="openSettings" class="button">
                    ⚙️ Settings
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
const emit = defineEmits(["open-settings", "open-accounts-mapping"]);

const openSettings = () => {
    emit("open-settings");
};

const openAccountsMapping = () => {
    emit("open-accounts-mapping");
};
</script>
