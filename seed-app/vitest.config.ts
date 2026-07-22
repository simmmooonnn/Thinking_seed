import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["bot/**/*.test.ts", "lib/**/*.test.ts"], environment: "node" } });
