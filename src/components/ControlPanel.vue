<template>
    <div class="block pt-5">
        <div class="box is-flex is-justify-content-space-between">
            <h2 class="title is-2 m-0">Lunch Mono</h2>
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
