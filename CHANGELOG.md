# Changelog

All notable changes to Lunch Mono will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-07-25

### Fixed

- **Currency Exchange Amounts** - Cross-currency transactions were imported with the wrong amount. The payload sent Monobank's *operation* currency as the transaction currency while the amount was in the *account's* currency, so Lunch Money re-converted it using its own daily exchange rate instead of the rate Monobank actually applied. Selling USD from a FOP account left a residual balance on the FOP UAH account and credited the destination card the wrong amount. Transactions are now always posted in the account's own currency, at Monobank's real rate
- **Date Range Boundaries** - The "From" date was parsed as UTC midnight, which is 03:00 in Kyiv, so transactions made in the first three hours of that day were silently never fetched
- **Transaction Dates** - Dates were formatted in UTC, so a transaction at 00:30 local time was recorded in Lunch Money as the previous day. Both the range and the recorded date now use local time
- **Stale Transactions After Switching Accounts** - Loaded transactions are now cleared when the account selection changes, instead of being syncable against a different account's currency and asset
- **Unsupported Currencies** - The currency table grew from 4 codes to 32; an unrecognised code previously aborted the entire batch

### Added

- **Account Selection for Auto Import** - Choose which mapped accounts take part in a run, with each account's currency, destination asset and an estimated run time. Since Monobank allows one request per 60 seconds, importing fewer accounts is the only thing that actually shortens a run
- **Currency Mismatch Detection** - A Monobank account mapped to a Lunch Money asset in a different currency is now rejected with an explicit error, and surfaced in the Auto Import account list before any request is spent. Previously it silently corrupted the asset balance
- **Exchange Rate in Notes** - Foreign-currency transactions record the original amount and the derived rate in the transaction notes, which Lunch Money has no dedicated field for
- **Unit Tests** - `npm test` runs a vitest suite over the transaction utilities, covering the multi-leg FOP currency-exchange chain and the date boundaries

### Changed

- Auto Import waits out the remainder of the Monobank rate limit measured from the last request, rather than restarting a flat 60 seconds after every account. Time spent syncing to Lunch Money now counts towards the window, the last account costs nothing, and a cooldown left over from a previous run is honoured
- Loaded accounts persist between Auto Import runs, so starting a new import does not spend another rate-limited request
- The FOP account special-case in amount handling was removed; it was compensating for the currency bug and is no longer needed
- The server health endpoint reports the real application version instead of a hardcoded `1.0.0`

### Notes

- Transactions imported before this release are **not** corrected automatically. Cross-currency amounts and early-morning dates need re-importing or fixing in the Lunch Money interface
- Re-importing a date range will now include transactions between 00:00 and 03:00 that were previously skipped

## [1.3.1] - 2026-05-31

### Added

- **Debug Mode** - Optional debug logging toggle in Settings, persisted via electron-store, with tagged console output across all components and the server utilities

### Fixed

- **Duplicate Transactions** - Monobank's transaction ID is now used as the Lunch Money `external_id`, preventing the same transaction being inserted twice across repeated syncs
- **Silent Sync Failures** - Lunch Money errors returned with an HTTP 200 status are now detected and reported instead of being treated as success
- **Transaction Date Format** - Dates are sent to Lunch Money in `YYYY-MM-DD` format

### Changed

- README expanded with build instructions
- Dependencies updated

## [1.3.0] - 2026-02-05

### Added

- **Auto Import Feature** - New batch transaction sync that automatically imports transactions from all mapped Monobank accounts to Lunch Money
- **Tabbed Interface** - Switch between Manual Sync and Auto Import modes for flexible transaction management
- **Progress Tracking** - Visual progress indicator showing current account being processed during Auto Import
- **Cancellation Support** - Ability to cancel Auto Import operation mid-process
- **Per-Account Result Reporting** - Detailed summary showing sync results for each account after Auto Import completes

### Changed

- Extracted shared transaction utilities to `transactionUtils.js` for better code reuse between Sync and Auto Import components
- Refactored Sync.vue to use shared utilities
- Auto Import respects Monobank API rate limits with 60-second delays between accounts

## [1.2.0] - 2025-11-05

### Added

- **API Rate Limit Visualization** - Added black progress bar that fills up over 60 seconds after fetching transactions, providing visual feedback for Monobank API rate limit
- **Request Cooldown Protection** - "Show transactions" button now disables during the 60-second API cooldown period to prevent rate limit errors
- **Dynamic Countdown Tooltip** - Added informative tooltip that displays remaining wait time in seconds when hovering over the disabled button
- **Smooth Progress Updates** - Progress bar increments every second, showing exact time remaining until next API request is allowed

### Improved

- Better user experience with real-time feedback on API rate limits
- Clear visual indication of when the next transaction fetch is available
- Prevents accidental API rate limit violations

## [1.1.0] - 2025-10-14

### Added

- **GBP Currency Support** - Added support for British Pound (GBP) currency in transaction sync and display

## [1.0.1] - 2025-10-13

### Fixed

- **Account Loading on Restart** - Fixed issue where accounts were not loaded on app restart even when API tokens were present
- **Account Mappings Synchronization** - Fixed bug where saved account mappings were not immediately available for transaction sync
- **Asset ID Comparison** - Added type-safe comparison for Lunch Money asset IDs to handle both string and number types correctly
- **Startup Error Messages** - Removed error notifications on first startup when tokens are not yet configured

### Changed

- SelectAccount component now checks for existing tokens on mount and loads accounts automatically if tokens are present
- Sync component now refreshes mappings immediately after they are saved in the Accounts Mapping modal
- Improved silent error handling for better first-time user experience

## [1.0.0] - 2025-10-13

### Added

- **Initial Release** - First stable release of Lunch Mono
- **Electron Desktop Application** - Built with Vue 3, Vite, and Hono embedded server
- **API Integration**
    - Monobank API integration for fetching account information and transactions
    - Lunch Money API integration for managing assets and syncing transactions
- **Secure Token Storage** - API tokens encrypted using OS-level encryption (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Account Mapping System** - Map Monobank accounts to Lunch Money assets for seamless transaction synchronization
- **Transaction Management**
    - View transactions from Monobank accounts within a selected date range
    - Sync transactions to Lunch Money with automatic currency conversion
    - Support for FOP (entrepreneur) accounts with special handling
    - Automatic detection and handling of multi-currency transactions
- **User Interface**
    - Clean, modern interface using Bulma CSS framework
    - Settings modal for configuring API tokens
    - Accounts mapping modal for linking Monobank accounts to Lunch Money assets
    - Real-time server status indicator showing server port
    - Transaction table with color-coded amounts (green for income, red for expenses)
    - Notification system for user feedback (success/error messages)
- **Cross-Platform Support**
    - macOS (Apple Silicon) - ZIP distribution
    - Windows (ARM64) - ZIP distribution
    - Linux (ARM64) - ZIP distribution
- **Custom Application Icon** - Professional branding with custom icon across all platforms

### Technical Features

- **Embedded Hono Server** - HTTP server running inside Electron main process (port 3000)
- **Automatic Token Migration** - Migrates plain-text tokens to encrypted storage on startup
- **Graceful Error Handling** - No startup errors when tokens are missing
- **Reactive Data Flow** - Real-time updates when settings or mappings are saved
- **Type-Safe Asset Comparison** - Handles both string and number asset IDs correctly
- **IPC Security** - Secure communication between renderer and main process using contextBridge

### Developer Experience

- NPM scripts for building across platforms:
    - `npm start` - Development mode with hot reload
    - `npm run make:mac` - Build for macOS
    - `npm run make:win` - Build for Windows
    - `npm run make:linux` - Build for Linux
    - `npm run make:all` - Build for all platforms
- Vite-powered build system for fast development and production builds
- Vue 3 Composition API with `<script setup>` syntax throughout

### Notes

- First-time users should configure API tokens in Settings before using the application
- Account mappings must be set up before syncing transactions
- The embedded server starts automatically and runs on port 3000
- Transaction sync preserves original descriptions and timestamps
- All sensitive data is encrypted and stored locally
