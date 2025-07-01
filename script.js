"use strict";

const baseShapeSel = document.getElementById("base-shape");
const baseOuterSizeIn = document.getElementById("base-outer-size");
const baseOuterColorIn = document.getElementById("base-outer-color");
const baseOuterOpacityIn = document.getElementById("base-outer-opacity");
const baseOuterOpacityOut = document.getElementById("base-outer-opacity-value");
const baseInnerSizeIn = document.getElementById("base-inner-size");
const baseInnerColorIn = document.getElementById("base-inner-color");
const baseInnerOpacityIn = document.getElementById("base-inner-opacity");
const baseInnerOpacityOut = document.getElementById("base-inner-opacity-value");
const baseCustomSvgTa = document.getElementById("base-custom-svg");
const baseCustomSvgFs = document.getElementById("custom-svg-fieldset");
const baseCustomSizeIn = document.getElementById("base-custom-size");
const baseCustomColorIn = document.getElementById("base-custom-color");
const baseCursorHotspotFs = document.getElementById("base-cursor-hotspot-fieldset");
const baseHotspotGrid = document.getElementById("base-hotspot-grid");

const hoverShapeSel = document.getElementById("hover-shape");
const hoverSizeIn = document.getElementById("hover-size");
const hoverColorIn = document.getElementById("hover-color");
const hoverOpacityIn = document.getElementById("hover-opacity");
const hoverOpacityOut = document.getElementById("hover-opacity-value");
const hoverCustomSvgTa = document.getElementById("hover-custom-svg");
const hoverCustomSvgFs = document.getElementById("hover-custom-svg-fieldset");
const hoverCustomSizeIn = document.getElementById("hover-custom-size");
const hoverCustomColorIn = document.getElementById("hover-custom-color");
const hoverCursorHotspotFs = document.getElementById("hover-cursor-hotspot-fieldset");
const hoverHotspotGrid = document.getElementById("hover-hotspot-grid");

const cssOutput = document.getElementById("css-output");
const copyButton = document.getElementById("copy-button");
const previewArea = document.getElementById("preview-area");

/**
 * Build preset shape SVG inner shapes strings similarly as before
 */
function shapeSvg(shape, size, fill, opacity) {
  /*
  shape: circle, square, triangle-up, triangle-down, diamond
  size: overall size in px
  fill: color string (#hex)
  opacity: number 0-1
  returns SVG string without encoding
  The viewport is width and height = size
  The shape is centered in the viewport.
  */

  if (size < 1) size = 1;
  if (opacity < 0) opacity = 0;
  if (opacity > 1) opacity = 1;

  const half = size / 2;

  switch (shape) {
    case "circle":
      return `<circle cx="${half}" cy="${half}" r="${half}" fill="${fill}" opacity="${opacity}" stroke="none"/>`;

    case "square":
      return `<rect x="0" y="0" width="${size}" height="${size}" fill="${fill}" opacity="${opacity}" stroke="none"/>`;

    case "triangle-up":
      // points: bottom left, bottom right, top middle
      return `<polygon points="0,${size} ${size},${size} ${half},0" fill="${fill}" opacity="${opacity}" stroke="none"/>`;

    case "triangle-down":
      // points: top-left, top-right, bottom middle
      return `<polygon points="0,0 ${size},0 ${half},${size}" fill="${fill}" opacity="${opacity}" stroke="none"/>`;

    case "diamond":
      // diamond is a rotated square: points middle-top, right-middle, bottom-middle, left-middle
      return `<polygon points="${half},0 ${size},${half} ${half},${size} 0,${half}" fill="${fill}" opacity="${opacity}" stroke="none"/>`;

    default:
      // fallback circle
      return `<circle cx="${half}" cy="${half}" r="${half}" fill="${fill}" opacity="${opacity}" stroke="none"/>`;
  }
}

function encodeSvg(svg) {
  return encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/#/g, "%23")
    .replace(/;/g, "%3B")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\+/g, "%2B")
    .replace(/\s+/g, "%20");
}

// Replace or add fill attributes in custom SVG with user chosen fill color (only if fill is present or not)
function replaceFillColors(svgContent, color) {
  if (!color) return svgContent;
  if (color.toLowerCase() === "none") return svgContent;
  let s = svgContent;

  // Replace fill="..." attributes:
  s = s.replace(/fill="(.*?)"/gi, (m, p1) => {
    if (p1.toLowerCase() === "none") return m; // keep none
    return `fill="${color}"`;
  });

  // Replace fill:#... inside style attributes (e.g. style="fill:#000000;")
  s = s.replace(/fill:\s*#[0-9a-fA-F]{3,6}/gi, `fill:${color}`);

  // For elements missing a fill attribute, add fill="color" to each element if possible
  // Add fill to any element that is a direct SVG shape tag and does not have fill attribute
  // We'll attempt a simple regex to add fill to the start tag if no fill attribute detected
  // This is a best effort, assumes well-formed SVG content.

  // List of common shape tags to add fill attribute to if missing
  const shapeTags = ["path", "circle", "ellipse", "rect", "polygon", "line", "polyline"];

  shapeTags.forEach(tag => {
    // Regex to find tags without fill attribute inside:
    // match <tag ... > not containing fill= anywhere in the open tag
    // This version handles both normal and self-closing tags
    const regex = new RegExp(`(<${tag}\\b(?![^>]*fill=)[^>]*?)(\\s*/?>)`, "gi");
    s = s.replace(regex, (match, p1, p2) => {
      const needsSpace = /\s$/.test(p1) ? "" : " ";
      return `${p1}${needsSpace}fill="${color}"${p2}`;
    });
  });

  return s;
}

function buildBaseCursorSvg(outerShape, outerSize, outerColor, outerOpacity, innerSize, innerColor, innerOpacity) {
  /*
  Build SVG with two shapes stacked in same viewport (size = outerSize x outerSize)
  We center both shapes.
  If shapes are circles, use radii accordingly.
  For non-circle shapes, inner shape is same shape scaled smaller by ratio innerSize/outerSize.
  */

  let svgWidth = outerSize;
  let svgHeight = outerSize;

  // Outer shape SVG snippet (no wrapper)
  const outerSvgShape = shapeSvg(outerShape, outerSize, outerColor, outerOpacity);

  let innerSvgShape = "";
  if (innerSize > 0) {
    if (outerShape === "circle") {
      // inner circle r = innerSize / 2, centered cx/cy = outerSize/2
      const halfOuter = outerSize / 2;
      const halfInner = innerSize / 2;
      innerSvgShape = `<circle cx="${halfOuter}" cy="${halfOuter}" r="${halfInner}" fill="${innerColor}" opacity="${innerOpacity}" stroke="none"/>`;
    } else {
      const scale = innerSize / outerSize;
      const innerShape = shapeSvg(outerShape, innerSize, innerColor, innerOpacity);

      const cx = outerSize / 2;
      const cy = outerSize / 2;

      innerSvgShape = `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-innerSize / 2} ${-innerSize / 2})">${innerShape}</g>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">${outerSvgShape}${innerSvgShape}</svg>`;
  return svg;
}

function buildHoverCursorSvg(shape, size, color, opacity) {
  /*
  Single shape SVG, size x size dimensions, shape centered
  */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${shapeSvg(shape, size, color, opacity)}</svg>`;
  return svg;
}

function buildSvgWrapper(innerContent, size) {
  // Wraps the inner SVG markup in a full SVG wrapper, scaled to size x size, no xmlns duplication.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${innerContent}</svg>`;
}

function getBaseCursorCssValue(svgString, size, hotX, hotY) {
  // returns CSS cursor url() value with proper encoding & hotspot position
  // Clamp hotspot coords between 0 and size
  const clampedHotX = Math.min(Math.max(hotX, 0), size);
  const clampedHotY = Math.min(Math.max(hotY, 0), size);

  return `url("data:image/svg+xml,${encodeSvg(svgString)}") ${clampedHotX} ${clampedHotY}, auto`;
}

function getHoverCursorCssValue(svgString, size, hotX, hotY) {
  // returns CSS cursor url() value with proper encoding & hotspot position
  // Clamp hotspot coords between 0 and size
  const clampedHotX = Math.min(Math.max(hotX, 0), size);
  const clampedHotY = Math.min(Math.max(hotY, 0), size);

  return `url("data:image/svg+xml,${encodeSvg(svgString)}") ${clampedHotX} ${clampedHotY}, pointer`;
}

function updateOpacityOutput(inputRange, outputText) {
  outputText.textContent = Number(inputRange.value).toFixed(2);
}

function sanitizeCustomSvgInput(svgString) {
  // Basic sanitization:
  // - trim
  // - remove xml declaration or <svg> wrapper if present to avoid nesting or broken SVG.
  // Since we expect inner content only, strip wrapper if present.
  let s = svgString.trim();
  if (!s) return "";

  // Remove xml declarations if any
  s = s.replace(/<\?xml.*?\?>/gi, "");

  // Remove outer <svg> and </svg> tags if present
  s = s.replace(/<svg[^>]*>/gi, "");
  s = s.replace(/<\/svg>/gi, "");

  return s.trim();
}

function toggleBaseCustomSvgFields() {
  if (baseShapeSel.value === "custom") {
    baseCustomSvgFs.style.display = "block";
    baseCursorHotspotFs.style.display = "block";
    Array.from(document.querySelectorAll("#base-cursor .preset-fields")).forEach(fs => {
      fs.style.display = "none";
    });
  } else {
    baseCustomSvgFs.style.display = "none";
    // Always show base hotspot fieldset for all shapes (changed per request)
    baseCursorHotspotFs.style.display = "block";
    Array.from(document.querySelectorAll("#base-cursor .preset-fields")).forEach(fs => {
      fs.style.display = "block";
    });
  }
}

function toggleHoverCustomSvgFields() {
  if (hoverShapeSel.value === "custom") {
    hoverCustomSvgFs.style.display = "block";
    hoverCursorHotspotFs.style.display = "block";
    Array.from(document.querySelectorAll("#hover-cursor .preset-fields")).forEach(fs => {
      fs.style.display = "none";
    });
  } else {
    hoverCustomSvgFs.style.display = "none";
    // Always show hover hotspot fieldset for all shapes (changed per request)
    hoverCursorHotspotFs.style.display = "block";
    Array.from(document.querySelectorAll("#hover-cursor .preset-fields")).forEach(fs => {
      fs.style.display = "block";
    });
  }
}

// Hotspot selection states and handlers for Base and Hover
function setupHotspotGrid(gridContainer, sizeInput) {
  let buttons = Array.from(gridContainer.querySelectorAll('button[role="radio"]'));
  let selectedButton = null;

  function updateTabs() {
    buttons.forEach(btn => {
      btn.tabIndex = btn === selectedButton ? 0 : -1;
    });
  }

  function selectButton(btn) {
    if (selectedButton) {
      selectedButton.setAttribute("aria-checked", "false");
    }
    selectedButton = btn;
    selectedButton.setAttribute("aria-checked", "true");
    updateTabs();
  }

  // Initialize: check if any button aria-checked true, else default center
  let checkedButton = buttons.find(b => b.getAttribute("aria-checked") === "true");
  if (!checkedButton) {
    let centerBtn = buttons.find(b => b.dataset.hotx === "50" && b.dataset.hoty === "50");
    if (centerBtn) {
      selectButton(centerBtn);
    } else {
      selectButton(buttons[4]);
    }
  } else {
    selectButton(checkedButton);
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => selectButton(btn));
    btn.addEventListener("keydown", (e) => {
      const idx = buttons.indexOf(btn);
      if (idx < 0) return;
      let nextIdx = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextIdx = (idx + 1) % buttons.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextIdx = (idx - 1 + buttons.length) % buttons.length;
      }
      if (nextIdx !== null) {
        e.preventDefault();
        selectButton(buttons[nextIdx]);
        buttons[nextIdx].focus();
      }
    });
  });

  return {
    getHotspot() {
      if (!selectedButton) return { xPercent: 50, yPercent: 50 };
      return {
        xPercent: Number(selectedButton.dataset.hotx),
        yPercent: Number(selectedButton.dataset.hoty),
      };
    },
    setHotspotByPercent(xPercent, yPercent) {
      let btn = buttons.find(
        b => Number(b.dataset.hotx) === xPercent && Number(b.dataset.hoty) === yPercent
      );
      if (btn) {
        selectButton(btn);
      }
    },
    selectButton,
  };
}

const baseHotspotSelector = setupHotspotGrid(baseHotspotGrid, baseCustomSizeIn);
const hoverHotspotSelector = setupHotspotGrid(hoverHotspotGrid, hoverCustomSizeIn);

function updateOutputs() {
  const baseShape = baseShapeSel.value;

  let baseOuterSize = Math.max(1, Math.min(256, Number(baseOuterSizeIn.value)));
  baseOuterSizeIn.value = baseOuterSize;
  const baseOuterColor = baseOuterColorIn.value;
  const baseOuterOpacity = Math.min(1, Math.max(0, Number(baseOuterOpacityIn.value)));
  const baseInnerSize = Math.max(0, Math.min(baseOuterSize, Number(baseInnerSizeIn.value)));
  baseInnerSizeIn.value = baseInnerSize;
  const baseInnerColor = baseInnerColorIn.value;
  const baseInnerOpacity = Math.min(1, Math.max(0, Number(baseInnerOpacityIn.value)));

  const hoverShape = hoverShapeSel.value;
  let hoverSize = Math.max(1, Math.min(256, Number(hoverSizeIn.value)));
  hoverSizeIn.value = hoverSize;
  const hoverColor = hoverColorIn.value;
  const hoverOpacity = Math.min(1, Math.max(0, Number(hoverOpacityIn.value)));

  let baseCustomSize = Math.max(1, Math.min(256, Number(baseCustomSizeIn.value)));
  baseCustomSizeIn.value = baseCustomSize;
  const baseCustomColor = baseCustomColorIn.value;

  let hoverCustomSize = Math.max(1, Math.min(256, Number(hoverCustomSizeIn.value)));
  hoverCustomSizeIn.value = hoverCustomSize;
  const hoverCustomColor = hoverCustomColorIn.value;

  const baseHotspotPercent = baseHotspotSelector.getHotspot();
  const baseHotspotX = Math.round((baseHotspotPercent.xPercent / 100) * (baseShape === "custom" ? baseCustomSize : baseOuterSize));
  const baseHotspotY = Math.round((baseHotspotPercent.yPercent / 100) * (baseShape === "custom" ? baseCustomSize : baseOuterSize));
  const hoverHotspotPercent = hoverHotspotSelector.getHotspot();
  const hoverHotspotX = Math.round((hoverHotspotPercent.xPercent / 100) * (hoverShape === "custom" ? hoverCustomSize : hoverSize));
  const hoverHotspotY = Math.round((hoverHotspotPercent.yPercent / 100) * (hoverShape === "custom" ? hoverCustomSize : hoverSize));

  let baseSvg = "";
  let hoverSvg = "";

  if (baseShape === "custom") {
    let rawSvg = sanitizeCustomSvgInput(baseCustomSvgTa.value);
    if (rawSvg) {
      rawSvg = replaceFillColors(rawSvg, baseCustomColor);
      baseSvg = buildSvgWrapper(rawSvg, baseCustomSize);
    } else {
      baseSvg = buildBaseCursorSvg("circle", baseOuterSize, baseOuterColor, baseOuterOpacity, baseInnerSize, baseInnerColor, baseInnerOpacity);
    }
  } else {
    baseSvg = buildBaseCursorSvg(
      baseShape,
      baseOuterSize,
      baseOuterColor,
      baseOuterOpacity,
      baseInnerSize,
      baseInnerColor,
      baseInnerOpacity
    );
  }

  if (hoverShape === "custom") {
    let rawSvg = sanitizeCustomSvgInput(hoverCustomSvgTa.value);
    if (rawSvg) {
      rawSvg = replaceFillColors(rawSvg, hoverCustomColor);
      hoverSvg = buildSvgWrapper(rawSvg, hoverCustomSize);
    } else {
      hoverSvg = buildHoverCursorSvg("circle", hoverSize, hoverColor, hoverOpacity);
    }
  } else {
    hoverSvg = buildHoverCursorSvg(hoverShape, hoverSize, hoverColor, hoverOpacity);
  }

  const baseCursorCss = getBaseCursorCssValue(baseSvg, baseShape === "custom" ? baseCustomSize : baseOuterSize, baseHotspotX, baseHotspotY);
  const hoverCursorCss = getHoverCursorCssValue(hoverSvg, hoverShape === "custom" ? hoverCustomSize : hoverSize, hoverHotspotX, hoverHotspotY);

  const cssCode = `html {
  cursor: ${baseCursorCss};
}
a, button, input, select, textarea, details, summary, .cursor-pointer  {
  cursor: ${hoverCursorCss} !important;
}
`;

  cssOutput.textContent = cssCode;

  document.documentElement.style.setProperty("--cursor-base", baseCursorCss);
  document.documentElement.style.setProperty("--cursor-hover", hoverCursorCss);
}

function updateAllOpacityOutputs() {
  updateOpacityOutput(baseOuterOpacityIn, baseOuterOpacityOut);
  updateOpacityOutput(baseInnerOpacityIn, baseInnerOpacityOut);
  updateOpacityOutput(hoverOpacityIn, hoverOpacityOut);
}

[
  baseShapeSel,
  baseOuterSizeIn,
  baseOuterColorIn,
  baseOuterOpacityIn,
  baseInnerSizeIn,
  baseInnerColorIn,
  baseInnerOpacityIn,
  baseCustomSvgTa,
  baseCustomSizeIn,
  baseCustomColorIn,
  hoverShapeSel,
  hoverSizeIn,
  hoverColorIn,
  hoverOpacityIn,
  hoverCustomSvgTa,
  hoverCustomSizeIn,
  hoverCustomColorIn,
].forEach((el) => {
  el.addEventListener("input", () => {
    updateAllOpacityOutputs();
    updateOutputs();
  });
});

baseShapeSel.addEventListener("change", () => {
  toggleBaseCustomSvgFields();
  updateOutputs();
});
hoverShapeSel.addEventListener("change", () => {
  toggleHoverCustomSvgFields();
  updateOutputs();
});

Array.from(baseHotspotGrid.querySelectorAll('button[role="radio"]')).forEach(btn => {
  btn.addEventListener("click", () => {
    updateOutputs();
  });
});
Array.from(hoverHotspotGrid.querySelectorAll('button[role="radio"]')).forEach(btn => {
  btn.addEventListener("click", () => {
    updateOutputs();
  });
});

copyButton.addEventListener("click", () => {
  const text = cssOutput.textContent;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copyButton.textContent = "Copied!";
      copyButton.disabled = true;
      setTimeout(() => {
        copyButton.textContent = "Copy to Clipboard";
        copyButton.disabled = false;
      }, 2000);
    })
    .catch(() => {
      alert("Failed to copy text. Please copy manually.");
    });
});

updateAllOpacityOutputs();
toggleBaseCustomSvgFields();
toggleHoverCustomSvgFields();
updateOutputs();