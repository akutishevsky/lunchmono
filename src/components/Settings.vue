<template>
    <div class="modal" :class="{ 'is-active': isOpen }">
        <div class="modal-background" @click="close"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Settings</p>
                <button
                    class="delete"
                    aria-label="close"
                    @click="close"
                ></button>
            </header>
            <section class="modal-card-body">
                <div v-if="errorMessage" class="notification is-danger">
                    {{ errorMessage }}
                </div>
                <div v-if="successMessage" class="notification is-success">
                    {{ successMessage }}
                </div>
                <div class="field">
                    <label class="label">Monobank API Token</label>
                    <div class="control">
                        <input
                            v-model="monobankToken"
                            id="input-token-mono"
                            class="input"
                            type="text"
                            placeholder="Monobank API Token"
                        />
                    </div>
                </div>
                <div class="field">
                    <label class="label">Lunch Money Access Token</label>
                    <div class="control">
                        <input
                            v-model="lunchMoneyToken"
                            id="input-token-lm"
                            class="input"
                            type="text"
                            placeholder="Lunch Money Access Token"
                        />
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
import { ref, watch } from "vue";

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
});

const emit = defineEmits(["close"]);

// Reactive state for token inputs
const monobankToken = ref("");
const lunchMoneyToken = ref("");
const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

watch(
    () => props.isOpen,
    (isNowOpen) => {
        if (isNowOpen) {
            clearMessages();
            loadTokens();
        }
    },
);

const loadTokens = async () => {
    try {
        const result = await window.electronAPI.loadTokens();

        monobankToken.value = result.tokens.monobankToken;
        lunchMoneyToken.value = result.tokens.lunchMoneyToken;
    } catch (error) {
        errorMessage.value = `Error: ${error.message}`;
    }
};

const saveTokens = async () => {
    isSaving.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
        const result = await window.electronAPI.saveTokens({
            monobankToken: monobankToken.value,
            lunchMoneyToken: lunchMoneyToken.value,
        });

        if (result.success) {
            successMessage.value = "Tokens saved successfully!";
            setTimeout(() => {
                successMessage.value = "";
            }, 3000);
        } else {
            errorMessage.value = result.error || "Failed to save tokens";
        }
    } catch (error) {
        errorMessage.value = `Error: ${error.message}`;
    } finally {
        isSaving.value = false;
    }
};

const close = () => {
    clearMessages();
    emit("close");
};

const clearMessages = () => {
    errorMessage.value = "";
    successMessage.value = "";
};
</script>
