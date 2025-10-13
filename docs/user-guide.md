# Lunch Mono User Guide

Welcome to Lunch Mono! This guide will walk you through setting up and using the application to sync your Monobank transactions with Lunch Money.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Initial Setup](#initial-setup)
3. [Mapping Accounts](#mapping-accounts)
4. [Syncing Transactions](#syncing-transactions)
5. [Troubleshooting](#troubleshooting)

---

## Getting Started

Lunch Mono is a desktop application that helps you automatically sync your Monobank transactions to Lunch Money for better financial tracking and budgeting.

**Prerequisites:**
- Active Monobank account
- Active Lunch Money account
- API tokens from both services

---

## Initial Setup

### Step 1: Add API Tokens

Before you can use Lunch Mono, you need to configure your API tokens for both Monobank and Lunch Money.

1. **Launch the Application**
   - Open Lunch Mono on your computer

2. **Open Settings**
   - Click the **"Settings"** button in the control panel at the top of the window

3. **Enter Your Monobank API Token**
   - In the "Monobank API Token" field, paste your Monobank API token
   - To get a Monobank token, visit: https://api.monobank.ua/docs/index.html
   - Click "Отримати токен для персонального використання" (Get token for personal use)

4. **Enter Your Lunch Money API Token**
   - In the "Lunch Money API Token" field, paste your Lunch Money API token
   - To get a Lunch Money token, visit: https://my.lunchmoney.app/developers
   - Click "Request new access token"

5. **Save Your Settings**
   - Click the **"Save"** button
   - You'll see a success notification when tokens are saved
   - Your tokens are encrypted and stored securely on your computer

6. **Close Settings**
   - Click the **"Close"** button or click outside the modal

> **Security Note:** Your API tokens are encrypted using your operating system's secure storage (macOS Keychain, Windows Credential Manager, or Linux Secret Service). They never leave your computer.

---

## Mapping Accounts

After setting up your API tokens, you need to map your Monobank accounts to your Lunch Money assets so the application knows where to sync transactions.

### Step 2: Configure Account Mappings

1. **Open Accounts Mapping**
   - Click the **"Accounts mapping"** button in the control panel

2. **Review Your Accounts**
   - The application will automatically fetch:
     - Your Monobank accounts (on the left)
     - Your Lunch Money assets (on the right)
   - Each Monobank account shows its type (e.g., "black", "white") and masked card number

3. **Map Each Account**
   - For each Monobank account you want to sync:
     - Click the dropdown next to the account
     - Select the corresponding Lunch Money asset from the list
   - Example: Map your Monobank "Black card (...1234)" to Lunch Money "Monobank UAH"

4. **Save Your Mappings**
   - Click the **"Save"** button
   - You'll see a success notification when mappings are saved
   - Close the modal by clicking **"Close"** or clicking outside

> **Tip:** You don't have to map all accounts. Only map the accounts you want to sync with Lunch Money.

---

## Syncing Transactions

Now that everything is configured, you can start syncing your transactions!

### Step 3: Select Account and Date Range

1. **Choose a Monobank Account**
   - Use the **"Select account"** dropdown to choose which Monobank account to sync
   - The dropdown shows all your available accounts with their card types

2. **Set Date Range**
   - **From date:** Click the "From" field and select the start date for transactions
   - **To date:** Click the "To" field and select the end date for transactions
   - The application will fetch transactions within this date range (inclusive)

> **Important:** Monobank API limits date ranges to a maximum of 31 days. If you need to sync more than 31 days of transactions, you'll need to do it in multiple batches (e.g., sync January 1-31, then February 1-28, etc.).

### Step 4: Preview Transactions

Before syncing, it's a good idea to preview what transactions will be synced.

1. **Show Transactions**
   - Click the **"Show transactions"** button
   - The application will fetch and display all transactions for the selected account and date range

2. **Review the Transaction Table**
   - The table shows:
     - **Date & Time:** When the transaction occurred
     - **Description:** Transaction description from Monobank
     - **MCC:** Merchant Category Code (transaction type)
     - **Amount:** Transaction amount in UAH
       - Green amounts = money received (positive)
       - Red amounts = money spent (negative)
     - **Balance:** Account balance after the transaction

3. **Verify the Data**
   - Check that the transactions look correct
   - Ensure the date range captured the transactions you want

### Step 5: Sync to Lunch Money

Once you've reviewed the transactions and everything looks good:

1. **Sync Transactions**
   - Click the **"Sync transactions"** button
   - The application will:
     - Use your account mappings to determine which Lunch Money asset to sync to
     - Transform the Monobank transactions into Lunch Money format
     - Send the transactions to Lunch Money via the API

2. **Check for Success**
   - You'll see a success notification when the sync completes
   - If there are any errors, an error notification will appear with details

3. **Verify in Lunch Money**
   - Open your Lunch Money account in a web browser
   - Navigate to the Transactions page
   - Verify that your transactions appear correctly

> **Tip:** The sync operation creates new transactions in Lunch Money. If you sync the same date range multiple times, you may create duplicate transactions. Lunch Money has built-in duplicate detection, but it's best to avoid syncing the same transactions repeatedly.

---

## Troubleshooting

### Common Issues

#### "Invalid API token" Error

**Problem:** The application shows an error about invalid API tokens.

**Solution:**
1. Open Settings and verify your tokens are correct
2. Check that you haven't accidentally included extra spaces
3. Generate new tokens from Monobank and Lunch Money if needed
4. Save the tokens again

#### "No account mapping found" Error

**Problem:** When syncing, you get an error about missing account mapping.

**Solution:**
1. Open Accounts Mapping
2. Ensure you've mapped the account you're trying to sync
3. Save the mappings
4. Try syncing again

#### "Date range too large" Error

**Problem:** You get an error about the date range being too large.

**Solution:**
1. Monobank API limits date ranges to 31 days maximum
2. Reduce your date range to 31 days or less
3. If you need more than 31 days, sync in multiple batches

#### Accounts Not Loading

**Problem:** Accounts don't appear in the dropdown or mapping screen.

**Solution:**
1. Verify your API tokens are correct in Settings
2. Check your internet connection
3. Restart the application
4. Check if Monobank or Lunch Money APIs are experiencing downtime

#### Transactions Not Appearing

**Problem:** Transaction table is empty after clicking "Show transactions".

**Solution:**
1. Verify you selected the correct account
2. Check that the date range is correct (From date should be before To date)
3. Ensure the date range is 31 days or less
4. Ensure there are actually transactions in that account for that date range
5. Try a wider date range (but still within 31 days)

#### Sync Fails

**Problem:** Sync button returns an error.

**Solution:**
1. Ensure you've completed account mapping for the selected account
2. Check that transactions were loaded (click "Show transactions" first)
3. Verify your Lunch Money API token has write permissions
4. Check error message for specific details

---

## Best Practices

1. **Regular Syncing:** Sync your transactions regularly (daily or weekly) to keep your Lunch Money data up to date

2. **Date Ranges:** Use reasonable date ranges within the 31-day limit. For syncing historical data, work backwards in 30-day chunks

3. **Preview First:** Always click "Show transactions" before "Sync transactions" to verify the data

4. **Backup Tokens:** Keep a backup of your API tokens in a secure location (password manager) in case you need to reconfigure

5. **Check for Duplicates:** After syncing, check Lunch Money for duplicate transactions and remove them if necessary

6. **Batch Processing:** If you need to sync several months of data, do it systematically:
   - Start with the oldest month
   - Sync 30 days at a time
   - Verify each batch before moving to the next

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the application logs for detailed error messages
2. Verify both Monobank and Lunch Money APIs are operational
3. Try restarting the application
4. Regenerate your API tokens if authentication issues persist

---

**Happy budgeting with Lunch Mono! 🚀**
