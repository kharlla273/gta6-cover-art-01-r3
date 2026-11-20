/* Palm City Cover Studio — cover render engine.
   Draws multi-panel poster-style cover art onto any 2D canvas.
   Plain Canvas 2D, no libraries, no network. All geometry is
   relative to the canvas size, so the same code renders the
   live preview and the full-size export. */
"use strict";

/* Export sizes: the common post sizes. */
const COVER_SIZES = {
  square: { w: 1080, h: 1080, label: "Square · 1080 × 1080" },
  portrait: { w: 1080, h: 1350, label: "Portrait · 1080 × 1350" },
  wide: { w: 1920, h: 1080, label: "Wide · 1920 × 1080" },
};

/* Colour grades. Each wash is a translucent fill drawn over a
   photo with a blend mode; titleA/titleB colour the caption. */
const COVER_GRADES = {
  sunset: {
    label: "Vice Sunset",
    washes: [
      { fill: "#ff5a28", op: "soft-light", alpha: 0.55 },
      { fill: "#ffb347", op: "overlay", alpha: 0.22 },
    ],
    titleA: "#ffe259",
    titleB: "#ff7518",
    sub: "#ffd9a0",
  },
  neon: {
    label: "Neon Nights",
    washes: [
      { fill: "#ff2e88", op: "soft-light", alpha: 0.5 },
      { fill: "#22d3ee", op: "overlay", alpha: 0.2 },
    ],
    titleA: "#fdf2f8",
    titleB: "#ff2e88",
    sub: "#67e8f9",
  },
  teal: {
    label: "Teal Heat",
    washes: [
      { fill: "#2dd4bf", op: "soft-light", alpha: 0.5 },
      { fill: "#f97316", op: "overlay", alpha: 0.22 },
    ],
    titleA: "#fef08a",
    titleB: "#2dd4bf",
    sub: "#fdba74",
  },
  golden: {
    label: "Golden Hour",
    washes: [
      { fill: "#fbbf24", op: "soft-light", alpha: 0.45 },
      { fill: "#ffffff", op: "overlay", alpha: 0.08 },
    ],
    titleA: "#fff7cc",
    titleB: "#f59e0b",
    sub: "#fde68a",
  },
  noir: {
    label: "Mono Noir",
    washes: [
      { fill: "#808080", op: "saturation", alpha: 1 },
      { fill: "#111827", op: "overlay", alpha: 0.35 },
    ],
    titleA: "#ffffff",
    titleB: "#9ca3af",
    sub: "#d1d5db",
  },
};

/* Layout names shown in the editor. */
const COVER_LAYOUTS = {
  hero: "Hero + strips",
  grid4: "Four panel grid",
  bleed: "Full bleed",
  triptych: "Triptych",
};

/* Panel rectangles for a layout, as fractions of the canvas.
   Returns { panels, title } where title is the caption zone. */
function layoutGeometry(layout, W, H) {
  const gap = Math.round(Math.min(W, H) * 0.014);
  const edge = Math.round(Math.min(W, H) * 0.024);
  const bandH = Math.round(H * 0.185);
  const top = edge;
  const bottom = H - edge - bandH;
  const left = edge;
  const right = W - edge;
  const title = { x: edge, y: H - edge - bandH + gap, w: W - edge * 2, h: bandH - gap };

  if (layout === "hero") {
    const split = Math.round(left + (right - left) * 0.6);
    const stripH = Math.round((bottom - top - gap * 2) / 3);
    return {
      panels: [
        { x: left, y: top, w: split - left - gap, h: bottom - top },
        { x: split, y: top, w: right - split, h: stripH },
        { x: split, y: top + stripH + gap, w: right - split, h: stripH },
        { x: split, y: top + (stripH + gap) * 2, w: right - split, h: bottom - (top + (stripH + gap) * 2) },
      ],
      title,
    };
  }
  if (layout === "grid4") {
    const colW = Math.round((right - left - gap) / 2);
    const rowH = Math.round((bottom - top - gap) / 2);
    return {
      panels: [
        { x: left, y: top, w: colW, h: rowH },
        { x: left + colW + gap, y: top, w: right - (left + colW + gap), h: rowH },
        { x: left, y: top + rowH + gap, w: colW, h: bottom - (top + rowH + gap) },
        { x: left + colW + gap, y: top + rowH + gap, w: right - (left + colW + gap), h: bottom - (top + rowH + gap) },
      ],
      title,
    };
  }
  if (layout === "bleed") {
    return {
      panels: [{ x: 0, y: 0, w: W, h: H }],
      title: { x: edge, y: H - bandH - edge, w: W - edge * 2, h: bandH },
    };
  }
  /* triptych: three tall panels side by side. */
  const colW = Math.round((right - left - gap * 2) / 3);
  return {
    panels: [
      { x: left, y: top, w: colW, h: bottom - top },
      { x: left + colW + gap, y: top, w: colW, h: bottom - top },
      { x: left + (colW + gap) * 2, y: top, w: right - (left + (colW + gap) * 2), h: bottom - top },
    ],
    title,
  };
}

/* Draw one photo into a panel rect, cover-fit, with the panel's
   zoom and pan. view.dx / view.dy run from -1 to 1 across the
   slack the zoom leaves. */
function drawPanelPhoto(ctx, img, rect, view) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = (view && view.zoom) || 1;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2);
  const slackY = Math.max(0, (dh - rect.h) / 2);
  const dx = (view && view.dx) || 0;
  const dy = (view && view.dy) || 0;
  const x = rect.x + (rect.w - dw) / 2 + dx * slackX;
  const y = rect.y + (rect.h - dh) / 2 + dy * slackY;
  ctx.drawImage(img, x, y, dw, dh);
}

/* A sunset placeholder for a panel with no photo yet: gradient
   sky, a low sun and palm fronds drawn as dark arcs. */
function drawPlaceholderPanel(ctx, rect, grade) {
  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sky.addColorStop(0, grade.titleB);
  sky.addColorStop(0.55, grade.titleA);
  sky.addColorStop(1, "#1b1035");
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sunR = Math.min(rect.w, rect.h) * 0.22;
  const sunX = rect.x + rect.w * 0.5;
  const sunY = rect.y + rect.h * 0.42;
  ctx.fillStyle = "rgba(255, 244, 200, 0.95)";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(20, 8, 32, 0.85)";
  ctx.lineWidth = Math.max(2, Math.min(rect.w, rect.h) * 0.012);
  ctx.lineCap = "round";
  const fronds = 5;
  for (let i = 0; i < fronds; i += 1) {
    const a = Math.PI * (0.15 + (i / (fronds - 1)) * 0.7);
    const bx = rect.x + rect.w * 0.12;
    const by = rect.y + rect.h * 0.98;
    const tipX = bx + Math.cos(a) * rect.w * 0.55;
    const tipY = by - Math.sin(a) * rect.h * 0.6;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + (tipX - bx) * 0.5, by - rect.h * 0.55, tipX, tipY);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(20, 8, 32, 0.55)";
  ctx.fillRect(rect.x, rect.y + rect.h * 0.88, rect.w, rect.h * 0.12);
}

/* Paint a grade's washes over a panel rect. */
function applyGrade(ctx, rect, grade) {
  for (const wash of grade.washes) {
    ctx.save();
    ctx.globalCompositeOperation = wash.op;
    ctx.globalAlpha = wash.alpha;
    ctx.fillStyle = wash.fill;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
}

/* Shrink a font size until the text fits maxWidth. */
function fitFontPx(ctx, text, maxWidth, startPx, family) {
  let px = startPx;
  ctx.font = px + "px " + family;
  while (px > 20 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = px + "px " + family;
  }
  return px;
}

/* The caption block: a dark scrim, the big Anton title with a
   sunset gradient fill and a dark outline, and the script
   subtitle in Pacifico with a neon glow. */
function drawCaptionBlock(ctx, zone, title, subtitle, grade, W) {
  const scrim = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h);
  scrim.addColorStop(0, "rgba(8, 4, 18, 0)");
  scrim.addColorStop(0.35, "rgba(8, 4, 18, 0.55)");
  scrim.addColorStop(1, "rgba(8, 4, 18, 0.88)");
  ctx.fillStyle = scrim;
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

  const pad = Math.round(zone.w * 0.02);
  const text = (title || "UNTITLED").toUpperCase();
  const maxW = zone.w - pad * 2;
  const startPx = Math.round(zone.h * 0.52);
  const px = fitFontPx(ctx, text, maxW, startPx, "Anton, 'Arial Black', sans-serif");
  const baseY = zone.y + zone.h - Math.round(zone.h * 0.3);

  ctx.save();
  ctx.translate(zone.x + pad, baseY);
  ctx.transform(1, 0, -0.045, 1, 0, 0);
  ctx.font = px + "px Anton, 'Arial Black', sans-serif";
  ctx.textBaseline = "alphabetic";
  const grad = ctx.createLinearGradient(0, -px, 0, 0);
  grad.addColorStop(0, grade.titleA);
  grad.addColorStop(1, grade.titleB);
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, px * 0.07);
  ctx.strokeStyle = "rgba(10, 4, 20, 0.9)";
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();

  if (subtitle) {
    const subPx = Math.round(zone.h * 0.24);
    ctx.save();
    ctx.font = subPx + "px Pacifico, cursive";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = grade.sub;
    ctx.shadowBlur = Math.round(subPx * 0.45);
    ctx.fillStyle = grade.sub;
    ctx.fillText(subtitle, zone.x + pad + Math.round(px * 0.08), zone.y + zone.h - Math.round(zone.h * 0.06));
    ctx.restore();
  }
}

/* A small star badge in the corner: five stars and a ribbon line. */
function drawStarBadge(ctx, x, y, scale, grade) {
  const star = "★".repeat(5);
  const px = Math.round(22 * scale);
  ctx.save();
  ctx.font = px + "px 'Arial Black', sans-serif";
  const w = ctx.measureText(star).width + px * 1.1;
  const h = px * 1.9;
  ctx.fillStyle = "rgba(8, 4, 18, 0.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.textBaseline = "middle";
  ctx.fillText(star, x + px * 0.55, y + h / 2 + 1);
  ctx.restore();
}

/* Deterministic film grain: a seeded generator, so the same
   cover always renders the same specks. */
function drawGrain(ctx, W, H) {
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const count = Math.round((W * H) / 1100);
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const light = next() > 0.5;
    ctx.fillStyle = light ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(Math.floor(next() * W), Math.floor(next() * H), 1.6, 1.6);
  }
  ctx.restore();
}

/* A soft dark vignette around the edges. */
function drawVignette(ctx, W, H) {
  const r = Math.sqrt(W * W + H * H) / 2;
  const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(5,2,12,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* Render a whole cover into ctx at W x H pixels.
   state: { layout, grade, title, subtitle, photos, views,
            badge, frame }
   photos: array of loaded images; views[i]: { photo, zoom, dx, dy } */
function renderCover(ctx, W, H, state) {
  const grade = COVER_GRADES[state.grade] || COVER_GRADES.sunset;
  const geo = layoutGeometry(state.layout || "hero", W, H);
  const gap = Math.round(Math.min(W, H) * 0.014);

  ctx.fillStyle = "#0a0616";
  ctx.fillRect(0, 0, W, H);

  geo.panels.forEach((rect, i) => {
    const view = (state.views && state.views[i]) || { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const img = state.photos && state.photos[view.photo];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawPanelPhoto(ctx, img, rect, view);
    } else {
      drawPlaceholderPanel(ctx, rect, grade);
    }
    applyGrade(ctx, rect, grade);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(1.5, gap * 0.45);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  drawCaptionBlock(ctx, geo.title, state.title, state.subtitle, grade, W);

  if (state.badge) {
    const s = Math.min(W, H) / 1080;
    drawStarBadge(ctx, W - Math.round(190 * s) - Math.round(24 * s), Math.round(24 * s), s, grade);
  }
  if (state.frame) {
    const fw = Math.max(3, Math.round(Math.min(W, H) * 0.008));
    ctx.strokeStyle = "#f8f7ff";
    ctx.lineWidth = fw;
    ctx.strokeRect(fw / 2, fw / 2, W - fw, H - fw);
  }
  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);
}
