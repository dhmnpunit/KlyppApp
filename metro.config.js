// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable bridgeless mode
config.server = {
  ...config.server,
  experimentalBridgeless: false,
};

module.exports = config; 