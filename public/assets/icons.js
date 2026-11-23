var D='var(--deep,#1764DF)',A='#FFB547',W='#fff';
var ICONS={
 book:'<path d="M7 14c8-3 17-2 25 3v37c-8-5-17-6-25-3z" fill="'+D+'"/><path d="M57 14c-8-3-17-2-25 3v37c8-5 17-6 25-3z" fill="'+D+'" opacity=".72"/><path d="M13 23c5-1 10 0 14 2M13 32c5-1 10 0 14 2" stroke="'+W+'" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="49" cy="11" r="5" fill="'+A+'"/>',
 books:'<rect x="8" y="14" width="14" height="40" rx="3" fill="'+D+'"/><rect x="25" y="8" width="14" height="46" rx="3" fill="'+D+'" opacity=".72"/><rect x="42" y="18" width="14" height="36" rx="3" fill="'+A+'"/><path d="M12 22h6M29 16h6M46 26h6" stroke="'+W+'" stroke-width="3" stroke-linecap="round"/>',
 folder:'<path d="M6 16a4 4 0 0 1 4-4h14l6 7h24a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="'+D+'"/><path d="M6 27h52v25a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="'+D+'" opacity=".72"/><circle cx="48" cy="35" r="5" fill="'+A+'"/>',
 clip:'<rect x="11" y="10" width="42" height="46" rx="6" fill="'+D+'"/><rect x="22" y="5" width="20" height="11" rx="4" fill="'+A+'"/><path d="M19 28h26M19 37h26M19 46h15" stroke="'+W+'" stroke-width="3.5" stroke-linecap="round"/>',
 cal:'<rect x="8" y="12" width="48" height="44" rx="7" fill="'+D+'"/><path d="M8 26h48" stroke="'+W+'" stroke-width="3" opacity=".6"/><path d="M20 7v12M44 7v12" stroke="'+A+'" stroke-width="5" stroke-linecap="round"/><circle cx="21" cy="38" r="3.5" fill="'+W+'"/><circle cx="32" cy="38" r="3.5" fill="'+W+'"/><circle cx="43" cy="38" r="3.5" fill="'+A+'"/><circle cx="21" cy="48" r="3.5" fill="'+W+'"/><circle cx="32" cy="48" r="3.5" fill="'+W+'"/>',
 chart:'<rect x="8" y="34" width="12" height="22" rx="3" fill="'+D+'" opacity=".72"/><rect x="26" y="20" width="12" height="36" rx="3" fill="'+D+'"/><rect x="44" y="8" width="12" height="48" rx="3" fill="'+A+'"/><path d="M6 58h52" stroke="'+D+'" stroke-width="3" stroke-linecap="round"/>',
 video:'<rect x="6" y="14" width="52" height="36" rx="8" fill="'+D+'"/><path d="M26 23v18l16-9z" fill="'+W+'"/><circle cx="52" cy="12" r="5" fill="'+A+'"/>',
 crown:'<path d="M8 46 5 18l15 12 12-18 12 18 15-12-3 28z" fill="'+A+'"/><rect x="8" y="48" width="48" height="8" rx="3" fill="'+D+'"/><circle cx="32" cy="38" r="3.5" fill="'+W+'"/>',
 star:'<path d="M32 5l8.2 17.6 19.1 2.3-14.1 13.1 3.7 19L32 47.7 15.1 57l3.7-19L4.7 24.9l19.1-2.3z" fill="'+A+'"/><path d="M32 17l4.3 9.3 10.1 1.2-7.5 7 2 10-8.9-5-8.9 5 2-10-7.5-7 10.1-1.2z" fill="'+D+'" opacity=".9"/>',
 gift:'<rect x="8" y="26" width="48" height="30" rx="5" fill="'+D+'"/><rect x="6" y="18" width="52" height="12" rx="4" fill="'+D+'" opacity=".72"/><path d="M32 18v38" stroke="'+A+'" stroke-width="6"/><path d="M32 18c-8 0-14-3-11-8s11 0 11 8zm0 0c8 0 14-3 11-8s-11 0-11 8z" fill="'+A+'"/>',
 target:'<circle cx="32" cy="34" r="24" fill="'+D+'" opacity=".72"/><circle cx="32" cy="34" r="16" fill="'+W+'"/><circle cx="32" cy="34" r="9" fill="'+D+'"/><path d="M32 34 50 12" stroke="'+A+'" stroke-width="4" stroke-linecap="round"/><path d="m46 8 8 2 2 8-6-1z" fill="'+A+'"/>',
 bookmark:'<path d="M16 6h32a3 3 0 0 1 3 3v47l-19-12-19 12V9a3 3 0 0 1 3-3z" fill="'+D+'"/><path d="M32 16l3.2 6.6 7.2.9-5.3 5 1.4 7.1-6.5-3.6-6.5 3.6 1.4-7.1-5.3-5 7.2-.9z" fill="'+A+'"/>',
 calc:'<rect x="12" y="6" width="40" height="52" rx="7" fill="'+D+'"/><rect x="18" y="12" width="28" height="12" rx="3" fill="'+W+'"/><g fill="'+W+'"><circle cx="22" cy="34" r="3.2"/><circle cx="32" cy="34" r="3.2"/><circle cx="22" cy="44" r="3.2"/><circle cx="32" cy="44" r="3.2"/></g><rect x="40" y="31" width="7" height="19" rx="3.5" fill="'+A+'"/>',
 flask:'<path d="M25 6h14v16l15 26a6 6 0 0 1-5 9H15a6 6 0 0 1-5-9l15-26z" fill="'+D+'" opacity=".78"/><path d="M17 40h30l6 10a3 3 0 0 1-2.6 4.5H13.6A3 3 0 0 1 11 50z" fill="'+D+'"/><circle cx="27" cy="46" r="3" fill="'+W+'"/><circle cx="38" cy="43" r="2.4" fill="'+A+'"/><rect x="22" y="4" width="20" height="5" rx="2.5" fill="'+A+'"/>',
 globe:'<circle cx="32" cy="32" r="25" fill="'+D+'"/><path d="M32 7c-9 7-9 43 0 50M32 7c9 7 9 43 0 50M8 32h48M12 19h40M12 45h40" stroke="'+W+'" stroke-width="2.6" fill="none" opacity=".75"/><circle cx="51" cy="13" r="6" fill="'+A+'"/>',
 chat:'<path d="M10 10h32a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H26l-11 9v-9h-5a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6z" fill="'+D+'"/><path d="M22 52v-6h22l8 7v-7h2a6 6 0 0 0 6-6V28" fill="'+A+'" opacity="0"/><circle cx="19" cy="25" r="3" fill="'+W+'"/><circle cx="29" cy="25" r="3" fill="'+W+'"/><circle cx="39" cy="25" r="3" fill="'+W+'"/><path d="M46 30h6a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6v7l-9-7H32" fill="'+A+'"/>',
 palette:'<path d="M32 6C17 6 6 17 6 31s11 27 24 27c6 0 7-4 5-7s-1-7 5-7h8c7 0 14-3 14-11C62 18 49 6 32 6z" fill="'+D+'"/><circle cx="19" cy="30" r="4.5" fill="'+A+'"/><circle cx="29" cy="19" r="4.5" fill="'+W+'"/><circle cx="43" cy="21" r="4.5" fill="'+A+'" opacity=".85"/><circle cx="50" cy="33" r="4" fill="'+W+'" opacity=".85"/>',
 laptop:'<rect x="10" y="10" width="44" height="32" rx="5" fill="'+D+'"/><path d="M18 22l6 5-6 5M30 33h10" stroke="'+W+'" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M4 48h56l-3 6H7z" fill="'+D+'" opacity=".72"/><circle cx="51" cy="12" r="5" fill="'+A+'"/>'
};
var THEMES={
 sky:{bg:'#E6F0FF',deep:'#1764DF'},mint:{bg:'#DDF6EE',deep:'#128C6B'},amber:{bg:'#FFF1D6',deep:'#C77700'},
 rose:{bg:'#FFE4EA',deep:'#C2294F'},violet:{bg:'#ECE6FF',deep:'#6A3FD0'},peach:{bg:'#FFE8DC',deep:'#D2542A'},
 teal:{bg:'#D9F3F6',deep:'#0E7C8C'},slate:{bg:'#E8ECF4',deep:'#3B4F78'}
};

const KEYS=Object.keys(THEMES);
var RULES=[
 [/mat|aljabar|geometri|hitung|statistik/i,'calc','sky'],
 [/fisika|kimia|biolog|\bipa\b|sains|science/i,'flask','mint'],
 [/\bips\b|geograf|sejarah|sosial|ekonomi/i,'globe','amber'],
 [/indonesia|inggris|bahasa|sastra|arab|jawa/i,'chat','violet'],
 [/seni|budaya|musik|prakarya/i,'palette','rose'],
 [/informatika|komputer|\btik\b|coding|program/i,'laptop','teal'],
 [/olahraga|pjok|jasmani/i,'target','peach'],
 [/agama|pkn|pancasila|akidah|fiqih|akhlak/i,'star','slate']
];
function auto(subject){
  var name=String((subject&&subject.name)||''),i,h=0;
  for(i=0;i<RULES.length;i++)if(RULES[i][0].test(name))return {icon:RULES[i][1],theme:RULES[i][2]};
  for(i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;
  return {icon:'book',theme:KEYS[h%KEYS.length]};
}


export const themes = THEMES;
export const iconNames = Object.keys(ICONS);
export const subjectStyle = auto;
export function icon(name, size=28) {
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 64 64" aria-hidden="true" focusable="false">'+(Object.hasOwn(ICONS,name)?ICONS[name]:ICONS.star)+'</svg>';
}
