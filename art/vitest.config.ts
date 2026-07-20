import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The corpus sweeps decode ~4,700 images and composite ~2,300 figures each.
    testTimeout: 120_000,
  },
});
