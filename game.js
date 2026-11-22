/* Dead Air Over Lucent controls, mission state and interface. */
'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const ui = Object.fromEntries([
    'world','rain','map','hud','menu','menu-title','menu-copy','menu-kicker','menu-help','primary','secondary','pause','sound',
    'objective-title','objective-note','mission-tag','progress','direction','speed-value','gear','meter-fill','district','distance','notice','error',
    'tuner','tuner-title','tuner-copy','dial','frequency','signal','signal-label','lock','tune-down','tune-up','quality'
  ].map(id=>[id,byId(id)]));
  let city;
  try {
    city = window.makeCity(ui.world);
  } catch (error) {
    ui.error.textContent='The 3D city could not start. Open Dead Air Over Lucent in a browser with hardware acceleration and WebGL enabled.';
    ui.error.hidden=false;ui.primary.disabled=true;ui.secondary.disabled=true;
    console.error(error);
    return;
  }

  const missions=[
    {x:4,z:53,hz:89.3,title:'Find the ferry dispatcher',note:'Drive into the cyan beacon at the Night Market.',station:'Night Market dispatch',message:'Dispatch has a head count. Tune in and relay it to the ferry.',receipt:'Dispatch · Twenty-three passengers aboard.'},
    {x:4,z:-47,hz:92.7,title:'Recover the channel markers',note:'Continue straight to Signal Row and enter the beacon.',station:'Signal Row weather station',message:'The old channel is underwater. Lock the signal to recover the safe approach.',receipt:'Weather station · East channel is clear.'},
    {x:84,z:-84,hz:90.4,via:{x:4,z:-84},title:'Open the harbour relay',note:'Turn right at the junction and follow the beacon to the tower.',station:'Harbour relay',message:'Find the ferry captain’s signal to upload the safe approach.',receipt:'Ferry captain · East channel confirmed. We’re coming in.'}
  ];
  const spawn={x:4,z:138,heading:0};
  const state={...spawn,speed:0,vx:0,vz:0,steer:0,view:'menu',mode:'mission',stage:0,elapsed:0,hitAge:0};
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
    state.speed=state.vx=state.vz=state.steer=0;
    city.draw(state,0,menuTime,objective(),true);
  }
  function label(title,kicker,copy,primary,secondary,compact=false) {
    if(compact) ui['menu-title'].textContent=title;
    else ui['menu-title'].innerHTML='DEAD AIR <span>OVER LUCENT</span>';
    ui['menu-title'].classList.toggle('compact',compact);
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
    city.setQuality(graphics);
    const mode=graphics==='low'?'Low':graphics==='high'?'High':'Medium';
    ui.quality.textContent=mode;
    ui.quality.setAttribute('aria-label','Graphics quality: '+mode+'. Change graphics quality.');
  }
  setQuality();
  ui.quality.addEventListener('click',()=>{
    graphics=modes[(modes.indexOf(graphics)+1)%modes.length];
    setQuality();
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
  let rainW=0,rainH=0,particles=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function resize() {
    city.resize();
    rainW=ui.rain.width=innerWidth;rainH=ui.rain.height=innerHeight;
    particles=Array.from({length:Math.min(170,Math.floor(rainW/8))},()=>({
      x:Math.random()*rainW,y:Math.random()*rainH,s:200+Math.random()*650,l:8+Math.random()*27
    }));
  }
  function drawRain(dt) {
    rain.clearRect(0,0,rainW,rainH);
    if(reduced.matches)return;
    rain.strokeStyle=state.view==='drive'?'#b0b7f759':'#b0b7f73c';rain.lineWidth=.68;
    rain.beginPath();
    for(const drop of particles){
      drop.y+=drop.s*dt;drop.x-=drop.s*.25*dt;
      if(drop.y>rainH+30||drop.x<-30){drop.y=-30;drop.x=Math.random()*(rainW+140);}
      rain.moveTo(drop.x,drop.y);rain.lineTo(drop.x-drop.l*.25,drop.y+drop.l);
    }
    rain.stroke();
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
      state.x=nx;state.z=nz;
    }
    const goal=objective();
    if(!goal)return;
    if(goal.via&&gap(state,goal.via)<15)viaReached=true;
    if(gap(state,goal)<8.7)openTuner(goal);
  }
  let last=performance.now();
  let mapAge=0;
  function frame(now) {
    const dt=clamp((now-last)/1000,0,.05);
    last=now;menuTime+=dt;mapAge+=dt;
    const playing=state.view==='drive';
    if(state.view==='tune'&&!document.hidden)state.elapsed+=dt;
    if(playing||state.view==='menu')city.updateTraffic(dt);
    if(playing)drive(dt);
    const goal=objective();
    city.draw(state,dt,menuTime,playing?goal:null);
    drawRain(dt);radio.update(state.view,Math.abs(state.speed),signalLevel,active('handbrake'));
    if(playing&&mapAge>.065){updateHud(goal);mapAge=0;}
    if(noticeUntil&&menuTime>noticeUntil){ui.notice.textContent='';noticeUntil=0;}
    requestAnimationFrame(frame);
  }
  addEventListener('resize',resize);
  resize();
  city.draw(state,0,0,null,true);
  requestAnimationFrame(frame);
})();