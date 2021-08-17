const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const devMode = process.env.NODE_ENV !== 'production';
const glob = require('glob');
const WebpackGlsl = require("webpack-glsl-loader");
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        bundle: path.join(__dirname, "../src/app.js")
    },
    output: {
        path: path.join(__dirname, "../build"),
        filename: "[name].js",

    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            name: 'common'
        },
        minimizer: [new TerserPlugin({})]
    },
    resolve: {
        extensions: ['.js', '.jsx', 'json', '.css'],
    },
    performance: {
        hints: false
    },
    module: {
        rules: [{
            test: /\.(js|jsx)?$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader'
        }, {
            test: /\.(scss|sass)$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader']
        }, {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
        }, {
            test: /\.html$/,
            use: [{loader: 'html-loader', options: {minimize: true}}]
        }, {
            test: /\.(ico)$/,
            use: "raw-loader",
        },{
            test:  /\.(eot|ttf|woff|woff2)/,
            loader: 'file-loader?name=fonts/[name].[ext]'
        }, {
            test: /\.(svg|png|jpg|jpeg|gif)$/,
            loader: "file-loader?name=images/[name].[ext]"
        }, {
            test: /\.json$/,
            loader: 'json-loader'
        }, {
            test: /\.glsl$/,
            loader: 'WebpackGlsl'
        }]
    },
    plugins:[
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: path.join(__dirname, "../public/index.html"),
            favicon:"public/favicon/favicon.ico",
        }),
        new MiniCssExtractPlugin({
            filename: devMode ? '[name].css' : '[name].[hash].css',
            chunkFilename: devMode ? '[name].css' : '[name].[hash].css',
        }),
        new CopyPlugin({
            patterns: [
                { from: 'node_modules/three/examples/js/libs/draco', to: 'libs/draco' }
            ]
        })
    ]
}