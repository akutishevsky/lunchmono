# Changelog

All notable changes to Lunch Mono will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/yourusername/lunchmono/releases/tag/v1.0.0
