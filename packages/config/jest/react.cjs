/** Shared Jest preset for React packages (jsdom + ts-jest). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  rootDir: ".",
  testRegex: ".*\\.(test|spec)\\.tsx?$",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.stories.tsx", "!src/**/index.ts"],
  coverageDirectory: "coverage",
};
