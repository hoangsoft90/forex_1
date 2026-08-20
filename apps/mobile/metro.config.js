// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Sentry metro plugin for source map uploads — only in CI where SENTRY_AUTH_TOKEN is set.
// Disabled locally & on web to avoid bundle crashes.
if (process.env.SENTRY_AUTH_TOKEN && process.env.PLATFORM !== 'web') {
  try {
    const { withSentryConfig } = require('@sentry/react-native/metro');
    module.exports = withSentryConfig(config);
  } catch {
    module.exports = config;
  }
} else {
  module.exports = config;
}
