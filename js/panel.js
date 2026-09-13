/* ── province callout ── */
const provBox = document.getElementById('provbox');
const leadSvg = document.getElementById('lead');
const leadLine = document.getElementById('lead-line');
const leadDot = document.getElementById('lead-dot');
let sheetProv = null, sheetURL = null;

/* one line from the province to the callout's lower-left corner */
function showLead(on){
  /* SVG elements do not reflect the hidden IDL property, so set the attribute */
  if(on) leadSvg.removeAttribute("hidden"); else leadSvg.setAttribute("hidden","");
}
function drawLead(){
  if(!sheetProv || provBox.hidden || !sheetProv.c){ showLead(false); return; }
  const s = els.stage.getBoundingClientRect(), c = provBox.getBoundingClientRect();
  showLead(true);
  if(c.width < 40 || getComputedStyle(leadSvg).display === "none"){ showLead(false); return; }
  const x = sheetProv.c[0]*view.k + view.x, y = sheetProv.c[1]*view.k + view.y;
  /* wide: the callout's lower-left corner. narrow: its top edge, under the province */
  const wide = c.width < s.width - 40;
  leadLine.setAttribute("x1", x); leadLine.setAttribute("y1", y);
  leadLine.setAttribute("x2", wide ? c.left - s.left : Math.max(30, Math.min(s.width - 30, x)));
  leadLine.setAttribute("y2", wide ? c.bottom - s.top : c.top - s.top);
  leadDot.setAttribute("cx", x); leadDot.setAttribute("cy", y);
}
function dropSheetURL(){ if(sheetURL){ URL.revokeObjectURL(sheetURL); sheetURL = null; } }

/* The date is open the moment a province is tapped, so a trip can be planned long
   before it is visited. The photo is what belongs to a stamp, so it waits for one. */
function paintProvState(){
  const on = !!(sheetProv && visited[sheetProv.id]);
  /* a photo belongs to a stamp, so its controls wait for one */
  document.getElementById('prov-photoact').hidden = !on;
}
async function repaintProv(){
  paintProvState();
  paintTrip();
  await paintSheetPhoto();
}

async function openProv(p){
  sheetProv = p;
  wantStamp = false;
  pendingKind = null;
  document.getElementById('prov-h').textContent = p.name;
  document.getElementById('prov-rg').textContent = p.region;
  paintProvState();
  paintTrip();
  provBox.hidden = false;
  relayout();
  await paintSheetPhoto();
  document.getElementById('prov-close').focus({preventScroll:true});
}
async function paintSheetPhoto(){
  const slot = document.getElementById('prov-slot');
  const rm = document.getElementById('prov-rmphoto');
  const add = document.getElementById('prov-add');
  const addtxt = document.getElementById('prov-addtxt');
  dropSheetURL(); slot.textContent = "";
  let rec = null;
  try{ rec = sheetProv ? await photoGet(sheetProv.id) : null; }catch(e){}
  if(rec && rec.full){
    sheetURL = URL.createObjectURL(rec.full);
    const frame = document.createElement('div');
    frame.className = "photoframe";
    /* the frame takes the photo's own shape, within limits, so most photos
       fill it — anything past the limits is fitted inside instead */
    if(rec.w && rec.h){
      const r = Math.min(16/9, Math.max(3/4, rec.w / rec.h));
      frame.style.aspectRatio = r.toFixed(4);
    }
    const img = document.createElement('img');
    img.className = "photo"; img.src = sheetURL;
    img.alt = "Your photo for " + sheetProv.name;
    frame.appendChild(img);
    slot.appendChild(frame);
    img.onload = drawLead;
    rm.hidden = false; add.hidden = false; addtxt.textContent = "Replace";
  } else {
    const d = document.createElement('div');
    d.className = "empty";
    d.textContent = sheetProv && visited[sheetProv.id]
      ? "No photo yet. Anything you add stays on this device and is never uploaded."
      : sheetProv && isPlanned(sheetProv.id)
      ? "Move it to stamped when you get back, and the photo slot opens up."
      : "Pick planned to date a trip ahead, or stamped to log the day you went and add a photo.";
    slot.appendChild(d);
    rm.hidden = true; add.hidden = false; addtxt.textContent = "Add photo";
  }
  drawLead();
}

/* the date field and the not visited / planned / stamped control */
const tripDate = document.getElementById('prov-date');
const tripKind = document.getElementById('prov-kind');
const tripNote = document.getElementById('prov-kind-note');
const tripRow = document.getElementById('prov-trip');
const tripTag = document.getElementById('prov-tag');
/* a status picked before a date exists waits here for one */
let pendingKind = null;

function defaultKind(){
  return sheetProv && visited[sheetProv.id] ? "traveled" : "planned";
}
function paintTrip(){
  const t = sheetProv ? trips[String(sheetProv.id)] : null;
  const st = statusOf(), shown = pendingKind || st;
  tripDate.value = t ? t.date : "";
  tripKind.querySelectorAll('button').forEach(b=>{
    b.setAttribute("aria-pressed", b.dataset.kind === shown ? "true" : "false");
  });
  /* nothing to date until the province is planned or stamped */
  tripRow.hidden = st === "none" && !pendingKind;
  tripTag.textContent = shown === "traveled" ? "went" : shown === "planned" ? "going" : "";
  setNote("");
}
function setNote(msg){
  tripNote.textContent = msg;
  tripNote.hidden = !msg;
}
function writeTrip(date, kind, p = sheetProv){
  if(!p) return;
  const open = sheetProv === p;
  if(open) pendingKind = null;
  const t = setTrip(p.id, date, kind);
  /* the toggle is the same rule from the other end: stamped stamps the province,
     planned lifts the stamp. mark() leaves the kind alone, it already agrees. */
  const lifted = !!t && t.kind === "planned" && !!visited[p.id];
  if(lifted){ delete visited[p.id]; save(); paintStats(); if(open) paintProvState(); }
  const put = !!t && t.kind === "traveled" && !visited[p.id];
  if(put) mark(p.id, true);
  paintProv(p);   /* a planned date colours the province in */
  if(hot === p){ hot = null; setHot(p); }
  paintPlanRow();
  if(open){
    paintTrip();
    paintSheetPhoto();   /* the photo slot follows the status, stamped or not */
  }
  toast(t ? p.name + " " + tripLabel(t) + (lifted ? ", stamp lifted" : put ? ", stamped" : "")
          : "Date cleared for " + p.name);
}
/* a tap meant to stamp arrives before the date does, so it waits here for one */
let wantStamp = false;
tripDate.onchange = ()=>{
  const cur = sheetProv ? trips[String(sheetProv.id)] : null;
  const kind = tripDate.value && wantStamp ? "traveled"
    : tripDate.value && pendingKind ? pendingKind
    : (cur ? cur.kind : defaultKind());
  wantStamp = false;
  writeTrip(tripDate.value, kind);
};
const STAMP_ASK = "Pick the day you went — the stamp goes on that date.";
const PLAN_ASK = "Pick the day you plan to go — the plan sits on that date.";
/* nothing is said about a province without a date to say it on, so an empty field
   is asked for first rather than acted on. */
function askForDate(msg){
  tripRow.hidden = false;
  setNote(msg);
  /* the row was display:none a moment ago, so the field has no box yet — read its
     size to lay it out now, or the picker has nothing to anchor to and opens at
     the top-left of the page */
  void tripDate.getBoundingClientRect();
  if(tripDate.showPicker){ try{ tripDate.showPicker(); }catch(err){ tripDate.focus(); } }
  else tripDate.focus();
}
/* not visited clears the province outright; the other two need a date to sit on */
function clearProv(p = sheetProv){
  if(!p) return;
  const had = !!visited[p.id] || !!trips[String(p.id)];
  if(visited[p.id]){ delete visited[p.id]; save(); }
  setTrip(p.id, "", "planned");
  paintProv(p);
  paintPlanRow(); paintStats();
  if(hot === p){ hot = null; setHot(p); }
  if(sheetProv === p){
    pendingKind = null;
    paintProvState(); paintTrip(); paintSheetPhoto();
  }
  /* the photo itself is left in place, so stamping again brings it back */
  if(had) toast(p.name + " set back to not visited");
}
tripKind.onclick = e=>{
  const b = e.target.closest('button'); if(!b || !sheetProv) return;
  wantStamp = false;
  const kind = b.dataset.kind;
  if(kind === statusOf() && !pendingKind) return;
  if(kind === "none"){ clearProv(); return; }
  /* the status needs a date to describe, so ask for one first */
  if(!tripDate.value){ askForKind(kind); return; }
  writeTrip(tripDate.value, kind);
};
/* hold a picked status in the open panel until a date arrives for it */
function askForKind(kind){
  pendingKind = kind;
  tripKind.querySelectorAll('button').forEach(x=>{
    x.setAttribute("aria-pressed", x.dataset.kind === kind ? "true" : "false");
  });
  tripTag.textContent = kind === "traveled" ? "went" : "going";
  askForDate(kind === "traveled" ? STAMP_ASK : PLAN_ASK);
}
/* the list's three buttons: a province already dated changes on the spot, and one
   with no date yet opens its panel to ask for the day first */
function setStatus(p, kind){
  if(kind === statusOf(p)) return;
  if(kind === "none"){ clearProv(p); return; }
  const t = trips[String(p.id)];
  if(t){
    writeTrip(t.date, kind, p);
    return;
  }
  setHot(p);
  openProv(p).then(()=>{ if(sheetProv === p) askForKind(kind); });
}

function closeProv(){
  provBox.hidden = true; showLead(false);
  wantStamp = false;
  pendingKind = null;
  dropSheetURL(); sheetProv = null;
  relayout();
}
document.getElementById('prov-close').onclick = closeProv;

document.getElementById('prov-file').onchange = async e=>{
  const f = e.target.files && e.target.files[0]; e.target.value = "";
  if(!f || !sheetProv) return;
  const p = sheetProv, slot = document.getElementById('prov-slot');
  slot.textContent = "";
  const busy = document.createElement('div');
  busy.className = "busy"; busy.textContent = "Adding photo…";
  slot.appendChild(busy);
  try{
    const rec = await makePhoto(p.id, f);
    await photoPut(rec);
    photoIds.add(String(p.id));
    await askPersist();
    paintPhotoMarks();
    if(hot === p){ hot = null; setHot(p); }
    if(sheetProv === p) await paintSheetPhoto();
    toast("Photo added to " + p.name);
  }catch(err){
    if(sheetProv === p) await paintSheetPhoto();
    toast("That image could not be read");
  }
};
document.getElementById('prov-rmphoto').onclick = async ()=>{
  if(!sheetProv) return;
  const p = sheetProv;
  try{
    await photoDel(p.id); photoIds.delete(String(p.id));
    paintPhotoMarks();
    if(hot === p){ hot = null; setHot(p); }
    await paintSheetPhoto();
    toast("Photo removed");
  }catch(e){ toast("The photo could not be removed"); }
};

/* the panel's height sets the map's fit, and it changes as the slot, the stamp
   state and a loading photo change it — refit whenever it actually resizes */
if(window.ResizeObserver){
  let lastH = 0;
  new ResizeObserver(()=>{
    const h = Math.round(provBox.getBoundingClientRect().height);
    if(provBox.hidden || Math.abs(h - lastH) < 2) return;
    lastH = h; relayout();
  }).observe(provBox);
}
