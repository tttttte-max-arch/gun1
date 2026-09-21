import {chromium} from 'playwright';
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const q of ['low','med','high','ultra']){
  const p = await b.newPage({viewport:{width:960,height:540}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const t0=Date.now();
  await p.goto('http://127.0.0.1:8099/angar.html?q='+q,{waitUntil:'load',timeout:120000});
  await p.waitForFunction(()=>window.HANGAR_MAP,null,{timeout:300000});
  const build=Date.now()-t0;
  const r = await p.evaluate(()=>{
    const H=window.HANGAR_MAP, R=H.renderer;
    H.player.pos.set(-30,7,-20); H.player.yaw=0.75; H.player.pitch=-0.2; H.player.fly=true;
    H.step(0.016);
    R.info.autoReset=false;
    // измеряем стоимость кадра напрямую
    const t=[];
    for(let i=0;i<8;i++){ R.info.reset(); const a=performance.now(); H.composer.render(); t.push(performance.now()-a); }
    R.info.autoReset=true;
    t.sort((x,y)=>x-y);
    let tris=0; H.scene.traverse(o=>{ if(o.isMesh&&o.visible){const g=o.geometry;
      tris += g.index?g.index.count/3:(g.attributes.position?g.attributes.position.count/3:0);} });
    return {ms:+t[Math.floor(t.length/2)].toFixed(1), calls:R.info.render.calls,
      drawnTris:R.info.render.triangles, sceneTris:Math.round(tris),
      pr:+R.getPixelRatio().toFixed(2), shadow:R.shadowMap.enabled,
      texs:R.info.memory.textures, geos:R.info.memory.geometries,
      progs:R.info.programs.length, stats:H.stats};
  });
  console.log(`${q.padEnd(6)} build=${(build/1000).toFixed(1)}s frame=${String(r.ms).padStart(6)}ms calls=${String(r.calls).padStart(4)} tris=${String((r.drawnTris/1000).toFixed(0)).padStart(4)}k scene=${(r.sceneTris/1000).toFixed(0)}k pr=${r.pr} tex=${r.texs} prog=${r.progs} frag=${r.stats.fragments} stairs=${r.stats.stairIssues.length===0?'OK':'FAIL'}`);
  if(errs.length) console.log('  errors', errs.slice(0,3));
  await p.close();
}
await b.close();
