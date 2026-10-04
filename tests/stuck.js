// Stuck test: tanks parked under/around the stop walls must climb back out. Needs playwright-core + Chromium (CHROME=path). Usage: node tests/stuck.js index.html
const {chromium}=require('playwright-core');const path=require('path');
const exe=process.env.CHROME||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
(async()=>{
  const b=await chromium.launch({executablePath:exe});const p=await b.newPage();
  await p.goto(require('url').pathToFileURL(path.resolve(process.argv[2])).href);
  const res=await p.evaluate(()=>{
    const o=window.__off,{CX,CY,HX,HY}=o,out=[];
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const who of ['player','ai'])for(const [ux,uy] of dirs)for(const off of [0,4,-9,30,40,44,-44])for(const depth of (who==="ai"?[10,18,22]:[10,22,30,38])){
      o.startGame();for(let w=0;w<62;w++)o.step(1/60);const t=who==='player'?o.tanks[0]:o.tanks[1];
      const half=ux?HX:HY;
      t.x=CX+ux*(half+depth)+(uy?off:0);t.y=CY+uy*(half+depth)+(ux?off:0);t.kx=t.ky=0;
      o.shells.length=0;
      let back=false,died=false;
      for(let i=0;i<360;i++){
        for(const q of o.tanks)if(q!==t){q.x=CX+(q.id-2)*80;q.y=CY-90+q.id*5;q.kx=q.ky=0;q.cd=99;} // keep others out of the way and quiet
        if(who==='player'){o.input.kx=-ux;o.input.ky=-uy;} // drive straight at the pad
        o.step(1/60);
        if(!t.alive){died=true;break;}
        if(o.over(t)<-4){back=true;break;}
      }
      out.push({who,ux,uy,off,depth,back,died});
    }
    return out;
  });
  const bad=res.filter(r=>!r.back);
  console.log(`stuck test: ${res.length-bad.length}/${res.length} climbed back`);
  for(const r of bad.slice(0,12))console.log('  FAIL',JSON.stringify(r));
  await b.close();
})();
