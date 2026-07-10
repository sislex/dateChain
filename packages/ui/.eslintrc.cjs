module.exports = {
  extends: [require.resolve("@datechain/config/eslint/react")],
  parserOptions: {
    project: null,
  },
  overrides: [
    {
      files: ["**/*.stories.tsx", "**/*.test.tsx", ".storybook/**"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
};
