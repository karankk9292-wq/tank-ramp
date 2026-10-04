// Idle-player sim: first fall timing. Needs playwright-core + Chromium (CHROME=path). Usage: node tests/sim.js index.html [runs] [maxSec]
const {chromium}=require('playwright-core');const path=require('path');
const exe=process.env.CHROME||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
(async()=>{
  const file=process.argv[2],N=+process.argv[3]||40,MAX=+process.argv[4]||60;
  const b=await chromium.launch({executablePath:exe});const p=await b.newPage();
  await p.goto(require('url').pathToFileURL(path.resolve(file)).href);
  const res=await p.evaluate(([N,MAX])=>{
    const o=window.__off,out=[];
    for(let r=0;r<N;r++){
      o.startGame();let first=null,firstWho=null,end=null,t=0;
      while(t<MAX){o.step(1/60);t+=1/60;
        const ts=o.tanks;
        if(first===null){const d=ts.find(x=>!x.alive);if(d){first=t;firstWho=d.isPlayer?'P':'AI';}}
        if(ts.filter(x=>x.alive).length<=1||!ts[0].alive){end=t;break;}}
      out.push({first,firstWho,end,pAlive:o.tanks[0].alive,alive:o.tanks.filter(x=>x.alive).length});
    }return out;},[N,MAX]);
  await b.close();
  const f=res.map(r=>r.first).filter(x=>x!==null).sort((a,b)=>a-b),med=a=>a.length?a[a.length>>1]:NaN;
  const e=res.map(r=>r.end).filter(x=>x!==null).sort((a,b)=>a-b);
  console.log(`runs ${N}: first fall in ${f.length}/${N}, <=20s ${f.filter(x=>x<=20).length}/${N}, median ${med(f).toFixed(1)}s, max ${f.length?f[f.length-1].toFixed(1):'-'}s; first faller player ${res.filter(r=>r.firstWho==='P').length}; ended(<=${MAX}s) ${e.length}/${N}, median end ${med(e).toFixed(1)}s`);
})();
