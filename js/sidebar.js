/* ── the stats on the map (tally, nickname, planned switch) and the list view ── */

/* Regions run in island order, then by PSGC code so they read in the official sequence. */
function groupNames(){
  return groupBy !== "region" ? ISLANDS.slice() : regionNames();
}
function regionNames(){
  const seen = new Map();
  provinces.forEach(p=>{
    const code = Number(p.id);
    const g = seen.get(p.region);
    if(!g) seen.set(p.region, {name:p.region, island:p.island, code:code});
    else if(code < g.code) g.code = code;
  });
  return [...seen.values()]
    .sort((a,b)=> ISLANDS.indexOf(a.island) - ISLANDS.indexOf(b.island) || a.code - b.code)
    .map(g=>g.name);
}
function buildList(){
  if(provRow) closeProv();
  els.list.textContent = "";
  const key = groupBy === "region" ? (p=>p.region) : (p=>p.island);
  groupNames().forEach((g,gi)=>{
    const gk = "g" + gi;
    const h = document.createElement('div'); h.className="grp"; h.dataset.grp=gk; h.dataset.name=g;
    h.innerHTML = '<b></b><span class="mono"></span>';
    h.querySelector('b').textContent = g;
    els.list.appendChild(h);
    provinces.filter(p=>key(p)===g).forEach(p=>{
      const b = document.createElement('div');
      b.className="row"; b.dataset.id=p.id; b.dataset.grp=gk;
      b.dataset.photo = photoIds.has(String(p.id)) ? "1":"0";
      b.dataset.name = p.name.toLowerCase();
      b.innerHTML = '<button type="button" class="tick"><span></span></button>'
        + '<button type="button" class="open" aria-expanded="false"><span class="nm"></span><span class="rg"></span></button>'
        + '<span class="when mono"></span>';
      b.querySelector('.nm').textContent = p.name;
      b.querySelector('.rg').textContent = groupBy === "region" ? p.island : p.region;
      /* the name opens the panel in place under the row; tapping it again closes it */
      b.querySelector('.open').onclick = ()=>{
        if(provRow === b) closeProv();
        else { setHot(p); openProv(p, b); }
      };
      /* the square stamps; taking a stamp off leaves its date as a plan */
      b.querySelector('.tick').onclick = ()=> setStatus(p, statusOf(p) === "traveled" ? "planned" : "traveled");
      paintRow(b, p);
      b.onmouseenter = ()=>{ setHot(p); els.readout.style.opacity = 0; };
      b.onmouseleave = ()=> setHot(null);
      els.list.appendChild(b);
    });
  });
  paintGroupCounts();
  filterList();
}
function paintGroupCounts(){
  const key = groupBy === "region" ? (p=>p.region) : (p=>p.island);
  els.list.querySelectorAll('.grp').forEach(h=>{
    const inG = provinces.filter(p=> key(p) === h.dataset.name);
    h.querySelector('span').textContent = inG.filter(p=> visited[p.id]).length + " / " + inG.length;
  });
}
function shortDay(iso){
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
}
function syncGroupToggle(){
  els.groupby.querySelectorAll('button').forEach(b=>{
    b.setAttribute('aria-pressed', String(b.dataset.mode === groupBy));
  });
}
els.groupby.addEventListener('click', e=>{
  const b = e.target.closest('button[data-mode]');
  if(!b || b.dataset.mode === groupBy) return;
  groupBy = b.dataset.mode;
  try{ localStorage.setItem(GROUP_KEY, groupBy); }catch(err){}
  syncGroupToggle();
  buildList();
  els.list.scrollTop = 0;
});

/* the list says where a province really stands, plans shown on the map or not */
function paintRow(row, p){
  const st = statusOf(p);
  row.dataset.on = st === "traveled" ? "1" : "0";
  row.dataset.st = st;
  const t = trips[String(p.id)], v = visited[p.id];
  const iso = t ? t.date : (v && v !== UNDATED ? v : "");
  row.querySelector('.when').textContent = st === "none" ? "" : iso ? shortDay(iso) : "";
  const tick = row.querySelector('.tick');
  tick.setAttribute("aria-pressed", st === "traveled" ? "true" : "false");
  tick.setAttribute("aria-label", (st === "traveled" ? "Take the stamp off " : "Stamp ") + p.name);
}
function applyNick(){
  els.h1.textContent = logTitle() || APP_NAME;
  document.title = logTitle() || APP_TITLE;
}
els.nick.addEventListener('input', ()=> setNick(els.nick.value));
els.nick.addEventListener('blur', ()=>{ els.nick.value = nickname; });

els.q.addEventListener('input', filterList);
function filterList(){
  const q = els.q.value.trim().toLowerCase();
  let n = 0;
  els.list.querySelectorAll('.row').forEach(r=>{
    const show = !q || r.dataset.name.includes(q);
    r.style.display = show ? "" : "none"; if(show) n++;
  });
  els.list.querySelectorAll('.grp').forEach(h=>{
    const any = [...els.list.querySelectorAll('.row[data-grp="'+h.dataset.grp+'"]')].some(r=>r.style.display!=="none");
    h.style.display = any ? "" : "none";
  });
  els.qn.textContent = q ? n+" match"+(n===1?"":"es") : "";
  if(provRow && provRow.style.display === "none") closeProv();
}

function paintStats(){
  paintPlanRow();
  const total = provinces.length || 82;
  const n = provinces.filter(p=>visited[p.id]).length;
  els.count.textContent = String(n);
  els.meter.style.width = (n/total*100)+"%";
  els.pct.textContent = Math.round(n/total*100) + "% stamped";
  paintGroupCounts();
  els.islands.textContent = "";
  ISLANDS.forEach(g=>{
    const inG = provinces.filter(p=>p.island===g);
    const done = inG.filter(p=>visited[p.id]).length;
    const d = document.createElement('div'); d.className="isl";
    d.innerHTML = '<span class="nm"></span><span class="ct mono"></span><span class="bar"><i></i></span>';
    d.querySelector('.nm').textContent = g;
    d.querySelector('.ct').textContent = done + " / " + inG.length;
    d.querySelector('.bar i').style.width = (inG.length? done/inG.length*100 : 0) + "%";
    els.islands.appendChild(d);
  });
  scheduleCalendar();
}

/* the switch reads the plans that exist, whether or not they are being drawn */
function paintPlanRow(){
  const np = provinces.filter(p=>isPlanned(p.id)).length;
  els.plannedN.textContent = np
    ? np + (np === 1 ? " province dated ahead" : " provinces dated ahead")
    : "None dated ahead yet";
  document.getElementById('plan-short').textContent = np ? np + " planned" : "";
}
els.showplan.addEventListener('change', ()=>{
  setShowPlanned(els.showplan.checked);
  provinces.forEach(paintProv);
  if(hot){ const p = hot; hot = null; setHot(p); }
  paintStats();
});

function repaintAll(){
  provinces.forEach(paintProv);
  els.list.querySelectorAll('.row').forEach(r=>{
    r.dataset.photo = photoIds.has(r.dataset.id) ? "1" : "0";
  });
  setHot(null); paintStats();
  if(sheetProv) repaintProv();
}

/* ── the stats open to the island bars, the planned switch and the nickname ── */
const statsEl = document.getElementById('stats');
const statsToggle = document.getElementById('statstoggle');
function setStatsOpen(open){
  statsEl.dataset.open = open ? "on" : "off";
  statsToggle.setAttribute('aria-expanded', open ? "true" : "false");
}
narrow.addEventListener('change', e => setStatsOpen(!e.matches));
statsToggle.onclick = ()=> setStatsOpen(statsEl.dataset.open !== "on");
