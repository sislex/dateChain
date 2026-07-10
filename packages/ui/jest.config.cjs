const base = require("@datechain/config/jest/react");

module.exports = {
  ...base,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
