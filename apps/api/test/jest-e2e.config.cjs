/** E2E test config: runs *.e2e-spec.ts against real containers (Testcontainers). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  testRegex: "test/.*\\.e2e-spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testTimeout: 180000,
  // Testcontainers keeps a docker socket handle open; close the app + stop
  // containers in afterAll, then force-exit so the runner terminates promptly.
  forceExit: true,
};
