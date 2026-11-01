#!/bin/sh
set -eu

# The optional compatibility run is evidence for its actual CLI version only.
# Neither mode touches the desktop profile or proves runtime activation.
dsh_bot_mode=rc2
case "${1:-}" in
  '') ;;
  --compatible) dsh_bot_mode=compatible; shift ;;
  --help)
    echo 'Usage: scripts/dev-profile.sh [--compatible]'
    echo 'Default: require exactly DSH 0.2.1-rc.2. --compatible: test an installed compatible 0.2.x CLI and record its actual version.'
    exit 0 ;;
  *) echo 'Usage: scripts/dev-profile.sh [--compatible]' >&2; exit 2 ;;
esac
[ "$#" -eq 0 ] || { echo 'Unexpected extra arguments.' >&2; exit 2; }

cd "$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
export DSH_HOME="$PWD/.dsh-dev"
# The DSH CLI starts its own pnpm, so scripts/pnpm's environment is not enough.
export XDG_STATE_HOME="$DSH_HOME/state"
export NODE_COMPILE_CACHE="$DSH_HOME/node-compile-cache"
export pnpm_config_store_dir="$DSH_HOME/pnpm-store"
export pnpm_config_cache_dir="$DSH_HOME/pnpm-cache"
export TMPDIR="$DSH_HOME/tmp"
mkdir -p "$TMPDIR"

dsh_bot_version=$(scripts/dsh --version)
node --input-type=module - "$dsh_bot_version" "$dsh_bot_mode" <<'NODE'
const [version, mode] = process.argv.slice(2);
// The declared >=0.2.1-rc.2 <0.3.0 range admits rc.2+ for 0.2.1,
// and stable 0.2.1+ releases; other prerelease tuples are not admitted.
const match = /^0\.2\.(0|[1-9]\d*)(?:-rc\.(0|[1-9]\d*))?(?:\+[\da-zA-Z.-]+)?$/.exec(version);
const compatible = match && (match[2] === undefined
  ? Number(match[1]) >= 1
  : Number(match[1]) === 1 && Number(match[2]) >= 2);
if (mode === 'rc2' ? version !== '0.2.1-rc.2' : !compatible) {
  console.error(mode === 'rc2'
    ? `Expected exactly DSH 0.2.1-rc.2, found ${version}. Use --compatible explicitly for a separate compatibility run.`
    : `DSH ${version} is outside the supported compatibility candidates.`);
  process.exit(1);
}
NODE
test -f packages/dsh-bot/lib/index.js
test -f packages/dsh-bot/lib/client.js

scripts/dsh plugin --profile dev add "$PWD/packages/dsh-bot"
scripts/dsh --profile dev --dump-config > "$DSH_HOME/dump.yml"
grep -q 'dsh-bot' "$DSH_HOME/dump.yml"
grep -q '^# == dsh-bot' "$DSH_HOME/dump.yml"
node --input-type=module - "$dsh_bot_version" "$dsh_bot_mode" <<'NODE'
import { writeFileSync } from 'node:fs';
const [actualVersion, mode] = process.argv.slice(2);
writeFileSync(`${process.env.DSH_HOME}/dev-profile-version.json`, `${JSON.stringify({
  recordedAt: new Date().toISOString(), actualVersion, mode, exactRc2: actualVersion === '0.2.1-rc.2',
  installAndDump: 'PASS', runtimeActivation: 'NOT_RUN',
}, null, 2)}\n`);
NODE
echo "PASS: isolated dev installation and config dump with DSH $dsh_bot_version ($dsh_bot_mode); runtime activation NOT_RUN."
