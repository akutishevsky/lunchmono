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
                    <div class="control">
                        <input
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
                    <button class="button is-success">Save changes</button>
                    <button class="button" @click="close">Cancel</button>
                </div>
            </footer>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
});

const emit = defineEmits(["close"]);

const close = () => {
    emit("close");
};
</script>
