import {chromium} from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:8099/angar.html';
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:1280,height:720}});
const errs=[];
p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e=>errs.push('PAGEERROR: '+e.message));
await p.goto(url, {waitUntil:'load', timeout:120000});
try{ await p.waitForFunction(()=>window.HANGAR_MAP, null, {timeout:180000}); }
catch(e){ console.log('NO HANGAR_MAP'); console.log(await p.evaluate(()=>document.querySelector('#g_load')?.innerText)); }
const info = await p.evaluate(()=>{
  const H=window.HANGAR_MAP; if(!H) return null;
  return {stats:H.stats, colliders:H.colliders.length,
    calls:H.renderer.info.render.calls, tris:H.renderer.info.render.triangles,
    progs:H.renderer.info.programs.length, mem:H.renderer.info.memory};
});
console.log(JSON.stringify(info,null,1));
console.log('ERRORS:', errs.slice(0,15).join('\n'));
await p.screenshot({path:'.shots/base.png'});
await b.close();
