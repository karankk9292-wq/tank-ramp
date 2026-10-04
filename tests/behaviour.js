// Behaviour checks. Needs playwright-core + Chromium (CHROME=path). Usage: node tests/behaviour.js index.html [runs]
const {chromium}=require('playwright-core');const path=require('path');
const exe=process.env.CHROME||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
(async()=>{
  const b=await chromium.launch({executablePath:exe});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(process.argv[2])).href);
  const RUNS=+process.argv[3]||100;
  const r=await p.evaluate((RUNS)=>{
    const o=window.__off,{CX,CY,HX,HY,STUBS}=o,R=14,out={fails:[]};const ok=(c,m)=>{if(!c)out.fails.push(m);};
    // ---- A. AI behaviour over idle-player matches: wall/stub camping, panic only on ramps, AIs fighting each other
    const camp=[],stat={panOff:0,rampSteps:0,rampPan:0,deepSteps:0,deepPan:0,aiHitAi:0,playerHitAi:0,aiHitPlayer:0,fallsByAi:0,fallsByPlayer:0,fallsOnOwn:0,runsAiFight:0,aiFalls:0};
    const nearWall=t=>{if(o.over(t)<-R-5)return false;return true;};
    const nearStub=t=>STUBS.some(r=>{const cx=Math.max(r.x0,Math.min(t.x,r.x1)),cy=Math.max(r.y0,Math.min(t.y,r.y1));return Math.hypot(t.x-cx,t.y-cy)<R+6;});
    for(let run=0;run<RUNS;run++){
      o.startGame();const T=o.tanks,run0={cw:[0,0,0,0],cs:[0,0,0,0],mw:0,ms:0};let lastBy=[null,null,null,null],prev=T.map(t=>[t.x,t.y]),fight=false,dead=[0,0,0,0];
      for(let i=0;i<3600;i++){
        const wasRamp=T.map(t=>o.over(t)>0),wasDeep=T.map(t=>o.over(t)>o.RL*0.3); // deep = past the shallow-overshoot exception
        o.step(1/60);
        for(const t of T){
          if(t.alive&&!t.isPlayer){
            const sp=Math.hypot(t.x-prev[t.id][0],t.y-prev[t.id][1])*60,i0=t.id;
            if(i>90){ // after the opening standoff
              if(nearWall(t)&&!(o.over(t)>0)&&sp<12)run0.cw[i0]++;else run0.cw[i0]=0;
              if(nearStub(t)&&sp<12)run0.cs[i0]++;else run0.cs[i0]=0;
              run0.mw=Math.max(run0.mw,run0.cw[i0]);run0.ms=Math.max(run0.ms,run0.cs[i0]);
            }
            if(t.pan&&!wasRamp[t.id])stat.panOff++;
            if(wasRamp[t.id]){stat.rampSteps++;if(t.pan)stat.rampPan++;if(wasDeep[t.id]){stat.deepSteps++;if(t.pan)stat.deepPan++;}}
          }
          prev[t.id]=[t.x,t.y];
          if(t.by&&t.by!==lastBy[t.id]){lastBy[t.id]=t.by;if(t.isPlayer){if(!t.by.o.isPlayer)stat.aiHitPlayer++;}else if(t.by.o.isPlayer)stat.playerHitAi++;else if(t.by.o!==t){stat.aiHitAi++;fight=true;}}
          if(!t.alive&&!dead[t.id]){dead[t.id]=1;if(!t.isPlayer){stat.aiFalls++;if(t.by&&i/60-t.by.t<2.5||t.by&&true){const bt=t.by;if(bt&&!bt.o.isPlayer)stat.fallsByAi++;else if(bt)stat.fallsByPlayer++;}else stat.fallsOnOwn++;}}
        }
        if(!T[0].alive||T.filter(t=>t.alive).length<=1)break;
      }
      camp.push([run0.mw/60,run0.ms/60]);if(fight)stat.runsAiFight++;
    }
    const mx=a=>Math.max(...a),pct=(a,q)=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length*q)];
    out.camp={wallMax:mx(camp.map(c=>c[0])),wallP95:pct(camp.map(c=>c[0]),.95),stubMax:mx(camp.map(c=>c[1])),stubP95:pct(camp.map(c=>c[1]),.95)};
    out.stat=stat;
    ok(stat.panOff===0,'AI panicked while not on a ramp ('+stat.panOff+' steps)');
    ok(stat.deepSteps===0||stat.deepPan/stat.deepSteps>0.99,'AI deep on a ramp does not always panic: '+(stat.deepPan/stat.deepSteps).toFixed(3));
    ok(stat.runsAiFight>=RUNS*0.9,'AIs rarely fight each other: '+stat.runsAiFight+'/'+RUNS);
    ok(out.camp.wallMax<3&&out.camp.stubMax<3,'AI camps a wall/stub: '+JSON.stringify(out.camp));
    // ---- A2. AI-vs-AI: player pinned (invulnerable) at the centre; do AIs shove each other off?
    const a2={runs:40,ended:0,aiFalls:0,byAi:0,byPlayer:0,own:0};
    for(let run=0;run<a2.runs;run++){
      o.startGame();const T=o.tanks,dead=[0,0,0,0];
      for(let i=0;i<3600;i++){
        T[0].x=CX;T[0].y=CY;T[0].kx=T[0].ky=0;o.step(1/60);
        for(const t of T)if(!t.alive&&!dead[t.id]&&!t.isPlayer){dead[t.id]=1;a2.aiFalls++;if(t.by&&!t.by.o.isPlayer)a2.byAi++;else if(t.by)a2.byPlayer++;else a2.own++;}
        if(T.filter(t=>!t.isPlayer&&t.alive).length<=1){a2.ended++;break;}
      }
    }
    out.aiVsAi=a2;ok(a2.byAi>=a2.runs,'AIs rarely push each other off: '+a2.byAi+' falls in '+a2.runs+' runs');
    // ---- B. bumps push the tank nearest a ramp (all four sides, both id orders)
    let bumpPeak=0,bumpCases=0;
    for(const [ux,uy] of [[1,0],[-1,0],[0,1],[0,-1]])for(const swap of [0,1]){
      o.startGame();const T=o.tanks,e=ux?HX:HY;
      const near=T[swap?2:1],far=T[swap?1:2];
      T[0].x=CX-HX+40;T[0].y=CY+HY-30;T[3].x=CX+HX-40;T[3].y=CY-HY+30; // park the others in opposite corners
      near.x=CX+ux*(e-50);near.y=CY+uy*(e-50);far.x=near.x-ux*18;far.y=near.y-uy*18;near.kx=near.ky=far.kx=far.ky=0;
      ok(o.mdist(near)<o.mdist(far),'test setup: near tank not nearer the ramp');
      const n0=[near.x,near.y],f0=[far.x,far.y];
      for(let i=0;i<8;i++){o.step(1/60);bumpPeak=Math.max(bumpPeak,Math.hypot(near.kx,near.ky),Math.hypot(far.kx,far.ky));}
      const dn=(near.x-n0[0])*ux+(near.y-n0[1])*uy,df=(far.x-f0[0])*ux+(far.y-f0[1])*uy,kn=near.kx*ux+near.ky*uy,kf=far.kx*ux+far.ky*uy;
      ok(dn>df+1&&kn>kf+5,'bump did not favour pushing the ramp-side tank ('+[ux,uy,swap,dn.toFixed(1),df.toFixed(1),kn.toFixed(0),kf.toFixed(0)]+')');bumpCases++;
    }
    out.bumpPeak=Math.round(bumpPeak);
    // ---- C. shells hit harder than bumps
    o.startGame();{const T=o.tanks,tg=T[2],sh=T[1];T[0].x=CX-HX+40;T[0].y=CY+HY-30;T[3].x=CX+HX-40;T[3].y=CY-HY+30;sh.x=CX-120;sh.y=CY+60;tg.x=CX;tg.y=CY;tg.kx=tg.ky=0;
      o.shells.push({x:CX-20,y:CY,vx:340,vy:0,owner:T[0],life:1});let peak=0;for(let i=0;i<4;i++){o.step(1/60);peak=Math.max(peak,Math.hypot(tg.kx,tg.ky));}
      out.shellPeak=Math.round(peak);ok(peak>bumpPeak*2.5,'shell knockback '+peak.toFixed(0)+' is not clearly above bump '+bumpPeak.toFixed(0));}
    // ---- D. player falling = loss; last on pad = win
    o.startGame();o.tanks[0].x=CX;o.tanks[0].y=CY+HY+85;for(let i=0;i<150;i++)o.step(1/60);
    out.loss={state:o.state,won:o.playerWon,title:document.querySelector('#endTitle').textContent,shown:!document.querySelector('#end').classList.contains('hidden')};
    ok(o.state==='over'&&o.playerWon===false&&out.loss.shown&&out.loss.title==='Down the ramp','player falling is not a loss');
    o.startGame();for(let i=1;i<4;i++){o.tanks[i].x=CX+HX+85;o.tanks[i].y=CY;}for(let i=0;i<150;i++)o.step(1/60);
    out.win={state:o.state,won:o.playerWon,title:document.querySelector('#endTitle').textContent};
    ok(o.state==='over'&&o.playerWon===true&&out.win.title==='Pad is yours','last tank on pad is not a win');
    return out;
  },RUNS);
  console.log(JSON.stringify({camp:r.camp,stat:r.stat,aiVsAi:r.aiVsAi,bumpPeak:r.bumpPeak,shellPeak:r.shellPeak,loss:r.loss,win:r.win},null,1));
  console.log(errs.length?'PAGE ERRORS '+errs:'',r.fails.length?'FAIL\n'+r.fails.join('\n'):'behaviour ok');
  await b.close();
})();
