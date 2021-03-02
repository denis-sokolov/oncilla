module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ["plugin:@theorem/opinionated"],
  ignorePatterns: ["dist"],
  plugins: ["@theorem"],
  rules: {
    // Samples use a lot of imports from inside oncilla
    "@theorem/no-imports-down": "off",
    "@typescript-eslint/prefer-optional-chain": "off",
    "react-hooks/exhaustive-deps": "off",
  },
};
