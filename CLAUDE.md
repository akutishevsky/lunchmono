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
- Started automatically when Electron initializes (main.js:48-60)
- Runs on `http://localhost:3000` (configurable via `SERVER_PORT` constant)
- Port exposed to renderer via IPC handler `get-base-url`
- Cleaned up on app quit via `before-quit` event
- CORS enabled for renderer process communication
- API endpoints:
  - `/` - Health check
  - `/monobank/client-info` - Fetch Monobank account information
  - `/monobank/transactions/:account/:from/:to` - Fetch account transactions

### Vue Architecture

The renderer uses Vue 3 with the following component hierarchy:
- `App.vue` → `Main.vue` → Five main sections:
  - `ControlPanel.vue`: Top-level controls with "Accounts mapping" and "Settings" buttons
  - `SelectDates.vue`: Date range picker (From/To inputs)
  - `SelectAccount.vue`: Account selection dropdown
  - `Sync.vue`: Transaction actions ("Show transactions", "Sync transactions")
  - `Settings.vue`: Modal component for API token configuration (Monobank and Lunch Money)

The Settings modal uses the **container/presentational pattern**: Main.vue manages the modal visibility state (`isSettingsOpen` ref) while Settings.vue is a presentational component that receives `isOpen` prop and emits a `close` event. The modal is triggered by the Settings button in ControlPanel.vue via event emission.

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

### DevTools
DevTools can be opened during development. Remove auto-open for production builds.

### Server Lifecycle
The Hono server lifecycle is tightly coupled to Electron:
- `app.whenReady()` triggers server start
- `app.on('before-quit')` triggers server cleanup
- Failure to start server logs error but doesn't prevent app launch

### Component State
Components use Vue 3's Composition API with `<script setup>`:
- **Main.vue**: Manages modal visibility state using `ref(false)` for the Settings modal
- **ControlPanel.vue**: Emits custom events (`open-settings`) to parent component
- **Settings.vue**: Presentational component with props and event emission pattern for managing API tokens (Monobank and Lunch Money)
- **SelectAccount.vue**: Fetches and displays Monobank accounts on mount, sorted by account type

### Token Storage
Sensitive API tokens are securely stored using Electron's `safeStorage` API:
- **Location**: `src/tokenStorage.js` - Dedicated module for token management
- **Encryption**: Uses OS-level encryption (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Storage**: Encrypted tokens stored in electron-store (`config.json`)
- **IPC Communication**: Main process handles encryption/decryption, renderer accesses via IPC
- **Constants**: Token keys defined in `TOKENS` object (`MONO`, `LM`)
- **Migration**: Automatically migrates plain-text tokens to encrypted format on startup

### API Integration
- **Monobank API**: Accessed via embedded Hono server routes
- **Token retrieval**: `getDecryptedToken()` function in tokenStorage.js
- **Error handling**: Proper error messages for missing tokens and API failures
- **Data fetching**: Components use `window.electronAPI.getBaseUrl()` for dynamic server URL

### Styling
Uses Bulma CSS imported globally in `src/renderer.js`. Minimal custom CSS (only Main.vue has a scoped style for full-height container).
