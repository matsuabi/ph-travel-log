/* ── sidebar: the tally, the nickname, the planned switch and the province list ── */

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
  els.list.textContent = "";
  const key = groupBy === "region" ? (p=>p.region) : (p=>p.island);
  groupNames().forEach((g,gi)=>{
    const gk = "g" + gi;
    const h = document.createElement('div'); h.className="grp"; h.textContent = g; h.dataset.grp=gk;
    els.list.appendChild(h);
    provinces.filter(p=>key(p)===g).forEach(p=>{
      const b = document.createElement('div');
      b.className="row"; b.dataset.id=p.id; b.dataset.grp=gk;
      b.dataset.photo = photoIds.has(String(p.id)) ? "1":"0";
      b.dataset.name = p.name.toLowerCase();
      b.innerHTML = '<button type="button" class="open"><span class="nm"></span><span class="rg"></span></button>'
        + '<div class="rseg" role="group">'
        + '<button type="button" data-kind="none">Not visited</button>'
        + '<button type="button" data-kind="planned">Planned</button>'
        + '<button type="button" data-kind="traveled">Stamped</button></div>';
      b.querySelector('.nm').textContent = p.name;
      b.querySelector('.rg').textContent = groupBy === "region" ? p.island : p.region;
      b.querySelector('.rseg').setAttribute('aria-label', p.name + " status");
      b.querySelector('.open').onclick = ()=>{ setHot(p); openProv(p); };
      b.querySelector('.rseg').onclick = e=>{
        const k = e.target.closest('button[data-kind]');
        if(k) setStatus(p, k.dataset.kind);
      };
      paintRow(b, p);
      b.onmouseenter = ()=>{ setHot(p); els.readout.style.opacity = 0; };
      b.onmouseleave = ()=> setHot(null);
      els.list.appendChild(b);
    });
  });
  filterList();
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
  row.querySelectorAll('.rseg button').forEach(b=>{
    b.setAttribute("aria-pressed", b.dataset.kind === st ? "true" : "false");
  });
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
}

function paintStats(){
  paintPlanRow();
  const total = provinces.length || 82;
  const n = provinces.filter(p=>visited[p.id]).length;
  els.count.textContent = String(n);
  els.meter.style.width = (n/total*100)+"%";
  els.pct.textContent = Math.round(n/total*100) + "% of the archipelago";
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
}

/* the switch reads the plans that exist, whether or not they are being drawn */
function paintPlanRow(){
  const np = provinces.filter(p=>isPlanned(p.id)).length;
  els.plannedN.textContent = np
    ? np + (np === 1 ? " province dated ahead" : " provinces dated ahead")
    : "None dated ahead yet";
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

/* ── the list folds away on a phone so the map and the panel own the screen ── */
const asideEl = document.querySelector('aside');
const listToggle = document.getElementById('listtoggle');
function setListOpen(open){
  asideEl.dataset.list = open ? "on" : "off";
  listToggle.setAttribute('aria-expanded', open ? "true" : "false");
  listToggle.querySelector('i').textContent = open ? "\u25BE" : "\u25B8";
  document.getElementById('listtoggle-n').textContent =
    open ? "" : (provinces.length || 82) + " provinces";
  relayout();
}
narrow.addEventListener('change', e => setListOpen(!e.matches));
listToggle.onclick = ()=> setListOpen(asideEl.dataset.list !== "on");
