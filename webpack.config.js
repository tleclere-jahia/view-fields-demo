const path = require('path');
const {ModuleFederationPlugin} = require('webpack').container;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const getModuleFederationConfig = require('@jahia/webpack-config/getModuleFederationConfig');
const packageJson = require('./package.json');

module.exports = (env, argv) => ({
    entry: {},
    output: {
        path: path.resolve(__dirname, 'src/main/resources/javascript/apps/'),
        publicPath: 'auto',
        chunkFilename: '[name].view-fields-demo.[chunkhash:6].js',
        clean: true
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
    plugins: [
        new ModuleFederationPlugin(getModuleFederationConfig(packageJson)),
        // The app shell reads the remotes of the module from javascript/apps/package.json
        new CopyWebpackPlugin({patterns: [{from: './package.json', to: ''}]})
    ]
});
