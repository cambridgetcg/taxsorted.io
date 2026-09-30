# Disposable database recovery rehearsal

This exercises the repository's real API migrations with synthetic rows, makes a
PostgreSQL custom-format dump, restores it into a second empty database, and
compares every public table and the column, constraint and index definitions.
It checks migration reruns, account and connector relationships, receipts,
binary values, exact large integers, rollback and rejection of a truncated dump.

Run from a Git checkout with a commit, using Node 22, installed workspace dependencies,
and an already running Docker
daemon accessible through a local Unix socket. The image must already be cached;
the harness never pulls an image. Admit `postgres:17` or `postgres:16` separately
with your normal Docker image workflow if needed.

```sh
npm run test:infrastructure
npm run infrastructure:restore
npm run infrastructure:restore -- --postgres-major 16
```

The restore command explicitly opts into creating a disposable container. Its
equivalent is:

```sh
node infrastructure/testing/database-recovery.mjs --allow-local-container
```

The default socket is `/var/run/docker.sock`; use `--docker-socket /path/to/docker.sock`
for another local socket. Remote URL options, existing database names, backup
paths and unsupported PostgreSQL versions are rejected. Run from a shell without
`DATABASE_URL` or any `PG*` client variable, including empty variables. The harness
refuses these names without reading or reporting their values. It uses a temporary
Docker configuration and child home directory, ignoring ambient Docker contexts
and client authentication files. A Unix socket is a transport boundary, not proof
of where an operator-configured daemon physically runs.

The randomly named container has a unique ownership label, a randomly assigned
loopback-only port, and no host data mounts. Both databases and their dump live in
container tmpfs. The disposable database uses trust authentication: other
processes on the local machine can access this synthetic fixture while it runs.
No real tax data, provider token, production URL or secret is required. The
fixture's credential-shaped strings are deliberately invalid markers.

Cleanup resolves only the generated container name and verifies its complete ID,
name and ownership label before removal. An uncertain create result triggers the
same ownership check. If ownership or removal cannot be established, the report
fails and names only that generated container for investigation. SIGINT/SIGTERM
request cleanup at the next phase; forced termination or a daemon failure can
still prevent cleanup. There is no broad prefix-based deletion.

A private `taxsorted-db-recovery-*/report.json` is retained in the operating
system's temporary directory. It contains only status, checks, counts, commit,
PostgreSQL version and image ID, generated run identity and cleanup results.
Raw SQL errors, rows, hashes of rows, connection details and dump contents are
not logged. Reports are outside the repository and the scaffold source archive.
The CI workflow runs this same mechanism against PostgreSQL 16 and 17 and uploads
only these reports. Local tests do not demonstrate that the workflow has run.

This verifies a synthetic logical dump/restore on these versions. It does not
verify a production backup exists, the hosting PostgreSQL version, production
roles/ownership/privileges (restore uses `--no-owner --no-privileges`), token decryption or key custody, volume snapshots,
point-in-time recovery, retention, disaster recovery timing, or the application's
operation after a production incident. It is also separate from local Books
backup and user-profile recovery.
