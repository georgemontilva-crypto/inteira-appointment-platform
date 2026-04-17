#!/bin/bash
# Generates icon.icns for macOS from icons/source.png
# Requires: macOS with iconutil (built-in), or a Mac build environment

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../icons"
ICONSET="$ICONS_DIR/icon.iconset"

echo "Generating .iconset from source.png..."
mkdir -p "$ICONSET"

sips -z 16 16     "$ICONS_DIR/source.png" --out "$ICONSET/icon_16x16.png"
sips -z 32 32     "$ICONS_DIR/source.png" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32     "$ICONS_DIR/source.png" --out "$ICONSET/icon_32x32.png"
sips -z 64 64     "$ICONS_DIR/source.png" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128   "$ICONS_DIR/source.png" --out "$ICONSET/icon_128x128.png"
sips -z 256 256   "$ICONS_DIR/source.png" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256   "$ICONS_DIR/source.png" --out "$ICONSET/icon_256x256.png"
sips -z 512 512   "$ICONS_DIR/source.png" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512   "$ICONS_DIR/source.png" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$ICONS_DIR/source.png" --out "$ICONSET/icon_512x512@2x.png"

echo "Converting .iconset to .icns..."
iconutil -c icns "$ICONSET" -o "$ICONS_DIR/icon.icns"

rm -rf "$ICONSET"
echo "Done: $ICONS_DIR/icon.icns"
