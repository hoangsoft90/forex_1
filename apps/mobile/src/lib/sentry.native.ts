/**
 * sentry.native.ts — Sentry error tracking initialization (Android/iOS).
 *
 * DSN is read from EXPO_PUBLIC_SENTRY_DSN env var (set in .env or build env).
 * If DSN is empty/missing, Sentry is disabled (no-op) — safe for dev/test.
 *
 * Features enabled:
 * - Error monitoring (crashes, unhandled exceptions)
 * - Performance tracing (sample rate configurable)
 * - Session replay on errors
 *
 * Source maps are auto-uploaded via @sentry/react-native/metro plugin
 * when SENTRY_AUTH_TOKEN is set during build.
 */

import * as SentryLib from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  SentryLib.init({
    dsn,
    // TracesSampleRate: 1.0 = capture 100% of transactions (dev/beta).
    // Lower to 0.1–0.2 for production to reduce cost.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Session replay: capture replays for all errors + 10% of sessions.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    integrations: [SentryLib.mobileReplayIntegration()],
    // Enable debug logging in dev only.
    debug: __DEV__,
  });
}

/** Re-export Sentry API for use in _layout.tsx (Sentry.wrap). */
export const Sentry = SentryLib;
