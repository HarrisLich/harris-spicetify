# Hearth — a cozy Pokémon theme for Spotify (Spicetify) + Discord

Warm, calm color schemes, the Monocraft pixel font, and Pokémon pixel sprites
standing in for Spotify's controls, plus an optional rain/firefly weather layer
and a soft album-art glow.

| Control | Sprite(s) |
|---|---|
| Progress bar knob | Snorlax napping |
| Play / pause | Munchlax (playing) / Snorlax (paused) |
| Save to library | Larvitar → Tyranitar (with an evolution flash) |
| Previous / next | Latios ← / → Latias |
| Shuffle | Ditto (off) / Unown (on) |
| Repeat | Pichu (off) / Pikachu (all) / Raichu (one) |
| Volume | Whismur / Loudred / Exploud by level, Jigglypuff when muted |
| Extras | Jigglypuff on the album art, Munchlax by "Your Library", Pikachu by search, Eevee on card hover |

## Setup

Works anywhere Spicetify does: **Windows, macOS, Linux.** Use the regular
Spotify desktop app from spotify.com (the Microsoft Store version isn't supported).

### macOS / Linux
```bash
# 1. install Spicetify (say yes to Marketplace if you want it)
curl -fsSL https://raw.githubusercontent.com/spicetify/cli/main/install.sh | sh

# 2. open a new terminal, then
git clone <this repo> hearth-spicetify
cd hearth-spicetify
./build.sh
```

### Windows
```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
# new PowerShell window:
git clone <this repo> hearth-spicetify
cd hearth-spicetify
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

The build script embeds the sprites and fonts into the CSS, installs the theme
and the `hearth.js` extension, sets the theme to **snooze** on first run, and
runs `spicetify apply`.

## Everyday use

- **Color schemes** (`Hearth/color.ini`): `snooze` (Snorlax blues), `ember`
  (mocha + amber), `latte` (light), `forest` (greens).
  ```bash
  spicetify config color_scheme ember
  spicetify apply
  ```
- **Weather:** the cloud button in the top bar cycles fireflies → off → rain.
- **After a Spotify update** wipes the theme: run `spicetify backup apply`
  (or just re-run the build script).
- **Undo everything:** `spicetify restore`.

## Customizing

- Styles live in `Hearth/user.css`, behavior in `Hearth/hearth.js`.
- To add a sprite: drop the PNG in `Hearth/sprites/`, add a line to
  `Hearth/embeds.txt` (`__NAME__  sprites/file.png  image/png`), use
  `url("__NAME__")` in `user.css`, and rebuild. Sprites are Gen 7 menu icons
  from the PokeAPI sprites repo, cropped to their visible pixels and shown at
  whole-number scales so they stay crisp.
- Spotify updates sometimes rename the classes these rules target; when a
  sprite or style stops showing, that rule's selector needs updating.

## Discord

`discord/Hearth.theme.css` is a matching theme for **Vencord** / BetterDiscord
(snooze colors, Snorlax in the title bar). Copy it to the mod's `themes` folder
and enable it in Settings → Vencord → Themes, with Discord's appearance on Dark.
Client mods are against Discord's Terms of Service; theme-only use is low-risk
but not zero-risk.

See [CREDITS.md](CREDITS.md) for fonts, effects and sprite sources.
