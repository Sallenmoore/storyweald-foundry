#!/usr/bin/env bash
# Local release helper: verify system.json version == <version>, run the tests,
# then tag v<version> and push it — which fires .github/workflows/release.yml.
# Usage: scripts/release.sh 0.1.0
set -euo pipefail

ver="${1:?usage: scripts/release.sh <version>  (e.g. 0.1.0)}"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

manifest="$(node -p "require('./system/system.json').version")"
if [ "$ver" != "$manifest" ]; then
  echo "error: argument $ver != system.json version $manifest — bump system.json first" >&2
  exit 1
fi

npm test
git tag "v$ver"
git push origin "v$ver"
echo "pushed tag v$ver — watch the release with: gh run watch"
