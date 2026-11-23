import { esc } from './common.js';
export const templates = [null, ['Buku Cerita Bergambar', 'Cerita Kancil di tepi sungai', 'Halaman', '📖', ['image', 'text']], ['Komik Percakapan', 'Percakapan saat kerja bakti', 'Panel', '💬', ['image', 'actor', 'text']], ['Panduan Langkah', 'Membuat kincir kertas', 'Langkah', '✂️', ['title', 'text', 'image']], ['Peta Konsep', 'Cabang sumber energi', 'Cabang', '🌿', ['title', 'text']], ['Kartu Banding', 'Bandingkan akar dan batang', 'Aspek', '⚖️', ['title', 'left', 'right']], ['Galeri Jelajah', 'Kenali bagian bunga', 'Titik', '🔎', ['title', 'text', 'point']], ['Cari Pasangan', 'Pasangkan pecahan dan desimal', 'Pasangan', '🧩', ['left', 'image', 'right', 'image2']], ['Masuk Keranjang', 'Pilah sampah organik dan anorganik', 'Benda', '🧺', ['title', 'group']], ['Susun Jalurnya', 'Urutkan metamorfosis kupu-kupu', 'Kartu', '🐛', ['text']], ['Buka Kartu Ingatan', 'Ingat nama dan gambar buah', 'Pasangan', '🍎', ['left', 'image', 'right', 'image2']], ['Detektif Gambar', 'Temukan segitiga pada gambar', 'Petunjuk', '🕵️', ['text', 'title', 'point']], ['Lompatan Kata', 'Lengkapi kalimat tentang cuaca', 'Kalimat', '☀️', ['text', 'correct', 'wrong']]];
export const labels = {
  image: 'Gambar',
  image2: 'Gambar kanan',
  actor: 'Nama tokoh',
  text: 'Teks',
  title: 'Nama bagian',
  left: 'Isi kiri',
  right: 'Isi kanan',
  group: 'Keranjang',
  correct: 'Jawaban benar',
  wrong: 'Pengecoh (satu per baris)'
};
// Tiny layouts mirror the activity the teacher is about to build.
const snippets = ['', '<span class="minibook"><i>🌳</i><b>Kancil kecil</b></span>', '<span class="minicomic"><img src="./assets/faces/student-0.webp" alt=""><b>Ayo!</b><img src="./assets/faces/student-2.webp" alt=""></span>', '<span class="ministep"><b>1</b> Lipat <b>2</b> Potong</span>', '<span class="minitree"><b>Energi</b><i>↙　↘</i><span>Panas　Cahaya</span></span>', '<span class="minicompare"><b>Akar</b><b>Batang</b><i>↓</i><i>↑</i></span>', '<span class="minibloom">🌼<b>1</b><b>2</b></span>', '<span class="minipair"><b>½</b><i>↔</i><b>0,5</b></span>', '<span class="minibasket">🍃<i>↓</i><b>Organik</b></span>', '<span class="minipair"><b>🥚</b><i>→</i><b>🐛</b><i>→</i><b>🦋</b></span>', '<span class="minipair"><b>✦</b><b>🍎</b><b>✦</b></span>', '<span class="minishape">○　<b>△</b>　□</span>', '<span class="miniword">Hari ini <b>cerah</b></span>'];
export const sample = t => '<span class="sample s' + t + '" aria-hidden="true">' + snippets[t] + '</span>';
const text = v => String(v ?? '').trim();
const picture = v => typeof v === 'string' && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
export const img = (v, alt = '') => picture(v) ? '<img class="illustration" src="' + v + '" alt="' + esc(alt) + '">' : '';
const lines = v => text(v).split('\n').map(text).filter(Boolean);
const validPoint = r => ['x', 'y'].every(k => typeof r[k] === 'number' && r[k] >= 0 && r[k] <= 100);
export function validate(t, b) {
  if (!t) return text(b.instruction) ? '' : 'Isi instruksi tugas.';
  const rows = b.rows || [];
  if (!rows.length || rows.length > 30) return 'Isi 1–30 bagian.';
  if ([7, 8, 9, 10, 11].includes(t) && rows.length < 2) return 'Tambahkan minimal dua bagian agar permainan bisa dicoba.';
  if (t === 10 && rows.length > 8) return 'Gunakan maksimal 8 pasangan pada kartu ingatan.';
  if ([6, 11].includes(t) && !picture(b.image)) return 'Pilih gambar utama.';
  if (t === 3 && !text(b.goal)) return 'Isi tujuan kegiatan.';
  if (t === 4 && !text(b.topic)) return 'Isi topik utama.';
  if (t === 5 && (!text(b.a) || !text(b.b))) return 'Isi nama kedua objek.';
  for (const [i, r] of rows.entries()) {
    let needed = templates[t][4].filter(k => !['image', 'image2', 'point'].includes(k));
    if ([7, 10].includes(t)) needed = needed.filter(k => !(k === 'left' && picture(r.image) || k === 'right' && picture(r.image2)));
    const missing = needed.find(k => !text(r[k]));
    const issue = missing ? 'Lengkapi ' + labels[missing] : [1, 2].includes(t) && !picture(r.image) ? 'Pilih gambar' : [6, 11].includes(t) && !validPoint(r) ? 'Tandai posisi pada gambar' : t === 12 && (!r.text.includes('___') || r.text.split('___').length !== 2 || !lines(r.wrong).length || new Set([text(r.correct), ...lines(r.wrong)].map(v => v.toLocaleLowerCase())).size !== 1 + lines(r.wrong).length) ? 'Gunakan satu ___ dan pilihan jawaban yang berbeda' : '';
    if (issue) return templates[t][2] + ' ' + (i + 1) + ' · ' + issue + '.';
  }
  if (t === 8 && new Set(rows.map(r => text(r.group))).size < 2) return 'Isi minimal dua nama keranjang berbeda.';
  if ([7, 10].includes(t) && ['left', 'right'].some((key, j) => new Set(rows.map(r => text(r[key]) + '|' + (r[j ? 'image2' : 'image'] || ''))).size !== rows.length)) return 'Gunakan kartu yang berbeda pada setiap sisi pasangan.';
  if (t === 9 && new Set(rows.map(r => text(r.text))).size !== rows.length) return 'Gunakan langkah yang berbeda.';
  if (t === 11 && new Set(rows.map(r => text(r.title))).size !== rows.length) return 'Nama objek harus berbeda.';
  return '';
}
export function stage(image, rows, visible = true) {
  return '<div class="mapstage">' + img(image, 'Gambar kegiatan') + (visible ? rows.map((r, i) => validPoint(r) ? '<button class="pin" style="left:' + r.x + '%;top:' + r.y + '%" data-pin="' + i + '" aria-label="' + esc(r.title) + '">' + (i + 1) + '</button>' : '').join('') : '') + '</div>';
}
const ctl = (v, label, extra = '') => '<button class="piece" data-v="' + v + '" ' + extra + '>' + label + '</button>';
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function play(box, item) {
  const t = item.template,
    b = item.body,
    rows = b.rows || [],
    n = rows.length;
  const error = validate(t, b);
  if (error) {
    box.innerHTML = '<p class="empty">' + esc(error) + '</p>';
    return;
  }
  const indices = rows.map((_, i) => i);
  let cur = 0,
    selected = null,
    exposed = [],
    done = new Set(),
    waiting = false,
    message = '';
  const left = shuffled(indices),
    right = shuffled(indices),
    deck = shuffled(indices.flatMap(i => [i * 2, i * 2 + 1])),
    groups = [...new Set(rows.map(r => r.group))];
  const choices = rows.map(r => shuffled([r.correct, ...lines(r.wrong)]));
  const title = v => '<h3>' + esc(v) + '</h3>',
    para = v => '<p class="prose">' + esc(v) + '</p>';
  const side = (i, j) => img(rows[i][j ? 'image2' : 'image'], 'Kartu ' + (j ? 'kanan' : 'kiri')) + esc(rows[i][j ? 'right' : 'left']);
  const controls = (s, fn) => box.querySelectorAll(s).forEach(el => el.onclick = () => fn(el));
  function lesson() {
    let interior = '';
    if (t === 1) {
      const r = rows[cur];
      interior = '<figure class="storybook">' + img(r.image, 'Ilustrasi halaman ' + (cur + 1)) + '<figcaption>' + para(r.text) + '</figcaption></figure><div class="controls">' + ctl(-1, '← Sebelumnya', cur === 0 ? 'disabled' : '') + '<b>' + (cur + 1) + ' / ' + n + '</b>' + ctl(1, 'Lanjut →', cur === n - 1 ? 'disabled' : '') + '</div>';
    }
    if (t === 2) interior = '<div class="comic">' + rows.map(r => '<article>' + img(r.image, 'Adegan ' + r.actor) + '<blockquote><b>' + esc(r.actor) + '</b>' + para(r.text) + '</blockquote></article>').join('') + '</div>';
    if (t === 3) interior = title(b.goal) + (b.tools ? para('Alat dan bahan · ' + b.tools) : '') + '<ol class="steps">' + rows.map(r => '<li>' + title(r.title) + para(r.text) + img(r.image, r.title) + '</li>').join('') + '</ol>';
    if (t === 4) interior = '<div class="concept">' + title(b.topic) + rows.map(r => '<details><summary>' + esc(r.title) + '</summary>' + para(r.text) + '</details>').join('') + '</div>';
    if (t === 5) interior = rows.map(r => '<section class="compare">' + title(r.title) + '<div><b>' + esc(b.a) + '</b>' + para(r.left) + '</div><div><b>' + esc(b.b) + '</b>' + para(r.right) + '</div></section>').join('');
    if (t === 6) interior = stage(b.image, rows) + '<div class="pieces">' + rows.map((r, i) => ctl(i, i + 1 + '. ' + esc(r.title))).join('') + '</div><div aria-live="polite">' + title(rows[cur].title) + para(rows[cur].text) + '</div>';
    box.innerHTML = interior;
    controls('[data-v]', el => {
      cur = t === 1 ? cur + Number(el.dataset.v) : Number(el.dataset.v);
      lesson();
    });
    controls('[data-pin]', el => {
      cur = Number(el.dataset.pin);
      lesson();
    });
  }
  if (t < 7) {
    lesson();
    return;
  }
  const instructions = ['Ketuk kartu kiri, lalu pilih pasangannya di kanan.', 'Pilih benda, lalu ketuk keranjang yang sesuai.', 'Ketuk kartu dari tahap pertama sampai terakhir.', 'Buka dua kartu untuk menemukan pasangan.', 'Baca petunjuk, lalu pilih objek pada gambar atau namanya.', 'Ketuk kata yang tepat untuk mengisi bagian kosong.'];
  function check(ok) {
    message = ok ? '✓ Betul!' : 'Coba lagi, kamu bisa.';
    return ok;
  }
  function game() {
    if (done.size === n) {
      box.innerHTML = '<div class="result"><span>★</span>' + title('Kamu berhasil!') + para(n + ' dari ' + n + ' selesai · Latihan pribadi') + ctl(0, 'Main Lagi') + '</div>';
      controls('button', () => play(box, item));
      return;
    }
    let html = '';
    const card = (i, j) => ctl(i, side(i, j) + (done.has(i) ? ' ✓' : ''), 'data-side="' + j + '" ' + (done.has(i) ? 'disabled' : '') + (j === 0 && selected === i ? ' aria-pressed="true"' : ''));
    if (t === 7) html = '<div class="paircols"><div>' + left.map(i => card(i, 0)).join('') + '</div><div>' + right.map(i => card(i, 1)).join('') + '</div></div>';
    if (t === 8) html = '<div class="pieces">' + left.map(i => ctl(i, esc(rows[i].title) + (done.has(i) ? ' ✓' : ''), (done.has(i) ? 'disabled' : '') + (selected === i ? ' aria-pressed="true"' : ''))).join('') + '</div><div class="baskets">' + groups.map((g, i) => ctl(i, '🧺 ' + esc(g), 'data-group')).join('') + '</div>';
    if (t === 9) html = '<ol class="slots">' + indices.map(i => '<li>' + esc(done.has(i) ? rows[i].text : '…') + '</li>').join('') + '</ol><div class="pieces">' + left.map(i => ctl(i, esc(rows[i].text), done.has(i) ? 'disabled' : '')).join('') + '</div>';
    if (t === 10) html = '<div class="memory">' + deck.map((v, k) => {
      const i = v >> 1,
        on = done.has(i) || exposed.includes(k);
      return ctl(k, on ? side(i, v % 2) + (done.has(i) ? ' ✓' : '') : '✦', 'aria-label="' + esc(on ? rows[i][v % 2 ? 'right' : 'left'] || 'Gambar terbuka' : 'Buka kartu ' + (k + 1)) + '" ' + (on || waiting ? 'disabled' : ''));
    }).join('') + '</div>';
    if (t === 11) html = title(rows[cur].text) + stage(b.image, rows, false) + '<div class="pieces">' + left.map(i => ctl(i, esc(rows[i].title))).join('') + '</div>';
    if (t === 12) html = title(rows[cur].text.replace('___', '＿＿＿')) + '<div class="pieces">' + choices[cur].map((x, i) => ctl(i, esc(x))).join('') + '</div>';
    box.innerHTML = '<div class="gamehead">' + para(instructions[t - 7]) + '<b>' + done.size + ' / ' + n + '</b></div>' + html + '<p role="status" class="feedback">' + esc(message) + '</p>';
    controls('[data-v]', el => {
      const v = Number(el.dataset.v);
      if (t === 7 || t === 8) {
        if (t === 7 ? el.dataset.side === '0' : !el.hasAttribute('data-group')) {
          selected = v;
          message = 'Sekarang pilih ' + (t === 7 ? 'pasangannya.' : 'keranjangnya.');
        } else if (selected !== null) {
          if (check(t === 7 ? selected === v : rows[selected].group === groups[v])) {
            done.add(selected);
            selected = null;
          }
        } else message = 'Pilih kartu terlebih dahulu.';
      }
      if (t === 9 && check(v === done.size)) done.add(v);
      if (t === 10) {
        if (waiting || exposed.includes(v)) return;
        exposed.push(v);
        if (exposed.length === 2) {
          if (check(deck[exposed[0]] >> 1 === deck[v] >> 1)) {
            done.add(deck[v] >> 1);
            exposed = [];
          } else {
            waiting = true;
            setTimeout(() => {
              waiting = false;
              exposed = [];
              if (box.isConnected) game();
            }, 850);
          }
        }
      }
      if (t === 11 && check(v === cur)) {
        done.add(cur++);
      }
      if (t === 12 && check(choices[cur][v] === rows[cur].correct)) {
        done.add(cur++);
      }
      game();
    });
    if (t === 11) box.querySelector('.mapstage').onclick = e => {
      const rect = e.currentTarget.getBoundingClientRect(),
        r = rows[cur];
      if (check(Math.hypot(e.clientX - rect.left - rect.width * r.x / 100, e.clientY - rect.top - rect.height * r.y / 100) <= Math.max(22, rect.width * .055))) {
        done.add(cur++);
      }
      game();
    };
  }
  game();
}
