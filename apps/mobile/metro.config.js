// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Sentry metro plugin for source map uploads — only apply on native builds.
// On web it crashes because @sentry/react-native has native deps.
if (process.env.PLATFORM !== 'web') {
  try {
    const { withSentryConfig } = require('@sentry/react-native/metro');
    module.exports = withSentryConfig(config);
  } catch {
    module.exports = config;
  }
} else {
  module.exports = config;
}
