let debugEnabled = false;

export async function initLogger() {
    try {
        const result = await window.electronAPI.loadDebugMode();
        debugEnabled = result.enabled;
    } catch {
        debugEnabled = false;
    }
}

export function createLogger(tag) {
    const prefix = `[${tag}]`;
    return {
        debug: (...args) => debugEnabled && console.log(prefix, ...args),
        warn: (...args) => debugEnabled && console.warn(prefix, ...args),
        error: (...args) => debugEnabled && console.error(prefix, ...args),
    };
}
