# Windows: embeds sprites/fonts into Hearth/user.css, installs the theme and
# the hearth.js extension into Spicetify, then applies.
# Usage:  powershell -ExecutionPolicy Bypass -File .\build.ps1
$ErrorActionPreference = "Stop"
$src = Join-Path $PSScriptRoot "Hearth"
$css = [IO.File]::ReadAllText("$src\user.css")

foreach ($line in Get-Content "$src\embeds.txt") {
  if ($line -match '^\s*(#|$)') { continue }
  $key, $path, $mime = $line -split '\s+'
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $src $path)))
  $css = $css.Replace($key, "data:$mime;base64,$b64")
}
if ($css -match "__[A-Z]+__") { throw "Unreplaced placeholder: $($Matches[0]) (add it to Hearth/embeds.txt)" }

$spicetify = (Get-Command spicetify -ErrorAction SilentlyContinue).Source
if (-not $spicetify) { $spicetify = "$env:LOCALAPPDATA\spicetify\spicetify.exe" }
$cfgDir = Split-Path (& $spicetify -c)

$dest = "$cfgDir\Themes\Hearth"
New-Item -ItemType Directory -Force $dest | Out-Null
[IO.File]::WriteAllText("$dest\user.css", $css)
Copy-Item "$src\color.ini" $dest -Force

New-Item -ItemType Directory -Force "$cfgDir\Extensions" | Out-Null
Copy-Item "$src\hearth.js" "$cfgDir\Extensions\hearth.js" -Force

$exts = (& $spicetify config extensions) -join ""
if ($exts -notmatch "hearth\.js") { & $spicetify config extensions hearth.js }
$theme = (& $spicetify config current_theme) -join ""
if ($theme -notmatch "Hearth") { & $spicetify config current_theme Hearth color_scheme snooze inject_css 1 replace_colors 1 }

& $spicetify apply
