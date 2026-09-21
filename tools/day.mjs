import {chromium} from 'playwright';
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:900,height:520}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://127.0.0.1:8099/angar.html',{waitUntil:'load',timeout:120000});
await p.waitForFunction(()=>window.HANGAR_MAP,null,{timeout:240000});
const rows = await p.evaluate(()=>{
  const H=window.HANGAR_MAP, out=[];
  for(const t of [0.00,0.10,0.25,0.42,0.52,0.60,0.66,0.72,0.80,0.90,0.96]){
    H.time.set(t);
    const s = H.scene;
    let sun=null, moon=null, hemi=null, spots=0, spotPow=0;
    s.traverse(o=>{
      if(o.isDirectionalLight && o.castShadow!==undefined && o.shadow && o.shadow.mapSize.width>512) sun=o;
      if(o.isHemisphereLight) hemi=o;
      if(o.isSpotLight){ spots++; spotPow+=o.intensity; }
    });
    const dirs=[]; s.traverse(o=>{ if(o.isDirectionalLight) dirs.push(o); });
    out.push({t, phase:H.time.phase, clock:H.time.clock,
      sun:+(sun?sun.intensity:0).toFixed(2),
      sunY:+(sun?sun.position.y:0).toFixed(1),
      hemi:+(hemi?hemi.intensity:0).toFixed(2),
      spots, spotPow:+spotPow.toFixed(0),
      exposure:+H.renderer.toneMappingExposure.toFixed(2),
      fogD:+s.fog.density.toFixed(4),
      shadows: sun? sun.castShadow : false});
  }
  H.time.set(0.26);
  return out;
});
console.log('t     время  фаза                     солнце sunY  hemi  прожекторы экспоз  туман  тени');
for(const r of rows)
  console.log(`${r.t.toFixed(2)}  ${r.clock}  ${r.phase.padEnd(24)} ${String(r.sun).padStart(5)} ${String(r.sunY).padStart(6)} ${String(r.hemi).padStart(5)}  ${String(r.spotPow).padStart(5)}(${r.spots})  ${r.exposure}  ${r.fogD}  ${r.shadows?'да':'нет'}`);
console.log('errors', errs.slice(0,5));
await b.close();
