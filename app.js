/* 9M2PJU Generator Load Calculator — app logic */
const AMPACITY = {
  cu: {1.5:15, 2.5:25, 4:32, 6:40, 10:55, 16:75, 25:100, 35:125, 50:150, 70:185, 95:225, 120:260},
  al: {1.5:12, 2.5:20, 4:26, 6:32, 10:45, 16:60, 25:75, 35:95, 50:115, 70:140, 95:170, 120:200}
};
const L_PER_KWH = { diesel:0.25, petrol:0.35, gas:0.30, hybrid:0.23 };
const RHO = { cu: 0.0172, al: 0.0282 }; // ohm·mm²/m
const PRESETS = {
  light:  { label:"Lighting",            icon:"💡", unitW:20,   factor:1 },
  socket: { label:"Socket Outlet",       icon:"🔌", unitW:500,  factor:1 },
  pc:     { label:"Office Equipment",    icon:"🖥️", unitW:200,  factor:1 },
  fridge: { label:"Fridge / Freezer",    icon:"🧊", unitW:300,  factor:3 },
  ac:     { label:"Air-Cond 1.5HP",      icon:"❄️", unitW:1100, factor:3 },
  pump:   { label:"Water Pump 1HP",      icon:"💧", unitW:750,  factor:3.5 },
  motor:  { label:"Motor 1HP",           icon:"⚙️", unitW:750,  factor:3.5 },
  custom: { label:"Custom",              icon:"✏️", unitW:0,    factor:1 },
};
const LS_KEY = "genCalc-v1";
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const els = {
  genType: $$('input[name="genType"]'),
  genKVA: $("#genKVA"), pf: $("#pf"), pfVal: $("#pfVal"),
  fuel: $("#fuelAvailable"), burn100: $("#burn100"), fuelHint: $("#fuelHint"),
  cableMat: $("#cableMat"), cableSize: $("#cableSize"),
  system: $("#system"), cableLen: $("#cableLen"),
  loads: $("#loadsContainer"), live: $("#liveTotals"), loadCount: $("#loadCount"),
  results: $("#resultsBox"), gaugeArc: $("#gaugeArc"), gaugePct: $("#gaugePct"),
  statusHero: $("#statusHero"), statusK: $("#statusK"), statusV: $("#statusV"), statusS: $("#statusS"),
  meterRun: $("#meterRun"), meterRunVal: $("#meterRunVal"),
  mobileBar: $("#mobileSummary"),
  toast: $("#toast"),
};

/* ---------- Theme ---------- */
function initTheme(){
  const saved = localStorage.getItem("genCalc-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  updateThemeIcon();
}
function updateThemeIcon(){ $("#themeBtn").textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙"; }
$("#themeBtn").addEventListener("click", ()=>{
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("genCalc-theme", next);
  updateThemeIcon();
});

/* ---------- Toast ---------- */
let toastT;
function toast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(()=> els.toast.classList.remove("show"), 2600);
}

/* ---------- Loads ---------- */
function makeLoadCard(data={}){
  const card = document.createElement("div");
  card.className = "load-card";
  card.innerHTML = `
    <div class="load-head">
      <div class="load-icon">💡</div>
      <div><div class="title">Load</div><div class="meta">—</div></div>
      <div class="load-actions">
        <button class="mini-btn dup" title="Duplicate" aria-label="Duplicate load">⧉</button>
        <button class="mini-btn rm" title="Remove" aria-label="Remove load">×</button>
      </div>
    </div>
    <div class="load-fields">
      <div class="control c4"><label class="lbl">Type</label><select class="type"></select></div>
      <div class="control c4"><label class="lbl">Quantity</label>
        <div class="qty-wrap"><button class="qty-btn minus" type="button">−</button><input type="number" class="qty" min="1" step="1" value="1" inputmode="numeric"><button class="qty-btn plus" type="button">+</button></div>
      </div>
      <div class="control c4"><label class="lbl">Unit Power (W)</label><input type="number" class="unit" min="0" step="1" inputmode="numeric" placeholder="e.g. 500"></div>
      <div class="control c4"><label class="lbl">Starting ×</label><input type="number" class="sf" min="1" step="0.1" inputmode="decimal"></div>
      <div class="control c4"><label class="lbl">Name <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input type="text" class="nm" maxlength="32" placeholder="e.g. Kitchen"></div>
      <div class="control c4"><div class="load-total" style="margin-top:22px"><span class="lt-run">—</span></div></div>
    </div>`;
  const type = card.querySelector(".type");
  type.innerHTML = Object.entries(PRESETS).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join("");
  const qty = card.querySelector(".qty"), unit = card.querySelector(".unit"),
        sf = card.querySelector(".sf"), nm = card.querySelector(".nm"),
        icon = card.querySelector(".load-icon"), title = card.querySelector(".title"),
        meta = card.querySelector(".meta"), total = card.querySelector(".lt-run");

  function syncPreset(fromUser=true){
    const p = PRESETS[type.value];
    icon.textContent = p.icon;
    title.textContent = p.label;
    if(fromUser){ unit.value = p.unitW; sf.value = p.factor; }
    recalc();
  }
  function recalc(){
    const q = +qty.value||0, u = +unit.value||0, f = +sf.value||1;
    const runW = q*u, startW = runW*f;
    const label = (nm.value||"").trim();
    meta.textContent = `${q} × ${u}W · start ×${f}${label ? " · "+label : ""}`;
    total.innerHTML = `<span>Run <b>${fmt0(runW)} W</b></span><span>Peak <b>${fmt0(startW)} W</b></span>`;
    updateAll(false);
  }
  type.addEventListener("change", ()=>syncPreset(true));
  [qty,unit,sf,nm].forEach(el=>el.addEventListener("input", recalc));
  card.querySelector(".minus").addEventListener("click", ()=>{ qty.value = Math.max(1,(+qty.value||1)-1); recalc(); });
  card.querySelector(".plus").addEventListener("click", ()=>{ qty.value = (+qty.value||0)+1; recalc(); });
  card.querySelector(".rm").addEventListener("click", ()=>{ card.remove(); updateAll(); toast("Load removed"); });
  card.querySelector(".dup").addEventListener("click", ()=>{
    const c = makeLoadCard(snapshotCard(card));
    card.after(c); updateAll(); toast("Load duplicated");
  });

  // apply initial data
  type.value = data.type || "light";
  const p = PRESETS[type.value];
  qty.value = data.qty ?? 1; unit.value = data.unit ?? p.unitW; sf.value = data.sf ?? p.factor; nm.value = data.nm || "";
  icon.textContent = p.icon; title.textContent = p.label;
  // force one recalc display without triggering save loop twice
  requestAnimationFrame(recalc);
  return card;
}
function snapshotCard(card){
  return { type: card.querySelector(".type").value, qty: card.querySelector(".qty").value,
    unit: card.querySelector(".unit").value, sf: card.querySelector(".sf").value, nm: card.querySelector(".nm").value };
}
function snapshotAll(){
  return {
    genType: ($('input[name="genType"]:checked')||{}).value || "diesel",
    genKVA: els.genKVA.value, pf: els.pf.value, fuel: els.fuel.value, burn100: els.burn100.value,
    cableMat: els.cableMat.dataset.value || "cu", cableSize: els.cableSize.value,
    system: els.system.dataset.value || "1p", cableLen: els.cableLen.value,
    loads: $$(".load-card").map(snapshotCard),
  };
}
function sumLoads(){
  let runW=0, peakW=0;
  $$(".load-card").forEach(c=>{
    const q=+(c.querySelector(".qty")?.value||0), u=+(c.querySelector(".unit")?.value||0), f=+(c.querySelector(".sf")?.value||1);
    runW+=q*u; peakW+=q*u*f;
  });
  return { runW, peakW, runKW:runW/1000, peakKW:peakW/1000 };
}

$("#addLoadBtn").addEventListener("click", ()=>{ els.loads.appendChild(makeLoadCard({type:"custom"})); updateAll(); $("#resultsCard").scrollIntoView({behavior:"smooth", block:"nearest"}); });
$$("#quickAdd .chip").forEach(ch=>ch.addEventListener("click", ()=>{
  els.loads.appendChild(makeLoadCard({type: ch.dataset.preset}));
  updateAll(); toast(`${ch.textContent.trim()} added`);
}));

/* ---------- Segmented controls ---------- */
function segInit(id, onChange){
  const seg = $(id);
  seg.addEventListener("click", e=>{
    const b = e.target.closest("button"); if(!b) return;
    $$("button", seg).forEach(x=>x.setAttribute("aria-pressed","false"));
    b.setAttribute("aria-pressed","true");
    seg.dataset.value = b.dataset.value;
    onChange && onChange(seg.dataset.value);
    updateAll();
  });
}
segInit("#cableMat", v=>{ $("#cableMatLabel").textContent = v==="cu" ? "Copper (Cu)" : "Aluminium (Al)"; });
segInit("#system", v=>{ $("#voltHint").textContent = v==="3p" ? "3-phase 400V line-to-line. Current split across 3 phases." : "Single-phase 230V. Standard home / portable setup."; });

/* ---------- Core calc ---------- */
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function fmt0(n){ return (n||0).toLocaleString("en-MY",{maximumFractionDigits:0}); }

function compute(){
  const genType = ($('input[name="genType"]:checked')||{}).value || "diesel";
  const genKVA = +(els.genKVA.value||0);
  const pf = clamp(+(els.pf.value||0.8), 0.5, 1);
  const fuelL = +(els.fuel.value||0);
  let burn100 = +(els.burn100.value||0);
  const cableMat = els.cableMat.dataset.value || "cu";
  const cableSz = +(els.cableSize.value||0);
  const sys = els.system.dataset.value || "1p";
  const len = Math.max(0, +(els.cableLen.value||0));
  const { runKW, peakKW, runW, peakW } = sumLoads();

  const runKVA = pf>0 ? runKW/pf : runKW;
  const peakKVA = pf>0 ? peakKW/pf : peakKW;
  const loadPctPeak = genKVA>0 ? peakKVA/genKVA : 0;
  const loadPctRun = genKVA>0 ? runKVA/genKVA : 0;

  const V = sys==="3p" ? 400 : 230;
  const runA = sys==="3p"
    ? (runKW*1000)/(Math.sqrt(3)*V*(pf||0.8))
    : (runKW*1000)/(V*(pf||0.8));
  const ampacity = AMPACITY[cableMat]?.[cableSz] ?? null;
  const cableUtil = ampacity ? (runA/ampacity)*100 : 0;

  // voltage drop
  let vdrop=0, vdropPct=0;
  if(len>0 && cableSz>0 && runA>0){
    const R = RHO[cableMat]*len/cableSz;
    vdrop = sys==="3p" ? Math.sqrt(3)*runA*R : 2*runA*R;
    vdropPct = V>0 ? vdrop/V*100 : 0;
  }

  if(!burn100 || burn100<=0){
    burn100 = genKVA*pf*(L_PER_KWH[genType] ?? 0.28);
  }
  const burnAtRun = burn100*(loadPctRun||0);
  const runtimeH = (fuelL>0 && burnAtRun>0) ? fuelL/burnAtRun : 0;

  return { genType, genKVA, pf, fuelL, burn100, burnAtRun, runtimeH,
    cableMat, cableSz, sys, V, len, runA, ampacity, cableUtil, vdrop, vdropPct,
    runKW, peakKW, runW, peakW, runKVA, peakKVA, loadPctPeak, loadPctRun };
}

function line(label, value, tag){
  const badge = tag ? `<span class="tag ${tag}">OK</span>`.replace("OK", tag==="good"?"OK":"Check") : "";
  return `<div class="rline"><span class="lbl2">${label}</span><span><b>${value}</b>${badge}</span></div>`;
}

function render(r){
  // header equivalents
  const kWfull = r.genKVA*r.pf;
  $("#genKWEquiv").textContent = `≈ ${kWfull.toFixed(1)} kW usable`;
  els.pfVal.textContent = (+r.pf).toFixed(2);
  els.fuelHint.textContent = r.burn100>0
    ? `Estimated full-load burn ≈ ${r.burn100.toFixed(2)} L/h (${r.genType}). Override if you know the exact figure.`
    : `If blank, consumption is estimated from type & kVA.`;

  // live totals
  const n = $$(".load-card").length;
  els.loadCount.textContent = `${n} load${n===1?"":"s"}`;
  els.live.innerHTML = r.runW<=0
    ? `Add loads to see running & starting totals.`
    : `<span>Running <b>${fmt0(r.runW)} W</b></span><span>Peak <b>${fmt0(r.peakW)} W</b></span><span>· ${n} load${n===1?"":"s"}</span>`;

  // gauge (peak loading)
  const pct = Math.min(999, r.loadPctPeak*100);
  const C = 2*Math.PI*34;
  const over = r.peakKVA > r.genKVA && r.peakKVA>0;
  els.gaugeArc.style.strokeDasharray = `${C}`;
  els.gaugeArc.style.strokeDashoffset = `${C*(1-Math.min(1,r.loadPctPeak))}`;
  els.gaugeArc.setAttribute("stroke", over ? "#dc2626" : (pct>85 ? "#d97706" : "#16a34a"));
  els.gaugePct.textContent = r.genKVA>0 ? `${pct.toFixed(0)}%` : "—";
  els.statusHero.className = "status-hero " + (r.runW<=0 ? "" : over ? "bad" : "ok");
  if(r.runW<=0){ els.statusK.textContent="No loads yet"; els.statusV.textContent="Add equipment to size your generator"; els.statusS.textContent="Running and peak demand will appear here live."; }
  else if(over){ els.statusK.textContent="Oversized demand"; els.statusV.textContent=`Peak ${r.peakKVA.toFixed(2)} kVA > ${r.genKVA.toFixed(0)} kVA rating`; els.statusS.textContent="Upsize generator or stagger high-surge starts."; }
  else { els.statusK.textContent = pct>85 ? "Tight but OK" : "Generator OK"; els.statusV.textContent=`Peak ${r.peakKVA.toFixed(2)} kVA of ${r.genKVA.toFixed(0)} kVA`; els.statusS.textContent=`${(100-pct).toFixed(0)}% headroom for surge. Aim for 70–80% continuous.`; }

  // run meter
  els.meterRun.style.width = `${Math.min(100, r.loadPctRun*100)}%`;
  els.meterRun.parentElement.classList.toggle("over", r.loadPctRun>1);
  els.meterRunVal.textContent = `${(r.loadPctRun*100).toFixed(1)}% of rating (running)`;

  // stat tiles
  $("#stRun").innerHTML = `${r.runKW.toFixed(2)} <small>kW</small>`;
  $("#stRunKva").innerHTML = `${r.runKVA.toFixed(2)} <small>kVA</small>`;
  $("#stPeak").innerHTML = `${r.peakKW.toFixed(2)} <small>kW</small>`;
  $("#stPeakKva").innerHTML = `${r.peakKVA.toFixed(2)} <small>kVA</small>`;
  $("#stAmps").innerHTML = `${r.runA.toFixed(1)} <small>A</small>`;
  $("#stRuntime").innerHTML = r.runtimeH>0 ? `${r.runtimeH.toFixed(1)} <small>h</small>` : `—`;

  // detailed lines
  let html = "";
  html += line("Power factor", r.pf.toFixed(2));
  html += line("Cable ampacity", r.ampacity!=null?`${r.ampacity} A`:"—", r.ampacity!=null ? (r.runA<=r.ampacity?"good":"bad") : undefined);
  html += line("Cable load", r.ampacity?`${r.cableUtil.toFixed(0)} %`:"—", r.ampacity?(r.cableUtil<=80?"good":"bad"):undefined);
  html += line("Volt drop", r.len>0?`${r.vdrop.toFixed(1)} V (${r.vdropPct.toFixed(1)}%)`:"—", r.len>0?(r.vdropPct<=5?"good":"bad"):undefined);
  html += line("Fuel available", `${r.fuelL.toFixed(1)} L`);
  html += line("Burn @100%", `${r.burn100.toFixed(2)} L/h`);
  html += line("Burn @running", `${r.burnAtRun.toFixed(2)} L/h`);
  let warns = "";
  if(r.peakKVA>r.genKVA && r.peakKVA>0) warns += `<div class="notice danger">⚠ Generator undersized for peak. Consider larger kVA or staggered starts.</div>`;
  else if(r.runW>0) warns += `<div class="notice success">✅ Generator sufficient for calculated peak.</div>`;
  if(r.ampacity && r.runA>r.ampacity) warns += `<div class="notice danger">⚠ Cable undersized for running current. Upsize or run in parallel.</div>`;
  if(r.len>0 && r.vdropPct>5) warns += `<div class="notice warn">⚠ Voltage drop ${r.vdropPct.toFixed(1)}% exceeds 5% guideline. Shorten run or upsize cable.</div>`;
  if(r.fuelL>0 && r.runtimeH>0 && r.runtimeH<2) warns += `<div class="notice warn">⚠ Short runtime (${r.runtimeH.toFixed(1)} h). Add fuel or shed load.</div>`;
  els.results.innerHTML = html + warns + `<div class="fine">Single-phase 230V / 3-phase 400V simplified estimates. Ampacity is rule-of-thumb — verify with local codes (Suruhanjaya Tenaga / IEC).</div>`;

  // mobile bar
  els.mobileBar.innerHTML = r.runW<=0
    ? `<div class="m"><div class="a">No loads yet</div><div class="b">Add equipment ↑</div></div>`
    : `<div class="m"><div class="a">${fmt0(r.runW)} W run · ${fmt0(r.peakW)} W peak</div>
       <div class="b"><span class="${over?"over":"ok"}">${pct.toFixed(0)}% peak</span> · ${r.runtimeH>0?r.runtimeH.toFixed(1)+" h":"—"}</div></div>`;

  return r;
}

/* live update + persist (debounced) */
let saveT;
function updateAll(save=true){
  const r = render(compute());
  if(save){ clearTimeout(saveT); saveT = setTimeout(()=>{ try{ localStorage.setItem(LS_KEY, JSON.stringify(snapshotAll())); }catch(e){} }, 300); }
  return r;
}
["genKVA","pf","fuelAvailable","burn100","cableSize","cableLen"].forEach(id=>{
  document.getElementById(id).addEventListener("input", ()=>updateAll());
});
$$('input[name="genType"]').forEach(r=>r.addEventListener("change", ()=>updateAll()));

function restore(){
  let s=null; try{ s = JSON.parse(localStorage.getItem(LS_KEY)||"null"); }catch(e){}
  if(!s){
    els.loads.appendChild(makeLoadCard({type:"light"}));
    updateAll(false); return;
  }
  try{
    const radio = document.querySelector(`input[name="genType"][value="${s.genType}"]`);
    if(radio) radio.checked = true;
    els.genKVA.value = s.genKVA ?? "10"; els.pf.value = s.pf ?? 0.8;
    els.fuel.value = s.fuel ?? ""; els.burn100.value = s.burn100 ?? "";
    setSeg("#cableMat", s.cableMat||"cu"); setSeg("#system", s.system||"1p");
    els.cableSize.value = s.cableSize ?? "4"; els.cableLen.value = s.cableLen ?? "20";
    (s.loads?.length ? s.loads : [{type:"light"}]).forEach(d=>els.loads.appendChild(makeLoadCard(d)));
  }catch(e){ els.loads.appendChild(makeLoadCard({type:"light"})); }
  updateAll(false);
}
function setSeg(id, v){
  const seg = $(id); seg.dataset.value = v;
  $$("button", seg).forEach(x=>x.setAttribute("aria-pressed", String(x.dataset.value===v)));
}

/* ---------- Actions ---------- */
$("#resetBtn").addEventListener("click", ()=>{
  if(!confirm("Reset all inputs?")) return;
  localStorage.removeItem(LS_KEY);
  els.loads.innerHTML=""; els.loads.appendChild(makeLoadCard({type:"light"}));
  els.fuel.value=""; els.burn100.value="";
  updateAll(); toast("Reset done");
});
$("#printBtn").addEventListener("click", ()=>window.print());
$("#copyBtn").addEventListener("click", async ()=>{
  const r = compute();
  const txt = `9M2PJU Generator Check\nGen: ${r.genKVA}kVA ${r.genType} PF ${r.pf}\nRun: ${r.runKW.toFixed(2)}kW (${r.runKVA.toFixed(2)}kVA)\nPeak: ${r.peakKW.toFixed(2)}kW (${r.peakKVA.toFixed(2)}kVA)\nLoading (peak): ${(r.loadPctPeak*100).toFixed(1)}%\nCable: ${r.cableMat.toUpperCase()} ${r.cableSz}mm² ~ ${r.runA.toFixed(1)}A / ${r.ampacity??"?"}A\nFuel: ${r.fuelL}L → ~${r.runtimeH>0?r.runtimeH.toFixed(1)+"h":"—"} runtime`;
  try{ await navigator.clipboard.writeText(txt); toast("Summary copied"); }
  catch(e){
    const ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select();
    try{document.execCommand("copy"); toast("Summary copied");}catch(_){toast("Copy failed");}
    ta.remove();
  }
});
$("#shareBtn").addEventListener("click", async ()=>{
  const r = compute();
  const data = { title:"Generator sizing", text:`Gen ${r.genKVA}kVA: run ${r.runKW.toFixed(2)}kW, peak ${r.peakKVA.toFixed(2)}kVA (${(r.loadPctPeak*100).toFixed(0)}%), runtime ${r.runtimeH>0?r.runtimeH.toFixed(1)+"h":"—"}`, url: location.href };
  if(navigator.share){ try{ await navigator.share(data); }catch(e){} }
  else window.open("https://wa.me/?text="+encodeURIComponent(data.text+" "+location.href), "_blank");
});
$("#calcBtn").addEventListener("click", ()=>{ updateAll(); $("#resultsCard").scrollIntoView({behavior:"smooth"}); });
$("#viewResultsBtn").addEventListener("click", ()=>$("#resultsCard").scrollIntoView({behavior:"smooth", block:"start"}));

/* ---------- PWA install ---------- */
let deferredPrompt=null;
const installBtn=$("#installBtn"), banner=$("#installBanner");
function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
function isStandalone(){ return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true; }
window.addEventListener("beforeinstallprompt", e=>{
  e.preventDefault(); deferredPrompt=e;
  installBtn.hidden=false; banner.hidden=false;
});
async function doInstall(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if(outcome==="accepted"){ toast("Installing app…"); banner.hidden=true; installBtn.hidden=true; }
    deferredPrompt=null;
  } else if(isIOS()){
    toast("iOS: Share → Add to Home Screen");
  } else {
    toast("Use browser menu → Install / Add to Home Screen");
  }
}
installBtn.addEventListener("click", doInstall);
$("#installNowBtn")?.addEventListener("click", doInstall);
$("#installDismissBtn")?.addEventListener("click", ()=>{ banner.hidden=true; });
window.addEventListener("appinstalled", ()=>{ banner.hidden=true; installBtn.hidden=true; toast("App installed ✓"); });
if(isStandalone()){ installBtn.hidden=true; banner.hidden=true; }
else if(isIOS() && !localStorage.getItem("genCalc-ios-hint")){
  installBtn.hidden=false; // allow manual hint
}

/* ---------- SW ---------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

/* init */
initTheme();
restore();
