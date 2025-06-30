#!/bin/sh
set -e

(cd generated && pnpm run db-setup) || true

pnpm start
