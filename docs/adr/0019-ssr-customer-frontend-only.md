# 0019. SSR for the customer frontend only

Date: 2026-06-08 · Status: Accepted

## Context

Customer-facing vendor sites are public pages where load speed and
(eventually) SEO matter; the vendor app sits behind login where neither
does. Angular SSR adds an Express server, hydration concerns, and
server-safe coding constraints — costs worth paying only where they buy
something.

## Decision

`customer-frontend` uses Angular SSR with prerendering and client hydration
with event replay. `vendor-frontend` was explicitly rebuilt without SSR and
remains client-side rendered.

## Consequences

- Customer pages get fast first paint and a path to SEO without burdening
  the vendor app.
- Only customer-frontend code must be server-safe (no bare `window`/DOM
  access outside guards); the vendor app is free of that constraint.
- Two different build/deploy shapes: a Node server for customer-frontend,
  static assets for vendor-frontend.
- Running SSR behind Render's proxy has three coupled requirements, each
  silent if wrong — the symptom is an empty `<app-root>` CSR shell served for
  every host, not an error, so it looks like "SSR configured but not running":
  the Node engine must trust `X-Forwarded-*` (`trustProxyHeaders`), or Angular
  deopts to CSR on Render's `X-Forwarded-For`; the subdomain must be read from
  `request.url` (the forwarded host), not the `host` header (the internal
  `*.onrender.com` name); and `allowedHosts` must include `*.onrender.com` so
  Render's health check passes.
