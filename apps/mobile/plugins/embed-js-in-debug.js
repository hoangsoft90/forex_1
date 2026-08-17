// embed-js-in-debug.js
//
// Expo config plugin: embed the JS bundle into the DEBUG APK.
//
// Why: `./gradlew assembleDebug` produces an APK that tries to load the JS
// bundle from the Metro dev server (localhost:8081). On a real phone without
// Metro running, the app starts then dies with:
//
//   Unable to load script. Make sure you're running Metro or that your bundle
//   'index.android.bundle' is packaged correctly for release.
//
// Setting `debuggableVariants = []` in the generated app/build.gradle `react {}`
// block makes EVERY variant (including debug) bundle the JS inside the APK, so
// the app runs standalone on any device (no Metro, no `adb reverse` needed).
//
// NOTE for RN 0.86 / Expo SDK 57: the old `bundleInDebug = true` property was
// REMOVED from ReactExtension — gradle fails with:
//   Could not set unknown property 'bundleInDebug' for extension 'react'
// The modern equivalent is `debuggableVariants` (default ['debug',
// 'debugOptimized'] — variants in that list are NOT bundled). Empty list = all
// variants get bundled. Verified in:
//   node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/
//   src/main/kotlin/com/facebook/react/ReactExtension.kt
//
// Usage:
//   1. Register in app.json:
//      "plugins": [ "./plugins/embed-js-in-debug" ]
//   2. Commit + push; prebuild applies it on every CI run.

const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withEmbedJsInDebug(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    // Guard on our own marker comment, NOT on 'debuggableVariants' — the
    // generated build.gradle already ships commented debuggableVariants
    // examples (e.g. `// debuggableVariants = ["liteDebug", "prodDebug"]`),
    // so checking that string would make this plugin a no-op on every run.
    if (contents.includes('// bundle JS into the debug APK')) return config;

    // Insert debuggableVariants = [] inside the react { } block so the debug
    // APK embeds the JS bundle and runs without the Metro dev server.
    const updated = contents.replace(
      /react\s*\{/,
      'react {\n        // bundle JS into the debug APK so it runs standalone without Metro (added by embed-js-in-debug)\n        // RN 0.86 removed bundleInDebug; empty debuggableVariants = every variant (incl. debug) gets bundled\n        debuggableVariants = []'
    );

    if (updated === contents) {
      throw new Error('embed-js-in-debug: could not find "react {" block in app/build.gradle');
    }

    config.modResults.contents = updated;
    return config;
  });
};
