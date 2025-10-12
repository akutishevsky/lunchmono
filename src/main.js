import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { startServer, stopServer } from "./server/app.js";
import {
    saveTokens,
    loadTokens,
    migrateTokensToSafeStorage,
} from "./tokenStorage.js";

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(
            path.join(
                __dirname,
                `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
            ),
        );
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    // Migrate any existing plain-text tokens
    migrateTokensToSafeStorage();

    // Start Hono server
    try {
        await startServer(3000);
    } catch (error) {
        console.error("Failed to start server:", error);
    }

    createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// Clean up server when app is about to quit
app.on("before-quit", () => {
    stopServer();
});

// IPC handlers for token storage
ipcMain.handle("save-tokens", async (event, tokens) => {
    return saveTokens(tokens);
});

ipcMain.handle("load-tokens", async () => {
    return loadTokens();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
