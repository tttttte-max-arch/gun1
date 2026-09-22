import {chromium} from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:8099/angar.html';
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:1000,height:600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const t0=Date.now();
await p.goto(url,{waitUntil:'load',timeout:120000});
await p.waitForFunction(()=>window.HANGAR_MAP,null,{timeout:240000});
const build=Date.now()-t0;
const s = await p.evaluate(()=>{
  const H=window.HANGAR_MAP, r=H.renderer;
  let meshes=0, pts=0, tri=0, mats=new Set(), geos=new Set();
  H.scene.traverse(o=>{ if(o.isMesh){meshes++; mats.add(o.material.uuid); geos.add(o.geometry.uuid);
    const g=o.geometry; if(g.index) tri+=g.index.count/3; else if(g.attributes.position) tri+=g.attributes.position.count/3;}
    if(o.isPoints) pts++; });
  r.info.autoReset=false; r.info.reset();
  H.renderer.render(H.scene, H.camera);
  const calls=r.info.render.calls, rtri=r.info.render.triangles;
  r.info.autoReset=true;
  return {meshes,pts,tri:Math.round(tri),calls,rtri,mats:mats.size,geos:geos.size,
          progs:r.info.programs.length, texs:r.info.memory.textures, geom:r.info.memory.geometries};
});
console.log('buildMs', build, JSON.stringify(s));
console.log('errors', errs.slice(0,8));
await b.close();
