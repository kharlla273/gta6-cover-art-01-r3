/* Palm City Cover Studio — editor wiring.
   Loads photos, binds the controls, renders the live preview
   and exports the finished cover as a PNG. Photos are read on
   this machine and never uploaded anywhere. */
"use strict";

const SAMPLE_PHOTOS = [
  "samples/boulevard.jpg",
  "samples/rooftop.jpg",
  "samples/neon-street.jpg",
];

const state = {
  size: "square",
  layout: "hero",
  grade: "sunset",
  title: "OCEAN DRIVE",
  subtitle: "vice coast stories",
  photos: [],
  views: [
    { photo: 0, zoom: 1, dx: 0, dy: 0 },
    { photo: 1, zoom: 1, dx: 0, dy: 0 },
    { photo: 2, zoom: 1, dx: 0, dy: 0 },
    { photo: 0, zoom: 1.15, dx: 0, dy: 0 },
  ],
  badge: true,
  frame: true,
};

let activePhoto = 0;
let selectedPanel = 0;
let previewScale = 1;

const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d");

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load " + src));
    img.src = src;
  });
}

async function loadSamples() {
  const loaded = [];
  for (const src of SAMPLE_PHOTOS) {
    try {
      loaded.push(await loadImage(src));
    } catch (err) {
      console.warn(err.message);
    }
  }
  state.photos = loaded;
  renderTray();
  renderPreview();
}

/* The photo tray: thumbnails of every loaded photo. Clicking
   one makes it the active photo, ready to place in a panel. */
function renderTray() {
  const tray = document.getElementById("photoTray");
  tray.innerHTML = "";
  state.photos.forEach((img, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb" + (i === activePhoto ? " active" : "");
    btn.title = "Photo " + (i + 1);
    const thumb = document.createElement("img");
    thumb.src = img.src;
    thumb.alt = "Photo " + (i + 1);
    btn.appendChild(thumb);
    btn.addEventListener("click", () => {
      activePhoto = i;
      renderTray();
      renderPanelChoices();
    });
    tray.appendChild(btn);
  });
}

/* Choice buttons for layout, grade and size. */
function buildChoices(elId, entries, current, onPick) {
  const box = document.getElementById(elId);
  box.innerHTML = "";
  for (const [key, label] of entries) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice" + (key === current ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      onPick(key);
      buildChoices(elId, entries, key, onPick);
      renderPreview();
    });
    box.appendChild(btn);
  }
}

function renderPanelChoices() {
  const box = document.getElementById("panelPhotoChoices");
  box.innerHTML = "";
  state.photos.forEach((img, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice" + (state.views[selectedPanel].photo === i ? " active" : "");
    btn.textContent = "Photo " + (i + 1);
    btn.addEventListener("click", () => {
      state.views[selectedPanel].photo = i;
      renderPanelChoices();
      renderPreview();
    });
    box.appendChild(btn);
  });
  document.getElementById("panelLabel").textContent =
    "Panel " + (selectedPanel + 1) + " — photo " + (state.views[selectedPanel].photo + 1) + ".";
  document.getElementById("zoomRange").value = state.views[selectedPanel].zoom;
}

/* Size the preview canvas for the chosen export size, then draw. */
function renderPreview() {
  const size = COVER_SIZES[state.size];
  const longSide = Math.max(size.w, size.h);
  previewScale = Math.min(1, 880 / longSide);
  const W = Math.round(size.w * previewScale);
  const H = Math.round(size.h * previewScale);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  renderCover(ctx, W, H, state);
  window.__coverReady = true;
}

/* Which panel holds a point on the preview canvas, if any. */
function panelAt(px, py) {
  const size = COVER_SIZES[state.size];
  const W = Math.round(size.w * previewScale);
  const H = Math.round(size.h * previewScale);
  const geo = layoutGeometry(state.layout, W, H);
  for (let i = 0; i < geo.panels.length; i += 1) {
    const r = geo.panels[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

/* Drag to pan a panel's photo, scroll to zoom, click to place
   the active photo and select the panel. */
function bindCanvas() {
  let drag = null;
  canvas.addEventListener("pointerdown", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const idx = panelAt(px, py);
    if (idx < 0) return;
    drag = { panel: idx, startX: px, startY: py, moved: false };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const dxPx = px - drag.startX;
    const dyPx = py - drag.startY;
    if (Math.abs(dxPx) + Math.abs(dyPx) > 4) drag.moved = true;
    if (!drag.moved) return;
    const view = state.views[drag.panel];
    const img = state.photos[view.photo];
    if (!img) return;
    const size = COVER_SIZES[state.size];
    const W = Math.round(size.w * previewScale);
    const H = Math.round(size.h * previewScale);
    const geo = layoutGeometry(state.layout, W, H);
    const r = geo.panels[drag.panel];
    const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * view.zoom;
    const slackX = Math.max(1, (img.naturalWidth * scale - r.w) / 2);
    const slackY = Math.max(1, (img.naturalHeight * scale - r.h) / 2);
    view.dx = Math.max(-1, Math.min(1, view.dx + dxPx / slackX));
    view.dy = Math.max(-1, Math.min(1, view.dy + dyPx / slackY));
    drag.startX = px;
    drag.startY = py;
    renderPreview();
  });
  canvas.addEventListener("pointerup", () => {
    if (drag && !drag.moved) {
      selectedPanel = drag.panel;
      state.views[drag.panel].photo = activePhoto;
      renderPanelChoices();
      renderPreview();
    }
    drag = null;
  });
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const idx = panelAt(px, py);
    if (idx < 0) return;
    const view = state.views[idx];
    view.zoom = Math.max(1, Math.min(2.5, view.zoom * Math.exp(-ev.deltaY * 0.0012)));
    selectedPanel = idx;
    renderPanelChoices();
    renderPreview();
  }, { passive: false });
}

/* Add the user's own photos from their machine. */
function bindFileInput() {
  const input = document.getElementById("photoInput");
  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    for (const file of files) {
      try {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        state.photos.push(img);
        activePhoto = state.photos.length - 1;
      } catch (err) {
        console.warn("Could not read " + file.name);
      }
    }
    input.value = "";
    renderTray();
    renderPanelChoices();
    renderPreview();
  });
}

/* Export the cover at full size as a PNG download. */
function exportCover() {
  const size = COVER_SIZES[state.size];
  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext("2d"), size.w, size.h, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "palm-city-cover-" + state.size + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    document.getElementById("exportNote").textContent =
      "Exported " + size.w + " × " + size.h + " PNG.";
  }, "image/png");
}

/* Screenshot scenes (?shot=cover or ?shot=editor), used to take
   the entry's screenshots: the cover drawn full-frame, or the
   editor with photos loaded. */
function applyShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (params.get("layout") && COVER_LAYOUTS[params.get("layout")]) state.layout = params.get("layout");
  if (params.get("grade") && COVER_GRADES[params.get("grade")]) state.grade = params.get("grade");
  if (params.get("size") && COVER_SIZES[params.get("size")]) state.size = params.get("size");
  if (params.get("title")) state.title = params.get("title");
  if (params.get("subtitle")) state.subtitle = params.get("subtitle");
  if (shot !== "cover") return;
  document.body.classList.add("shot-cover");
  const px = (params.get("px") || "").split("x");
  const W = parseInt(px[0], 10) || 1280;
  const H = parseInt(px[1], 10) || 720;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  const draw = () => {
    renderCover(ctx, W, H, state);
    window.__coverReady = true;
  };
  renderPreview = draw;
}

function bindControls() {
  buildChoices("layoutChoices", Object.entries(COVER_LAYOUTS), state.layout, (k) => { state.layout = k; });
  buildChoices("gradeChoices", Object.entries(COVER_GRADES).map(([k, g]) => [k, g.label]), state.grade, (k) => { state.grade = k; });
  buildChoices("sizeChoices", Object.entries(COVER_SIZES).map(([k, s]) => [k, s.label]), state.size, (k) => { state.size = k; });
  document.getElementById("titleInput").addEventListener("input", (ev) => {
    state.title = ev.target.value;
    renderPreview();
  });
  document.getElementById("subtitleInput").addEventListener("input", (ev) => {
    state.subtitle = ev.target.value;
    renderPreview();
  });
  document.getElementById("badgeToggle").addEventListener("change", (ev) => {
    state.badge = ev.target.checked;
    renderPreview();
  });
  document.getElementById("frameToggle").addEventListener("change", (ev) => {
    state.frame = ev.target.checked;
    renderPreview();
  });
  document.getElementById("zoomRange").addEventListener("input", (ev) => {
    state.views[selectedPanel].zoom = parseFloat(ev.target.value);
    renderPreview();
  });
  document.getElementById("fillAllBtn").addEventListener("click", () => {
    for (const view of state.views) view.photo = activePhoto;
    renderPanelChoices();
    renderPreview();
  });
  document.getElementById("exportBtn").addEventListener("click", exportCover);
}

async function init() {
  applyShotMode();
  bindControls();
  bindCanvas();
  bindFileInput();
  renderPanelChoices();
  try {
    await Promise.all([
      document.fonts.load("100px Anton"),
      document.fonts.load("60px Pacifico"),
    ]);
  } catch (err) {
    console.warn("Display fonts did not load; using fallbacks.");
  }
  await loadSamples();
  renderPreview();
}

init();
