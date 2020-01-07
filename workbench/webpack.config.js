"use strict";

const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = async function() {
  return {
    devtool: "eval",
    entry: {
      main: [path.resolve(__dirname, "./client.js")]
    },
    mode: "development",
    performance: { hints: false },
    plugins: [new HtmlWebpackPlugin({})],
    stats: "minimal"
  };
};
