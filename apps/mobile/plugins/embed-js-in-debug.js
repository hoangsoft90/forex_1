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
// Setting `bundleInDebug = true` in the generated app/build.gradle `react {}`
// block makes the debug build bundle the JS inside the APK, so the app runs
// standalone on any device (no Metro, no `adb reverse` needed).
//
// Usage:
//   1. Register in app.json:
//      "plugins": [ "./plugins/embed-js-in-debug" ]
//   2. Commit + push; prebuild applies it on every CI run.

const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withEmbedJsInDebug(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('bundleInDebug')) return config;

    // Insert bundleInDebug = true inside the react { } block so the debug
    // APK embeds the JS bundle and runs without the Metro dev server.
    const updated = contents.replace(
      /react\s*\{/,
      'react {\n        // bundle JS into the debug APK so it runs standalone without Metro (added by embed-js-in-debug)\n        bundleInDebug = true'
    );

    if (updated === contents) {
      throw new Error('embed-js-in-debug: could not find "react {" block in app/build.gradle');
    }

    config.modResults.contents = updated;
    return config;
  });
};
