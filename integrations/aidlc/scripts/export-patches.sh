#!/bin/sh
# Regenerate patches/ from the upstream/ working branch and write patches/README.md,
# an index of every patch with its subject and the files it touches.
#
# Usage: scripts/export-patches.sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
UPSTREAM="$ROOT/upstream"
BASE_TAG=v2.10.0
OUT="$ROOT/patches"

if [ -n "$(git -C "$UPSTREAM" status --porcelain)" ]; then
	echo "export-patches: upstream/ has uncommitted changes; commit them first" >&2
	exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"
git -C "$UPSTREAM" format-patch --quiet --no-signature --zero-commit --full-index \
	--output-directory "$OUT" "$BASE_TAG..HEAD"

{
	echo "# Patch series"
	echo
	echo "Base: \`awslabs/aidlc-workflows\` tag \`$BASE_TAG\` (commit \`$(git -C "$UPSTREAM" rev-parse --short "$BASE_TAG^{commit}")\`)."
	echo "Apply in order with \`git am -3 patches/*.patch\`. See [../GRAFTING.md](../GRAFTING.md)."
	echo
	echo "| Patch | Subject | Files |"
	echo "|---|---|---|"
	for commit in $(git -C "$UPSTREAM" rev-list --reverse "$BASE_TAG..HEAD"); do
		subject=$(git -C "$UPSTREAM" log -1 --format=%s "$commit")
		number=$(git -C "$UPSTREAM" rev-list --count "$BASE_TAG..$commit")
		file=$(ls "$OUT" | grep -E "^$(printf '%04d' "$number")-" | head -n 1)
		files=$(git -C "$UPSTREAM" diff-tree --no-commit-id --name-only -r "$commit" | wc -l | tr -d ' ')
		echo "| [\`$file\`]($file) | $subject | $files |"
	done
} >"$OUT/README.md"

echo "export-patches: wrote $(ls "$OUT"/*.patch 2>/dev/null | wc -l | tr -d ' ') patches to patches/"
