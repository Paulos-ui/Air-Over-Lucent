/* Dead Air Over Lucent controls, mission state and interface. */
'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const ui = Object.fromEntries([
    'world','rain','map','hud','menu','menu-title','menu-copy','menu-kicker','menu-help','primary','secondary','pause','sound',
    'objective-title','objective-note','mission-tag','progress','direction','speed-value','gear','meter-fill','district','distance','notice','error',
    'tuner','tuner-title','tuner-copy','dial','frequency','signal','signal-label','lock','tune-down','tune-up','quality'
  ].map(id=>[id,byId(id)]));
  let city, rendererMode;
  const physicsStep=1/60;
  const maxFrame=7*physicsStep;
  const budgetSteps=[.65,.78,.9,1];
  let lagLevel=budgetSteps.length-1;
  let samples=0,slowSamples=0,totalFrame=0,totalCpu=0,coolWindows=0,spikes=0;
  function resetBudget(){
    lagLevel=budgetSteps.length-1;
    samples=slowSamples=totalFrame=totalCpu=coolWindows=spikes=0;
  }
  function adjustBudget(frameMs,cpuMs){
    if(frameMs<5)return;
    spikes=cpuMs>85?spikes+1:0;
    if(spikes>=2&&lagLevel>0){
      lagLevel--;coolWindows=spikes=0;
      samples=slowSamples=totalFrame=totalCpu=0;
      city.setBudget?.(budgetSteps[lagLevel]);
      return;
    }
    frameMs=Math.min(frameMs,140);
    samples++;
    totalFrame+=frameMs;totalCpu+=cpuMs;
    if(frameMs>29||cpuMs>19)slowSamples++;
    if(totalFrame<800)return;
    const meanFrame=totalFrame/samples,meanCpu=totalCpu/samples;
    const overloaded=meanFrame>38||meanCpu>23||(slowSamples/samples>.42&&meanCpu>13);
    if(overloaded&&lagLevel>0){
      lagLevel--;coolWindows=0;city.setBudget?.(budgetSteps[lagLevel]);
    }else if(!overloaded&&meanFrame<21&&meanCpu<11){
      if(++coolWindows>=5&&lagLevel<budgetSteps.length-1){
        lagLevel++;coolWindows=0;city.setBudget?.(budgetSteps[lagLevel]);
      }
    }else coolWindows=0;
    samples=slowSamples=totalFrame=totalCpu=0;
  }

  const missions=[
    {x:4,z:53,hz:89.3,title:'Find the ferry dispatcher',note:'Drive into the cyan beacon at the Night Market.',station:'Night Market dispatch',message:'Dispatch has a head count. Tune in and relay it to the ferry.',receipt:'Dispatch · Twenty-three passengers aboard.'},
    {x:4,z:-47,hz:92.7,title:'Recover the channel markers',note:'Continue straight to Signal Row and enter the beacon.',station:'Signal Row weather station',message:'The old channel is underwater. Lock the signal to recover the safe approach.',receipt:'Weather station · East channel is clear.'},
    {x:84,z:-84,hz:90.4,via:{x:4,z:-84},title:'Open the harbour relay',note:'Turn right at the junction and follow the beacon to the tower.',station:'Harbour relay',message:'Find the ferry captain’s signal to upload the safe approach.',receipt:'Ferry captain · East channel confirmed. We’re coming in.'}
  ];
  const spawn={x:4,z:138,heading:0};
  const state={...spawn,speed:0,vx:0,vz:0,steer:0,suspension:0,wheelAngle:0,brake:false,view:'menu',mode:'mission',stage:0,elapsed:0,hitAge:0};
  let viaReached=false,noticeUntil=0,menuTime=0;
  const held=new Set();
  const keyMap=new Map([
    ['KeyW','forward'],['ArrowUp','forward'],['KeyS','back'],['ArrowDown','back'],
    ['KeyA','left'],['ArrowLeft','left'],['KeyD','right'],['ArrowRight','right'],['Space','handbrake']
  ]);
  const pointers=new Map();
  const pressed=new Set();
  const active=action=>pressed.has(action);
  function syncControls() {
    pressed.clear();
    for(const key of held)pressed.add(keyMap.get(key));
    for(const action of pointers.values())pressed.add(action);
  }
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const objective=()=>state.mode==='mission' ? missions[state.stage] : undefined;
  function guidance() {
    const goal=objective();
    return goal?.via&&!viaReached ? goal.via : goal;
  }
  function renderObjective() {
    const goal=objective();
    ui['mission-tag'].textContent=goal?'EMERGENCY BROADCAST':'FREE DRIVE';
    ui['objective-title'].textContent=goal?.title??'Explore Lucent Bay';
    ui['objective-note'].textContent=goal?.note??'The city is yours for the night.';
    ui.progress.hidden=!goal;
    for (const [i,bar] of Array.from(ui.progress.children).entries()) bar.classList.toggle('on',i<=state.stage);
    ui.direction.hidden=!goal;
  }
  function resetCar(home=false) {
    if(home) Object.assign(state,spawn);
    else {
      const gx=Math.round(state.x/city.block)*city.block,gz=Math.round(state.z/city.block)*city.block;
      const alongZ=Math.abs(state.x-gx)<Math.abs(state.z-gz);
      if(alongZ) {
        state.heading=Math.cos(state.heading)>=0?0:Math.PI;
        state.x=gx+4;
      } else {
        state.heading=Math.sin(state.heading)>=0?Math.PI/2:-Math.PI/2;
        state.z=gz+4;
      }
      state.x=clamp(state.x,-339,339);state.z=clamp(state.z,-339,339);
    }
    state.speed=state.vx=state.vz=state.steer=state.suspension=state.wheelAngle=0;
    state.brake=false;
    city.draw(state,0,menuTime,objective(),true);
  }
  function label(title,kicker,copy,primary,secondary,compact=false) {
    if(compact) ui['menu-title'].textContent=title;
    else ui['menu-title'].innerHTML='DEAD AIR <span>OVER LUCENT</span>';
    ui['menu-title'].classList.toggle('compact',compact);
    byId('driver').hidden=compact;
    ui['menu-kicker'].textContent=kicker;
    ui['menu-copy'].textContent=copy;
    ui.primary.textContent=primary;ui.secondary.textContent=secondary;
    ui['menu-help'].hidden=compact;
  }
  function toggleButtons() {
    const playing=state.view==='drive';
    const tuning=state.view==='tune';
    ui.hud.hidden=!playing;ui.menu.hidden=playing||tuning;ui.pause.hidden=!playing;
    ui.tuner.hidden=!tuning;
    document.querySelector('.top').inert=tuning;
  }
  function clearInputs() {
    held.clear();pointers.clear();syncControls();
    document.querySelectorAll('.touch .active').forEach(button=>button.classList.remove('active'));
  }
  function launch(mode) {
    state.mode=mode;state.stage=0;state.elapsed=0;state.view='drive';state.hitAge=0;
    viaReached=false;noticeUntil=0;ui.notice.textContent='';
    clearInputs();toggleButtons();renderObjective();resetCar(true);
    if(soundOn) radio.enable(true);
    ui.primary.blur();ui.secondary.blur();
  }
  function pause() {
    if(state.view!=='drive')return;
    state.view='pause';clearInputs();toggleButtons();
    label('PAUSED','DEAD AIR OVER LUCENT',state.mode==='mission'?'The rescue is on hold.':'Lucent Bay will be here when you get back.','Resume drive','Restart',true);
    ui.primary.focus();
  }
  function resume() {
    if(state.view!=='pause')return;
    state.view='drive';toggleButtons();ui.primary.blur();
  }
  function fmt(seconds) {
    const total=Math.floor(seconds);
    return Math.floor(total/60)+':'+String(total%60).padStart(2,'0');
  }
  function finish() {
    state.view='finish';state.speed=state.vx=state.vz=0;
    clearInputs();toggleButtons();
    let best=state.elapsed;
    try {
      const saved=Number(localStorage.getItem('lucent-rescue-best-v1'));
      if(saved>0) best=Math.min(saved,best);
      localStorage.setItem('lucent-rescue-best-v1',String(best));
    } catch (_) { /* Storage can be unavailable in a private browser. */ }
    label('FERRY HOME','RESCUE COMPLETE','Twenty-three passengers reached the harbour. The captain followed the route you broadcast. Rescue time '+fmt(state.elapsed)+' · Best '+fmt(best)+'.','Play again','Free drive',true);
    ui.primary.focus();
  }
  ui.primary.addEventListener('click',()=>state.view==='pause'?resume():launch('mission'));
  ui.secondary.addEventListener('click',()=>launch(state.view==='pause'?state.mode:'free'));
  ui.pause.addEventListener('click',pause);
  byId('recover').addEventListener('click',()=>{if(state.view==='drive'){clearInputs();resetCar();announce('Car reset');}});
  function announce(message) {
    ui.notice.textContent=message;noticeUntil=menuTime+2.2;
  }
  addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.code==='Escape'&&!event.repeat) {
      if(state.view==='drive')pause();
      else if(state.view==='pause')resume();
      return;
    }
    if(state.view!=='drive')return;
    if(keyMap.has(event.code)) {
      event.preventDefault();held.add(event.code);syncControls();
    }
    if(event.code==='KeyR'&&!event.repeat){resetCar();announce('Car reset');}
  });
  addEventListener('keyup',event=>{held.delete(event.code);syncControls();});
  addEventListener('blur',clearInputs);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&state.view==='drive') pause();
    if(document.hidden) radio.enable(false);
    else if(soundOn) radio.enable(true);
  });
  document.querySelectorAll('.touch button').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId,button.dataset.key);syncControls();button.classList.add('active');
    });
    for(const kind of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(kind,event=>{
      pointers.delete(event.pointerId);syncControls();button.classList.remove('active');
    });
  });

  const radio=window.createLucentAudio();
  let soundOn=false, signalLevel=0;
  const compactControls=matchMedia('(pointer: coarse), (max-width: 670px)');
  const modes=['low','balanced','high'];
  let graphics=compactControls.matches?'low':'balanced';
  try {
    const saved=localStorage.getItem('lucent-graphics-v1');
    if(modes.includes(saved))graphics=saved;
  } catch (_) { /* Private browsers may disable storage. */ }
  function setQuality() {
    resetBudget();
    city.setQuality(graphics);
    const mode=graphics==='low'?'Low':graphics==='high'?'High':'Medium';
    ui.quality.textContent=rendererMode==='canvas'?'Compat '+mode:mode;
    ui.quality.setAttribute('aria-label',(rendererMode==='canvas'?'Compatibility graphics: ':'Graphics quality: ')+mode+'. Change graphics quality.');
  }
  function openCity(useCanvas) {
    ui.world.textContent='';
    rendererMode=useCanvas?'canvas':'webgl';
    city=useCanvas?window.makeCompatibilityCity(ui.world):window.makeCity(ui.world);
    ui.world.dataset.renderer=rendererMode;
    setQuality();
    const canvas=ui.world.querySelector('canvas');
    if(!useCanvas&&canvas){
      canvas.addEventListener('webglcontextlost',()=>{
        if(rendererMode==='webgl'&&ui.world.querySelector('canvas')===canvas)activateCompatibility();
      },{once:true});
    }
    city.draw(state,0,menuTime,objective(),true);
  }
  function showRendererError(error) {
    console.error('Game renderer failed',error);
    city=null;
    ui.error.textContent='The game could not start either renderer. Reload this page or try another browser.';
    ui.error.hidden=false;ui.primary.disabled=true;ui.secondary.disabled=true;
  }
  function activateCompatibility(reason) {
    if(reason)console.warn('Switching to compatibility graphics',reason);
    try {
      openCity(true);
      if(state.view==='drive'&&city.blocked(state.x,state.z))resetCar();
      if(state.view==='drive')announce('Compatibility graphics active');
      return true;
    } catch(error) {
      showRendererError(error);
      return false;
    }
  }
  let preferCompatibility=false;
  try { preferCompatibility=localStorage.getItem('lucent-renderer-v2')==='canvas'; } catch (_) {}
  if(preferCompatibility){
    if(!activateCompatibility())return;
  }else{
    try { openCity(false); }
    catch(error){if(!activateCompatibility(error))return;}
  }
  ui.quality.addEventListener('click',()=>{
    if(!city)return;
    if(rendererMode==='webgl'&&graphics==='high'){
      graphics='balanced';
      if(activateCompatibility()){
        preferCompatibility=true;
        try {localStorage.setItem('lucent-renderer-v2','canvas');}catch(_){}
      }
    }else if(rendererMode==='canvas'&&graphics==='high'&&preferCompatibility){
      graphics='balanced';
      try {
        openCity(false);
        preferCompatibility=false;
        try {localStorage.removeItem('lucent-renderer-v2');}catch(_){}
      } catch(error) {
        if(!activateCompatibility(error))return;
      }
    }else{
      graphics=modes[(modes.indexOf(graphics)+1)%modes.length];
      try {setQuality();}
      catch(error){if(!activateCompatibility(error))return;}
    }
    try { localStorage.setItem('lucent-graphics-v1',graphics); } catch (_) {}
  });
  ui.sound.addEventListener('click',()=>{
    soundOn=radio.enable(!soundOn);
    ui.sound.setAttribute('aria-pressed',String(soundOn));
    ui.sound.textContent=soundOn?'Sound on':'Sound off';
  });
  function updateTuner() {
    const station=objective();
    if(state.view!=='tune'||!station)return;
    const tuned=Number(ui.dial.value), error=Math.abs(tuned-station.hz);
    signalLevel=Math.max(0,1-error/1.5);
    ui.frequency.textContent=tuned.toFixed(1)+' MHz';
    ui.signal.value=Math.round(signalLevel*100);
    ui['signal-label'].textContent=error<.16?'Locked':error<.49?'Strong':error<.95?'Fair':'Weak';
    ui.lock.disabled=error>=.16;
    ui.lock.setAttribute('aria-disabled',String(ui.lock.disabled));
  }
  function openTuner(station) {
    state.view='tune';state.speed=state.vx=state.vz=state.steer=0;
    clearInputs();toggleButtons();ui.notice.textContent='';
    ui['tuner-title'].textContent=station.station;
    ui['tuner-copy'].textContent=station.message+' Move the dial until the meter reads Locked.';
    ui.dial.value='91.0';updateTuner();ui.dial.focus({preventScroll:true});
    radio.cue(294);
  }
  ui.dial.addEventListener('input',updateTuner);
  ui['tune-down'].addEventListener('click',()=>{ui.dial.stepDown();updateTuner();});
  ui['tune-up'].addEventListener('click',()=>{ui.dial.stepUp();updateTuner();});
  ui.lock.addEventListener('click',()=>{
    const station=objective();
    if(state.view!=='tune'||!station||ui.lock.disabled)return;
    radio.cue(state.stage===missions.length-1?523:392);
    state.stage++;
    announce(station.receipt);
    if(state.stage===missions.length){finish();return;}
    state.view='drive';toggleButtons();renderObjective();
  });

  const map=ui.map.getContext('2d'), rain=ui.rain.getContext('2d');
  let rainW=0,rainH=0,rainClock=0,particles=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function resize(){
    city.resize();
    rainW=Math.max(1,innerWidth);rainH=Math.max(1,innerHeight);
    const scale=Math.min(1,Math.sqrt(790_000/(rainW*rainH)));
    ui.rain.width=Math.round(rainW*scale);ui.rain.height=Math.round(rainH*scale);
    rain.setTransform(scale,0,0,scale,0,0);
    particles=Array.from({length:Math.min(154,Math.floor(rainW/8))},(_,i)=>({
      x:Math.random()*rainW,y:Math.random()*rainH,near:i%3===0,
      speed:210+Math.random()*650,length:8+Math.random()*26,
    }));
  }
  function drawRain(dt){
    if(reduced.matches){rain.clearRect(0,0,rainW,rainH);return;}
    rainClock+=dt;
    const constrained=lagLevel<2;
    if(constrained&&rainClock<1/32)return;
    const wind=.23+.057*state.steer;
    const elapsed=rainClock;rainClock=0;
    rain.clearRect(0,0,rainW,rainH);
    for(const near of [false,true]){
      rain.strokeStyle=near?'#c9e4ea57':'#bcd1e230';
      rain.lineWidth=near?.94:.53;
      rain.beginPath();
      for(const [index,drop] of particles.entries()){
        if(drop.near!==near||(constrained&&index%4===0))continue;
        const travel=drop.speed*elapsed;
        drop.y+=travel;drop.x-=travel*wind;
        if(drop.y>rainH+34||drop.x<-34){drop.y=-34;drop.x=Math.random()*(rainW+153);}
        const length=drop.length*(near?1.14:.59);
        rain.moveTo(drop.x,drop.y);
        rain.lineTo(drop.x-length*wind,drop.y+length);
      }
      rain.stroke();
    }
  }
  function districtName() {
    if(state.x>60&&state.z<10)return 'RELAY HILL';
    if(state.z<5)return 'SIGNAL ROW';
    if(state.z<86)return 'NIGHT MARKET';
    if(state.x< -65)return 'FERRY WARD';
    return 'LOWER QUAY';
  }
  function drawMap(goal) {
    const {width:w,height:h}=ui.map,scale=1.35;
    const project=(x,z)=>[w/2+(x-state.x)*scale,h/2+(z-state.z)*scale];
    map.fillStyle='#10101f';map.fillRect(0,0,w,h);
    const road=26*scale;
    map.fillStyle='#2f3049';
    for(let i=-4;i<=4;i++){
      const [x,z]=project(i*city.block,i*city.block);
      map.fillRect(x-road/2,0,road,h);map.fillRect(0,z-road/2,w,road);
    }
    map.strokeStyle='#434260';map.lineWidth=1;
    for(let i=-4;i<4;i++)for(let j=-4;j<4;j++){
      const [x,z]=project(i*city.block+15,j*city.block+15);
      map.strokeRect(x,z,54*scale,54*scale);
    }
    if(goal){
      const points=goal.via&&!viaReached?[goal.via,goal]:[goal];
      map.strokeStyle='#6bdfd69b';map.lineWidth=2.5;map.setLineDash([6,6]);
      map.beginPath();map.moveTo(w/2,h/2);
      for(const point of points)map.lineTo(...project(point.x,point.z));
      map.stroke();map.setLineDash([]);
      let [x,z]=project(goal.x,goal.z);
      x=clamp(x,13,w-13);z=clamp(z,13,h-13);
      map.fillStyle='#79fff4';map.save();map.translate(x,z);map.rotate(Math.PI/4);
      map.fillRect(-5,-5,10,10);map.restore();
    }
    map.save();map.translate(w/2,h/2);map.rotate(state.heading);
    map.beginPath();map.moveTo(0,-11);map.lineTo(7,8);map.lineTo(0,4);map.lineTo(-7,8);
    map.closePath();map.fillStyle='#fff7fc';map.fill();map.restore();
    ui.district.textContent=districtName();
    ui.distance.textContent=goal?Math.round(gap(state,goal))+' m':'';
  }
  function updateHud(goal) {
    const kph=Math.round(Math.abs(state.speed)*3.6);
    ui['speed-value'].textContent=String(kph).padStart(3,'0');
    ui.gear.textContent=state.speed<-.4?'R':state.speed>.4?'D':'N';
    ui['meter-fill'].style.width=Math.min(100,kph/1.94)+'%';
    if(goal){
      const target=guidance();
      const relative=Math.atan2(target.x-state.x,state.z-target.z)-state.heading;
      const angle=Math.atan2(Math.sin(relative),Math.cos(relative));
      ui.direction.firstElementChild.textContent=Math.abs(angle)>2.34?'↶':angle>.55?'▶':angle<-.55?'◀':'◆';
      ui.direction.lastElementChild.textContent=Math.round(gap(state,target))+' m';
    }
    drawMap(goal);
  }

  function drive(dt) {
    state.elapsed+=dt;
    state.hitAge=Math.max(0,state.hitAge-dt);
    const throttle=active('forward'),braking=active('back'),drift=active('handbrake');
    state.brake=(braking&&state.speed>.28)||drift;
    const pitch=state.brake?-.066:throttle?.035:0;
    state.suspension+=(pitch-state.suspension)*(1-Math.exp(-dt*8));
    const turn=Number(active('right'))-Number(active('left'));
    state.steer+=(turn-state.steer)*(1-Math.exp(-dt*13));
    if(throttle)state.speed+=dt*(state.speed<0?30:17-Math.max(0,state.speed)*.24);
    if(braking)state.speed-=dt*(state.speed>0?30:12);
    if(!throttle&&!braking)state.speed*=Math.exp(-dt*1.22);
    if(drift)state.speed*=Math.exp(-dt*(turn?.68:1.55));
    state.speed=clamp(state.speed,-10,compactControls.matches?35:45);
    if(Math.abs(state.speed)<.08&&!throttle&&!braking)state.speed=0;
    const rolling=Math.min(1,Math.abs(state.speed)/6);
    const steering=(drift?2.8:1.94)/(1+Math.abs(state.speed)*.014);
    state.heading+=state.steer*steering*rolling*Math.sign(state.speed)*dt;
    state.heading=Math.atan2(Math.sin(state.heading),Math.cos(state.heading));
    const traction=1-Math.exp(-dt*(drift&&turn?2.35:12));
    state.vx+=(Math.sin(state.heading)*state.speed-state.vx)*traction;
    state.vz+=(-Math.cos(state.heading)*state.speed-state.vz)*traction;
    const nx=state.x+state.vx*dt,nz=state.z+state.vz*dt;
    if(city.blocked(nx,nz) || (state.hitAge===0&&city.trafficCollision(nx,nz))) {
      state.speed*=-.25;state.vx=state.vz=0;state.hitAge=.45;
    } else {
      const distance=Math.hypot(nx-state.x,nz-state.z)*Math.sign(state.speed);
      state.wheelAngle=(state.wheelAngle+distance/window.lucentMotion.radius)%(Math.PI*2);
      state.x=nx;state.z=nz;
    }
    const goal=objective();
    if(!goal)return;
    if(goal.via&&gap(state,goal.via)<15)viaReached=true;
    if(gap(state,goal)<8.7)openTuner(goal);
  }
  let last=performance.now();
  let mapAge=0,physicsDebt=0;
  function frame(now) {
    if(!city)return;
    const frameMs=Math.max(0,now-last);
    const dt=clamp(frameMs/1000,0,maxFrame);
    last=now;menuTime+=dt;mapAge+=dt;
    if(state.view==='tune'&&!document.hidden)state.elapsed+=dt;
    if(state.view==='drive'){
      physicsDebt=Math.min(maxFrame,physicsDebt+dt);
      while(physicsDebt+1e-8>=physicsStep&&state.view==='drive'){
        city.updateTraffic(physicsStep);
        drive(physicsStep);
        physicsDebt-=physicsStep;
      }
    }else{
      physicsDebt=0;
      if(state.view==='menu')city.updateTraffic(dt);
    }
    const playing=state.view==='drive';
    const drawStart=performance.now();
    try {
      city.draw(state,dt,menuTime,playing?objective():null);
    } catch(error) {
      if(rendererMode==='canvas'){showRendererError(error);return;}
      if(!activateCompatibility(error))return;
    }
    drawRain(dt);
    if((playing||state.view==='menu')&&!document.hidden)adjustBudget(frameMs,performance.now()-drawStart);
    radio.update(state.view,Math.abs(state.speed),signalLevel,active('handbrake'));
    if(playing&&mapAge>.065){updateHud(objective());mapAge=0;}
    if(noticeUntil&&menuTime>noticeUntil){ui.notice.textContent='';noticeUntil=0;}
    requestAnimationFrame(frame);
  }
  addEventListener('resize',resize);
  resize();
  requestAnimationFrame(frame);
})();