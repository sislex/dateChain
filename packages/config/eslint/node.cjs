/** ESLint config for Node/NestJS backend packages. */
module.exports = {
  extends: [require.resolve("./base.cjs")],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // NestJS relies heavily on decorators and DI metadata.
    "@typescript-eslint/no-extraneous-class": "off",
  },
};
