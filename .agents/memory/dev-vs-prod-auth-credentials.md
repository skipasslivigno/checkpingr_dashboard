---
name: Dev vs prod auth credentials
description: AUTH_USERS secret differs per environment; a production login will not work in the dev workspace.
---

The `AUTH_USERS` value (comma-separated `username:password` pairs consumed by the API's `/auth/login` route) is a Replit secret and can be configured differently in the dev workspace vs. the production VPS deployment. A username/password that works in production is not guaranteed to exist in the dev environment's `AUTH_USERS`, and vice versa.

**Why:** Confirmed during e2e testing — a real production account (`gerardo.mottini`) failed to log in on the dev preview because dev's `AUTH_USERS` only had a single, different test account configured.

**How to apply:** When e2e-testing login flows or asking the user for test credentials, check `viewEnvVars` for the dev `AUTH_USERS` value (or ask the user specifically for a *dev* account) rather than assuming a prod login will work.
