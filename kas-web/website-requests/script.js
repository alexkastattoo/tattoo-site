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
const bookingButton = form.querySelector('button[type=submit]');
const bookingStatus = document.querySelector('#booking-status');
let requestId = null;
let sending = false;
form.addEventListener('input', () => { if (!sending) requestId = null; });
function readReference(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve({mime:file.type,content:reader.result.split(',')[1]});
    reader.readAsDataURL(file);
  });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  const fields = new FormData(form);
  if (fields.get('_honey')) return;
  const files = Array.from(form.querySelectorAll('input[type=file]')).flatMap(input => Array.from(input.files));
  if (files.some(file => !['image/jpeg','image/png'].includes(file.type)) ||
      files.reduce((total,file) => total + file.size,0) > 6 * 1024 * 1024) {
    bookingStatus.textContent = 'Choose JPG or PNG references, up to 6 MB combined.';
    return;
  }
  sending = true;
  const inputs = Array.from(form.querySelectorAll('input,textarea,button'));
  inputs.forEach(input => input.disabled = true);
  bookingStatus.textContent = 'Sending your request…';
  try {
    requestId ||= crypto.randomUUID();
    const details = Object.fromEntries(['name','email','idea','placement','size'].map(key => [key,fields.get(key)]));
    details.updates = fields.has('available_spots_updates');
    const response = await fetch('https://cvvaakuvdgayvtrdikfw.supabase.co/rest/v1/rpc/kas_submit_website_request',{
      method:'POST',
      headers:{apikey:'sb_publishable_i7YBAMK6L4OTqA3fU8xl3w_-rLVAGwz','Content-Type':'application/json'},
      body:JSON.stringify({p_id:requestId,p_request:details,p_images:await Promise.all(files.map(readReference))})
    });
    if (!response.ok || await response.json() !== requestId) throw new Error('Submission failed');
    bookingStatus.textContent = 'Request received. Reference: '+requestId.slice(0,8)+'. Alex will follow up by email.';
    form.reset();
    requestId = null;
  } catch {
    bookingStatus.textContent = 'Could not confirm delivery. Retry, or email Alex directly.';
  } finally {
    sending = false;
    inputs.forEach(input => input.disabled = false);
  }
});
bookingButton.disabled = false;
