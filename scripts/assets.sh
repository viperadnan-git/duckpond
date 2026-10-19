#!/bin/sh
# Renders app icons and the Open Graph card from static/favicon.svg.
# Needs rsvg-convert (librsvg) and Google Chrome.
set -eu
cd "$(dirname "$0")/.."

logo=static/favicon.svg
chrome=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

rsvg-convert -w 512 "$logo" -o static/icon-512.png
rsvg-convert -w 180 "$logo" -o static/apple-touch-icon.png

# maskable: full-bleed square, duck shrunk into the 80% safe zone
sed -e 's#rx="16" ##' -e 's#x="9" y="9" width="46" height="46"#x="14" y="14" width="36" height="36"#' \
	"$logo" >"$tmp/maskable.svg"
rsvg-convert -w 512 "$tmp/maskable.svg" -o static/icon-maskable.png

sed -e "s#__FONTS__#file://$PWD/node_modules/@fontsource-variable#g" \
	-e "s#__LOGO__#data:image/svg+xml;base64,$(base64 <"$logo" | tr -d '\n')#" \
	scripts/og.html >"$tmp/og.html"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
	--window-size=1200,630 --screenshot="$PWD/static/og.png" "file://$tmp/og.html" 2>/dev/null
