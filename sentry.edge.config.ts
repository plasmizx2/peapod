// This file configures the Sentry server SDK for Edge functions.
// It is loaded on the server only and should not be included in browser bundles.
// It is used by the Sentry Next.js SDK to automatically wrap API routes and server-side data-fetching functions.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
