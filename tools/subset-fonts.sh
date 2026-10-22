#!/usr/bin/env bash
# Cắt font chỉ giữ chữ Latin + tiếng Việt + dấu câu, xuất woff2 vào src/fonts/.
# Chỉ cần chạy lại khi đổi font. Cần: Node (npm) và Python fonttools + brotli
#   pip install fonttools brotli
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
( cd "$TMP" && npm init -y >/dev/null && npm install --silent @expo-google-fonts/be-vietnam-pro @expo-google-fonts/bricolage-grotesque @expo-google-fonts/fraunces )
F="$TMP/node_modules/@expo-google-fonts"
U="U+0020-007E,U+00A0-00FF,U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0309,U+0323,U+1EA0-1EF9,U+2013-2014,U+2018-201D,U+2022,U+2026,U+20AB,U+2192,U+2212"
sub() { pyftsubset "$1" --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file="$ROOT/src/fonts/$2"; }
sub "$F/be-vietnam-pro/400Regular/BeVietnamPro_400Regular.ttf" be-vietnam-pro-400.woff2
sub "$F/be-vietnam-pro/600SemiBold/BeVietnamPro_600SemiBold.ttf" be-vietnam-pro-600.woff2
sub "$F/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf" bricolage-grotesque-700.woff2
sub "$F/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf" bricolage-grotesque-800.woff2
sub "$F/fraunces/400Regular_Italic/Fraunces_400Regular_Italic.ttf" fraunces-400-italic.woff2
rm -rf "$TMP"
ls -la "$ROOT/src/fonts"
