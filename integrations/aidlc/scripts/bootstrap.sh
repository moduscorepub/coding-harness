#!/bin/sh
# Recreate the fork working tree: upstream AI-DLC at v2.10.0 plus patches/*.patch
# applied as commits on branch harness-distribution.
#
# Usage: scripts/bootstrap.sh [--force]
#   --force  delete an existing upstream/ first
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
UPSTREAM="$ROOT/upstream"
REPO=${AIDLC_UPSTREAM_REPO:-https://github.com/awslabs/aidlc-workflows}
BASE_TAG=v2.10.0
BASE_COMMIT=2a883858f5483bce3b48f43b8f6d3ca2c042d6ae
BRANCH=harness-distribution

if [ "${1:-}" = "--force" ]; then
	rm -rf "$UPSTREAM"
fi
if [ -e "$UPSTREAM" ]; then
	echo "bootstrap: $UPSTREAM exists; rerun with --force to recreate it" >&2
	exit 1
fi

git clone --quiet "$REPO" "$UPSTREAM"
git -C "$UPSTREAM" checkout --quiet -b "$BRANCH" "$BASE_TAG"
actual=$(git -C "$UPSTREAM" rev-parse HEAD)
if [ "$actual" != "$BASE_COMMIT" ]; then
	echo "bootstrap: $BASE_TAG resolved to $actual, expected $BASE_COMMIT" >&2
	exit 1
fi

set -- "$ROOT"/patches/*.patch
if [ -e "$1" ]; then
	git -C "$UPSTREAM" -c user.name="aidlc-harness" -c user.email="aidlc-harness@users.noreply.github.com" \
		am --quiet --3way "$@"
fi

git -C "$UPSTREAM" log --oneline "$BASE_TAG..HEAD"
echo "bootstrap: upstream/ is on $BRANCH with $(git -C "$UPSTREAM" rev-list --count "$BASE_TAG..HEAD") commits over $BASE_TAG"
