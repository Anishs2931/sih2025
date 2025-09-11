const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable fast refresh
config.resolver.unstable_enablePackageExports = true;

// Configure watchman for better file watching
config.watchFolders = [__dirname];

module.exports = config;
