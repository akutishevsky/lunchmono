export const getBaseUrl = async () => {
    const baseUrl = await window.electronAPI.getBaseUrl();
    if (!baseUrl) {
        throw new Error("The baseUrl was not exposed by the main process");
    }

    return baseUrl;
};
