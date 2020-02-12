module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: ["plugin:@theorem/opinionated"],
  plugins: ["@theorem"],
  rules: {
    "@typescript-eslint/prefer-optional-chain": "off",
    "react-hooks/exhaustive-deps": "off"
  }
};
