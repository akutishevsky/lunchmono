import { createLogger } from "./logger.js";

const log = createLogger("Utils");

export const getBaseUrl = async () => {
    const baseUrl = await window.electronAPI.getBaseUrl();
    if (!baseUrl) {
        log.error("getBaseUrl: baseUrl not exposed by main process");
        throw new Error("The baseUrl was not exposed by the main process");
    }

    log.debug("getBaseUrl resolved:", baseUrl);
    return baseUrl;
};
