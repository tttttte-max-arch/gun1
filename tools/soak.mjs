import {chromium} from 'playwright';
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:800,height:480}});
const errs=[]; p.on('pageerror',e=>errs.push('PE: '+e.message));
p.on('console',m=>{ if(m.type()==='error') errs.push('CE: '+m.text()); });
await p.goto('http://127.0.0.1:8099/angar.html?q=med',{waitUntil:'load',timeout:120000});
await p.waitForFunction(()=>window.HANGAR_MAP,null,{timeout:300000});
// быстрый прогон полных суток + разрушения + ходьба
await p.evaluate(()=>{ const H=window.HANGAR_MAP;
  H.time.setSpeed(1/20); H.time.pause(false);
  H.player.fly=false; H.player.pos.set(-30,1.7,-20); });
for(let i=0;i<10;i++){
  await p.evaluate(()=>{ const H=window.HANGAR_MAP;
    H.keys['KeyW']=true; H.player.yaw += 0.6;
    const THREE=H.THREE, P=H.physics, PL=H.player;
    const org=new THREE.Vector3(PL.pos.x,PL.pos.y+1.5,PL.pos.z);
    const d=new THREE.Vector3(-Math.sin(PL.yaw),0,-Math.cos(PL.yaw));
    P.damage(org,d,5);
  });
  await p.waitForTimeout(2500);
}
const st = await p.evaluate(()=>{ const H=window.HANGAR_MAP;
  H.keys['KeyW']=false;
  return {clock:H.time.clock, phase:H.time.phase,
    broken:H.physics.breakable.filter(b=>b.dead).length,
    rigid:H.physics.rigid.length,
    pos:[+H.player.pos.x.toFixed(1),+H.player.pos.y.toFixed(2),+H.player.pos.z.toFixed(1)],
    geos:H.renderer.info.memory.geometries, texs:H.renderer.info.memory.textures,
    calls:H.renderer.info.render.calls};
});
console.log(JSON.stringify(st));
console.log('errors('+errs.length+')', errs.slice(0,8));
await b.close();
