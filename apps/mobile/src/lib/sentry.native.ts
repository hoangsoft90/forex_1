/**
 * sentry.native.ts — Sentry error tracking initialization (Android/iOS).
 *
 * DSN is read from EXPO_PUBLIC_SENTRY_DSN env var.
 * If DSN is empty/missing, Sentry is disabled (no-op).
 *
 * IMPORTANT: We do NOT use Sentry.wrap() because it blocks the JS thread
 * on device and causes app to hang on startup. Instead, Sentry.init() runs
 * in background for error capture only. React's built-in error boundary
 * handles crash UI.
 */

import * as SentryLib from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  try {
    SentryLib.init({
      dsn,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      // Enable debug logging in dev only.
      debug: __DEV__,
      // Minimal init — no replay, no heavy integrations to avoid blocking JS thread.
    });
  } catch {
    // Silent fail — Sentry is non-critical.
  }
}

/** Re-export Sentry API for use in _layout.tsx (wrap is no-op — we don't wrap). */
export const Sentry = {
  init: () => {},
  /** No-op: Sentry.wrap() causes app hang on device. Use React ErrorBoundary instead. */
  wrap: (Component: React.ComponentType) => Component,
  captureException: (e: unknown) => {
    try { SentryLib.captureException(e); } catch {}
  },
  captureMessage: (msg: string) => {
    try { SentryLib.captureMessage(msg); } catch {}
  },
  withScope: (fn: (scope: unknown) => void) => {
    try { SentryLib.withScope(fn as any); } catch {}
  },
  setTag: (key: string, value: string) => {
    try { SentryLib.setTag(key, value); } catch {}
  },
  setUser: (user: Record<string, string>) => {
    try { SentryLib.setUser(user); } catch {}
  },
};
