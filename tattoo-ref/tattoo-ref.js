// tattoo-ref.js
let originalImg = null;
let imgNaturalWidth = 0;
let imgNaturalHeight = 0;
let zoomFactor = 1;

const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");

const contrastSlider = document.getElementById("contrast");
const brightnessSlider = document.getElementById("brightness");
const smoothnessSlider = document.getElementById("smoothness");
const lineStrengthSlider = document.getElementById("lineStrength");

const contrastVal = document.getElementById("contrastVal");
const brightnessVal = document.getElementById("brightnessVal");
const smoothnessVal = document.getElementById("smoothnessVal");
const lineStrengthVal = document.getElementById("lineStrengthVal");

const processBtn = document.getElementById("processBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");

const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomInfo = document.getElementById("zoomInfo");

const metaInfo = document.getElementById("metaInfo");

const originalCanvas = document.getElementById("originalCanvas");
const processedCanvas = document.getElementById("processedCanvas");
const ctxOrig = originalCanvas.getContext("2d");
const ctxProc = processedCanvas.getContext("2d");

// ---------- FILE LOAD ----------

dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) loadImage(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    loadImage(file);
  }
});

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      originalImg = img;
      imgNaturalWidth = img.width;
      imgNaturalHeight = img.height;
      zoomFactor = 1;
      updateZoomInfo();

      fitAndDrawOriginal();
      processImage();
      processBtn.disabled = false;
      downloadBtn.disabled = false;

      metaInfo.textContent = `Loaded ${file.name} · ${img.width}×${img.height}px`;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ---------- CANVAS SIZING ----------

function fitAndDrawOriginal() {
  if (!originalImg) return;
  const container = originalCanvas.parentElement;
  const maxW = container.clientWidth - 12;
  const maxH = Math.max(container.clientHeight - 12, 260);

  const imgRatio = imgNaturalWidth / imgNaturalHeight;
  const boxRatio = maxW / maxH;

  let drawW, drawH;
  if (imgRatio > boxRatio) {
    drawW = maxW;
    drawH = maxW / imgRatio;
  } else {
    drawH = maxH;
    drawW = maxH * imgRatio;
  }

  originalCanvas.width = drawW * zoomFactor;
  originalCanvas.height = drawH * zoomFactor;
  processedCanvas.width = drawW * zoomFactor;
  processedCanvas.height = drawH * zoomFactor;

  ctxOrig.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
  ctxOrig.drawImage(
    originalImg,
    0,
    0,
    imgNaturalWidth,
    imgNaturalHeight,
    0,
    0,
    originalCanvas.width,
    originalCanvas.height
  );
}

// ---------- SLIDERS UI ----------

function updateSliderLabels() {
  contrastVal.textContent = Number(contrastSlider.value).toFixed(2);
  brightnessVal.textContent = Number(brightnessSlider.value).toFixed(2);
  smoothnessVal.textContent = Number(smoothnessSlider.value).toFixed(2);
  lineStrengthVal.textContent = Number(lineStrengthSlider.value).toFixed(2);
}

[contrastSlider, brightnessSlider, smoothnessSlider, lineStrengthSlider].forEach(
  (sl) => {
    sl.addEventListener("input", () => {
      updateSliderLabels();
      if (originalImg) processImage();
    });
  }
);

updateSliderLabels();

// ---------- CORE PROCESSING (TATTOO REF) ----------

function processImage() {
  if (!originalImg) return;

  fitAndDrawOriginal();

  const w = originalCanvas.width;
  const h = originalCanvas.height;
  const src = ctxOrig.getImageData(0, 0, w, h);
  const dst = ctxProc.createImageData(w, h);

  const contrast = parseFloat(contrastSlider.value); // 0.6–1.8
  const brightness = parseFloat(brightnessSlider.value); // 0.7–1.4
  const smoothness = parseFloat(smoothnessSlider.value); // 0–1
  const lineStrength = parseFloat(lineStrengthSlider.value); // 0–1

  const data = src.data;
  const out = dst.data;

  // 1) grayscale + basic contrast/brightness in one pass
  const c = contrast;
  const b = brightness;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const bch = data[i + 2];

    let gray = 0.299 * r + 0.587 * g + 0.114 * bch;

    // normalize to 0..1, apply contrast/brightness, then back
    let n = gray / 255;
    n = (n - 0.5) * c + 0.5;
    n *= b;
    n = Math.min(1, Math.max(0, n));
    gray = n * 255;

    out[i] = gray;
    out[i + 1] = gray;
    out[i + 2] = gray;
    out[i + 3] = 255;
  }

  // 2) light smoothing (box blur, strength based on slider)
  const smoothPasses = Math.round(smoothness * 4); // 0..4 простых прохода
  if (smoothPasses > 0) {
    boxBlurGray(out, w, h, smoothPasses);
  }

  // 3) edge detection (Sobel) + смешивание как "карандашные" линии
  if (lineStrength > 0.01) {
    const edge = sobelEdges(out, w, h); // 0..255
    for (let i = 0; i < out.length; i += 4) {
      const base = out[i];
      const e = edge[i] / 255; // 0..1
      const k = 1 + lineStrength * 1.5;
      let v = base * (1 - lineStrength * 0.8) + (base * (1 - e)) * lineStrength * k;
      v = Math.max(0, Math.min(255, v));
      out[i] = out[i + 1] = out[i + 2] = v;
    }
  }

  ctxProc.putImageData(dst, 0, 0);
}

// ----- simple box blur for grayscale image -----

function boxBlurGray(arr, w, h, iterations) {
  const tmp = new Uint8ClampedArray(arr.length);
  for (let it = 0; it < iterations; it++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const gray = arr[idx]; // r=g=b
        sum += gray;
        const idx3 = (y * w + Math.max(0, x - 3)) * 4;
        if (x >= 3) sum -= arr[idx3];
        const radius = Math.min(3, x + 1);
        const avg = sum / radius;
        const tIdx = (y * w + x) * 4;
        tmp[tIdx] = tmp[tIdx + 1] = tmp[tIdx + 2] = avg;
        tmp[tIdx + 3] = 255;
      }
    }
    // vertical
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = 0; y < h; y++) {
        const idx = (y * w + x) * 4;
        const gray = tmp[idx];
        sum += gray;
        const idx3 = (Math.max(0, y - 3) * w + x) * 4;
        if (y >= 3) sum -= tmp[idx3];
        const radius = Math.min(3, y + 1);
        const avg = sum / radius;
        const aIdx = (y * w + x) * 4;
        arr[aIdx] = arr[aIdx + 1] = arr[aIdx + 2] = avg;
        arr[aIdx + 3] = 255;
      }
    }
  }
}

// ----- Sobel edge detection on grayscale (in RGBA array) -----

function sobelEdges(arr, w, h) {
  const out = new Uint8ClampedArray(arr.length);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sumX = 0;
      let sumY = 0;
      let k = 0;
      for (let yy = -1; yy <= 1; yy++) {
        for (let xx = -1; xx <= 1; xx++) {
          const idx = ((y + yy) * w + (x + xx)) * 4;
          const gray = arr[idx]; // r=g=b
          sumX += gx[k] * gray;
          sumY += gy[k] * gray;
          k++;
        }
      }
      const mag = Math.min(
        255,
        Math.sqrt(sumX * sumX + sumY * sumY)
      );
      const oIdx = (y * w + x) * 4;
      out[oIdx] = out[oIdx + 1] = out[oIdx + 2] = mag;
      out[oIdx + 3] = 255;
    }
  }
  return out;
}

// ---------- BUTTONS ----------

processBtn.addEventListener("click", () => {
  if (!originalImg) return;
  processImage();
});

downloadBtn.addEventListener("click", () => {
  if (!processedCanvas.width || !processedCanvas.height) return;
  const link = document.createElement("a");
  link.download = "tattoo-ref.png";
  link.href = processedCanvas.toDataURL("image/png");
  link.click();
});

resetBtn.addEventListener("click", () => {
  contrastSlider.value = "1.3";
  brightnessSlider.value = "1.0";
  smoothnessSlider.value = "0.4";
  lineStrengthSlider.value = "0.35";
  updateSliderLabels();
  zoomFactor = 1;
  updateZoomInfo();
  if (originalImg) {
    fitAndDrawOriginal();
    processImage();
  } else {
    ctxOrig.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    ctxProc.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    metaInfo.textContent = "No image loaded yet.";
  }
});

// ---------- ZOOM ----------

function updateZoomInfo() {
  zoomInfo.textContent = `Zoom: ${Math.round(zoomFactor * 100)}%`;
}

zoomInBtn.addEventListener("click", () => {
  if (!originalImg) return;
  zoomFactor = Math.min(3, zoomFactor * 1.2);
  updateZoomInfo();
  processImage();
});

zoomOutBtn.addEventListener("click", () => {
  if (!originalImg) return;
  zoomFactor = Math.max(0.4, zoomFactor / 1.2);
  updateZoomInfo();
  processImage();
});

zoomResetBtn.addEventListener("click", () => {
  if (!originalImg) return;
  zoomFactor = 1;
  updateZoomInfo();
  processImage();
});

// resize handling
window.addEventListener("resize", () => {
  if (originalImg) processImage();
});