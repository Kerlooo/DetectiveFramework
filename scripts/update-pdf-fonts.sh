#!/usr/bin/env sh
# Downloads the fonts used by the PDF export into static/fonts/ (SIL Open Font License):
# Noto Sans regular and bold, and Noto Sans JP regular reduced to the JIS X 0208 characters
# (about 2 MB instead of 5.7 MB). Needs curl, python3 and uv (for fonttools).
#
# Run manually: `sh scripts/update-pdf-fonts.sh`
set -eu

OUT="$(dirname "$0")/../static/fonts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Google Fonts serves TrueType files to clients that do not ask for WOFF2.
font_url() {
	curl -sf -A 'Mozilla/4.0' "https://fonts.googleapis.com/css2?family=$1" | grep -oE 'https://[^)]+\.ttf'
}

curl -sf -o "$OUT/NotoSans-Regular.ttf" "$(font_url 'Noto+Sans:wght@400')"
curl -sf -o "$OUT/NotoSans-Bold.ttf" "$(font_url 'Noto+Sans:wght@700')"
curl -sf -o "$TMP/NotoSansJP.ttf" "$(font_url 'Noto+Sans+JP:wght@400')"

# JIS X 0208 (via the EUC-JP codec), Latin-1 and Latin Extended-A, general punctuation,
# CJK symbols and kana, full-width forms.
python3 - "$TMP/unicodes.txt" <<'PY'
import sys
cps = set(range(0x20, 0x7F)) | set(range(0xA0, 0x180)) | set(range(0x2000, 0x2070))
cps |= set(range(0x3000, 0x3100)) | set(range(0xFF00, 0xFFF0))
for b1 in range(0xA1, 0xFF):
    for b2 in range(0xA1, 0xFF):
        try:
            cps.update(ord(c) for c in bytes([b1, b2]).decode('euc_jp'))
        except UnicodeDecodeError:
            pass
open(sys.argv[1], 'w').write('\n'.join('U+%04X' % c for c in sorted(cps)))
PY

uv run --quiet --with fonttools pyftsubset "$TMP/NotoSansJP.ttf" \
	--unicodes-file="$TMP/unicodes.txt" --layout-features='' --no-hinting \
	--output-file="$OUT/NotoSansJP-Regular.ttf"

ls -l "$OUT"
