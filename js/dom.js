/* Elements used across the app, and the small DOM helpers everything shares. */

const els = {
  svg:document.getElementById('svg'), stage:document.querySelector('.stage'),
  readout:document.getElementById('readout'),
  count:document.getElementById('count'), pct:document.getElementById('pct'),
  meter:document.getElementById('meter'), islands:document.getElementById('islands'),
  list:document.getElementById('list'), q:document.getElementById('q'), qn:document.getElementById('qn'),
  groupby:document.getElementById('groupby'), nick:document.getElementById('nick'),
  showplan:document.getElementById('showplan'), plannedN:document.getElementById('planned-n'),
  h1:document.querySelector('.wordmark h1')
};
const narrow = window.matchMedia(NARROW_QUERY);

let toastT;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('up');
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('up'), 2600);
}

/* A saved file is named nickname-stamplogs-date, or just stamplogs-date when the
   log has no nickname. The extension tells the map from the log. */
function slugName(){
  const n = nickname.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  return (n ? n + "-" : "") + "stamplogs";
}
function fileName(ext){
  return slugName() + "-" + new Date().toISOString().slice(0,10) + "." + ext;
}
function download(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
}
