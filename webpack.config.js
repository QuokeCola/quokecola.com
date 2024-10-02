// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './framework/main.ts', // Entry point for the TypeScript file
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'lib'),
        clean: true
    },
    resolve: {
        extensions: ['.ts', '.js'], // Resolve both .ts and .js extensions
    },
    module: {
        rules: [
            {
                test: /\.ts$/, // Apply this rule to .ts files
                use: 'ts-loader', // Use ts-loader to transpile TypeScript
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index_template.html', // Path to your HTML file template
            filename: '../index.html',
            inject: 'body', // Inject scripts at the bottom of the body
        }),
    ],
    optimization: {
        splitChunks: {
            chunks: 'all',
            minSize: 30000, // Set a lower minimum chunk size
            maxSize: 200000, // Set a smaller maximum chunk size
            automaticNameDelimiter: '-',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: -10
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                },
            },
        },
    },
    performance: {
        maxAssetSize: 244000, // Set the asset size limit to 250KiB
    },
    mode: 'production',
};
