const webpack = require("webpack");
const path = require("path");
const { merge } = require("webpack-merge");
const webpackConfigBase = require("./webpack.base.config.js");
const openBrowserPlugin = require('open-browser-webpack-plugin');

const webpackConfigDev = {
    mode: 'development',
    plugins: [
        new webpack.DefinePlugin({
            'API_HOST': '""'
        }),
        new openBrowserPlugin({ url: "http://localhost:8018" })
    ],
    devServer: {
        historyApiFallback: true,
        contentBase: path.join(__dirname, "../public"),
        hot: true,
        host: '0.0.0.0',
        inline: true,
        port: 8018,
        proxy: {
          "/direction": {
            target: "http://192.168.43.47:8089",
            changeOrigin: true,
            pathRewrite: {
              "^/direction": "/direction/",
            },
          },
        },
    }
}
module.exports = merge(webpackConfigBase, webpackConfigDev);