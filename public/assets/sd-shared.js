import { db, checked, esc, setView, button, busy, readableError, toast } from './common.js';
export const api = (name, action, p = {}) => checked(db.rpc('kb_sd_' + name, {
  action,
  p
}));
export const gate = (action, feature = null, password = null) => checked(db.rpc('kb_sd_gate', {
  action,
  feature,
  password
}));
export const $ = s => document.querySelector(s);
export const route = (page, params = {}) => './' + page + '.html?' + new URLSearchParams(params);
export const param = new URLSearchParams(location.search);
export const status = {
  sent: 'Sudah dikirim',
  revise: 'Perlu diperbaiki',
  done: 'Selesai'
};
export const states = {
  draft: 'Draft',
  published: 'Terbit',
  archived: 'Arsip'
};
export const lb = (s, html) => '<label class="field">' + esc(s) + html + '</label>';
export const inp = (val = '', attrs = '') => '<input value="' + esc(val) + '" ' + attrs + '>';
export const opt = (v, s, selected) => '<option value="' + esc(v) + '" ' + (String(v) === String(selected) ? 'selected' : '') + '>' + esc(s) + '</option>';
export const book = '<span class="bookpal" aria-hidden="true"><i></i><b>⌣</b></span>';
export function loading(mode) {
  const blocks = (n, cls) => '<div class="' + cls + '">' + Array.from({
    length: n
  }, () => '<i></i>').join('') + '</div>';
  const main = $('#main');
  main.setAttribute('aria-busy', 'true');
  main.innerHTML = '<div class="sdbusy" role="status" aria-label="Memuat halaman"><div aria-hidden="true">' + blocks(1, 'skhead') + (mode === 'dashboard' || mode === 'library' ? blocks(6, 'grades') : blocks(2, 'pieces')) + blocks(1, 'skhero') + blocks(3, 'sdgrid') + '</div></div>';
}
export async function unlock(f, again) {
  setView('<section class="panel form"><h1>Menu terkunci</h1><p>Masukkan password tambahan untuk membuka ' + esc(f) + '.</p><form id="unlock" class="form">' + lb('Password menu', inp('', 'type="password" required autocomplete="off"')) + '<button class="btn">Buka menu</button><p role="status"></p></form></section>');
  $('#unlock').onsubmit = e => {
    e.preventDefault();
    busy(e.submitter, async () => {
      const result = await gate('unlock', f, e.target.querySelector('input').value);
      if (result === true) await again();else e.target.querySelector('p').textContent = result;
    });
  };
}
export function links(items) {
  return '<div class="pieces">' + items.map(([s, url]) => button(s, url, 'ghost')).join('') + '</div>';
}
export async function imageFile(file, maxEdge = 1100) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5242880) throw Error('Pilih JPG, PNG, atau WebP maksimal 5 MB.');
  let bitmap, url;
  try {
    if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file);else {
      url = URL.createObjectURL(file);
      bitmap = new Image();
      bitmap.src = url;
      await bitmap.decode();
    }
  } catch {
    if (url) URL.revokeObjectURL(url);
    throw Error('Gambar tidak bisa dibaca. Simpan ulang sebagai JPG.');
  }
  const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height)),
    canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  if (url) URL.revokeObjectURL(url);
  return canvas.toDataURL('image/webp', .8);
}
export async function cleanPhotos() {
  const paths = await api('work', 'cleanup');
  for (let i = 0; i < paths.length; i += 50) await checked(db.storage.from('kb-sd-tugas').remove(paths.slice(i, i + 50)));
}
export function feedback(err) {
  toast(readableError(err), true);
}
