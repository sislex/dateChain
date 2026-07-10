/** E2E test config: runs *.e2e-spec.ts against real containers (Testcontainers). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  testRegex: "test/.*\\.e2e-spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    // Resolve the workspace types package to TS source (ts-jest transforms it)
    // instead of the ESM dist build, which CommonJS jest cannot require.
    "^@datechain/types$": "<rootDir>/../../packages/types/src/index.ts",
  },
  testTimeout: 180000,
  // Testcontainers keeps a docker socket handle open; close the app + stop
  // containers in afterAll, then force-exit so the runner terminates promptly.
  forceExit: true,
};
