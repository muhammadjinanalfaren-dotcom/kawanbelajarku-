import { db, checked, esc, guard, shell, setView, heading, button, empty, busy, loadError, toast } from './common.js';
import { api, gate, $, lb, inp, opt, param, route, states, links, loading, unlock, imageFile } from './sd-shared.js';
import { templates, labels, sample, img, stage, play, validate } from './sd-templates.js';
import { assignment, review } from './sd-work.js';
import { readTable } from './student-data.js';
const url = p => route('studio', p);
const steps = active => '<ol class="authorsteps" aria-label="Tahapan membuat konten">' + ['Template', 'Isi', 'Pratinjau'].map((v, i) => '<li ' + (i === active ? 'aria-current="step"' : '') + '><span>' + (i + 1) + '</span>' + v + '</li>').join('') + '</ol>';
const nav = () => links([['Pustaka Konten', url({
  view: 'library'
})], ['Kiriman Siswa', url({
  view: 'kiriman'
})], ['Kelas dan pengguna', './kelas.html'], ['Bank soal & Kuis Live', './guru.html']]);
const go = (name, p) => button(name, url(p), 'ghost');
let account,
  locks,
  rooms = [],
  subjects = [],
  chapters = [],
  draft;
const kinds = {
  materi: 'Materi',
  game: 'Mini-game',
  tugas: 'Tugas'
};
const visibleRooms = () => rooms.map(c => opt(c.id, c.title, draft.room)).join('');
function welcome() {
  setView(heading('Ruang Guru', 'Apa yang ingin dibuat hari ini?') + '<div class="sdgrid">' + Object.entries(kinds).map(([k, v], i) => '<a class="workcard c' + i + '" href="' + url({
    create: k
  }) + '"><span aria-hidden="true">' + ['📚', '🧩', '✏️'][i] + '</span><strong>Buat ' + v + '</strong></a>').join('') + '</div>' + nav() + (account.admin ? links([['Kunci menu', url({
    view: 'locks'
  })], ['Panel Pengelola', './kelola.html']]) : ''));
}
async function settings() {
  if (!account.admin) throw Error('Akses pengelola diperlukan.');
  setView(heading('Kunci menu', 'Atur akses ke materi template, mini-game, dan tugas foto SD. Akses berlaku 15 menit per sesi.', url({})) + Object.entries(kinds).map(([k, v]) => '<form class="panel form" data-lock="' + k + '"><h2>' + v + ' ' + (locks[k].locked ? '· Terkunci' : '· Terbuka') + '</h2>' + lb('Password baru', inp('', 'type="password" minlength="8" autocomplete="new-password"')) + '<div class="pieces"><button class="btn" value="set">' + (locks[k].locked ? 'Ganti password' : 'Aktifkan kunci') + '</button>' + (locks[k].locked ? '<button class="piece" value="off" formnovalidate>Nonaktifkan</button>' : '') + '</div></form>').join(''));
  document.querySelectorAll('[data-lock]').forEach(f => f.onsubmit = e => {
    e.preventDefault();
    const action = e.submitter.value;
    busy(e.submitter, async () => {
      await gate(action, f.dataset.lock, f.querySelector('input').value);
      locks = await gate('list');
      await settings();
      toast('Pengaturan disimpan.');
    });
  });
}
async function library(submissions) {
  const items = (await api('content', 'library')).filter(x => !submissions || x.kind === 'tugas');
  setView(heading(submissions ? 'Kiriman Siswa' : 'Pustaka Konten', submissions ? 'Pilih tugas untuk memeriksa kiriman.' : 'Cari, edit, atau gandakan kegiatan kelas.', url({})) + '<div class="filters">' + lb('Cari judul', inp('', 'type="search" id="q"')) + lb('Kelas', '<select id="gr">' + opt('', 'Semua kelas') + [1, 2, 3, 4, 5, 6].map(i => opt(i, 'Kelas ' + i)).join('') + '</select>') + lb('Pelajaran', '<select id="sub">' + opt('', 'Semua pelajaran') + [...new Set(items.map(x => x.subject))].map(s => opt(s, s)).join('') + '</select>') + lb('Status', '<select id="st">' + opt('', 'Semua status') + Object.entries(states).map(([a, b]) => opt(a, b)).join('') + '</select>') + '</div><div id="results"></div>' + Object.keys(kinds).filter(k => !locks[k].open).map(k => go('Buka kunci ' + kinds[k], {
    view: submissions ? 'kiriman' : 'library',
    access: k
  })).join(''));
  function draw() {
    const rows = items.filter(x => x.title.toLowerCase().includes($('#q').value.toLowerCase()) && (!$('#gr').value || x.grade === $('#gr').value * 1) && (!$('#sub').value || x.subject === $('#sub').value) && (!$('#st').value || x.state === $('#st').value));
    $('#results').innerHTML = rows.length ? rows.map(x => '<article class="panel"><small>Kelas ' + x.grade + ' · ' + esc(x.subject) + ' · ' + states[x.state] + '</small><h2>' + esc(x.title) + '</h2><div class="pieces">' + (submissions ? go('Periksa kiriman', {
      review: x.id
    }) : go('Edit', {
      edit: x.id
    }) + go('Duplikasi', {
      copy: x.id
    }) + (x.state === 'archived' ? '' : '<button class="piece" data-archive="' + x.id + '">Arsipkan</button>')) + '</div></article>').join('') : empty('Belum ada konten dengan pilihan ini.');
    document.querySelectorAll('[data-archive]').forEach(el => el.onclick = () => busy(el, async () => {
      if (!confirm('Arsipkan konten ini?')) return;
      const item = await api('content', 'get', {
        id: el.dataset.archive
      });
      await api('content', 'save', {
        ...item,
        state: 'archived'
      });
      await library(false);
    }));
  }
  document.querySelectorAll('.filters input,.filters select').forEach(el => el.oninput = draw);
  draw();
}
function picker(kind) {
  const list = templates.map((t, i) => t && (kind === 'materi' && i <= 6 || kind === 'game' && i > 6) ? '<a class="tpl" href="' + url({
    create: kind,
    t: i
  }) + '">' + sample(i) + '<strong>' + esc(t[0]) + '</strong><small>' + esc(t[1]) + '</small></a>' : '').join('');
  setView(heading('Pilih template ' + kinds[kind], 'Semua template bisa dipakai di kelas 1–6.', url({})) + steps(0) + '<div class="sdgrid">' + list + '</div>');
}
const stringField = (obj, key, label, area = false, attrs = '') => lb(label, area ? '<textarea data-key="' + key + '" ' + attrs + '>' + esc(obj[key]) + '</textarea>' : inp(obj[key], 'data-key="' + key + '" ' + attrs));
function fileField(obj, key, label) {
  return '<div data-filebox="' + key + '">' + lb(label + ' · JPG, PNG, WebP maks. 5 MB', '<input type="file" accept="image/jpeg,image/png,image/webp" data-file="' + key + '">') + img(obj[key], label) + (obj[key] ? '<button class="piece" type="button" data-del="' + key + '">Hapus gambar</button>' : '') + '<small role="status"></small></div>';
}
function rowForm(t, r, i) {
  const names = {
    ...labels,
    ...(t === 3 ? {
      title: 'Judul langkah',
      text: 'Penjelasan'
    } : t === 4 ? {
      title: 'Judul cabang',
      text: 'Penjelasan'
    } : t === 5 ? {
      title: 'Aspek',
      left: draft.body.a || 'Objek pertama',
      right: draft.body.b || 'Objek kedua'
    } : t === 8 ? {
      title: 'Nama benda'
    } : t === 11 ? {
      text: 'Petunjuk',
      title: 'Nama objek'
    } : t === 12 ? {
      text: 'Kalimat (gunakan ___ untuk bagian kosong)'
    } : {})
  };
  const fields = templates[t][4].map(k => k === 'point' ? '<p>Ketuk titik pada gambar. Dengan keyboard, gunakan tombol panah untuk menggeser titik.</p><div class="pointedit" tabindex="0" role="group" aria-label="Posisi titik ' + (i + 1) + '">' + (draft.body.image ? stage(draft.body.image, [r]) : 'Pilih gambar utama terlebih dahulu.') + '</div>' : k === 'image' || k === 'image2' ? fileField(r, k, names[k]) : stringField(r, k, names[k], ['text', 'wrong'].includes(k))).join('');
  return '<fieldset class="panel form" data-row="' + i + '"><legend>' + templates[t][2] + ' ' + (i + 1) + '</legend>' + fields + '<div class="pieces">' + ['Naik', 'Turun', 'Hapus'].map((v, j) => '<button class="piece" type="button" data-op="' + j + '" ' + (j === 0 && i === 0 || j === 1 && i === draft.body.rows.length - 1 ? 'disabled' : '') + '>' + v + '</button>').join('') + '</div></fieldset>';
}
function editor() {
  const d = draft,
    b = d.body,
    t = d.template;
  const specific = t === 0 ? stringField(b, 'instruction', 'Instruksi tugas *', true) + fileField(b, 'image', 'Lampiran soal (opsional)') : t === 3 ? stringField(b, 'goal', 'Tujuan *') + stringField(b, 'tools', 'Alat dan bahan (opsional)') : t === 4 ? stringField(b, 'topic', 'Topik utama *') : t === 5 ? stringField(b, 'a', 'Objek pertama *') + stringField(b, 'b', 'Objek kedua *') : [6, 11].includes(t) ? fileField(b, 'image', 'Gambar utama *') : '';
  const localTime = d.due ? new Date(new Date(d.due).getTime() - new Date(d.due).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  setView(heading(t ? templates[t][0] : 'Buat Tugas', 'Isi bagian bertanda * sebelum terbit.', url({
    view: 'library'
  })) + (t ? steps(1) : '') + '<form id="editSD" class="form"><div class="panel form" id="meta">' + lb('Kelas sekolah *', '<select name="room" ' + (d.rev ? 'disabled' : '') + '>' + visibleRooms() + '</select>') + lb('Tingkat *', '<select name="grade">' + [1, 2, 3, 4, 5, 6].map(i => opt(i, 'Kelas ' + i, d.grade)).join('') + '</select>') + lb('Mata pelajaran *', inp(d.subject, 'name="subject" list="subjectHints" maxlength="150"')) + '<datalist id="subjectHints">' + [...new Set(subjects.map(s => s.name))].map(s => opt(s, s)).join('') + '</datalist>' + lb('Bab (opsional)', inp(d.chapter, 'name="chapter" list="chapterHints" maxlength="150"')) + '<datalist id="chapterHints"></datalist>' + lb('Judul *', inp(d.title, 'name="title" maxlength="150" required')) + (t === 0 ? lb('Tenggat (opsional)', inp(localTime, 'name="due" type="datetime-local"')) : '') + '</div><div id="bodyFields" class="form">' + specific + '</div>' + (t ? b.rows.map((r, i) => rowForm(t, r, i)).join('') + '<button type="button" class="piece" id="addrow">+ Tambah ' + templates[t][2] + '</button>' : '') + '<p id="problem" role="alert"></p><div class="pieces"><button class="btn ghost" type="button" id="previewBtn">Pratinjau</button><button class="btn secondary" value="draft">Simpan Draft</button><button class="btn" value="published">Terbitkan</button></div></form>');
  const hints = () => {
    const ids = subjects.filter(s => s.name === d.subject).map(s => String(s.id));
    $('#chapterHints').innerHTML = chapters.filter(c => ids.includes(String(c.subject_id))).map(c => opt(c.title, c.title)).join('');
  };
  hints();
  $('#meta').oninput = e => {
    const k = e.target.name;
    if (!k) return;
    d[k] = k === 'grade' ? Number(e.target.value) : k === 'due' ? e.target.value ? new Date(e.target.value).toISOString() : null : e.target.value;
    if (k === 'subject') hints();
  };
  const scopeFor = el => el.closest('[data-row]') ? b.rows[Number(el.closest('[data-row]').dataset.row)] : b;
  $('#editSD').addEventListener('input', e => {
    if (e.target.dataset.key) scopeFor(e.target)[e.target.dataset.key] = e.target.value;
  });
  document.querySelectorAll('[data-file]').forEach(el => el.onchange = async () => {
    if (!el.files[0]) return;
    const box = el.closest('[data-filebox]'),
      msg = box.querySelector('small'),
      obj = scopeFor(el);
    msg.textContent = 'Memproses gambar…';
    const form = $('#editSD');
    form.inert = true;
    try {
      obj[el.dataset.file] = await imageFile(el.files[0]);
      editor();
      toast('Gambar siap disimpan bersama konten.');
    } catch (e) {
      msg.textContent = e.message;
    } finally {
      form.inert = false;
    }
  });
  document.querySelectorAll('[data-del]').forEach(el => el.onclick = () => {
    delete scopeFor(el)[el.dataset.del];
    editor();
  });
  document.querySelectorAll('[data-op]').forEach(el => el.onclick = () => {
    const i = Number(el.closest('[data-row]').dataset.row),
      j = Number(el.dataset.op);
    if (j === 2) b.rows.splice(i, 1);else {
      const dest = i + (j === 0 ? -1 : 1);
      [b.rows[i], b.rows[dest]] = [b.rows[dest], b.rows[i]];
    }
    editor();
  });
  document.querySelectorAll('.pointedit').forEach(el => {
    const r = scopeFor(el);
    const update = (x, y) => {
      r.x = Math.max(0, Math.min(100, x));
      r.y = Math.max(0, Math.min(100, y));
      el.innerHTML = stage(b.image, [r]);
      el.querySelector('button').type = 'button';
    };
    const pin = el.querySelector('button');
    if (pin) pin.type = 'button';
    el.onclick = e => {
      const rect = el.querySelector('.mapstage')?.getBoundingClientRect();
      if (rect) update(100 * (e.clientX - rect.left) / rect.width, 100 * (e.clientY - rect.top) / rect.height);
    };
    el.onkeydown = e => {
      if (!e.key.startsWith('Arrow') || !b.image) return;
      e.preventDefault();
      update((r.x ?? 50) + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0), (r.y ?? 50) + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0));
    };
  });
  if (t) $('#addrow').onclick = () => {
    b.rows.push({});
    editor();
    document.querySelector('[data-row="' + (b.rows.length - 1) + '"]').scrollIntoView();
  };
  function problem() {
    const issue = !d.title.trim() ? 'Isi judul.' : !d.subject.trim() ? 'Isi mata pelajaran.' : validate(t, b);
    if (issue) {
      const i = Number(issue.match(/^\S+ (\d+) ·/)?.[1]);
      const target = i ? document.querySelector('[data-row="' + (i - 1) + '"]') : !d.title.trim() ? $('#meta [name=title]') : !d.subject.trim() ? $('#meta [name=subject]') : $('#bodyFields');
      const msg = $('#problem');
      msg.textContent = issue;
      target?.after(msg);
      msg.scrollIntoView({
        block: 'center'
      });
      return true;
    }
    return false;
  }
  $('#previewBtn').onclick = () => {
    if (problem()) return;
    setView(heading('Pratinjau siswa', d.title) + (t ? steps(2) : '') + '<button id="backEdit" class="piece">← Kembali ke isian</button><div class="panel" id="preview"></div>');
    if (t) play($('#preview'), d);else assignment(d, true);
    $('#backEdit').onclick = editor;
  };
  $('#editSD').onsubmit = e => {
    e.preventDefault();
    const state = e.submitter.value;
    if (state === 'published' && problem()) return;
    const f = e.currentTarget;
    f.inert = true;
    busy(e.submitter, async () => {
      try {
        const res = await api('content', 'save', {
          ...d,
          state
        });
        d.rev = res.rev;
        setView(heading(state === 'draft' ? 'Draft tersimpan' : 'Konten sudah terbit', d.title) + links([['Buka konten', url({
          edit: d.id
        })], ...(state === 'published' && t ? [['Tampilan siswa', route('kegiatan', {
          id: d.id,
          kind: d.kind
        })]] : []), ['Pustaka Konten', url({
          view: 'library'
        })]]));
      } finally {
        f.inert = false;
      }
    });
  };
}
async function start() {
  loading('guru');
  account = await guard();
  if (!account) return;
  if (!account.admin && !['guru', 'teacher'].includes(account.profile?.role)) {
    location.replace('./kawanbelajarku-dashboard.html');
    return;
  }
  shell(account);
  locks = await gate('list');
  const view = param.get('view'),
    kind = param.get('create'),
    requestedId = param.get('review') || param.get('edit') || param.get('copy');
  const access = requestedId ? await api('content', 'kind', {
    id: requestedId
  }) : param.get('access') || kind;
  if (access && locks[access] && !locks[access].open) return unlock(access, start);
  if (view === 'locks') return settings();
  if (view === 'library' || view === 'kiriman') return library(view === 'kiriman');
  if (param.has('review')) return review(await api('content', 'get', {
    id: param.get('review')
  }));
  if (!kind && !param.has('edit') && !param.has('copy')) return welcome();
  if (kind && !Object.hasOwn(kinds, kind)) throw Error('Jenis konten tidak dikenal.');
  if (kind && kind !== 'tugas' && !param.has('t')) return picker(kind);
  [rooms, subjects, chapters] = await Promise.all([api('content', 'rooms'), readTable('subjects'), readTable('kb_chapters')]);
  if (!rooms.length) {
    setView(heading('Buat kelas terlebih dahulu', 'Konten guru perlu terhubung ke kelas yang dikelola.') + button('Buka Kelas', './kelas.html'));
    return;
  }
  if (kind) {
    const t = Number(param.get('t')) || 0;
    if (!(kind === 'materi' && t >= 1 && t <= 6 || kind === 'game' && t >= 7 && t <= 12 || kind === 'tugas' && t === 0)) throw Error('Template tidak sesuai.');
    draft = {
      id: crypto.randomUUID(),
      room: rooms[0].id,
      kind,
      template: t,
      grade: 1,
      subject: '',
      chapter: '',
      title: '',
      body: {
        rows: [{}]
      }
    };
  } else {
    draft = await api('content', 'get', {
      id: param.get('edit') || param.get('copy')
    });
    if (!rooms.some(c => c.id === draft.room)) throw Error('Pilih konten kelas yang dikelola.');
    if (param.has('copy')) {
      draft = {
        ...draft,
        id: crypto.randomUUID(),
        title: ('Salinan ' + draft.title).slice(0, 150),
        rev: null,
        state: 'draft'
      };
      const copy = await api('content', 'save', draft);
      location.replace(url({
        edit: copy.id
      }));
      return;
    }
  }
  editor();
}
start().catch(loadError);
