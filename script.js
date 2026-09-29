'use strict';
// All paths stay relative so both custom domains and /repository/ GitHub Pages work.
const nextUrl = document.querySelector('#next-url');
if (nextUrl && /^https?:$/.test(location.protocol)) {
  nextUrl.value = new URL('thanks.html', location.href).href;
  nextUrl.disabled = false;
}
const dialog = document.querySelector('#lightbox');
const links = [...document.querySelectorAll('[data-lightbox]')];
let active = 0;
let opener;
function showImage(index) {
  active = (index + links.length) % links.length;
  const link = links[active];
  document.querySelector('#lightbox-image').src = link.href;
  document.querySelector('#lightbox-image').alt = link.querySelector('img').alt;
  document.querySelector('#lightbox-caption').textContent = link.dataset.caption;
  document.querySelector('#image-count').textContent = `${active + 1} / ${links.length}`;
}
links.forEach((link, index) => link.addEventListener('click', event => {
  if (!dialog.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  opener = link;
  showImage(index);
  dialog.showModal();
  document.body.classList.add('modal-open');
}));
document.querySelector('.close').addEventListener('click', () => dialog.close());
document.querySelector('#previous').addEventListener('click', () => showImage(active - 1));
document.querySelector('#next').addEventListener('click', () => showImage(active + 1));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); showImage(active + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  opener?.focus({preventScroll: true});
});
let touchStart;
dialog.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0]; touchStart = {x: touch.clientX, y: touch.clientY};
}, {passive: true});
dialog.addEventListener('touchend', event => {
  if (!touchStart) return;
  const touch = event.changedTouches[0], dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) showImage(active + (dx < 0 ? 1 : -1));
  touchStart = undefined;
}, {passive: true});
const form = document.querySelector('#booking-form');
const uploads = [...form.querySelectorAll('input[type=file]')];
function validateFiles() {
  uploads.forEach(input => input.setCustomValidity(''));
  const files = uploads.flatMap(input => [...input.files]);
  const bytes = files.reduce((sum, file) => sum + file.size, 0);
  const invalid = uploads.find(input => [...input.files].some(file => !['image/jpeg', 'image/png'].includes(file.type)));
  let message = '';
  if (invalid) message = 'Please choose JPG or PNG images.';
  else if (bytes > 9 * 1024 * 1024) message = 'Please reduce your reference images to 9 MB combined or less.';
  if (message) (invalid || uploads.find(input => input.files.length) || uploads[0]).setCustomValidity(message);
  document.querySelector('#file-status').textContent = message || (files.length ? `${files.length} of 3 selected · ${(bytes / 1024 / 1024).toFixed(1)} MB` : '');
  return !message;
}
uploads.forEach(input => input.addEventListener('change', validateFiles));
form.addEventListener('submit', event => {
  if (!validateFiles()) {event.preventDefault(); form.reportValidity();}
  // Native POST: do not show success or redirect until FormSubmit accepts the request.
});
