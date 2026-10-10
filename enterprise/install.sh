#!/bin/sh
# Build the harness binary and install it for the current user, seeding a deployment profile.
#   HARNESS_DEPLOYMENT   deployment profile folder (default: this folder); may add profile.env, brand.yml, themes/*.json
#   HARNESS_GATEWAY_URL  Anthropic-compatible gateway base URL
#   HARNESS_KB_URL       knowledge-base API base URL
#   HARNESS_DOMAIN       internal DNS suffix
# Existing files in ~/.harness are never overwritten.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PROFILE=$(cd "${HARNESS_DEPLOYMENT:-$ROOT/enterprise}" && pwd)
# A profile may supply its own defaults; explicit HARNESS_* exports still win.
if [ -f "$PROFILE/profile.env" ]; then . "$PROFILE/profile.env"; fi
GATEWAY=${HARNESS_GATEWAY_URL:-https://llm-gateway.example.com}
KB=${HARNESS_KB_URL:-https://kb.example.com/api}
DOMAIN=${HARNESS_DOMAIN:-example.com}
HOME_DIR="$HOME/.harness"

seed() {
	[ -e "$2" ] && return 0
	sed -e "s#__HARNESS_GATEWAY_URL__#$GATEWAY#g" -e "s#__HARNESS_KB_URL__#$KB#g" -e "s#__HARNESS_DOMAIN__#$DOMAIN#g" "$1" >"$2"
	echo "seeded $2"
}

cd "$ROOT"
bun install --frozen-lockfile
# Native addon: compiled from crates/ with the pinned nightly (rust-toolchain.toml); needs cmake + ninja.
NATIVE="packages/natives/native/pi_natives.$(uname -s | tr A-Z a-z)-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/').node"
if [ ! -e "$NATIVE" ]; then
	TOOLCHAIN=$(sed -n 's/^channel = "\(.*\)"/\1/p' rust-toolchain.toml)
	PATH="$(dirname "$(rustup which cargo --toolchain "$TOOLCHAIN")"):$PATH" bun --cwd=packages/natives run build:bindings
fi
bun --cwd=packages/coding-agent run build

mkdir -p "$HOME_DIR/agent/themes" "$HOME/.local/bin"
seed "$PROFILE/config.yml" "$HOME_DIR/agent/config.yml"
seed "$PROFILE/models.yml" "$HOME_DIR/agent/models.yml"
seed "$PROFILE/enterprise.yml" "$HOME_DIR/enterprise.yml"
seed "$PROFILE/policy.yml" "$HOME_DIR/policy.yml"
if [ -f "$PROFILE/brand.yml" ]; then seed "$PROFILE/brand.yml" "$HOME_DIR/brand.yml"; fi
for theme in "$PROFILE"/themes/*.json; do
	if [ -f "$theme" ]; then seed "$theme" "$HOME_DIR/agent/themes/$(basename "$theme")"; fi
done
ln -sf "$ROOT/packages/coding-agent/dist/harness" "$HOME/.local/bin/harness"
echo "installed: $("$HOME/.local/bin/harness" --version) (profile: $PROFILE)"
