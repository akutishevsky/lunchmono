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
                <div class="field">
                    <label class="label">Monobank API Token</label>
                    <div class="control has-icons-right">
                        <input
                            v-model="monobankToken"
                            id="input-token-mono"
                            class="input"
                            :type="showMonobankToken ? 'text' : 'password'"
                            placeholder="Monobank API Token"
                        />
                        <span
                            class="icon is-small is-right"
                            style="pointer-events: auto; cursor: pointer"
                            @click="showMonobankToken = !showMonobankToken"
                        >
                            <span>{{ showMonobankToken ? "🙈" : "👁️" }}</span>
                        </span>
                    </div>
                </div>
                <div class="field">
                    <label class="label">Lunch Money Access Token</label>
                    <div class="control has-icons-right">
                        <input
                            v-model="lunchMoneyToken"
                            id="input-token-lm"
                            class="input"
                            :type="showLunchMoneyToken ? 'text' : 'password'"
                            placeholder="Lunch Money Access Token"
                        />
                        <span
                            class="icon is-small is-right"
                            style="pointer-events: auto; cursor: pointer"
                            @click="showLunchMoneyToken = !showLunchMoneyToken"
                        >
                            <span>{{ showLunchMoneyToken ? "🙈" : "👁️" }}</span>
                        </span>
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

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
});

const emit = defineEmits(["close", "tokens-saved"]);

const showNotification = inject("showNotification");

// Reactive state for token inputs
const monobankToken = ref("");
const lunchMoneyToken = ref("");
const isSaving = ref(false);

// Visibility toggles for password fields
const showMonobankToken = ref(false);
const showLunchMoneyToken = ref(false);

watch(
    () => props.isOpen,
    (isNowOpen) => {
        if (isNowOpen) {
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
        showNotification(`Error: ${error.message}`, true);
    }
};

const saveTokens = async () => {
    isSaving.value = true;

    try {
        const result = await window.electronAPI.saveTokens({
            monobankToken: monobankToken.value,
            lunchMoneyToken: lunchMoneyToken.value,
        });

        if (result.success) {
            showNotification("Tokens saved successfully!", false);
            emit("tokens-saved"); // Notify parent that tokens were saved
        } else {
            showNotification(result.error || "Failed to save tokens", true);
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
