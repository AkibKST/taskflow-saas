import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount rendered components between tests (auto-cleanup needs test globals,
// which we keep disabled).
afterEach(() => {
  cleanup();
});
