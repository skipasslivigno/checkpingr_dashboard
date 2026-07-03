---
name: Responsive layout pattern
description: How wide-screen layout is handled in skiarea-dashboard to keep list rows and stat cards from stretching/disconnecting.
---

On wide screens (React Native web), unconstrained flex containers stretch full width, which visually disconnects fixed-width number columns (e.g. passages/guests) from labels on the left, and makes stat-card buttons oversized.

Fix pattern: a shared `useResponsive()` hook (breakpoint ~700px, returns `{ isWide, width }`) plus a `CONTENT_MAX_WIDTH` constant (640). Screens wrap their main content in a `View` with `{ maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" }` applied conditionally when `isWide`. For `FlatList`-based screens, wrap the whole `FlatList` (not just `contentContainerStyle`) in this max-width view, since `renderItem` content otherwise stretches to fill the FlatList's own width regardless of contentContainerStyle. Stat cards get an optional `compact` prop to render smaller/one-row on wide screens.

**Why:** `contentContainerStyle` alone doesn't constrain a FlatList's rendered row width; only wrapping the FlatList itself does.

**How to apply:** Any new list or dashboard screen in `artifacts/skiarea-dashboard` that shows label+numbers rows or stat cards should reuse `useResponsive()`/`CONTENT_MAX_WIDTH` rather than inventing new breakpoint logic.
