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
                Lorem, ipsum dolor sit amet consectetur adipisicing elit.
                Consectetur libero nisi perferendis facere quam architecto
                doloremque unde placeat. Nemo adipisci, delectus dicta iure enim
                consectetur incidunt dolore harum sunt rem!
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

const isSaving = ref(false);

const emit = defineEmits(["close"]);

// watch(
//     () => props.isOpen,
//     (isNowOpen) => {
//         if (isNowOpen) {
//             // loadTokens();
//         }
//     },
// );

// const loadTokens = async () => {
//     try {
//         const result = await window.electronAPI.loadTokens();

//         monobankToken.value = result.tokens.monobankToken;
//         lunchMoneyToken.value = result.tokens.lunchMoneyToken;
//     } catch (error) {
//         errorMessage.value = `Error: ${error.message}`;
//     }
// };

// const saveTokens = async () => {
//     isSaving.value = true;
//     errorMessage.value = "";
//     successMessage.value = "";

//     try {
//         const result = await window.electronAPI.saveTokens({
//             monobankToken: monobankToken.value,
//             lunchMoneyToken: lunchMoneyToken.value,
//         });

//         if (result.success) {
//             successMessage.value = "Tokens saved successfully!";
//             setTimeout(() => {
//                 successMessage.value = "";
//             }, 3000);
//         } else {
//             errorMessage.value = result.error || "Failed to save tokens";
//         }
//     } catch (error) {
//         errorMessage.value = `Error: ${error.message}`;
//     } finally {
//         isSaving.value = false;
//     }
// };

const close = () => {
    emit("close");
};
</script>
