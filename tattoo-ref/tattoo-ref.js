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
    if (originalImageData) processImage();
  });

  [contrastSlider, brightnessSlider, smoothSlider, sharpenSlider].forEach(slider => {
    slider.addEventListener("input", () => {
      updateSliderLabels();
    });
  });

  processBtn.addEventListener("click", () => {
    if (!originalImageData) return;
    processOrVector();
  });

  downloadBtn.addEventListener("click", () => {
    if (!workingWidth || !workingHeight) return;
    const mode = currentMode();
    if (mode === "vector") {
      // Векторизация и скачка
      const svg = ImageTracer.imagedataToSVG(
        procCtx.getImageData(0, 0, workingWidth, workingHeight),
        { scale: 1, pathomit: 8 } // можно поиграть с параметрами
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

  function applyFiltersToImageData(srcImageData, params) {
    const width = srcImageData.width;
    const height = srcImageData.height;
    const src = srcImageData.data;
    const dst = new Uint8ClampedArray(src.length);

    const { contrast, brightness, smoothness, sharpen } = params;

    // grayscale + brightness + contrast
    for (let i = 0; i < src.length; i += 4) {
      let r = src[i], g = src[i + 1], b = src[i + 2];
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      gray = gray * brightness;
      const mid = 128;
      gray = (gray - mid) * contrast + mid;
      gray = clamp(gray, 0, 255);
      dst[i] = dst[i + 1] = dst[i + 2] = gray;
      dst[i + 3] = src[i + 3];
    }

    if (smoothness > 0.001) {
      const grayArr = new Float32Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          grayArr[y * width + x] = dst[(y * width + x) * 4];
        }
      }
      const blurred = boxBlurGray(grayArr, width, height, Math.round(smoothness * 4));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const v = blurred[y * width + x];
          dst[idx] = dst[idx + 1] = dst[idx + 2] = v;
        }
      }
    }

    if (sharpen > 0.001) {
      const grayArr = new Float32Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          grayArr[y * width + x] = dst[(y * width + x) * 4];
        }
      }
      const blurred = boxBlurGray(grayArr, width, height, 1);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const orig = dst[idx];
          const blur = blurred[y * width + x];
          let v = orig + (orig - blur) * sharpen;
          v = clamp(v, 0, 255);
          dst[idx] = dst[idx + 1] = dst[idx + 2] = v;
        }
      }
    }

    return new ImageData(dst, width, height);
  }

  function processOrVector() {
    // сначала — фильтры + блэк-энд-вайт
    const filtered = applyFiltersToImageData(originalImageData, {
      contrast: parseFloat(contrastSlider.value),
      brightness: parseFloat(brightnessSlider.value),
      smoothness: parseFloat(smoothSlider.value),
      sharpen: parseFloat(sharpenSlider.value),
    });

    procCtx.putImageData(filtered, 0, 0);
    procDims.textContent = `${workingWidth}×${workingHeight}`;

    if (currentMode() === "vector") {
      // ничего сразу не делать, ждём download кнопки
    }
  }

})();