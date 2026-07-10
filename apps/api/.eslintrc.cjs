module.exports = {
  extends: [require.resolve("@datechain/config/eslint/node")],
  parserOptions: {
    project: null,
  },
  rules: {
    // NestJS DI + decorators legitimately use parameter properties and empty ctors.
    "@typescript-eslint/no-useless-constructor": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.ts", "test/**/*.ts"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
};
