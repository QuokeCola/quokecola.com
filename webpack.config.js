// webpack.config.js
const path = require('path');

module.exports = {
    entry: './framework/main.ts', // Entry point for the TypeScript file
    output: {
        filename: 'main.js', // Output file after bundling
        path: path.resolve(__dirname, 'lib'),
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
    mode: 'production', // Set to 'development' for easier debugging
};
