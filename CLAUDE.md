# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron application called "Lunch Mono" built with Vue 3, Vite, and Hono. The application features a desktop UI for transaction management with an embedded Node.js server running inside the Electron main process.

## Architecture

### Dual Process Structure

The application uses Electron's multi-process architecture:

- **Main Process** (`src/main.js`): Manages the Electron BrowserWindow and lifecycle. Also starts/stops an embedded Hono server on port 3000 when the app launches/quits.
- **Renderer Process** (`src/renderer.js`): Vue 3 application that renders the UI
- **Preload Script** (`src/preload.js`): Secure bridge between main and renderer (standard Electron IPC pattern)

### Embedded Server

The application includes an embedded Hono HTTP server (`src/server/app.js`) that runs in the main process:
- Started automatically when Electron initializes (main.js:52-63)
- Runs on `http://localhost:3000` (configurable via `SERVER_PORT` constant)
- Port exposed to renderer via IPC handler `get-base-url`
- Cleaned up on app quit via `before-quit` event
- CORS enabled for renderer process communication
- **API Routes**: Organized using Hono's routing system
  - **Monobank routes** (`/monobank/*`):
    - `/monobank/client-info` - Fetch Monobank account information
    - `/monobank/transactions/:account/:from/:to` - Fetch account transactions for a date range
  - **Lunch Money routes** (`/lunchmoney/*`):
    - `/lunchmoney/assets` - Fetch Lunch Money assets (bank accounts/credit cards)
    - `/lunchmoney/transactions/:transactions` - Insert transactions into Lunch Money
  - `/` - Health check endpoint

### Vue Architecture

The renderer uses Vue 3 with the following component hierarchy:
- `App.vue` → `Main.vue` → Main sections:
  - `Notification.vue`: Fixed overlay notification component for user feedback (success/error messages)
  - `ControlPanel.vue`: Top-level controls with "Accounts mapping" and "Settings" buttons
  - `SelectDates.vue`: Date range picker (From/To inputs)
  - `SelectAccount.vue`: Account selection dropdown (fetches Monobank accounts on mount)
  - `Sync.vue`: Transaction actions ("Show transactions", "Sync transactions") with transaction table display
  - `AccountsMapping.vue`: Modal for mapping Monobank accounts to Lunch Money assets
  - `Settings.vue`: Modal component for API token configuration (Monobank and Lunch Money)

**Component Patterns**:
- **Container/Presentational Pattern**: Main.vue manages modal visibility state (`isSettingsOpen`, `isAccountsMappingOpen` refs) while modal components (Settings.vue, AccountsMapping.vue) are presentational, receiving `isOpen` props and emitting `close` events
- **Event-driven communication**: ControlPanel.vue emits custom events (`open-settings`, `open-accounts-mapping`) to parent component
- **Dependency Injection**: Main.vue provides `showNotification` function via Vue's `provide/inject` API, allowing all child components to trigger notifications without prop drilling
- **Composition API**: All components use `<script setup>` syntax with reactive refs and lifecycle hooks

All components use Bulma CSS framework for styling.

### Build System

Uses Electron Forge with Vite plugin:
- Three separate Vite configs: `vite.main.config.mjs` (main process), `vite.preload.config.mjs` (preload), `vite.renderer.config.mjs` (renderer with Vue)
- Configured in `forge.config.js` with makers for Windows (Squirrel), macOS (ZIP), and Linux (DEB/RPM)

## Development Commands

```bash
# Start development mode (with hot reload)
npm start

# Package the application (without creating installer)
npm run package

# Create distributable installers for current platform
npm run make

# Publish application (requires publisher config)
npm run publish
```

## Key Implementation Details

### IPC Communication
The preload script exposes the following methods to the renderer via `window.electronAPI`:
- `saveTokens(tokens)` - Save encrypted API tokens
- `loadTokens()` - Load and decrypt API tokens
- `getBaseUrl()` - Get server base URL dynamically
- `onServerReady(callback)` - Listen for server-ready event
- `saveAccountMappings(mappings)` - Save account mappings to storage
- `loadAccountMappings()` - Load account mappings from storage

### DevTools
DevTools can be opened during development. Remove auto-open for production builds.

### Server Lifecycle
The Hono server lifecycle is tightly coupled to Electron:
- `app.whenReady()` triggers server start
- `app.on('before-quit')` triggers server cleanup
- Failure to start server logs error but doesn't prevent app launch

### Component State
Components use Vue 3's Composition API with `<script setup>`:
- **Main.vue**: Manages modal visibility state (`isSettingsOpen`, `isAccountsMappingOpen`), notification state, and provides `showNotification` function to all children via dependency injection
- **ControlPanel.vue**: Emits custom events (`open-settings`, `open-accounts-mapping`) to parent component
- **Settings.vue**: Presentational modal component for managing API tokens (Monobank and Lunch Money)
- **AccountsMapping.vue**: Modal component that fetches Monobank accounts and Lunch Money assets on open, manages account mappings with save/load functionality
- **SelectAccount.vue**: Fetches and displays Monobank accounts on mount, sorted by account type
- **Sync.vue**: Manages transaction display state, fetches transactions from Monobank API based on selected account and date range, displays transactions in a formatted table with color-coded amounts
- **Notification.vue**: Presentational component with fixed overlay positioning, displays success (green) or error (red) messages with close button

### Token Storage & Data Persistence
Sensitive data is securely stored using `src/tokenStorage.js`:

**API Token Storage**:
- **Encryption**: Uses Electron's `safeStorage` API with OS-level encryption (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Storage Backend**: electron-store (`config.json` in user data directory)
- **IPC Communication**: Main process handles encryption/decryption, renderer accesses via IPC
- **Constants**: Token keys defined in `TOKENS` object (`MONO`, `LM`)
- **Migration**: Automatically migrates plain-text tokens to encrypted format on startup
- **Corruption Handling**: Detects and backs up corrupted config files before creating fresh storage

**Account Mappings Storage**:
- **Purpose**: Maps Monobank account IDs to Lunch Money asset IDs for transaction synchronization
- **Storage**: Stored in plain JSON format in electron-store (no encryption needed as these are non-sensitive mapping IDs)
- **Functions**: `saveAccountMappings(mappings)` and `loadAccountMappings()` in tokenStorage.js
- **Data Structure**: Object with Monobank account IDs as keys, Lunch Money asset IDs as values (e.g., `{"account123": "asset456"}`)
- **IPC Handlers**: Exposed to renderer via `save-account-mappings` and `load-account-mappings` IPC channels (main.js:112-118)

### API Integration
The application integrates with two external APIs through the embedded Hono server:

**Monobank API** (`src/server/routes/monobank.js`):
- **Authentication**: Uses decrypted token from `getDecryptedToken(TOKENS.MONO)`
- **Endpoints**: Client info, transaction history with date range filtering
- **Data format**: Returns account details, masked PANs, IBANs, balances, transaction lists
- **Error handling**: Returns proper error messages for missing tokens and API failures

**Lunch Money API** (`src/server/routes/lunchMoney.js`):
- **Authentication**: Uses decrypted token from `getDecryptedToken(TOKENS.LM)`
- **Assets endpoint**: Fetches all assets (bank accounts, credit cards) with balances and institution info
- **Transactions endpoint**: Inserts transactions into Lunch Money (implementation in progress)

**Common Patterns**:
- Components use `getBaseUrl()` utility (`src/scripts/utils.js`) to fetch dynamic server URL via IPC
- All API calls go through the embedded server, keeping sensitive tokens in main process
- Proper error handling with user-friendly notifications via `showNotification` injection

### User Workflow & Data Flow

**Initial Setup**:
1. User clicks "Settings" → enters Monobank and Lunch Money API tokens → tokens encrypted and stored
2. User clicks "Accounts mapping" → system fetches Monobank accounts and Lunch Money assets → user maps accounts → mappings saved to electron-store

**Transaction Synchronization Workflow**:
1. **SelectAccount**: Fetches and displays Monobank accounts on component mount
2. **SelectDates**: User selects date range (From/To)
3. **Sync**:
   - "Show transactions" → fetches transactions from Monobank API → displays in formatted table
   - "Sync transactions" → (implementation in progress) will use account mappings to sync transactions to Lunch Money

**Data Flow Architecture**:
```
User Action → Vue Component (renderer)
          ↓
    fetch() to localhost:3000 (embedded server)
          ↓
    Hono Route Handler (main process)
          ↓
    Token Storage (decrypt token)
          ↓
    External API (Monobank/Lunch Money)
          ↓
    Response back through chain
          ↓
    Component updates UI + shows notification
```

### Styling
Uses Bulma CSS imported globally in `src/renderer.js`. Component-specific styles:
- **Main.vue**: Scoped style for full-height container with background
- **Notification.vue**: Fixed overlay positioning with z-index and centering transforms
