import {chromium} from 'playwright';
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:900,height:520}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://127.0.0.1:8099/angar.html',{waitUntil:'load',timeout:120000});
await p.waitForFunction(()=>window.HANGAR_MAP,null,{timeout:240000});
// даём кадрам идти, чтобы физика отработала
await p.waitForTimeout(4000);
console.log(JSON.stringify(await p.evaluate(()=>{
  const H=window.HANGAR_MAP, P=H.physics;
  // 1) Флаг реально деформируется ветром
  const c = P.cloths[0];
  const snap = ()=>{ const a=c.geo.attributes.position.array; return [a[0],a[1],a[2], a[30],a[31],a[32]]; };
  const s1 = snap();
  return new Promise(res=>setTimeout(()=>{
    const s2 = snap();
    const moved = s1.some((v,i)=>Math.abs(v-s2[i])>1e-4);
    // 2) Ветер порывистый, не константа
    const w1 = P.wind.speed;
    setTimeout(()=>{
      const w2 = P.wind.speed;
      // 3) Разрушаемость
      const before = P.breakable.filter(x=>!x.dead).length;
      const THREE = H.THREE;
      let broke = 0;
      for(const b of P.breakable.slice(0,400)){
        if(b.dead) continue;
        const ctr = b.box.getCenter(new THREE.Vector3());
        // бьём из точки прямо перед панелью
        const n = new THREE.Vector3(b.box.max.x-b.box.min.x < b.box.max.z-b.box.min.z ? 1:0, 0,
                                    b.box.max.x-b.box.min.x < b.box.max.z-b.box.min.z ? 0:1);
        const org = ctr.clone().addScaledVector(n, 1.2);
        const dir = n.clone().negate();
        if(P.damage(org, dir, 5)) broke++;
        if(broke>=12) break;
      }
      const after = P.breakable.filter(x=>!x.dead).length;
      res({clothMoved:moved, wind1:+w1.toFixed(2), wind2:+w2.toFixed(2),
           windVaries: Math.abs(w1-w2)>0.01,
           cloths:P.cloths.length, breakableTotal:P.breakable.length,
           brokeAttempt:broke, destroyed: before-after, rigidBodies:P.rigid.length});
    }, 700);
  }, 700));
}),null,1));
console.log('errors', errs.slice(0,6));
await b.close();
