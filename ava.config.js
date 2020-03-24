export default {
  extensions: ["ts", "tsx"],
  files: ["src/**/*.test.{js,jsx,ts,tsx}"],
  require: ["ts-node/register/transpile-only"],
};
