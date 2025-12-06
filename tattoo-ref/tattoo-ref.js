// Pic → Tattoo Reference with 4 pencil modes + Stylized Tattoo mode
// Всё клиент‑сайд на Canvas.

(() => {
  const fileInput = document.getElementById("fileInput");
  const fileNameEl = document.getElementById("fileName");

  const contrastSlider = document.getElementById("contrast");
  const brightnessSlider = document.getElementById("brightness");
  const smoothnessSlider = document.getElementById("smoothness");
  const pencilSlider = document.getElementById("pencilStrength");

  const contrastVal = document.getElementById("contrastValue");
  const brightnessVal = document.getElementById("brightnessValue");
  const smoothnessVal = document.getElementById("smoothnessValue");
  const pencilVal = document.getElementById("pencilValue");

  const zoomSlider = document.getElementById("zoom");
  const zoomVal = document.getElementById("zoomValue");

  const modeButtons = document.querySelectorAll(".mode-button");
  let currentMode = "soft"; // soft | hard | smudge | photo | stylized

  const processBtn = document.getElementById("processBtn");
  const resetBtn = document.getElementById("resetBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const origDims = document.getElementById("origDims");
  const procDims = document.getElementById("procDims");

  const origCanvas = document.getElementById("originalCanvas");
  const procCanvas = document.getElementById("processedCanvas");
  const origCtx = origCanvas.getContext("2d");
  const procCtx = procCanvas.getContext("2d");

  let originalImageData = null;
  let workingWidth = 0;
  let workingHeight = 0;

  const MAX_SIZE = 1600;

  function updateSliderLabels() {
    contrastVal.textContent = parseFloat(contrastSlider.value).toFixed(2);
    brightnessVal.textContent = parseFloat(brightnessSlider.value).toFixed(2);
    smoothnessVal.textContent = parseFloat(smoothnessSlider.value).toFixed(2);
    pencilVal.textContent = parseFloat(pencilSlider.value).toFixed(2);
  }
  updateSliderLabels();

  function setZoomFromSlider() {
    const z = parseInt(zoomSlider.value, 10) / 100;
    zoomVal.textContent = `${zoomSlider.value}%`;
    origCanvas.style.transform = `scale(${z})`;
    procCanvas.style.transform = `scale(${z})`;
  }
  setZoomFromSlider();

  zoomSlider.addEventListener("input", setZoomFromSlider);

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode || "soft";
      if (originalImageData) processImage();
    });
  });

  function resetSliders() {
    contrastSlider.value = "1.15";
    brightnessSlider.value = "1.05";
    smoothnessSlider.value = "0.30";
    pencilSlider.value = "0.50";
    zoomSlider.value = "100";
    updateSliderLabels();
    setZoomFromSlider();
  }
  resetSliders();

  resetBtn.addEventListener("click", () => {
    resetSliders();
    if (originalImageData) processImage();
  });

  [contrastSlider, brightnessSlider, smoothnessSlider, pencilSlider].forEach(
    (slider) => {
      slider.addEventListener("input", () => {
        updateSliderLabels();
        if (originalImageData) processImage();
      });
    }
  );

  processBtn.addEventListener("click", () => {
    if (!originalImageData) return;
    processImage();
  });

  downloadBtn.addEventListener("click", () => {
    if (!workingWidth || !workingHeight) return;
    procCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tattoo-reference.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      "image/png"
    );
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    fileNameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => prepareImage(img);
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  function prepareImage(img) {
    const ratio = img.width / img.height;
    let w = img.width;
    let h = img.height;

    if (w > MAX_SIZE || h > MAX_SIZE) {
      if (w > h) {
        w = MAX_SIZE;
        h = Math.round(MAX_SIZE / ratio);
      } else {
        h = MAX_SIZE;
        w = Math.round(MAX_SIZE * ratio);
      }
    }

    workingWidth = w;
    workingHeight = h;

    origCanvas.width = w;
    origCanvas.height = h;
    procCanvas.width = w;
    procCanvas.height = h;

    origCtx.clearRect(0, 0, w, h);
    procCtx.clearRect(0, 0, w, h);

    origCtx.drawImage(img, 0, 0, w, h);
    originalImageData = origCtx.getImageData(0, 0, w, h);

    origDims.textContent = `${w}×${h}`;
    procDims.textContent = `${w}×${h}`;

    processImage();
    downloadBtn.disabled = false;
  }

  // --- helpers ---

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  // separable box blur for grayscale array
  function boxBlurGray(src, width, height, radius) {
    if (radius <= 0) return src.slice();
    const tmp = new Float32Array(width * height);
    const dst = new Float32Array(width * height);
    const r = radius;
    const w = width;
    const h = height;
    const iarr = 1 / (2 * r + 1);

    // horizontal
    for (let y = 0; y < h; y++) {
      let ti = y * w;
      let li = ti;
      let ri = ti + r;
      const fv = src[ti];
      const lv = src[ti + w - 1];
      let val = (r + 1) * fv;
      for (let j = 0; j < r; j++) val += src[ti + j];
      for (let x = 0; x < w; x++) {
        val += src[ri] - src[li];
        tmp[ti] = val * iarr;
        ri++;
        li++;
        ti++;
      }
    }

    // vertical
    for (let x = 0; x < w; x++) {
      let ti = x;
      let li = ti;
      let ri = ti + r * w;
      const fv = tmp[ti];
      const lv = tmp[ti + w * (h - 1)];
      let val = (r + 1) * fv;
      for (let j = 0; j < r; j++) val += tmp[ti + j * w];
      for (let y = 0; y < h; y++) {
        val += tmp[ri] - tmp[li];
        dst[ti] = val * iarr;
        ri += w;
        li += w;
        ti += w;
      }
    }

    return dst;
  }

  function processImage() {
    if (!originalImageData) return;

    const contrast = parseFloat(contrastSlider.value);
    const brightness = parseFloat(brightnessSlider.value);
    const smoothness = parseFloat(smoothnessSlider.value);
    const pencilStrength = parseFloat(pencilSlider.value);

    const { data, width, height } = originalImageData;
    const total = width * height;

    // 1) grayscale
    const gray = new Float32Array(total);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let y = 0.299 * r + 0.587 * g + 0.114 * b;
      y *= brightness;
      gray[j] = clamp(y, 0, 255);
    }

    // 2) blur amount
    let blurRadiusBase = 1 + Math.round(smoothness * 6); // 1..7
    if (currentMode === "hard") blurRadiusBase = Math.max(1, blurRadiusBase - 1);
    if (currentMode === "smudge") blurRadiusBase += 2;
    if (currentMode === "photo") blurRadiusBase = 2 + Math.round(smoothness * 4);
    if (currentMode === "stylized") blurRadiusBase = 2 + Math.round(smoothness * 3);

    const inverted = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      inverted[i] = 255 - gray[i];
    }

    const blurredInv = boxBlurGray(inverted, width, height, blurRadiusBase);

    // 3) pencil sketch
    const sketch = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      const g = gray[i];
      const b = blurredInv[i];
      const denom = 255 - b;
      let val;
      if (denom <= 0) val = 255;
      else val = clamp((g * 255) / denom, 0, 255);
      sketch[i] = val;
    }

    const out = new Uint8ClampedArray(total * 4);

    function applyContrast(v) {
      const mid = 128;
      return clamp((v - mid) * contrast + mid, 0, 255);
    }

    for (let i = 0, j = 0; j < total; j++, i += 4) {
      const g = gray[j];
      const s = sketch[j];
      let finalVal;

      switch (currentMode) {
        case "soft": {
          const mix = 0.5 + 0.4 * pencilStrength;
          finalVal = g * (1 - mix) + s * mix;
          break;
        }
        case "hard": {
          const mix = 0.7 + 0.3 * pencilStrength;
          finalVal = s * mix + g * (1 - mix);
          if (pencilStrength > 0.3) {
            finalVal = finalVal * (1 + pencilStrength * 0.6);
          }
          break;
        }
        case "smudge": {
          const mix = 0.4 + 0.4 * pencilStrength;
          finalVal = g * (1 - mix) + s * mix;
          finalVal = 30 + (finalVal - 30) * 0.9;
          break;
        }
        case "photo": {
          const mix = 0.3 + 0.4 * pencilStrength;
          finalVal = g * (1 - mix) + s * mix;
          break;
        }
        case "stylized": {
          // реалистичный, но единый stylized‑реф
          const mix = 0.5 + 0.3 * pencilStrength; // 0.5..0.8
          let v = g * (1 - mix) + s * mix;       // базовое смешение

          // мягкая S‑кривая
          const mid = 128;
          const t = (v - mid) / 128;             // -1..1
          const sCurve = t * (0.6 + 0.4 * contrast);
          v = mid + sCurve * 128;

          // лёгкая квантизация тонов (3–4 уровня), чтобы сблизить стиль
          const levels = 4;
          const step = 255 / (levels - 1);
          const q = Math.round(v / step) * step;
          finalVal = 0.6 * v + 0.4 * q;
          break;
        }
        default: {
          finalVal = s;
        }
      }

      finalVal = applyContrast(finalVal);

      out[i] = finalVal;
      out[i + 1] = finalVal;
      out[i + 2] = finalVal;
      out[i + 3] = 255;
    }

    const outImageData = new ImageData(out, width, height);
    procCtx.putImageData(outImageData, 0, 0);
    procDims.textContent = `${width}×${height}`;
  }

  // для отладки, если нужно вызвать сброс из консоли
  window._tattooRefReset = resetSliders;
})();
