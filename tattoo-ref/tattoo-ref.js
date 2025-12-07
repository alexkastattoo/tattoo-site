// Тест: загрузка → draw → возможность vectorize

const fileInput = document.getElementById("fileInput");
const origCanvas = document.getElementById("origCanvas");
const procCanvas = document.getElementById("procCanvas");
const origCtx = origCanvas.getContext("2d");
const procCtx = procCanvas.getContext("2d");
const vectorBtn = document.getElementById("vectorBtn");
const svgContainer = document.getElementById("svgContainer");

let imgData = null;

fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      origCanvas.width = w;
      origCanvas.height = h;
      procCanvas.width = w;
      procCanvas.height = h;

      origCtx.drawImage(img, 0, 0, w, h);
      imgData = origCtx.getImageData(0, 0, w, h);

      // просто копируем на processed для теста
      procCtx.putImageData(imgData, 0, 0);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

vectorBtn.addEventListener("click", () => {
  if (!imgData) return;

  // получаем ImageData из procCanvas
  const pd = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);

  // трассируем в SVG
  const svg = ImageTracer.imagedataToSVG(pd, { ltres: 0.5, qtres: 1, pathomit: 8 });

  console.log("SVG string:", svg);

  // вставляем в контейнер для превью
  svgContainer.innerHTML = "";
  ImageTracer.appendSVGString(svg, "svgContainer");

  // автоматически скачать
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "out.svg";
  a.click();
  URL.revokeObjectURL(url);
});