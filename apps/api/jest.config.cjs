const base = require("@datechain/config/jest/node");

module.exports = {
  ...base,
  rootDir: "src",
  moduleNameMapper: {
    // Resolve the workspace types package to its TS source so ts-jest (CommonJS)
    // can transform it instead of choking on the ESM dist build.
    "^@datechain/types$": "<rootDir>/../../../packages/types/src/index.ts",
  },
};
