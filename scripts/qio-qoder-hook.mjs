#!/usr/bin/env node
// Qoder hook adapter: label metadata-only events before delegating to Qio's safe logger.
process.env.QIO_AGENT='Qoder';
await import('./qio-hook.mjs');
