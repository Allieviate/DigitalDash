#!/bin/bash
# Report whether the checkout is behind its remote.
#
# Called by start.sh and status.sh. Must never block the dash coming up:
# in a car there is usually no network, so the fetch is wrapped in a
# timeout and every failure path exits 0.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FETCH_TIMEOUT=10

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed. Cannot check for updates."
  exit 0
fi

if ! git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "$REPO_DIR is not a git repository."
  exit 0
fi

current_branch="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)"
echo "Checking updates for branch: $current_branch"

# Without the timeout this hangs on DNS resolution when parked with no
# wifi, holding up start.sh for however long the resolver takes.
if ! timeout "$FETCH_TIMEOUT" git -C "$REPO_DIR" fetch --quiet origin "$current_branch" 2>/dev/null; then
  echo "Could not reach origin (offline or timed out). Skipping update check."
  exit 0
fi

local_rev="$(git -C "$REPO_DIR" rev-parse "$current_branch")"
remote_rev="$(git -C "$REPO_DIR" rev-parse "origin/$current_branch" 2>/dev/null || echo "$local_rev")"

if [ "$local_rev" != "$remote_rev" ]; then
  echo "Update available. Before driving, run:"
  echo "  git -C $REPO_DIR pull --ff-only origin $current_branch"
  echo "  cd $REPO_DIR/frontend && npm run build"
else
  echo "Repo is up to date."
fi
