import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // Cast: the workspace hoists two vite copies (vitest's rolldown-vite at the
  // root, plugin-react's vite here) whose Plugin types aren't identical.
  plugins: [react() as never],
  // Next's tsconfig has jsx:"preserve", which vitest's esbuild would pass
  // through untransformed — force the automatic runtime instead.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", ".next/**"],
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    // Mirror tsconfig's "@/*" → "./*"
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
