<template>
    <div
        :class="
            props.isError === true
                ? 'notification is-danger notification-overlay'
                : 'notification is-success notification-overlay'
        "
    >
        <button class="delete" @click="emit('close')"></button>
        {{ props.message }}
    </div>
</template>

<script setup>
const props = defineProps({
    message: {
        type: String,
        default: "",
    },
    isError: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["close"]);
</script>

<style scoped>
.notification-overlay {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    min-width: 300px;
    max-width: 600px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
