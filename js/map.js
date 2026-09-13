/* ── the map: decode the boundaries, lay them out, draw, stamp, pan and zoom ── */

const AB = window.STAMPLOGS_ALPHABET;
const IDX = {}; for(let i=0;i<AB.length;i++) IDX[AB[i]] = i;
let provinces = [];
/* Metro Manila is drawn but never counted: it is a region, not a province, so it
   stays out of `provinces` and out of everything that reads it. */
let ncr = null, ncrEl = null, ncrPat = null;
let gRoot, gStamp, hot = null;
let view = {k:1, x:0, y:0}, base = null;

function decode(s){
  const pts = []; let i = 0, x = 0, y = 0;
  while(i < s.length){
    let shift = 0, res = 0, c;
    do{ c = IDX[s[i++]]; res += (c & 31) * Math.pow(32, shift); shift++; } while(c >= 32);
    x += (res & 1) ? -(res + 1) / 2 : res / 2;
    shift = 0; res = 0;
    do{ c = IDX[s[i++]]; res += (c & 31) * Math.pow(32, shift); shift++; } while(c >= 32);
    y += (res & 1) ? -(res + 1) / 2 : res / 2;
    pts.push([x/1000, y/1000]);
  }
  return pts;
}
const RAD = Math.PI/180;
function merc(lon,lat){
  return [lon*RAD, Math.log(Math.tan(Math.PI/4 + Math.max(-85,Math.min(85,lat))*RAD/2))];
}

function prepare(){
  provinces = window.STAMPLOGS.map(p=>({
    name:p.n, region:p.r, island:p.i, id:String(p.id),
    rings:p.g.map(g=>decode(g).map(c=>merc(c[0],c[1])))
  }));
  const n = window.STAMPLOGS_NCR;
  ncr = n ? {name:n.n, rings:n.g.map(g=>decode(g).map(c=>merc(c[0],c[1])))} : null;
}

function fit(){
  const w = els.stage.clientWidth, h = els.stage.clientHeight;
  const pad = w < 600 ? 14 : 24;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  provinces.forEach(p=>p.rings.forEach(r=>r.forEach(c=>{
    if(c[0]<x0)x0=c[0]; if(c[0]>x1)x1=c[0]; if(c[1]<y0)y0=c[1]; if(c[1]>y1)y1=c[1];
  })));
  /* under 600px the callout is a sheet on the bottom edge: fit the whole
     map into the band above it and align it to the top, so no province is
     covered and the lead line can always reach the one that is open */
  const sheetH = (w <= 600 && provBox && !provBox.hidden)
    ? Math.round(provBox.getBoundingClientRect().height || 162) : 0;
  els.stage.style.setProperty('--sheet-h', sheetH + 'px');
  const inset = sheetH ? sheetH + 22 : 0;
  const availH = h - inset;
  const s = Math.min((w-2*pad)/(x1-x0), (availH-2*pad)/(y1-y0));
  base = {s, tx:(w-(x1-x0)*s)/2 - x0*s, ty:0};
  base.ty = inset ? pad + y1*s : (h-(y1-y0)*s)/2 + y1*s;
  provinces.forEach(p=>{
    let d = "", best = null, bestLen = -1, cx = 0, cy = 0;
    p.rings.forEach(r=>{
      d += "M";
      r.forEach((c,i)=>{ d += (i?"L":"") + (c[0]*base.s + base.tx).toFixed(1) + " " + (base.ty - c[1]*base.s).toFixed(1); });
      d += "Z";
      if(r.length > bestLen){ bestLen = r.length; best = r; }
    });
    best.forEach(c=>{ cx += c[0]*base.s + base.tx; cy += base.ty - c[1]*base.s; });
    p.d = d; p.c = [cx/best.length, cy/best.length];
  });
  /* NCR is laid out on the same transform, but after it — the fit is measured
     from the 82 alone, so adding the capital moves nothing. */
  if(ncr){
    let d = "";
    ncr.rings.forEach(r=>{
      d += "M";
      r.forEach((c,i)=>{ d += (i?"L":"") + (c[0]*base.s + base.tx).toFixed(1) + " " + (base.ty - c[1]*base.s).toFixed(1); });
      d += "Z";
    });
    ncr.d = d;
  }
}

function paintProv(p){
  const on = !!visited[p.id], plan = !on && showsPlan(p.id);
  p.el.classList.toggle('on', on);
  p.el.classList.toggle('plan', plan);
  p.el.classList.toggle('off', !on && !plan);
  const row = els.list.querySelector('.row[data-id="'+p.id+'"]');
  if(row) paintRow(row, p);
}
function drawMap(){
  els.svg.textContent = "";
  gRoot = document.createElementNS(NS,"g");
  els.svg.appendChild(gRoot);
  /* the capital goes down first, so the provinces around it paint over its edge
     and no seam shows where the boundaries were simplified apart */
  if(ncr){
    const defs = document.createElementNS(NS,"defs");
    ncrPat = document.createElementNS(NS,"pattern");
    ncrPat.setAttribute("id","ncr-hatch");
    ncrPat.setAttribute("patternUnits","userSpaceOnUse");
    ncrPat.setAttribute("patternTransform","rotate(45)");
    const bg = document.createElementNS(NS,"rect");
    bg.setAttribute("fill","#DCD7C9");
    const ln = document.createElementNS(NS,"line");
    ln.setAttribute("stroke","#B5AF9E");
    ncrPat.append(bg, ln);
    defs.appendChild(ncrPat);
    els.svg.appendChild(defs);
    ncrEl = document.createElementNS(NS,"path");
    ncrEl.setAttribute("class","ncr");
    ncrEl.setAttribute("d", ncr.d);
    const t = document.createElementNS(NS,"title");
    t.textContent = "Metro Manila — a region, not one of the 82 provinces";
    ncrEl.appendChild(t);
    gRoot.appendChild(ncrEl);
  }
  provinces.forEach(p=>{
    const el = document.createElementNS(NS,"path");
    el.setAttribute("d", p.d);
    el.setAttribute("data-id", p.id);
    p.el = el;
    el.setAttribute("class", "prov");
    paintProv(p);   /* the list is not built yet; paintProv skips the row it cannot find */
    gRoot.appendChild(el);
  });
  gStamp = document.createElementNS(NS,"g");
  gStamp.setAttribute("pointer-events","none");
  gRoot.appendChild(gStamp);
  applyView();
}
function applyView(){
  gRoot.setAttribute("transform","translate("+view.x+","+view.y+") scale("+view.k+")");
  hatchScale();
  drawLead();
}
/* the hatch is a texture on the paper, not on the land: hold it at the same size
   on screen however far the map is zoomed in */
function hatchScale(){
  if(!ncrPat) return;
  const u = 7/view.k;
  ncrPat.setAttribute("width", u); ncrPat.setAttribute("height", u);
  const [bg, ln] = ncrPat.children;
  bg.setAttribute("width", u); bg.setAttribute("height", u);
  ln.setAttribute("x1",0); ln.setAttribute("y1",0); ln.setAttribute("x2",0); ln.setAttribute("y2",u);
  ln.setAttribute("stroke-width", 2/view.k);
}
function relayout(){
  if(!els.stage.clientWidth || !els.stage.clientHeight) return;
  fit();
  provinces.forEach(p=>p.el.setAttribute("d", p.d));
  if(ncrEl) ncrEl.setAttribute("d", ncr.d);
  drawLead();
}

/* ── stamping ── */
function setHot(p){
  if(hot === p) return;
  if(hot) hot.el.classList.remove('hot');
  hot = p;
  if(!p){ els.readout.style.opacity = 0; return; }
  p.el.classList.add('hot');
  gRoot.insertBefore(p.el, gStamp);
  els.readout.textContent = "";
  const b = document.createElement('span'); b.textContent = p.name;
  const e = document.createElement('em');
  const trip = trips[String(p.id)];
  /* the trip date is the day it was stamped for, so it is the truer thing to say
     when there is one — rather than the day the stamp itself went on. */
  e.textContent = visited[p.id] ? (trip ? tripLabel(trip) : stampLabel(visited[p.id]))
                : showsPlan(p.id) ? tripLabel(trip)
                : p.region;
  els.readout.append(b, e);
  if(photoIds.has(String(p.id))){
    const i = document.createElement('i'); i.textContent = "photo";
    els.readout.append(i);
  }
  els.readout.style.opacity = 1;
}
function mark(id, on){
  const p = provinces.find(x=>x.id===id); if(!p) return;
  if(on === !!visited[id]) return;
  if(on) visited[id] = new Date().toISOString().slice(0,10);
  else delete visited[id];   /* the date outlives the stamp — it may be a plan */
  save();
  /* the stamp and a traveled date are the same statement, so they move together:
     stamping carries a plan over to traveled, and taking the stamp off puts the
     date back to planned rather than leaving a traveled day with no stamp. */
  const t = trips[String(id)];
  if(t && t.kind !== (on ? "traveled" : "planned"))
    setTrip(id, t.date, on ? "traveled" : "planned");
  paintProv(p);
  if(on) burst(p);
  if(hot === p){ hot = null; setHot(p); }
  if(sheetProv === p){ repaintProv(); paintTrip(); }
  paintPlanRow();
  paintStats();
}
function burst(p){
  const c = document.createElementNS(NS,"circle");
  c.setAttribute("class","burst");
  c.setAttribute("cx", p.c[0]); c.setAttribute("cy", p.c[1]);
  gStamp.appendChild(c);
  const t0 = performance.now(), dur = 520, k = view.k;
  (function step(t){
    /* a frame's timestamp can fall just before t0, so hold progress at 0 until time catches up */
    const u = Math.max(0, Math.min(1,(t-t0)/dur)), e = 1-Math.pow(1-u,3);
    c.setAttribute("r", (1 + e*26)/k);
    c.setAttribute("stroke-width", (2 - 1.7*e));
    c.style.opacity = String(1-e);
    if(u<1) requestAnimationFrame(step); else c.remove();
  })(t0);
}

/* ── pan / zoom / tap ── */
function clampK(k){ return Math.max(1, Math.min(16, k)); }
function zoomAt(px, py, factor){
  const nk = clampK(view.k*factor);
  const f = nk/view.k;
  view.x = px - (px - view.x)*f;
  view.y = py - (py - view.y)*f;
  view.k = nk;
  if(view.k === 1){ view.x = 0; view.y = 0; }
  applyView();
}
const pointers = new Map();
let dragged = false, startDist = 0, startK = 1, downT = 0;

els.svg.addEventListener('pointerdown', e=>{
  els.svg.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, {x:e.clientX, y:e.clientY, ox:e.clientX, oy:e.clientY});
  if(pointers.size === 1){ dragged = false; downT = performance.now(); }
  if(pointers.size === 2){
    const [a,b] = [...pointers.values()];
    startDist = Math.hypot(a.x-b.x, a.y-b.y) || 1;
    startK = view.k;
  }
});
els.svg.addEventListener('pointermove', e=>{
  const rect = els.svg.getBoundingClientRect();
  if(!pointers.has(e.pointerId)){
    if(e.pointerType === "mouse") setHot(provAt(e.clientX, e.clientY));
    return;
  }
  const pt = pointers.get(e.pointerId);
  const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
  pt.x = e.clientX; pt.y = e.clientY;
  if(Math.hypot(e.clientX-pt.ox, e.clientY-pt.oy) > 6) dragged = true;
  if(pointers.size === 1){
    view.x += dx; view.y += dy; applyView();
  } else if(pointers.size === 2){
    const [a,b] = [...pointers.values()];
    const d = Math.hypot(a.x-b.x, a.y-b.y) || 1;
    const mx = (a.x+b.x)/2 - rect.left, my = (a.y+b.y)/2 - rect.top;
    zoomAt(mx, my, clampK(startK*(d/startDist))/view.k);
  }
});
function endPointer(e){ pointers.delete(e.pointerId); }
els.svg.addEventListener('pointerup', endPointer);
els.svg.addEventListener('pointercancel', endPointer);
els.svg.addEventListener('pointerleave', e=>{ if(e.pointerType==="mouse" && !pointers.size) setHot(null); });

/* Capturing the pointer retargets the click to the <svg>, so the province has to
   be found from where the cursor actually is rather than from e.target. */
function provAt(x, y){
  const t = document.elementFromPoint(x, y);
  if(!t || !t.classList || !t.classList.contains('prov')) return null;
  return provinces.find(p=>p.el===t) || null;
}
els.svg.addEventListener('click', e=>{
  if(dragged || performance.now()-downT > 700) return;
  const p = provAt(e.clientX, e.clientY); if(!p) return;
  setHot(p);
  openProv(p);
});
els.svg.addEventListener('wheel', e=>{
  e.preventDefault();
  const r = els.svg.getBoundingClientRect();
  zoomAt(e.clientX-r.left, e.clientY-r.top, Math.pow(0.998, e.deltaY));
}, {passive:false});

function zoomButton(factor){
  const r = els.svg.getBoundingClientRect();
  zoomAt(r.width/2, r.height/2, factor);
}
document.getElementById('z-in').onclick = ()=> zoomButton(1.7);
document.getElementById('z-out').onclick = ()=> zoomButton(1/1.7);
document.getElementById('z-reset').onclick = ()=>{ view = {k:1,x:0,y:0}; applyView(); };
