# Operational diary schema

The diary is stored in the `operational_notes` PostgreSQL table. Apply the
additive schema change to the intended development database with:

```sh
pnpm --filter @workspace/db run push
```

Review the generated SQL before confirming any changes in another environment.
This task applied the schema only in development; it did not deploy or change
production services.

Civil dates use PostgreSQL `date`, not timestamps. The original author and latest
editor have stored display names as well as nullable account references
(`ON DELETE SET NULL`). Lift names are copied when a note is saved, so notes remain
readable after account deletion or removal of historical extractions.

Dates do not require daily snapshots or a season. Lift references must belong to
the authenticated tenant's historical catalog (including retained notes).
Read access is shared within the tenant; admin and operator roles can write.
The server derives tenant, authors and timestamps from the authenticated session.

Checks:

```sh
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
pnpm --filter @workspace/api-server run test:diary
pnpm --filter @workspace/api-server run test:diary-pdf
```

Integration tests create isolated temporary tenants, use real session validation,
and remove their fixtures afterwards. Use a development/test database.
