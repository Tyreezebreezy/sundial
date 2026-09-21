// Page-side probes. Each export is a plain, self-contained function: it is
// serialised with Function.prototype.toString() and evaluated inside the page
// (see Win.probe), so it must not close over anything from this module.
// selfcheck.mjs compiles every probe to prove the source stays valid.

/**
 * A fair count of the controls a person can act on. A native radio or checkbox
 * is one control whether its input is visually hidden (a styled label is the
 * face) or not. Elements at opacity 0 (hover-only controls at rest) are skipped.
 * opts: { selector }
 */
export function censusProbe(opts) {
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none"
    );
  };
  const label = (e) =>
    (
      e.getAttribute("aria-label") ||
      e.innerText ||
      e.value ||
      e.type ||
      e.tagName
    )
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 24);
  const controls = [...document.querySelectorAll(opts.selector)].filter((e) => {
    if (e.matches("input[type=radio], input[type=checkbox]"))
      return visible(e.closest("label") || e);
    return visible(e) && getComputedStyle(e).opacity !== "0";
  });
  return { controls: controls.length, names: controls.map(label) };
}

/**
 * Overflow, clipping and target-size probe for the current layout.
 * opts: { interactiveSelector, textSelector, truncationSelectors[], heroSelector, minTargetPx, autoClip }
 *   interactiveSelector - controls: checked for leaving the viewport and for minimum target size
 *   textSelector        - other elements (readouts, labels): checked for leaving the viewport only
 *   truncationSelectors - elements whose own text must never be cut by their box
 *   autoClip            - also flag any text element that clips its own overflow
 */
export function layoutProbe(opts) {
  const vw = innerWidth;
  const vh = innerHeight;
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return (
      r.width > 1 &&
      r.height > 1 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      cs.opacity !== "0"
    );
  };
  const label = (e) =>
    (e.getAttribute("aria-label") || e.textContent || e.className || e.tagName)
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);

  // What a person can point at. A visually hidden native radio/checkbox is
  // represented by its label, because that is the clickable face.
  const faces = new Set();
  for (const e of document.querySelectorAll(opts.interactiveSelector)) {
    if (e.matches("input[type=radio], input[type=checkbox]")) {
      const r = e.getBoundingClientRect();
      const hidden =
        getComputedStyle(e).opacity === "0" || r.width <= 2 || r.height <= 2;
      faces.add(hidden ? e.closest("label") || e : e);
    } else faces.add(e);
  }
  const vis = [...faces].filter(visible);
  const textEls = opts.textSelector
    ? [...document.querySelectorAll(opts.textSelector)].filter(visible)
    : [];
  const offEdge = [...vis, ...textEls]
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return r.right > vw + 0.5 || r.left < -0.5;
    })
    .map(label);

  const explicit = opts.truncationSelectors.length
    ? [...document.querySelectorAll(opts.truncationSelectors.join(","))]
        .filter((e) => e.scrollWidth > e.clientWidth + 1)
        .map(label)
    : [];
  const auto = [];
  if (opts.autoClip) {
    for (const e of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(e);
      const clips =
        cs.textOverflow === "ellipsis" || /hidden|clip/.test(cs.overflowX);
      if (!clips || e.scrollWidth <= e.clientWidth + 1) continue;
      if (!visible(e) || !(e.innerText || "").trim()) continue;
      auto.push(label(e));
    }
  }

  const small = vis
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return r.height < opts.minTargetPx || r.width < opts.minTargetPx;
    })
    .map(label);
  const hero = opts.heroSelector
    ? document.querySelector(opts.heroSelector)
    : null;
  const root = document.documentElement;
  return {
    hOverflow: root.scrollWidth > vw + 1,
    vScroll: root.scrollHeight > vh + 1,
    scrollW: root.scrollWidth,
    scrollH: root.scrollHeight,
    innerW: vw,
    innerH: vh,
    offEdge,
    truncated: [...new Set([...explicit, ...auto])],
    smallTargets: small,
    hero: hero ? Math.round(hero.getBoundingClientRect().width) : null,
  };
}

/**
 * Describe the focused element and whether it shows a >= 2px focus ring.
 * opts: { faceSelectors[] } - selectors for the visible "face" of a visually
 * hidden native input (the ring is drawn on the face, not the input).
 */
export function focusProbe(opts) {
  const e = document.activeElement;
  if (!e || e === document.body) return null;
  const ringOn = (el) => {
    const cs = getComputedStyle(el);
    return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2;
  };
  let face = e;
  if (e.matches("input[type=radio], input[type=checkbox]")) {
    const scope = e.closest("label");
    const found =
      scope && opts.faceSelectors.length
        ? scope.querySelector(opts.faceSelectors.join(","))
        : null;
    face = found || e;
  }
  const r = e.getBoundingClientRect();
  return {
    tag: e.tagName.toLowerCase() + (e.type ? ":" + e.type : ""),
    name: (
      e.getAttribute("aria-label") ||
      (e.labels && e.labels[0] && e.labels[0].textContent) ||
      e.textContent ||
      ""
    )
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 34),
    ring: ringOn(e) || ringOn(face),
    w: Math.round(r.width),
    h: Math.round(r.height),
  };
}

/**
 * Overflow and clipping inside a small window (a widget, a popover).
 * opts: { clipSelectors[] } - elements whose content must never be cut.
 * An element is cut when its content is wider than its box, or taller than its box AND the box clips
 * vertically (overflow other than visible). A visible glyph box a pixel taller than its line box is
 * not a defect.
 */
export function clipProbe(opts) {
  const root = document.documentElement;
  const cut = (e) =>
    e.scrollWidth > e.clientWidth + 1 ||
    (getComputedStyle(e).overflowY !== "visible" &&
      e.scrollHeight > e.clientHeight + 1);
  const clipped = [...document.querySelectorAll(opts.clipSelectors.join(","))]
    .filter(cut)
    .map((e) =>
      (e.getAttribute("aria-label") || e.className || e.tagName)
        .toString()
        .slice(0, 40),
    );
  return {
    inner: [innerWidth, innerHeight],
    overflowX: root.scrollWidth > innerWidth + 1,
    overflowY: root.scrollHeight > innerHeight + 1,
    clipped,
  };
}

/** Running and infinite CSS/Web animations (motion budget, reduced-motion checks). */
export function animationsProbe() {
  const all = document.getAnimations();
  return {
    running: all.filter((a) => a.playState === "running").length,
    infinite: all.filter(
      (a) => a.effect && a.effect.getComputedTiming().iterations === Infinity,
    ).length,
  };
}

/** Center of the first element matching a selector, in viewport coordinates. */
export function centerProbe(selector) {
  const e = document.querySelector(selector);
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}

/** Programmatic click on the first control whose text or aria-label equals `text`. */
export function clickTextProbe(args) {
  const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const want = args.text.toLowerCase();
  const el = [...document.querySelectorAll(args.selector)].find(
    (e) =>
      norm(e.textContent) === want ||
      (e.getAttribute("aria-label") || "").toLowerCase() === want,
  );
  if (!el) return "NOT_FOUND:" + want;
  el.click();
  return "ok";
}

/** Set an input/select value the way React (and other frameworks) notice. */
export function setValueProbe(args) {
  const el = document.querySelector(args.selector);
  if (!el) return "NOT_FOUND";
  const proto =
    el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(
    el,
    String(args.value),
  );
  el.dispatchEvent(
    new Event(el instanceof HTMLSelectElement ? "change" : "input", {
      bubbles: true,
    }),
  );
  return "ok";
}

/** Normalised innerText of the first match, or null. */
export function textProbe(selector) {
  const e = document.querySelector(selector);
  return e ? e.innerText.trim().replace(/\s+/g, " ") : null;
}
