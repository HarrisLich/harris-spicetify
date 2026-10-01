#!/usr/bin/env bash
# macOS / Linux: embeds sprites/fonts into Hearth/user.css, installs the theme
# and the hearth.js extension into Spicetify, then applies.
# Usage:  ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
SRC="Hearth"

SPICETIFY="$(command -v spicetify || true)"
[ -z "$SPICETIFY" ] && [ -x "$HOME/.spicetify/spicetify" ] && SPICETIFY="$HOME/.spicetify/spicetify"
[ -z "$SPICETIFY" ] && { echo "spicetify not found - install it first (see README)"; exit 1; }

CFG_DIR="$(dirname "$("$SPICETIFY" -c)")"
DEST="$CFG_DIR/Themes/Hearth"
mkdir -p "$DEST" "$CFG_DIR/Extensions"

# Embed every file listed in embeds.txt as a base64 data: URI (perl ships with macOS)
perl -e '
  use strict; use warnings; use MIME::Base64;
  my ($src, $out) = @ARGV;
  local $/; open my $fh, "<", "$src/user.css" or die; my $css = <$fh>; close $fh;
  open my $list, "<", "$src/embeds.txt" or die;
  for my $line (split /\n/, <$list>) {
    next if $line =~ /^\s*(#|$)/;
    my ($key, $path, $mime) = split /\s+/, $line;
    open my $f, "<:raw", "$src/$path" or die "missing $path\n"; my $data = <$f>; close $f;
    my $uri = "data:$mime;base64," . encode_base64($data, "");
    $css =~ s/\Q$key\E/$uri/g;
  }
  die "Unreplaced placeholder: $1 (add it to Hearth/embeds.txt)\n" if $css =~ /(__[A-Z]+__)/;
  open my $o, ">", $out or die; print $o $css; close $o;
' "$SRC" "$DEST/user.css"

cp "$SRC/color.ini" "$DEST/"
cp "$SRC/hearth.js" "$CFG_DIR/Extensions/hearth.js"

"$SPICETIFY" config extensions | grep -q "hearth.js" || "$SPICETIFY" config extensions hearth.js
"$SPICETIFY" config current_theme | grep -q "Hearth" || \
  "$SPICETIFY" config current_theme Hearth color_scheme snooze inject_css 1 replace_colors 1

"$SPICETIFY" apply
