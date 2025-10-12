<template>
    <div class="block">
        <h3 class="title is-5">1️⃣ Select dates</h3>
        <div class="box">
            <div class="columns">
                <div class="column">
                    <div class="control">
                        <div class="label">From</div>
                        <input
                            class="input is-primary is-fullwidth"
                            type="date"
                            name="from"
                            v-model="dateFrom"
                        />
                    </div>
                </div>
                <div class="column">
                    <div class="control">
                        <div class="label">To</div>
                        <input
                            class="input is-primary is-fullwidth"
                            type="date"
                            name="to"
                            v-model="dateTo"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from "vue";

// Create reactive models - defaults will be set in onMounted
const dateFrom = defineModel("dateFrom", {
    type: String,
    default: ""
});

const dateTo = defineModel("dateTo", {
    type: String,
    default: ""
});

// Format dates as YYYY-MM-DD for HTML5 date input
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Get the first day of the current month
const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

// Get the last day of the current month
const getLastDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
};

// Set default values only if parent hasn't provided values
onMounted(() => {
    if (!dateFrom.value) {
        dateFrom.value = formatDate(getFirstDayOfMonth());
    }
    if (!dateTo.value) {
        dateTo.value = formatDate(getLastDayOfMonth());
    }
});
</script>
