#!/bin/sh
set -e

pnpm envio local db-migrate up
exec pnpm run start 