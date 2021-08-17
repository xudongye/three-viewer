const webpack = require("webpack");
const path = require("path");
const webpackConfigBase = require("./webpack.base.config.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { merge } = require("webpack-merge");
const webpackConfigProd = {
    mode: "production",
    plugins:[
        new  CleanWebpackPlugin()
    ],
    devtool: "nosources-source-map"
};

module.exports = merge(webpackConfigBase, webpackConfigProd);