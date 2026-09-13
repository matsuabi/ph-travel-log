/* ── dialogs: Clear, How to use, About, the Escape key and the phone tools menu ── */

/* Stamps and photos are cleared separately — wiping a map should not silently
   destroy pictures. An in-page dialog, since confirm() is suppressed in some frames. */
const clearBox = document.getElementById('clearbox');
function openClear(){
  const ns = Object.keys(visited).length, nd = Object.keys(trips).length, np = photoIds.size;
  if(!ns && !nd && !np){ toast("Nothing to clear"); return; }
  const sc = document.getElementById('clear-stamps'), pc = document.getElementById('clear-photos');
  const dc = document.getElementById('clear-dates');
  sc.checked = ns > 0; sc.disabled = !ns; dc.checked = false; pc.checked = false;
  document.getElementById('clear-stamps-n').textContent =
    ns ? ns + (ns === 1 ? " province stamped" : " provinces stamped") : "none stamped";
  document.getElementById('clear-dates-n').textContent =
    nd + (nd === 1 ? " province dated" : " provinces dated");
  document.getElementById('clear-dates-row').hidden = !nd;
  document.getElementById('clear-photos-n').textContent =
    np + (np === 1 ? " photo on this device" : " photos on this device");
  document.getElementById('clear-photos-row').hidden = !np;
  clearBox.hidden = false;
  document.getElementById('clear-close').focus();
}
function closeClear(){ clearBox.hidden = true; }
document.getElementById('reset').onclick = openClear;
document.getElementById('clear-close').onclick = closeClear;
document.getElementById('clear-cancel').onclick = closeClear;
clearBox.onclick = e=>{ if(e.target === clearBox) closeClear(); };
document.getElementById('clear-go').onclick = async ()=>{
  const sc = document.getElementById('clear-stamps');
  const doS = sc.checked && !sc.disabled;
  const doD = document.getElementById('clear-dates').checked && Object.keys(trips).length > 0;
  const doP = document.getElementById('clear-photos').checked && photoIds.size > 0;
  closeClear();
  if(!doS && !doD && !doP) return;
  if(doS){
    visited = {}; save();
    /* a traveled date with nothing stamped would contradict the map */
    for(const id in trips) if(trips[id].kind === "traveled") trips[id].kind = "planned";
    saveTrips();
  }
  if(doD){ trips = {}; saveTrips(); }
  if(doP){
    try{ await photoClear(); photoIds = new Set(); }
    catch(e){ toast("The photos could not be deleted"); return; }
  }
  repaintAll();
  const done = [doS && "stamps", doD && "dates", doP && "photos"].filter(Boolean)
    .join(", ").replace(/, ([^,]*)$/, " and $1");
  toast(done.charAt(0).toUpperCase() + done.slice(1) + " cleared");
};

/* How to use and About are two sheets of the same shape, so they share the
   opening, the scrim click and the Escape key; only one is ever up at a time */
const aboutBox = document.getElementById('aboutbox');
const helpBox = document.getElementById('helpbox');
function showSheet(box, on){
  if(on){ aboutBox.hidden = true; helpBox.hidden = true; }
  box.hidden = !on;
  if(on) box.querySelector('.x').focus();
}
function showAbout(on){ showSheet(aboutBox, on); }
function showHelp(on){ showSheet(helpBox, on); }
document.getElementById('about').onclick = ()=> showAbout(true);
document.getElementById('about-close').onclick = ()=> showAbout(false);
aboutBox.onclick = e=>{ if(e.target === aboutBox) showAbout(false); };
document.getElementById('help').onclick = ()=> showHelp(true);
document.getElementById('help-close').onclick = ()=> showHelp(false);
helpBox.onclick = e=>{ if(e.target === helpBox) showHelp(false); };
document.addEventListener('keydown', e=>{
  if(e.key !== "Escape") return;
  if(viewerIsOpen()) closeViewer();
  else if(!provBox.hidden) closeProv();
  else if(!clearBox.hidden) closeClear();
  else { showAbout(false); showHelp(false); }
});

/* mobile tools menu: the five buttons live behind one trigger so the header
   stays a single row and the map keeps the height the wrapped rows used to take */
const toolsEl = document.getElementById('tools');
const toolsBtn = document.getElementById('tools-toggle');
const toolsScrim = document.getElementById('tools-scrim');
function isNarrow(){ return narrow.matches; }
function setTools(on){
  const open = !!on && isNarrow();
  toolsEl.hidden = open ? false : isNarrow();
  toolsScrim.hidden = !open;
  toolsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function syncTools(){ if(isNarrow()) setTools(false); else { toolsEl.hidden = false; toolsScrim.hidden = true; } }
toolsBtn.onclick = ()=> setTools(toolsEl.hidden);
toolsScrim.onclick = ()=> setTools(false);
toolsEl.addEventListener('click', e=>{ if(e.target.closest('.ghost')) setTools(false); });
document.addEventListener('keydown', e=>{ if(e.key === "Escape" && !toolsScrim.hidden) setTools(false); });
