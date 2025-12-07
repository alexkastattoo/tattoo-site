// Pic → Tattoo Reference + Vectorize filter

(() => {
  const fileInput  = document.getElementById("fileInput");
  const fileNameEl = document.getElementById("fileName");

  const contrastSlider   = document.getElementById("contrast");
  const brightnessSlider = document.getElementById("brightness");
  const smoothSlider     = document.getElementById("smoothness");
  const sharpenSlider    = document.getElementById("sharpen");

  const contrastVal   = document.getElementById("contrastValue");
  const brightnessVal = document.getElementById("brightnessValue");
  const smoothVal     = document.getElementById("smoothnessValue");
  const sharpenVal    = document.getElementById("sharpenValue");

  const modeRadios   = document.querySelectorAll('input[name="mode"]');

  const zoomSlider = document.getElementById("zoom");
  const zoomVal    = document.getElementById("zoomValue");

  const processBtn  = document.getElementById("processBtn");
  const resetBtn    = document.getElementById("resetBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const origDims = document.getElementById("origDims");
  const procDims = document.getElementById("procDims");

  const origCanvas = document.getElementById("originalCanvas");
  const procCanvas = document.getElementById("processedCanvas");
  const origCtx = origCanvas.getContext("2d");
  const procCtx = procCanvas.getContext("2d");

  let originalImageData = null;
  let originalImage = null;
  let workingWidth = 0;
  let workingHeight = 0;

  const MAX_SIZE = 1600;

  function currentMode() {
    return [...modeRadios].find(r => r.checked)?.value || "ref";
  }

  function updateSliderLabels() {
    contrastVal.textContent   = parseFloat(contrastSlider.value).toFixed(2);
    brightnessVal.textContent = parseFloat(brightnessSlider.value).toFixed(2);
    smoothVal.textContent     = parseFloat(smoothSlider.value).toFixed(2);
    sharpenVal.textContent    = parseFloat(sharpenSlider.value).toFixed(2);
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

  resetBtn.addEventListener("click", () => {
    contrastSlider.value = 1.30;
    brightnessSlider.value = 1.00;
    smoothSlider.value = 0.00;
    sharpenSlider.value = 0.00;
    updateSliderLabels();
    setZoomFromSlider();
    if (originalImageData) processOrVector();
  });

  [contrastSlider, brightnessSlider, smoothSlider, sharpenSlider].forEach(slider => {
    slider.addEventListener("input", () => {
      updateSliderLabels();
      if (originalImageData) processOrVector();
    });
  });

  modeRadios.forEach(r => {
    r.addEventListener("change", () => {
      if (originalImageData) processOrVector();
    });
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

  processBtn.addEventListener("click", () => {
    if (!originalImageData) return;
    processOrVector();
  });

  downloadBtn.addEventListener("click", () => {
    if (!workingWidth || !workingHeight) return;
    const mode = currentMode();
    if (mode === "vector") {
      const svg = ImageTracer.imagedataToSVG(
        procCtx.getImageData(0, 0, workingWidth, workingHeight),
        { scale: 1, pathomit: 8 }
      );
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tattoo_vector.svg";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      procCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tattoo_ref.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    }
  });

  function prepareImage(img) {
    originalImage = img;
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

    processOrVector();
    downloadBtn.disabled = false;
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function boxBlurGray(src, width, height, radius) {
    if (radius <= 0) return src.slice();
    const tmp = new Float32Array(width * height);
    const dst = new Float32Array(width * height);
    const r = radius;
    const w = width;
    const h = height;
    const iarr = 1 / (2 * r + 1);

    for (let y = 0; y < h; y++) {
      let ti = y * w;
      let li = ti;
      let ri = ti + r;
      const fv = src[ti];
      for (let j = 0; j < r; j++) {
        // nothing
      }
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

    for (let x = 0; x < w; x++) {
      let ti = x;
      let li = ti;
      let ri = ti + r * w;
      const fv2 = tmp[ti];
      for (let j = 0; j < r; j++) {
        // nothing
      }
      let val2 = (r + 1) * fv2;
      for (let j = 0; j < r; j++) val2 += tmp[ti + j * w];
      for (let y = 0; y < h; y++) {
        val2 += tmp[ri] - tmp[li];
        dst[ti] = val2 * iarr;
        ri += w;
        li += w;
        ti += w;
      }
    }

    return dst;
  }

  function applyFiltersToImageData(srcImageData, params) {
    const width = srcImageData.width;
    const height = srcImageData.height;
    const src = srcImageData.data;
    const dst = new Uint8ClampedArray(src.length);

    const { contrast, brightness, smoothness, sharpen } = params;
    const total = width * height;

    // grayscale + brightness + contrast
    const gray = new Float32Array(total);
    for (let i = 0, j = 0; i < src.length; i += 4, j++) {
      const r = src[i], g = src[i + 1], b = src[i + 2];
      let v = 0.299 * r + 0.587 * g + 0.114 * b;
      v = v * brightness;
      const mid = 128;
      v = (v - mid) * contrast + mid;
      v = clamp(v, 0, 255);
      gray[j] = v;
    }

    // blur if needed
    let blurred = gray;
    if (smoothness > 0.001) {
      blurred = boxBlurGray(gray, width, height, Math.round(smoothness * 4));
    }

    // sharpen if needed
    if (sharpen > 0.001) {
      const blur2 = boxBlurGray(blurred, width, height, 1);
      for (let i = 0; i < total; i++) {
        const orig = blurred[i];
        const b = blur2[i];
        let v = orig + (orig - b) * sharpen;
        v = clamp(v, 0, 255);
        blurred[i] = v;
      }
    }

    // fill dst
    for (let i = 0, j = 0; j < total; j++, i += 4) {
      const v = blurred[j];
      dst[i] = dst[i + 1] = dst[i + 2] = v;
      dst[i + 3] = src[i + 3];
    }

    return new ImageData(dst, width, height);
  }

  function processOrVector() {
    const filtered = applyFiltersToImageData(originalImageData, {
      contrast: parseFloat(contrastSlider.value),
      brightness: parseFloat(brightnessSlider.value),
      smoothness: parseFloat(smoothSlider.value),
      sharpen: parseFloat(sharpenSlider.value),
    });

    procCtx.putImageData(filtered, 0, 0);
    procDims.textContent = `${workingWidth}×${workingHeight}`;

    if (currentMode() === "vector") {
      // ничего сразу, SVG генерируется при Download
    }
  }

})();