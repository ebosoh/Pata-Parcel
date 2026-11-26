/**
 * Error reporting utility for the React error boundary.
 * Reports errors to the console; extend this to plug in Sentry or similar.
 */
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error("[ErrorBoundary]", message, { context, stack });
}
