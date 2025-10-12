<template>
    <div class="block">
        <h3 class="title is-5">3️⃣ Sync</h3>
        <div class="box">
            <div class="columns">
                <div class="column">
                    <button
                        class="button is-fullwidth"
                        @click="showTransactions"
                    >
                        📋 Show transactions
                    </button>
                </div>
                <div class="column">
                    <button class="button is-fullwidth">
                        🔄 Sync transactions
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { getBaseUrl } from "../scripts/utils.js";

const props = defineProps({
    selectedAccount: {
        type: String,
        default: "",
    },
    dateFrom: {
        type: String,
        default: "",
    },
    dateTo: {
        type: String,
        default: "",
    },
});

const showTransactions = async () => {
    console.log("Selected Account:", props.selectedAccount);
    console.log("Date From:", props.dateFrom);
    console.log("Date To:", props.dateTo);

    const baseUrl = await getBaseUrl();

    // Convert date strings to Date objects, then to Unix timestamps (seconds)
    const dateFromObj = new Date(props.dateFrom);
    const dateFromTimestamp = Math.floor(dateFromObj.getTime() / 1000);

    // Add 1 day to dateTo to include the entire end date
    const dateToObj = new Date(props.dateTo);
    dateToObj.setDate(dateToObj.getDate() + 1);
    const dateToTimestamp = Math.floor(dateToObj.getTime() / 1000);

    console.log(
        "Fetching transactions from:",
        dateFromTimestamp,
        "to:",
        dateToTimestamp,
    );

    const response = await fetch(
        `${baseUrl}/monobank/transactions/${props.selectedAccount}/${dateFromTimestamp}/${dateToTimestamp}`,
    );

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching transactions:", errorData);
        return;
    }

    const transactions = await response.json();
    console.log("Transactions:", transactions);
};
</script>
