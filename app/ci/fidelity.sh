#!/usr/bin/env bash
# HP-508: open Hueprint's three fixture themes in a throwaway VS Code profile, to compare with the preview.
# Your own VS Code settings and extensions are not touched. Run from the app/ folder: bash ci/fidelity.sh
set -euo pipefail
OUT="${1:-/tmp/hueprint-fidelity}"
CODE="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
rm -rf "$OUT" && mkdir -p "$OUT/ud/User" "$OUT/ext"
FIDELITY_OUT="$OUT" npx vitest run ci/fidelity.test.ts >/dev/null
cat > "$OUT/ud/User/settings.json" <<'JSON'
{
  "workbench.colorTheme": "fidelity-a",
  "workbench.startupEditor": "none",
  "update.mode": "none",
  "telemetry.telemetryLevel": "off",
  "editor.minimap.enabled": true,
  "window.restoreWindows": "none",
  "security.workspace.trust.enabled": false
}
JSON
for v in fidelity-a fidelity-b fidelity-c; do
  "$CODE" --user-data-dir "$OUT/ud" --extensions-dir "$OUT/ext" --install-extension "$OUT/$v.vsix" 2>&1 | grep -v -i deprecat | grep -v trace-deprecation || true
done
echo "Opening VS Code. Switch themes with Cmd+K Cmd+T: fidelity-a (dark), fidelity-b (light), fidelity-c (dark)."
open -n -a "Visual Studio Code" --args --user-data-dir "$OUT/ud" --extensions-dir "$OUT/ext" "$OUT/samples" "$OUT/samples/shuffle.ts"
