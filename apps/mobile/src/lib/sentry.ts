/**
 * sentry.ts — Web stub for Sentry error tracking.
 *
 * @sentry/react-native is native-only. On web, export no-op equivalents
 * so _layout.tsx can use Sentry.wrap() without platform checks.
 */

const noOp = () => ({});

export const Sentry = {
  init: () => {},
  wrap: (Component: React.ComponentType) => Component,
  captureException: () => {},
  captureMessage: () => {},
  withScope: (fn: (scope: unknown) => void) => fn({}),
  setTag: () => {},
  setUser: () => {},
};
