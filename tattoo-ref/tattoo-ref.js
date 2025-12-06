// Tattoo Reference Stylizer – один режим Graphite

(() => {
  const fileInput = document.getElementById("fileInput");
  const fileNameEl = document.getElementById("fileName");

  const contrastSlider = document.getElementById("contrast");
  const brightnessSlider = document.getElementById("brightness");
  const smoothnessSlider = document.getElementById("smoothness");

  const contrastVal = document.getElementById("contrastValue");
  const brightnessVal = document.getElementById("brightnessValue");
  const smoothnessVal = document.getElementById("smoothnessValue");

  const zoomSlider = document.getElementById("zoom");
  const zoomVal = document.getElementById("zoomValue");

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

  function resetSliders() {
    contrastSlider.value = "1.15";
    brightnessSlider.value = "1.05";
    smoothnessSlider.value = "0.55";
    zoomSlider.value = "100";
    updateSliderLabels();
    setZoomFromSlider();
  }
  resetSliders();

  resetBtn.addEventListener("click", () => {
    resetSliders();
    if (originalImageData) processImage();
  });

  [contrastSlider, brightnessSlider, smoothnessSlider].forEach((slider) => {
    slider.addEventListener("input", () => {
      updateSliderLabels();
      if (originalImageData) processImage();
    });
  });

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

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  // blur для grayscale
  function boxBlurGray(src, width, height, radius) {
    if (radius <= 0) return src.slice();
    const tmp = new Float32Array(width * height);
    const dst = new Float32Array(width * height);
    const r = radius;
    const w = width;
    const h = height;
    const iarr = 1 / (2 * r + 1);

    // горизонталь
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

    // вертикаль
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

    const { data, width, height } = originalImageData;
    const total = width * height;

    // grayscale
    const gray = new Float32Array(total);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let y = 0.299 * r + 0.587 * g + 0.114 * b;
      y *= brightness;
      gray[j] = clamp(y, 0, 255);
    }

    // blur для sketch
    const blurRadius = 2 + Math.round(smoothness * 8); // 2..10
    const inverted = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      inverted[i] = 255 - gray[i];
    }
    const blurredInv = boxBlurGray(inverted, width, height, blurRadius);

    // classic pencil sketch
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

    for (let i = 0, j = 0; j < total; j++, i += 4) {
      const g = gray[j];
      const s = sketch[j];

      // Graphite‑микс
      let v = g * 0.4 + s * 0.6;

      // локальный мягкий контраст
      const mid = 128;
      let t = (v - mid) / 128;
      const localBoost = 1.1 + (contrast - 1.0) * 0.4;
      v = mid + t * 128 * localBoost;

      // смягчение глубоких теней
      if (v < 40) v = 40 + (v - 40) * 0.6;

      // глобальный контраст
      const mid2 = 128;
      v = clamp((v - mid2) * contrast + mid2, 0, 255);

      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }

    const outImageData = new ImageData(out, width, height);
    procCtx.putImageData(outImageData, 0, 0);
    procDims.textContent = `${width}×${height}`;
  }

  window._tattooRefReset = resetSliders;
})();
