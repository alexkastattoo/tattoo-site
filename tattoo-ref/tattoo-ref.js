// Получаем элементы
const fileInput = document.getElementById('imageLoader');
const originalImg = document.getElementById('originalPreview');
const processedImg = document.getElementById('processedPreview');

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
      // приводим к разумному размеру, чтобы браузер не умирал
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

      // покажем оригинал сразу
      originalImg.src = workCanvas.toDataURL('image/jpeg', 0.9);
      processedImg.src = '';  // пока пусто
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

  const contrast   = parseFloat(contrastSlider.value);
  const brightness = parseFloat(brightnessSlider.value);
  const smoothness = parseFloat(smoothSlider.value);
  const lineStrength = parseFloat(lineSlider.value);

  // копия исходных пикселей
  const imgData = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );

  const { width, height, data } = imgData;

  // 1) перевод в ч/б + яркость/контраст
  // формула: gray = 0.299 R + 0.587 G + 0.114 B
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // brightness (умножение)
    gray *= brightness;

    // contrast
    gray = factor * (gray - 128) + 128;

    gray = Math.max(0, Math.min(255, gray));

    data[i] = data[i + 1] = data[i + 2] = gray;
  }

  // 2) лёгкое размытие (smoothness)
  if (smoothness > 0.01) {
    boxBlur(imgData, Math.round(1 + smoothness * 3));
  }

  // 3) эффект "карандаш" — детекция границ (Sobel) + смешивание с базой
  if (lineStrength > 0.01) {
    const edges = sobelEdges(imgData);
    const ed = edges.data;
    for (let i = 0; i < data.length; i += 4) {
      const e = ed[i]; // 0..255
      const base = data[i];
      // invert edges, чтобы линии были тёмными
      const line = 255 - e;
      const mixed = base * (1 - lineStrength) + line * lineStrength;
      const v = Math.max(0, Math.min(255, mixed));
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }

  // положим результат на canvas
  ctx.putImageData(imgData, 0, 0);

  const url = workCanvas.toDataURL('image/jpeg', 0.95);
  processedImg.src = url;
  lastProcessedDataUrl = url;
  downloadBtn.disabled = false;
}

processBtn.addEventListener('click', processImage);

// ---------- RESET ----------

function resetSettings() {
  contrastSlider.value   = 1.30;
  brightnessSlider.value = 1.00;
  smoothSlider.value     = 0.40;
  lineSlider.value       = 0.40;

  if (originalImageData) {
    // вернуть исходный preview
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
        sum += data[idx]; // gray
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
          const gray = data[idx]; // уже ч/б
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