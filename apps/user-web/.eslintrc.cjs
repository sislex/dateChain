module.exports = {
  extends: [require.resolve("@datechain/config/eslint/react")],
  parserOptions: { project: null },
  env: { browser: true },
  overrides: [
    {
      files: ["**/*.test.tsx", "**/*.test.ts", "**/setup-tests.ts"],
      rules: { "import/no-extraneous-dependencies": "off" },
    },
  ],
};
