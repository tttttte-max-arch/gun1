import {chromium} from 'playwright';
const q = process.argv[2] || 'high';
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:900,height:520}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://127.0.0.1:8099/angar.html?q='+q,{waitUntil:'load',timeout:120000});
await p.waitForFunction(()=>window.HANGAR_MAP,null,{timeout:240000});

const out = await p.evaluate(()=>{
  const H=window.HANGAR_MAP;
  const R=0.34, HH=1.76, STEP=0.46, S=0.35, YQ=0.25;
  const cols=H.colliders.filter(c=>!c.disabled);
  const CELL=4, G=new Map(), key=(a,b)=>a*10007+b;
  cols.forEach(c=>{ for(let ix=Math.floor(c.x0/CELL);ix<=Math.floor(c.x1/CELL);ix++)
    for(let iz=Math.floor(c.z0/CELL);iz<=Math.floor(c.z1/CELL);iz++){
      const k=key(ix,iz); if(!G.has(k))G.set(k,[]); G.get(k).push(c);} });
  const near=(x,z)=>{ const s=[];
    for(let ix=Math.floor((x-1)/CELL);ix<=Math.floor((x+1)/CELL);ix++)
      for(let iz=Math.floor((z-1)/CELL);iz<=Math.floor((z+1)/CELL);iz++){
        const a=G.get(key(ix,iz)); if(a) s.push(...a);} return s; };
  // Ступени маршей — опора, а не стена: движок делает то же исключение,
  // без него любая лестница читается как сплошной блок.
  const blocked=(x,y,z)=>near(x,z).some(c=>{
    if(c.step && y >= c.y1-0.02) return false;
    return !(x+R<=c.x0||x-R>=c.x1)&&!(z+R<=c.z0||z-R>=c.z1)&&!(y+HH<=c.y0||y>=c.y1);});
  // все поверхности под точкой, на которые можно встать
  const surfaces=(x,z)=>{ const ys=[];
    for(const c of near(x,z)){
      if(x+R<=c.x0||x-R>=c.x1||z+R<=c.z0||z-R>=c.z1) continue;
      ys.push(c.y1); }
    ys.push(0); return ys; };
  // Флуд-фил в 3D: узел = (i, j, округлённая высота опоры)
  const id=(i,j,y)=>i+','+j+','+Math.round(y/YQ);
  const seen=new Set(), q=[];
  const push=(x,z,y)=>{ const i=Math.round(x/S), j=Math.round(z/S);
    const k=id(i,j,y); if(seen.has(k)) return; seen.add(k); q.push([i,j,y]); };
  push(-36,0,0);
  let iter=0;
  while(q.length && iter<600000){
    iter++;
    const [i,j,y]=q.pop();
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const ni=i+di, nj=j+dj, nx=ni*S, nz=nj*S;
      if(Math.abs(nx)>44||Math.abs(nz)>34) continue;
      for(const sy of surfaces(nx,nz)){
        if(sy-y > STEP) continue;            // слишком высокая ступень
        if(y-sy > 4.0) continue;             // слишком большой обрыв
        if(blocked(nx, sy+0.03, nz)) continue;
        push(nx,nz,sy);
      }
    }
  }
  const has=(x,z,y,tol=1.0)=>{
    const i0=Math.round(x/S), j0=Math.round(z/S);
    for(let di=-3;di<=3;di++) for(let dj=-3;dj<=3;dj++)
      for(let k=-8;k<=8;k++){
        if(seen.has(id(i0+di,j0+dj,y+k*YQ))) return true;
      }
    return false;
  };
  const B=H.building, DK=H.floors.deck;
  const checks=[
    ['ангар СЗ угол',-36,-27,0],['ангар СВ угол',36,-27,0],
    ['ангар ЮЗ угол',-36,27,0],['ангар ЮВ угол',36,27,0],
    ['центр атриума',0,0,0],
    ['здание З крыло 1эт',-13,-7.5,0],['здание В крыло 1эт',13,7.5,0],
    ['здание СЗ комната 1эт',-10,-7.5,0],['здание ЮВ комната 1эт',10,7.5,0],
    ['коридор С 1эт',-9,-3.5,0],['коридор Ю 1эт',9,3.5,0],
    ['здание З крыло 2эт',-13,-7.5,DK],['здание В крыло 2эт',13,7.5,DK],
    ['галерея С 2эт',0,-7.5,DK],['галерея Ю 2эт',0,7.5,DK],
    ['коридор 2эт запад',-10,0,DK],['коридор 2эт восток',10,0,DK],
    ['гараж 1 уровень',29.5,-18,0],['гараж стоянка 2 ур',27,-21,3.9],
    ['вертолётная площадка',-30,19.5,0.26],['под башней',30,20,0],
    ['мост гараж→здание',19,0,DK],
    ['подмости у З фасада',-15.7,2.0,DK],
  ];
  return {nodes:seen.size, iter, colliders:cols.length,
    checks: checks.map(([n,x,z,y])=>({n, ok:has(x,z,y)}))};
});
console.log('=== nav', q, '=== nodes:', out.nodes, 'iter:', out.iter, 'colliders:', out.colliders);
let bad=0;
for(const c of out.checks){ if(!c.ok) bad++; console.log(` ${c.ok?'OK  ':'FAIL'} ${c.n}`); }
console.log('UNREACHABLE:', bad, '/', out.checks.length);
console.log('errors', errs.slice(0,5));
await b.close();
