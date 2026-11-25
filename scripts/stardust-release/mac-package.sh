#!/usr/bin/env bash
set -euo pipefail
out="$T3CODE_DESKTOP_OUTPUT_DIR"
built="$(find "$out" -maxdepth 3 -name '*.app' -path '*mac-arm64*' -print -quit)"
test -n "$built"
plist="$built/Contents/Info.plist"
for key in CFBundleIdentifier CFBundleName CFBundleExecutable; do
  /usr/libexec/PlistBuddy -c "Print :$key" "$plist" > "$out/$key.original"
done
[[ "$(cat "$out/CFBundleIdentifier.original")" == com.t3tools.t3code ]]
staged="$out/Stardust.app"
rm -rf "$staged"
ditto "$built" "$staged"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName 'Stardust Agent'" "$staged/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION}" "$staged/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :LSHasLocalizedDisplayName true" "$staged/Contents/Info.plist" || \
  /usr/libexec/PlistBuddy -c "Add :LSHasLocalizedDisplayName bool true" "$staged/Contents/Info.plist"
for l in en.lproj zh-Hans.lproj zh_CN.lproj; do
  mkdir -p "$staged/Contents/Resources/$l"
  name="Stardust Agent"
  [[ "$l" == zh* ]] && name="星尘 Agent"
  printf '"CFBundleDisplayName" = "%s";\n' "$name" > "$staged/Contents/Resources/$l/InfoPlist.strings"
done
commit="$(git rev-parse HEAD)"
node -e '
  const fs = require("node:fs");
  const meta = {
    customBuild: "v" + process.env.VERSION + "-ci-stardust",
    communityVersion: process.env.VERSION,
    sourceCommit: process.argv[1],
    releaseChannel: "stable",
  };
  for (const f of ["stardust-build.json", "t3-custom-build.json"]) {
    fs.writeFileSync(process.argv[2] + "/Contents/Resources/" + f, JSON.stringify(meta, null, 2) + "\n");
  }
' "$commit" "$staged"
codesign --force --deep --sign - "$staged"
codesign --verify --deep --strict "$staged"
for key in CFBundleIdentifier CFBundleName CFBundleExecutable; do
  [[ "$(/usr/libexec/PlistBuddy -c "Print :$key" "$staged/Contents/Info.plist")" == "$(cat "$out/$key.original")" ]]
done
zip_name="Stardust-v${VERSION}-macOS-arm64.zip"
ditto -c -k --sequesterRsrc --keepParent "$staged" "$out/$zip_name"
(cd "$out" && shasum -a 256 "$zip_name") | tee "$out/SHA256SUMS-macos-arm64.txt"
ls -lh "$out/$zip_name"
executable="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$staged/Contents/Info.plist")"
printf '%s/%s/Contents/MacOS/%s\n' "$PWD" "$staged" "$executable" > "$out/executable.txt"
