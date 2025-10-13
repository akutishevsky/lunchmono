import { safeStorage, app } from "electron";
import Store from "electron-store";
import fs from "node:fs";
import path from "node:path";

export const TOKENS = {
    MONO: "monobankToken",
    LM: "lunchMoneyToken",
};

// Helper to detect and handle corrupted config file from old encryption
const ensureValidConfigFile = () => {
    const configPath = path.join(app.getPath("userData"), "config.json");

    if (fs.existsSync(configPath)) {
        try {
            // Try to read and parse the file
            const content = fs.readFileSync(configPath, "utf8");
            JSON.parse(content);
        } catch (error) {
            // File is corrupted/encrypted with old method, back it up and start fresh
            console.warn(
                "Detected corrupted config file, creating backup and starting fresh...",
            );
            const backupPath = path.join(
                app.getPath("userData"),
                `config.json.backup.${Date.now()}`,
            );
            fs.renameSync(configPath, backupPath);
            console.log(`Old config backed up to: ${backupPath}`);
        }
    }
};

// Ensure config is valid before initializing store
ensureValidConfigFile();

// Initialize electron-store without encryption (we'll use safeStorage instead)
const store = new Store();

/**
 * Encrypts a token using Electron's safeStorage API (OS keychain)
 * @param {string} token - Plain text token to encrypt
 * @returns {string} Base64-encoded encrypted token
 */
export const encryptToken = (token) => {
    if (!token) return "";
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn("Encryption not available, storing token in plain text");
        return token;
    }
    const encrypted = safeStorage.encryptString(token);
    return encrypted.toString("base64");
};

/**
 * Decrypts a token using Electron's safeStorage API
 * @param {string} encryptedToken - Base64-encoded encrypted token
 * @returns {string} Plain text token
 */
export const decryptToken = (encryptedToken) => {
    if (!encryptedToken) return "";
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn("Encryption not available, returning token as-is");
        return encryptedToken;
    }
    try {
        const buffer = Buffer.from(encryptedToken, "base64");
        return safeStorage.decryptString(buffer);
    } catch (error) {
        console.error("Failed to decrypt token:", error);
        return "";
    }
};

/**
 * Get a decrypted token from storage
 * @param {string} tokenName - Name of the token to retrieve
 * @returns {string} Decrypted token value
 */
export const getDecryptedToken = (tokenName) => {
    const encryptedToken = store.get(tokenName, "");
    return decryptToken(encryptedToken);
};

/**
 * Save tokens to encrypted storage
 * @param {Object} tokens - Object containing token key-value pairs
 * @returns {Object} Result with success status
 */
export const saveTokens = (tokens) => {
    try {
        const encryptedMonobank = encryptToken(tokens.monobankToken);
        const encryptedLunchMoney = encryptToken(tokens.lunchMoneyToken);

        store.set(TOKENS.MONO, encryptedMonobank);
        store.set(TOKENS.LM, encryptedLunchMoney);

        return { success: true };
    } catch (error) {
        console.error("Error saving tokens:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Load and decrypt all tokens from storage
 * @returns {Object} Result with decrypted tokens
 */
export const loadTokens = () => {
    try {
        const encryptedMonobank = store.get(TOKENS.MONO, "");
        const encryptedLunchMoney = store.get(TOKENS.LM, "");

        return {
            success: true,
            tokens: {
                monobankToken: decryptToken(encryptedMonobank),
                lunchMoneyToken: decryptToken(encryptedLunchMoney),
            },
        };
    } catch (error) {
        console.error("Error loading tokens:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Migration: Re-encrypt any plain-text tokens with safeStorage
 * This should be called once on app startup
 */
export const migrateTokensToSafeStorage = () => {
    try {
        const monobankToken = store.get(TOKENS.MONO, "");
        const lunchMoneyToken = store.get(TOKENS.LM, "");

        // Check if tokens exist and are not already encrypted (base64 check)
        const isBase64 = (str) => {
            try {
                return btoa(atob(str)) === str;
            } catch {
                return false;
            }
        };

        if (monobankToken && !isBase64(monobankToken)) {
            console.log("Migrating Monobank token to safeStorage...");
            store.set(TOKENS.MONO, encryptToken(monobankToken));
        }

        if (lunchMoneyToken && !isBase64(lunchMoneyToken)) {
            console.log("Migrating Lunch Money token to safeStorage...");
            store.set(TOKENS.LM, encryptToken(lunchMoneyToken));
        }
    } catch (error) {
        console.error("Token migration failed:", error);
    }
};

// ===== Account Mappings Storage =====

const ACCOUNT_MAPPINGS_KEY = "accountMappings";

/**
 * Save account mappings between Monobank accounts and Lunch Money assets
 * @param {Object} mappings - Object with monobank account IDs as keys and lunch money asset IDs as values
 * @returns {Object} Result with success status
 */
export const saveAccountMappings = (mappings) => {
    try {
        store.set(ACCOUNT_MAPPINGS_KEY, mappings);
        return { success: true };
    } catch (error) {
        console.error("Error saving account mappings:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Load account mappings from storage
 * @returns {Object} Result with mappings object
 */
export const loadAccountMappings = () => {
    try {
        const mappings = store.get(ACCOUNT_MAPPINGS_KEY, {});
        return {
            success: true,
            mappings: mappings,
        };
    } catch (error) {
        console.error("Error loading account mappings:", error);
        return { success: false, error: error.message, mappings: {} };
    }
};
