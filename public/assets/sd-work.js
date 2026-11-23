import { db, checked, esc, setView, heading, section, busy, button } from './common.js';
import { api, $, lb, status, route, cleanPhotos, feedback, imageFile } from './sd-shared.js';
import { img } from './sd-templates.js';
const bucket = () => db.storage.from('kb-sd-tugas');
async function showPhoto(box, path) {
  const blob = await checked(bucket().download(path));
  const url = URL.createObjectURL(blob);
  const picture = document.createElement('img');
  picture.alt = 'Foto jawaban siswa';
  picture.className = 'illustration';
  picture.onload = () => URL.revokeObjectURL(url);
  picture.src = url;
  box.replaceChildren(picture);
}
export async function assignment(item, preview = false) {
  const work = preview ? null : await api('work', 'mine', {
    task: item.id
  });
  const editable = !preview && (!work || work.status === 'revise');
  const content = '<div class="panel taskbrief"><small>' + esc(item.subject) + ' · Kelas ' + item.grade + '</small><h2>' + esc(item.title) + '</h2><p class="prose">' + esc(item.body.instruction) + '</p>' + img(item.body.image, 'Lampiran soal') + (item.due ? '<p>Tenggat ' + esc(new Date(item.due).toLocaleString('id-ID')) + '</p>' : '') + '</div>';
  const root = preview ? $('#preview') : $('#main');
  root.innerHTML = content + (preview ? '' : section(status[work?.status] || 'Belum dikirim', (work ? '<div class="panel"><div id="oldphoto"></div><p>' + esc(work.note) + '</p>' + (work.feedback ? '<p><b>Umpan balik guru</b> ' + esc(work.feedback) + '</p>' : '') + (work.score != null ? '<p>Nilai · ' + work.score + '</p>' : '') + '</div>' : '') + (editable ? '<div class="form panel"><p>Gunakan JPG, PNG, atau WebP maksimal 5 MB.</p><div class="pieces"><label class="filepick">Ambil Foto<input type="file" id="camera" accept="image/*" capture="environment"></label><label class="filepick">Pilih dari Galeri<input type="file" id="gallery" accept="image/jpeg,image/png,image/webp"></label></div><div id="selected"></div>' + lb('Catatan (opsional)', '<textarea id="note" maxlength="2000">' + esc(work?.note) + '</textarea>') + '<button id="send" class="btn" disabled>Kirim ke Guru</button><p id="sending" role="status"></p></div>' : '')) + button('Kembali ke tugas', route('latihan', {
    kind: 'tugas'
  }), 'ghost'));
  if (preview) return;
  if (work) showPhoto($('#oldphoto'), work.photo).catch(feedback);
  if (!editable) {
    cleanPhotos().catch(feedback);
    return;
  }
  let file = null,
    version = 0,
    working = false;
  const choose = async e => {
    const current = ++version,
      raw = e.target.files[0];
    if (!raw) return;
    e.target.value = '';
    $('#send').disabled = true;
    try {
      const data = await imageFile(raw, 2200);
      const normalized = await (await fetch(data)).blob();
      if (current !== version) return;
      file = normalized;
      $('#selected').innerHTML = img(data, 'Pratinjau foto') + '<button class="piece" id="remove">Hapus foto</button>';
      $('#remove').onclick = () => {
        version++;
        file = null;
        $('#selected').innerHTML = '';
        $('#send').disabled = true;
      };
      $('#sending').textContent = 'Foto siap. Pilih foto lain untuk mengganti.';
    } catch (err) {
      $('#sending').textContent = err.message;
    } finally {
      if (current === version) $('#send').disabled = !file;
    }
  };
  $('#camera').onchange = $('#gallery').onchange = choose;
  $('#send').onclick = async () => {
    if (!file || working) return;
    working = true;
    const send = $('#send'),
      msg = $('#sending');
    send.disabled = true;
    let path;
    const note = $('#note').value;
    try {
      msg.textContent = 'Mengunggah foto…';
      path = await api('work', 'prepare', {
        task: item.id,
        ext: file.type === 'image/png' ? 'png' : 'webp'
      });
      await checked(bucket().upload(path, file, {
        contentType: file.type,
        upsert: false
      }));
      msg.textContent = 'Mencatat kiriman…';
      await api('work', 'submit', {
        task: item.id,
        path,
        note
      });
      await assignment(item);
    } catch (err) {
      if (path) {
        try {
          const current = await api('work', 'mine', {
            task: item.id
          });
          if (current?.photo === path) {
            await assignment(item);
            return;
          }
          await api('work', 'cancel', {
            task: item.id,
            path
          });
        } catch {/* Pending uploads can be reclaimed on the next visit. */}
      }
      msg.textContent = 'Gagal mengirim. ' + (err.message || 'Periksa koneksi dan coba lagi.');
    } finally {
      working = false;
      send.disabled = false;
      cleanPhotos().catch(feedback);
    }
  };
  cleanPhotos().catch(feedback);
}
export async function review(item) {
  const roster = await api('work', 'roster', {
    task: item.id
  });
  setView(heading('Kiriman Siswa', item.title, route('studio', {
    view: 'kiriman'
  })) + (roster.length ? roster.map((m, i) => '<article class="panel"><h2>' + esc(m.name) + '</h2><p>' + esc(status[m.work?.status] || 'Belum dikirim') + '</p>' + (m.work ? '<p>' + esc(m.work.note) + '</p><button class="piece" data-photo="' + i + '">Buka foto</button><div id="photo' + i + '"></div><form class="form" data-review="' + i + '">' + lb('Umpan balik', '<textarea name="feedback" maxlength="4000">' + esc(m.work.feedback) + '</textarea>') + lb('Nilai (opsional)', '<input name="score" type="number" min="0" max="100" value="' + esc(m.work.score) + '">') + lb('Status', '<select name="status"><option value="done">Selesai</option><option value="revise" ' + (m.work.status === 'revise' ? 'selected' : '') + '>Perlu diperbaiki</option></select>') + '<button class="btn">Simpan pemeriksaan</button></form>' : '') + '</article>').join('') : '<p class="empty">Belum ada siswa terdaftar di kelas ini.</p>'));
  document.querySelectorAll('[data-photo]').forEach(b => b.onclick = () => busy(b, () => showPhoto($('#photo' + b.dataset.photo), roster[b.dataset.photo].work.photo)));
  document.querySelectorAll('[data-review]').forEach(f => f.onsubmit = e => {
    e.preventDefault();
    busy(e.submitter, async () => {
      const m = roster[f.dataset.review],
        v = Object.fromEntries(new FormData(f));
      await api('work', 'review', {
        ...v,
        score: v.score || null,
        task: item.id,
        student: m.uid,
        path: m.work.photo
      });
      await review(item);
    });
  });
}
