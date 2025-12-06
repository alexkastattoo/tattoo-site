// ---------- ЭЛЕМЕНТЫ ----------

const fileInput      = document.getElementById('imageLoader');
const originalImg    = document.getElementById('originalPreview');
const processedImg   = document.getElementById('processedPreview');

const contrastSlider   = document.getElementById('contrast');
const brightnessSlider = document.getElementById('brightness');
const smoothSlider     = document.getElementById('smoothness');
const lineSlider       = document.getElementById('lineStrength');

const processBtn  = document.getElementById('processBtn');
const resetBtn    = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const workCanvas = document.getElementById('workCanvas');
const ctx = workCanvas.getContext('2d');

let originalImageData = null;   // исходные пиксели (после ресайза)
let lastProcessedDataUrl = null;


// ---------- ЗАГРУЗКА ИЗОБРАЖЕНИЯ ----------

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 1600;
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);

      workCanvas.width = w;
      workCanvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      originalImageData = ctx.getImageData(0, 0, w, h);

      // показываем оригинал
      originalImg.src = workCanvas.toDataURL('image/jpeg', 0.9);
      processedImg.src = '';
      lastProcessedDataUrl = null;
      downloadBtn.disabled = true;
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});


// ---------- ОБРАБОТКА ----------

function processImage() {
  if (!originalImageData) return;

  const contrast    = parseFloat(contrastSlider.value);   // 0.5–2.0
  const brightness  = parseFloat(brightnessSlider.value); // 0.3–2.0
  const smoothness  = parseFloat(smoothSlider.value);     // 0–1
  const lineStrength = parseFloat(lineSlider.value);      // 0–1

  // копия исходных пикселей
  const imgData = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );

  const { width, height, data } = imgData;

  // 1) в ч/б + яркость + контраст (аккуратная формула)
  // gray в диапазоне 0..1, потом обратно 0..255
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let gray = 0.299 * r + 0.587 * g + 0.114 * b; // 0..255
    gray /= 255.0;                                // 0..1

    // яркость – просто множитель
    gray *= brightness;

    // контраст вокруг 0.5
    gray = (gray - 0.5) * contrast + 0.5;

    // кламп
    gray = Math.max(0, Math.min(1, gray));
    const v = gray * 255;

    data[i] = data[i + 1] = data[i + 2] = v;
  }

  // 2) лёгкое размытие (смягчить переходы)
  if (smoothness > 0.01) {
    boxBlur(imgData, Math.round(1 + smoothness * 3));
  }

  // 3) «карандаш» — делаем края чуть темнее (без дикого стенсила)
  if (lineStrength > 0.01) {
    const edges = sobelEdges(imgData);
    const ed = edges.data;

    for (let i = 0; i < data.length; i += 4) {
      const base = data[i];     // серый 0..255
      const e    = ed[i];       // сила края 0..255

      // вычитаем часть границы из базы => тёмные линии
      const mixed = base - lineStrength * e;

      const v = Math.max(0, Math.min(255, mixed));
      data[i] = data[i + 1] = data[i + 2] = v;
      // alpha оставляем как есть
    }
  }

  // кладём результат
  ctx.putImageData(imgData, 0, 0);
  const url = workCanvas.toDataURL('image/jpeg', 0.95);
  processedImg.src = url;
  lastProcessedDataUrl = url;
  downloadBtn.disabled = false;
}

processBtn.addEventListener('click', processImage);


// ---------- LIVE-ОБНОВЛЕНИЕ ПРИ ДВИЖЕНИИ СЛАЙДЕРОВ ----------

[contrastSlider, brightnessSlider, smoothSlider, lineSlider].forEach(sl => {
  sl.addEventListener('input', () => {
    if (originalImageData) {
      processImage();
    }
  });
});


// ---------- RESET ----------

function resetSettings() {
  contrastSlider.value   = 1.30;
  brightnessSlider.value = 1.00;
  smoothSlider.value     = 0.40;
  lineSlider.value       = 0.40;

  if (originalImageData) {
    ctx.putImageData(originalImageData, 0, 0);
    originalImg.src = workCanvas.toDataURL('image/jpeg', 0.9);
    processedImg.src = '';
    lastProcessedDataUrl = null;
    downloadBtn.disabled = true;
  }
}
resetBtn.addEventListener('click', resetSettings);


// ---------- DOWNLOAD ----------

downloadBtn.addEventListener('click', () => {
  if (!lastProcessedDataUrl) return;
  const a = document.createElement('a');
  a.href = lastProcessedDataUrl;
  a.download = 'tattoo_ref.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});


// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------

// Простое боксовое размытие
function boxBlur(imgData, radius) {
  const { width, height, data } = imgData;
  const tmp = new Uint8ClampedArray(data.length);

  // по X
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= width) continue;
        const idx = (y * width + xx) * 4;
        sum += data[idx];
        count++;
      }
      const val = sum / count;
      const idx0 = (y * width + x) * 4;
      tmp[idx0] = tmp[idx0 + 1] = tmp[idx0 + 2] = val;
      tmp[idx0 + 3] = data[idx0 + 3];
    }
  }

  // по Y
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= height) continue;
        const idx = (yy * width + x) * 4;
        sum += tmp[idx];
        count++;
      }
      const val = sum / count;
      const idx0 = (y * width + x) * 4;
      data[idx0] = data[idx0 + 1] = data[idx0 + 2] = val;
      // alpha уже есть
    }
  }
}

// Sobel для границ
function sobelEdges(imgData) {
  const { width, height, data } = imgData;
  const out = new ImageData(width, height);
  const d = out.data;

  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      let k = 0;

      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const xx = x + i;
          const yy = y + j;
          const idx = (yy * width + xx) * 4;
          const gray = data[idx];
          gx += gxKernel[k] * gray;
          gy += gyKernel[k] * gray;
          k++;
        }
      }

      const mag = Math.sqrt(gx * gx + gy * gy);
      const v = Math.max(0, Math.min(255, mag));
      const idx0 = (y * width + x) * 4;
      d[idx0] = d[idx0 + 1] = d[idx0 + 2] = v;
      d[idx0 + 3] = 255;
    }
  }

  return out;
}