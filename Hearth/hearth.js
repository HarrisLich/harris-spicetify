// NAME: Hearth
// AUTHOR: harri
// DESCRIPTION: Companion script for the Hearth theme: volume-level sprites,
//              album-art glow, and a toggleable pixel weather layer.

(function hearth() {
  const S = window.Spicetify;
  if (!S?.Player || !S?.Platform || !S?.LocalStorage || !document.body) {
    setTimeout(hearth, 300);
    return;
  }

  const root = document.documentElement;

  // ---------------------------------------------------------------
  // Volume level → <html data-hearth-vol="low|mid|high">
  // (CSS swaps Whismur / Loudred / Exploud; muted is handled in CSS)
  // ---------------------------------------------------------------
  function updateVolume() {
    let v;
    try { v = S.Player.getVolume(); } catch { return; }
    if (typeof v !== "number") return;
    const level = v < 0.34 ? "low" : v < 0.67 ? "mid" : "high";
    if (root.dataset.hearthVol !== level) root.dataset.hearthVol = level;
  }
  updateVolume();
  setInterval(updateVolume, 400);

  // ---------------------------------------------------------------
  // Album-art glow → --hearth-art on <html>
  // ---------------------------------------------------------------
  function coverUrl() {
    const meta = S.Player.data?.item?.metadata;
    const raw = meta?.image_xlarge_url || meta?.image_large_url || meta?.image_url;
    if (!raw) return null;
    return raw.startsWith("spotify:image:")
      ? "https://i.scdn.co/image/" + raw.slice("spotify:image:".length)
      : raw;
  }

  let currentArt = null;
  function updateArt() {
    const url = coverUrl();
    if (!url || url === currentArt) return;
    currentArt = url;
    const img = new Image();
    img.onload = () => {
      if (currentArt !== url) return;               // song changed again meanwhile
      root.setAttribute("data-hearth-art-fading", "");
      setTimeout(() => {
        if (currentArt !== url) return;
        root.style.setProperty("--hearth-art", `url("${url}")`);
        root.setAttribute("data-hearth-art", "");
        root.removeAttribute("data-hearth-art-fading");
      }, 900);
    };
    img.src = url;
  }
  S.Player.addEventListener("songchange", updateArt);
  updateArt();
  setInterval(updateArt, 3000); // catches the first song after startup

  // ---------------------------------------------------------------
  // Weather layer: off → rain → fireflies
  // ---------------------------------------------------------------
  const MODES = ["off", "rain", "fireflies"];
  const STORE_KEY = "hearth:weather";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mode = S.LocalStorage.get(STORE_KEY) || (reducedMotion ? "off" : "fireflies");
  if (!MODES.includes(mode)) mode = "off";

  // Both effects are laid over Spotify's main panel (.Root__main-view).
  const rainBox = document.createElement("div");
  rainBox.id = "hearth-rain";
  rainBox.innerHTML = '<div class="hr-row hr-back"></div><div class="hr-row hr-front"></div>';
  document.body.appendChild(rainBox);

  const canvas = document.createElement("canvas");
  canvas.id = "hearth-weather";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

  let rect = { left: 0, top: 0, width: 0, height: 0 };
  let W = 0, H = 0;                                       // size in CSS px
  // Rain spans the full window width, from the top of the panels down to
  // the top edge of the player bar, where the drops land (--hr-h). The box
  // reaches SPLASH px past that edge so the splat rings aren't clipped.
  const SPLASH = 14;
  function fitRain(mainTop) {
    const bar = document.querySelector(".Root__now-playing-bar");
    const barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight;
    const h = Math.max(50, barTop - mainTop);
    Object.assign(rainBox.style, {
      left: "0px", top: mainTop + "px",
      width: window.innerWidth + "px", height: h + SPLASH + "px",
    });
    rainBox.style.setProperty("--hr-h", h + "px");
  }

  function fitLayers() {
    const main = document.querySelector(".Root__main-view");
    if (!main) return;
    const r = main.getBoundingClientRect();
    fitRain(r.top);
    const dpr = window.devicePixelRatio || 1;
    if (r.width === rect.width && r.height === rect.height &&
        r.left === rect.left && r.top === rect.top && canvas.dataset.dpr == dpr) return;
    rect = r; W = r.width; H = r.height; canvas.dataset.dpr = dpr;
    Object.assign(canvas.style, {
      left: r.left + "px", top: r.top + "px",
      width: W + "px", height: H + "px",
      borderRadius: getComputedStyle(main).borderRadius,
    });
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedFlies();
  }
  setInterval(() => { if (mode !== "off") fitLayers(); }, 1000);  // sidebar resizes etc.
  window.addEventListener("resize", fitLayers);

  // ---------- Rain ----------
  // Ported from "CSS Rain Effect" by Aaron Rickle (codepen.io/arickle/pen/XKjMZY,
  // MIT via CodePen's public-pen license). Each drop is a DOM element animated
  // purely with CSS transforms (see #hearth-rain in user.css), so the GPU does
  // the work and motion stays smooth. jQuery removed; splats and the dimmer
  // back row are always on.
  function makeItRain() {
    let increment = 0, drops = "", backDrops = "";
    while (increment < 100) {
      const randoHundo = Math.floor(Math.random() * 98 + 1);   // 1..98
      const randoFiver = Math.floor(Math.random() * 4 + 2);    // 2..5
      increment += randoFiver;
      const bottom = randoFiver + randoFiver - 1 + 100;
      const lift = `--b: ${bottom - 100};`;            // % above the top; used to land exactly on the bar
      const timing = `animation-delay: 0.${randoHundo}s; animation-duration: 0.5${randoHundo}s;`;
      const inner = `<div class="hr-stem" style="${timing}"></div><div class="hr-splat" style="${timing}"></div>`;
      drops += `<div class="hr-drop" style="left: ${increment}%; bottom: ${bottom}%; ${lift} ${timing}">${inner}</div>`;
      backDrops += `<div class="hr-drop" style="right: ${increment}%; bottom: ${bottom}%; ${lift} ${timing}">${inner}</div>`;
    }
    rainBox.querySelector(".hr-front").innerHTML = drops;
    rainBox.querySelector(".hr-back").innerHTML = backDrops;
  }

  // ---------- Fireflies (canvas) ----------
  // Motion is scaled by real frame time with sub-pixel positions, and the
  // canvas is backed at the display's pixel ratio, so it glides smoothly.
  let glow = "206,165,113";
  function readColors() {
    glow = getComputedStyle(root).getPropertyValue("--spice-rgb-button-active").trim() || glow;
  }

  let flies = [];
  function seedFlies() {
    flies = Array.from({ length: Math.max(8, Math.round((W * H) / 36000)) }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 10,   // px/s
      phase: Math.random() * Math.PI * 2,
      rate: 0.6 + Math.random() * 0.9,                    // glow pulses, rad/s
    }));
  }

  function drawFireflies(dt) {
    for (const f of flies) {
      f.phase += f.rate * dt;
      f.vx += (Math.random() - 0.5) * 24 * dt;           // gentle wandering
      f.vy += (Math.random() - 0.5) * 24 * dt;
      f.vx = Math.max(-18, Math.min(18, f.vx));
      f.vy = Math.max(-15, Math.min(15, f.vy));
      f.x = (f.x + f.vx * dt + W) % W;
      f.y = (f.y + f.vy * dt + H) % H;
      const a = 0.12 + 0.4 * (Math.sin(f.phase) + 1) / 2;
      ctx.fillStyle = `rgba(${glow}, ${a * 0.22})`;
      ctx.fillRect(f.x - 4, f.y - 4, 10, 10);             // soft halo
      ctx.fillStyle = `rgba(${glow}, ${a})`;
      ctx.fillRect(f.x, f.y, 2, 2);                       // bright core
    }
  }

  let running = false, last = 0, lastColors = 0;
  function frame(t) {
    if (mode !== "fireflies" || document.hidden) {
      running = false;
      ctx.clearRect(0, 0, W, H);
      return;
    }
    requestAnimationFrame(frame);
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;  // clamp stalls
    last = t;
    if (t - lastColors > 1000) { readColors(); lastColors = t; }
    ctx.clearRect(0, 0, W, H);
    drawFireflies(dt);
  }

  function start() {
    fitLayers();
    // rain: (re)build drops when switching to it, empty them otherwise
    const rainOn = mode === "rain";
    if (rainOn && !rainBox.classList.contains("on")) makeItRain();
    if (!rainOn) { rainBox.querySelector(".hr-front").innerHTML = ""; rainBox.querySelector(".hr-back").innerHTML = ""; }
    rainBox.classList.toggle("on", rainOn);
    canvas.classList.toggle("on", mode === "fireflies");
    if (mode === "fireflies" && !running && !document.hidden) {
      running = true; last = 0; lastColors = 0; requestAnimationFrame(frame);
    }
  }
  document.addEventListener("visibilitychange", start);

  // Top-bar toggle button
  const ICONS = {
    off: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 12a3.5 3.5 0 0 1-.4-6.98 4.5 4.5 0 0 1 8.64 1.1A2.95 2.95 0 0 1 12 12H4.5z" opacity=".55"/></svg>`,
    rain: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 9a3.5 3.5 0 0 1-.4-6.98 4.5 4.5 0 0 1 8.64 1.1A2.95 2.95 0 0 1 12 9H4.5z"/><rect x="4" y="11" width="1" height="3"/><rect x="7.5" y="10.5" width="1" height="3"/><rect x="11" y="11" width="1" height="3"/></svg>`,
    fireflies: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="4" width="2" height="2"/><rect x="10" y="2" width="2" height="2"/><rect x="7" y="8" width="2" height="2"/><rect x="12" y="11" width="2" height="2"/><rect x="2" y="12" width="2" height="2"/></svg>`,
  };
  const LABELS = { off: "Weather: off", rain: "Weather: rain", fireflies: "Weather: fireflies" };

  let button = null;
  function syncButton() {
    if (!button) return;
    button.label = LABELS[mode];
    button.icon = ICONS[mode];
  }
  function cycle() {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    S.LocalStorage.set(STORE_KEY, mode);
    syncButton();
    start();
  }
  // Prefer the right side of the top bar (next to the bell); if Spicetify
  // can't find that container in this Spotify layout, fall back to the
  // player bar's right-hand controls.
  function addButton(tries = 0) {
    if (!S.Topbar?.Button && !S.Playbar?.Button) {
      if (tries < 40) setTimeout(() => addButton(tries + 1), 500);
      return;
    }
    if (S.Topbar?.Button) {
      button = new S.Topbar.Button(LABELS[mode], ICONS[mode], cycle, false, true);
      setTimeout(() => {
        if (button?.element?.isConnected) return;
        if (!S.Playbar?.Button) return;
        button.element?.remove();
        button = new S.Playbar.Button(LABELS[mode], ICONS[mode], cycle);
      }, 4000);
    } else {
      button = new S.Playbar.Button(LABELS[mode], ICONS[mode], cycle);
    }
  }
  addButton();
  start();
})();
