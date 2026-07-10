/** ESLint config for React (web + UI-kit) packages. */
module.exports = {
  extends: [
    require.resolve("./base.cjs"),
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  plugins: ["react", "react-hooks", "jsx-a11y"],
  settings: {
    react: { version: "detect" },
  },
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
};
