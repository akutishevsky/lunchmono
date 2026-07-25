import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // These are pure functions with no DOM dependency
        environment: "node",
        include: ["src/**/*.test.js"],
        setupFiles: ["src/scripts/test-setup.js"],
    },
});
