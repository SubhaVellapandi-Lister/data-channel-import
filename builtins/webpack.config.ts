import { resolve } from 'path';

import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { Configuration, } from 'webpack';

const config: Configuration = {
    entry: {
        ['ss-dc-Builtins/index']: './src/index.ts'
    },
    // Open question on whether to set aws-sdk to external.
    // Doing so reduces the bundle size, but theburningmonk says cold start times are actually better when you include it.
    output: {
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        path: resolve(__dirname, 'build'),
    },
    // Set to `development` for debugging purposes if needed.
    mode: 'production',
    module: {
        rules: [{ test: /\.ts$/, loader: 'ts-loader' }],
    },
    resolve: {
        extensions: ['.js', '.ts'],
    },
    target: 'node',
    plugins: [
        new CopyWebpackPlugin({
            patterns: ['ss-dc-Builtins'].map((fn) => ({ from: 'config', to: `${fn}/config` })),
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_fnames: /AbortSignal/,
                },
            }),
        ],
    }

};

export default config;
