/* ── calendar view: the year read as twelve months, every dated province on its day ── */
const calEl = document.getElementById('calview');
const calGrid = document.getElementById('calgrid');
const calScroll = document.getElementById('calscroll');
const calYearsEl = document.getElementById('calyears');
const calScrim = document.getElementById('cal-scrim');
const calPick = document.getElementById('cal-pick');
const calBox = document.getElementById('calbox');
const calList = document.getElementById('calcard-list');
const CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const CAL_HEAD = ["S","M","T","W","T","F","S"];
const CAL_SPAN = 10;
const calBase = new Date().getFullYear();
let calYear = calBase, calT = null, calOpen = null;

function calIso(y, m, d){ return y + "-" + String(m+1).padStart(2,"0") + "-" + String(d).padStart(2,"0"); }
function calNode(tag, cls){ const n = document.createElement(tag); if(cls) n.className = cls; return n; }
/* the day a province sits on: its trip date, or the stamp date when it has no trip */
function calDate(p){
  const t = trips[String(p.id)];
  if(t) return t.date;
  const v = visited[p.id];
  return v && v !== UNDATED ? v : "";
}
/* date -> the provinces on it. A plan is left out when the planned switch is off,
   the same as on the map and in the list. */
function calEntries(){
  const by = {};
  provinces.forEach(p=>{
    const on = !!visited[p.id];
    if(!on && !showsPlan(p.id)) return;
    const d = calDate(p);
    if(!d) return;
    (by[d] = by[d] || []).push({p:p, kind: on ? "traveled" : "planned"});
  });
  for(const d in by) by[d].sort((a,b)=>
    (a.kind === b.kind ? 0 : a.kind === "traveled" ? -1 : 1) || a.p.name.localeCompare(b.p.name));
  return by;
}
function calTally(t, p){
  const b = [];
  if(t) b.push(t + " stamped");
  if(p) b.push(p + " planned");
  return b.join(", ");
}

function buildCalendar(){
  const by = calEntries();
  document.getElementById('cal-y').textContent = String(calYear);
  document.getElementById('cal-prev').disabled = calYear <= calBase - CAL_SPAN;
  document.getElementById('cal-next').disabled = calYear >= calBase + CAL_SPAN;
  const now = new Date(), todayIso = calIso(now.getFullYear(), now.getMonth(), now.getDate());
  calGrid.textContent = "";
  CAL_MONTHS.forEach((name, m)=>{
    const box = calNode('div', 'calmonth');
    const hd = calNode('button', 'calmh');
    hd.type = "button";
    const nm = calNode('b'); nm.textContent = name;
    const ct = calNode('span');
    hd.append(nm, ct);
    hd.onclick = ()=> openCalCard(m, 0);
    const days = calNode('div', 'caldays');
    CAL_HEAD.forEach(h=>{ const w = calNode('span', 'calwd'); w.textContent = h; days.appendChild(w); });
    const first = new Date(calYear, m, 1).getDay(), n = new Date(calYear, m+1, 0).getDate();
    for(let i = 0; i < first; i++) days.appendChild(calNode('span', 'calday'));
    let mt = 0, mp = 0;
    for(let d = 1; d <= n; d++){
      const key = calIso(calYear, m, d), list = by[key] || [];
      const t = list.filter(e=> e.kind === "traveled").length, p = list.length - t;
      mt += t; mp += p;
      const c = calNode(list.length ? 'button' : 'span', 'calday');
      c.textContent = String(d);
      if(list.length){
        c.type = "button";
        c.dataset.st = t && p ? "both" : t ? "traveled" : "planned";
        c.setAttribute('aria-label', d + " " + name + ": " + list.map(e=> e.p.name).join(", "));
        c.onclick = ()=> openCalCard(m, d);
        if(list.length > 1){ const k = calNode('i'); k.textContent = String(list.length); c.appendChild(k); }
      }
      if(key === todayIso) c.dataset.today = "1";
      days.appendChild(c);
    }
    ct.textContent = calTally(mt, mp);
    box.append(hd, days);
    calGrid.appendChild(box);
  });
  if(!calYearsEl.hidden) paintCalYears();
  if(calOpen) paintCalCard();
}
function scheduleCalendar(){
  if(mainView !== "calendar") return;
  clearTimeout(calT); calT = setTimeout(buildCalendar, 30);
}

/* ── the year: arrows step one, the year itself opens all twenty-one ── */
function paintCalYears(){
  const g = document.getElementById('calyears-grid');
  const has = {};
  Object.keys(calEntries()).forEach(k=>{ has[k.slice(0,4)] = 1; });
  g.textContent = "";
  for(let y = calBase - CAL_SPAN; y <= calBase + CAL_SPAN; y++){
    const b = calNode('button');
    b.type = "button";
    b.textContent = String(y);
    b.dataset.on = y === calYear ? "1" : "0";
    b.dataset.now = y === calBase ? "1" : "0";
    b.dataset.has = has[y] ? "1" : "0";
    b.onclick = ()=> setCalYear(y);
    g.appendChild(b);
  }
}
function setCalYearsOpen(on){
  calYearsEl.hidden = !on;
  calScrim.hidden = !on;
  calPick.setAttribute('aria-expanded', String(on));
  if(on){
    paintCalYears();
    const b = calYearsEl.querySelector('button[data-on="1"]');
    if(b) b.focus({preventScroll:true});
  }
}
function setCalYear(y){
  calYear = Math.max(calBase - CAL_SPAN, Math.min(calBase + CAL_SPAN, y));
  setCalYearsOpen(false);
  closeCalCard();
  buildCalendar();
  calScroll.scrollTop = 0;
}
document.getElementById('cal-prev').onclick = ()=> setCalYear(calYear - 1);
document.getElementById('cal-next').onclick = ()=> setCalYear(calYear + 1);
document.getElementById('cal-this').onclick = ()=> setCalYear(calBase);
calPick.onclick = ()=> setCalYearsOpen(calYearsEl.hidden);
calScrim.onclick = ()=> setCalYearsOpen(false);

/* ── a day or a month, opened as a small card: names and status only ── */
function paintCalCard(){
  const o = calOpen, by = calEntries(), rows = [];
  let title, sub;
  if(o.d){
    (by[calIso(calYear, o.m, o.d)] || []).forEach(e=> rows.push({e:e, date:""}));
    if(!rows.length){ closeCalCard(); return; }
    title = o.d + " " + CAL_MONTHS[o.m];
    sub = CAL_DAYS[new Date(calYear, o.m, o.d).getDay()] + " \u00b7 " + calYear;
  } else {
    let t = 0, p = 0;
    const n = new Date(calYear, o.m+1, 0).getDate();
    for(let d = 1; d <= n; d++){
      (by[calIso(calYear, o.m, d)] || []).forEach((e,i)=>{
        e.kind === "traveled" ? t++ : p++;
        rows.push({e:e, date: i ? "" : String(d)});
      });
    }
    title = CAL_MONTHS[o.m];
    sub = calYear + " \u00b7 " + (calTally(t, p) || "nothing logged");
  }
  document.getElementById('calcard-h').textContent = title;
  document.getElementById('calcard-sub').textContent = sub;
  calList.dataset.mode = o.d ? "day" : "month";
  calList.textContent = "";
  if(!rows.length){
    const none = calNode('div', 'calnone');
    none.textContent = "Nothing stamped or planned this month.";
    calList.appendChild(none);
    return;
  }
  rows.forEach(r=>{
    const row = calNode('div', 'calrow');
    row.dataset.st = r.e.kind;
    const d = calNode('span', 'd'); d.textContent = r.date;
    const sw = calNode('i');
    const nm = calNode('span', 'nm'); nm.textContent = r.e.p.name;
    const k = calNode('em'); k.textContent = r.e.kind === "traveled" ? "Stamped" : "Planned";
    row.append(d, sw, nm, k);
    calList.appendChild(row);
  });
}
function openCalCard(m, d){
  calOpen = {m:m, d:d};
  calBox.hidden = false;
  paintCalCard();
  document.getElementById('calcard-close').focus({preventScroll:true});
}
function closeCalCard(){
  calBox.hidden = true;
  calOpen = null;
}
function closeCalOverlays(){ closeCalCard(); setCalYearsOpen(false); }
document.getElementById('calcard-close').onclick = closeCalCard;
calBox.addEventListener('click', e=>{ if(e.target === calBox) closeCalCard(); });
document.addEventListener('keydown', e=>{
  if(e.key !== "Escape") return;
  if(!calBox.hidden) closeCalCard();
  else if(!calYearsEl.hidden){ setCalYearsOpen(false); calPick.focus({preventScroll:true}); }
});
