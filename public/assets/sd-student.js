import { guard, shell, esc, enc, heading, button, empty, section, materialUrl, setView, loadError, date } from './common.js';
import { readTable, announcements } from './student-data.js';
import { showStreak } from './streak.js';
import { GOOGLE_SITES_URL } from './config.js';
import { api, gate, $, book, route, param, links, loading, status, unlock, cleanPhotos, feedback } from './sd-shared.js';
import { templates, play } from './sd-templates.js';
import { assignment } from './sd-work.js';
const page = document.body.dataset.page;
const asset = './assets/';
const dest = i => i.legacy ? materialUrl(i.id) : route('kegiatan', {
  id: i.id,
  kind: i.kind
});
const schoolGrade = v => {
  const m = String(v ?? '').trim().match(/^(?:kelas\s*)?([1-6])(?:\s*SD)?$/i);
  return m ? Number(m[1]) : 0;
};
const older = './pelajaran.html#/semua';
const gradeButtons = (g, file, keep = {}) => '<nav class="grades" aria-label="Pilih kelas">' + [1, 2, 3, 4, 5, 6].map(i => '<a href="' + route(file, {
  ...keep,
  g: i
}) + '" ' + (g === i ? 'aria-current="true"' : '') + '>Kelas ' + i + (g === i ? ' ✓' : '') + '</a>').join('') + '</nav>';
const card = (title, sub, url, image = 'tile-books.webp') => '<a class="activity" href="' + esc(url) + '"><img src="' + asset + image + '" alt=""><span><strong>' + esc(title) + '</strong><small>' + esc(sub) + '</small></span><b aria-hidden="true">›</b></a>';
const linkK = k => route('latihan', {
  kind: k
});
const detail = i => card(i.title, i.kind === 'tugas' ? status[i.submission] || 'Belum dikirim' : i.legacy ? 'Materi sekolah' : templates[i.template]?.[0] || '', dest(i), i.kind === 'tugas' ? 'menu-clip.webp' : i.kind === 'game' ? 'tile-target.webp' : 'tile-books.webp');
const grid = html => '<div class="sdgrid">' + html + '</div>';
const file = page === 'dashboard' ? 'kawanbelajarku-dashboard' : page === 'library' ? 'pelajaran' : 'latihan';
let account, locks, grade, staff;
async function start() {
  loading(page);
  account = await guard();
  if (!account) return;
  shell(account);
  staff = account.admin || ['guru', 'teacher'].includes(account.profile?.role);
  if (page === 'pilih') {
    let sites = null;
    try {
      const url = new URL(GOOGLE_SITES_URL);
      if (url.protocol === 'https:' && url.hostname === 'sites.google.com') sites = url.href;
    } catch {}
    setView('<section class="choose"><div class="bookcover">' + book + '<strong>KawanBelajarku</strong><span>Kelas 1–6 SD</span></div><div><h1>Mau belajar di mana?</h1>' + card('Masuk ke KawanBelajarku', account.admin ? 'Beranda pengelola' : staff ? 'Ruang guru' : 'Beranda belajarmu', account.admin ? './kelola.html' : staff ? './studio.html' : './kawanbelajarku-dashboard.html') + (sites ? '<a class="activity independent" href="' + esc(sites) + '" target="_blank" rel="noopener noreferrer"><span><strong>Belajar Mandiri ↗</strong><small>Google Sites KawanBelajar</small></span></a>' : '<div class="activity inactive"><span><strong>Belajar Mandiri ↗</strong><small>Google Sites KawanBelajar · Tautan belum diatur</small></span></div>') + '</div></section>');
    return;
  }
  locks = await gate('list');
  const kind = page === 'kegiatan' ? await api('content', 'kind', {
    id: param.get('id')
  }) : param.get('kind') || (page === 'library' ? 'materi' : '');
  if (kind && locks[kind] && !locks[kind].open) return unlock(kind, start);
  if (page === 'kegiatan') {
    const item = await api('content', 'get', {
      id: param.get('id')
    });
    if (item.kind === 'tugas') return assignment(item);
    if (item.kind === 'materi') await api('content', 'touch', {
      id: item.id
    });
    setView(heading(item.title, 'Kelas ' + item.grade + ' · ' + item.subject + (item.chapter ? ' · ' + item.chapter : ''), item.kind === 'game' ? linkK('game') : route('pelajaran', {
      g: item.grade,
      s: item.subject
    })) + '<article class="panel reader" id="content"></article>');
    play($('#content'), item);
    return;
  }
  const key = 'kb:sd-grade:' + account.user.id;
  grade = schoolGrade(param.get('g')) || schoolGrade(sessionStorage.getItem(key)) || schoolGrade(account.profile?.kb_grade || account.profile?.grade || account.profile?.kelas || account.user.user_metadata?.grade) || 1;
  sessionStorage.setItem(key, grade);
  document.body.dataset.band = grade <= 3 ? 'awal' : 'lanjut';
  const items = await api('content', 'list'),
    tasks = items.filter(i => i.kind === 'tugas');
  if (page === 'quiz') {
    if (locks.tugas.open) void cleanPhotos().catch(feedback);
    const list = kind === 'tugas' ? tasks : items.filter(x => x.grade === grade && x.kind === 'game');
    setView(heading('Latihan', kind === 'tugas' ? 'Tugas dari kelas yang kamu ikuti.' : kind === 'game' ? 'Pilih permainan untuk kelas ' + grade + '.' : 'Mau main atau mengirim tugas?') + grid(card('Mini-game', 'Latihan pribadi', linkK('game'), 'tile-target.webp') + card('Tugas', 'Kirim foto ke guru', linkK('tugas'), 'menu-clip.webp')) + (kind === 'game' ? gradeButtons(grade, file, {
      kind
    }) : '') + (kind ? section(kind === 'game' ? 'Mini-game kelas ' + grade : 'Tugas saya', list.length ? grid(list.map(detail).join('')) : empty('Belum ada ' + (kind === 'game' ? 'mini-game untuk kelas ini.' : 'tugas untuk kelasmu.'))) : '') + links([['Kuis sekolah', './latihan.html#/semua'], ['Kelas dan tugas kuis', './kelas.html'], ['Kuis Live', './guru.html']]));
    return;
  }
  const [subjects, materials, chapters, news, activity] = await Promise.all([readTable('subjects'), readTable('materials'), readTable('kb_chapters'), page === 'dashboard' ? readTable('announcements') : [], page === 'dashboard' ? readTable('kb_material_activity', account.user.id) : []]);
  const school = materials.flatMap(m => {
    const s = subjects.find(x => String(x.id) === String(m.subject_id));
    if (!s || schoolGrade(s.kb_grade) !== grade) return [];
    return [{
      ...m,
      kind: 'materi',
      legacy: true,
      subject: s.name,
      chapter: chapters.find(x => String(x.id) === String(m.kb_chapter))?.title || 'Materi lainnya',
      touched: activity.find(x => String(x.material_id) === String(m.id))?.opened_at
    }];
  });
  const lessons = [...items.filter(x => x.kind === 'materi' && x.grade === grade), ...school];
  const subjectNames = [...new Set([...subjects.filter(s => schoolGrade(s.kb_grade) === grade).map(x => x.name), ...lessons.map(x => x.subject)])];
  const slink = s => route('pelajaran', {
    g: grade,
    s
  });
  const noLessons = empty('Belum ada materi untuk kelas ' + grade + '. Pilih kelas lain di atas.');
  const subjectArt = s => /matematika/i.test(s) ? 'matematika.webp' : /ipa|sains/i.test(s) ? 'tile-flask.webp' : /seni|prakarya/i.test(s) ? 'tile-gift.webp' : /olahraga|pjok/i.test(s) ? 'tile-target.webp' : 'tile-books.webp';
  const subjectCards = subjectNames.length ? '<div class="schooltiles">' + subjectNames.map((s, i) => '<a class="schooltile tile' + i % 4 + '" href="' + esc(slink(s)) + '"><img src="' + asset + subjectArt(s) + '" alt=""><span><strong>' + esc(s) + '</strong><small>' + lessons.filter(x => x.subject === s).length + ' materi</small></span></a>').join('') + '</div>' : '';
  if (page === 'dashboard') {
    const next = lessons.slice().sort((a, b) => String(b.touched || '').localeCompare(String(a.touched || '')))[0];
    const pending = tasks.filter(x => !x.submission || x.submission === 'revise');
    setView('<header class="welcome">' + book + '<div><small>KawanBelajarku · Sekolah Dasar</small><h1>Halo, ' + esc(account.name.split(' ')[0]) + '!</h1></div></header>' + section('Pilih Kelas', gradeButtons(grade, file)) + '<div class="continue"><span class="covericon" aria-hidden="true">Aa</span><div><small>Lanjut Belajar · Kelas ' + grade + '</small><h2>' + esc(next?.title || 'Jelajahi pelajaran') + '</h2></div><a aria-label="Lanjut belajar" href="' + esc(next ? dest(next) : route('pelajaran', {
      g: grade
    })) + '">→</a></div>' + section('Mata Pelajaran', subjectCards || noLessons, './pelajaran.html') + section('Tugas saya', pending.length ? grid(pending.slice(0, 3).map(detail).join('')) : empty(locks.tugas.open ? 'Belum ada tugas yang perlu dikirim.' : 'Buka menu Tugas untuk melihat tugasmu.'), linkK('tugas')) + (news.length ? section('Pengumuman', announcements(news.slice(-2).reverse())) : '') + section('Jelajah', links([['Kuis Live', './guru.html'], ['Bahasa', './bahasa.html'], ['Tata Surya', './tata-surya.html'], ['Streak', './streak.html'], ['Menu lainnya', './belajar.html#/menu'], ...(staff ? [['Ruang Guru', './studio.html']] : [])])));
    void showStreak().catch(feedback);
    return;
  }
  const s = param.get('s'),
    ch = param.get('bab');
  const filtered = lessons.filter(x => x.subject === s);
  const chapterNames = [...new Set(filtered.map(x => x.chapter || 'Materi lainnya'))];
  const chapterList = chapterNames.map(c => card(c, s, route('pelajaran', {
    g: grade,
    s,
    bab: c
  }), 'menu-bookmark.webp')).join('');
  setView(heading(ch || s || 'Pelajaran', 'Kelas ' + grade + (s ? ' · ' + s : ''), ch ? slink(s) : s ? route('pelajaran', {
    g: grade
  }) : '') + gradeButtons(grade, file) + (ch ? section('Materi', grid(filtered.filter(x => (x.chapter || 'Materi lainnya') === ch).map(detail).join(''))) : '<label class="field searchsd">Cari ' + (s ? 'bab' : 'mata pelajaran') + '<input type="search" id="find" placeholder="' + (s ? 'Nama bab' : 'Nama mata pelajaran') + '"></label>' + section(s ? 'Pilih Bab' : 'Mata Pelajaran', s ? chapterList ? grid(chapterList) : noLessons : subjectCards || noLessons)) + '<p id="nomatch" class="empty" hidden>Tidak ada hasil pencarian.</p>' + links([['Koleksi sekolah & materi tanpa kelas', older], ['Materi tersimpan', './pelajaran.html#/tersimpan']]));
  if ($('#find')) $('#find').oninput = e => {
    const cards = [...document.querySelectorAll('#main .activity,#main .schooltile')];
    cards.forEach(el => el.hidden = !el.textContent.toLowerCase().includes(e.target.value.toLowerCase()));
    $('#nomatch').hidden = !cards.length || cards.some(el => !el.hidden);
  };
}
start().catch(loadError);
