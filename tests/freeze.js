// Countdown freeze test. Needs playwright-core + a Chromium (set CHROME=path, default: Windows ms-playwright). Usage: node tests/freeze.js index.html
const {chromium}=require('playwright-core');const path=require('path');
const exe=process.env.CHROME||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
(async()=>{
  const b=await chromium.launch({executablePath:exe});const p=await b.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(process.argv[2])).href);
  // 1) sim-level: input held, step through the countdown (start and rematch paths both call startCount)
  const fails=await p.evaluate(()=>{
    const o=window.__off,f=[];
    const snap=()=>JSON.stringify(o.tanks.map(t=>[t.x,t.y,t.kx,t.ky,t.dx,t.dy,t.cd]));
    for(const phase of ['start','rematch']){
      o.startCount();Object.assign(o.input,{kx:1,ky:-1,jx:1,jy:1,fire:true});
      const s0=snap();let t=0;
      while(o.state==='count'&&t<4){o.step(1/60);t+=1/60;
        if(snap()!==s0){f.push(phase+': tank state changed at '+t.toFixed(2)+'s');break;}
        if(o.shells.length){f.push(phase+': shell exists');break;}}
      if(o.state!=='play')f.push(phase+': never reached GO');
      else{
        if(o.input.kx||o.input.ky||o.input.jx||o.input.jy||o.input.fire)f.push(phase+': input not cleared at GO');
        const g=o.tanks[0].x+','+o.tanks[0].y;o.step(1/60);o.step(1/60);
        if(o.tanks[0].x+','+o.tanks[0].y!==g||o.shells.length)f.push(phase+': stale input acted after GO');
      }
    }
    return f;
  });
  await p.reload();  // 2) real keyboard: fresh start screen; hold arrow+Space through GO
  await p.keyboard.down('ArrowRight');await p.keyboard.down('Space'); // Space on start screen starts the countdown
  await p.waitForFunction(()=>window.__off.state==='play',null,{timeout:6000});
  const x0=await p.evaluate(()=>window.__off.tanks[0].x);
  await p.waitForTimeout(400);
  const k=await p.evaluate(()=>({x:window.__off.tanks[0].x,sh:window.__off.shells.filter(s=>s.owner===window.__off.tanks[0]).length}));
  if(Math.abs(k.x-x0)>1)fails.push('real keys: player moved '+(k.x-x0).toFixed(1)+' after GO with keys held since countdown');
  if(k.sh)fails.push('real keys: player fired from held Space');
  await p.keyboard.up('ArrowRight');await p.keyboard.up('Space');
  // fresh press after GO still works
  await p.keyboard.down('ArrowRight');await p.waitForTimeout(300);await p.keyboard.up('ArrowRight');
  const x2=await p.evaluate(()=>window.__off.tanks[0].x);
  if(x2-k.x<10)fails.push('fresh keypress after GO did not move player');
  console.log(errs.length?'PAGE ERRORS '+errs:'',fails.length?'FAIL\n'+fails.join('\n'):'freeze ok');
  await b.close();
})();
