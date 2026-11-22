/* Original generative score and vehicle sound for Dead Air Over Lucent. */
'use strict';

window.createLucentAudio = function createLucentAudio() {
  let context, master, music, weather, staticGain, engineGain, engine, engineTone, noise;
  let nextBeat=0, step=0, enabled=false;
  const chords=[[38,50,53,57,64],[34,46,50,53,60],[41,53,57,60,67],[36,48,52,55,62]];
  const pattern=[2,3,-1,4,3,-1,1,-1,2,-1,3,4,-1,2,1,-1];
  const hertz=midi=>440*2**((midi-69)/12);

  function gain(level,destination) {
    const stage=context.createGain();
    stage.gain.value=level;
    stage.connect(destination);
    return stage;
  }
  function filter(type, frequency, destination) {
    const node=context.createBiquadFilter();
    node.type=type;
    node.frequency.value=frequency;
    node.connect(destination);
    return node;
  }
  function whiteNoise() {
    const audio=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const samples=audio.getChannelData(0);
    for(let i=0;i<samples.length;i++) samples[i]=Math.random()*2-1;
    return audio;
  }
  function loopNoise(destination) {
    const source=context.createBufferSource();
    source.buffer=noise;
    source.loop=true;
    source.connect(destination);
    source.start();
  }
  function voice(type, from, to, t, duration, peak, destination, attack=.015) {
    const shape=context.createOscillator();
    const envelope=gain(.0001,destination);
    shape.type=type;
    shape.frequency.setValueAtTime(from,t);
    shape.frequency.exponentialRampToValueAtTime(to,t+duration*.75);
    envelope.gain.setValueAtTime(.0001,t);
    envelope.gain.exponentialRampToValueAtTime(peak,t+attack);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);
    shape.connect(envelope);
    shape.start(t);
    shape.stop(t+duration+.04);
    shape.onended=()=>{shape.disconnect();envelope.disconnect();};
  }
  function setup() {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return false;
    context=new Audio();
    const limiter=context.createDynamicsCompressor();
    limiter.threshold.value=-13;
    limiter.ratio.value=5;
    limiter.connect(context.destination);
    master=gain(0,limiter);
    const score=gain(.67,master);
    music=gain(0,score);
    const echo=context.createDelay(.6);
    echo.delayTime.value=.352;
    echo.connect(gain(.21,score));
    music.connect(echo);
    noise=whiteNoise();
    weather=gain(0,master);
    loopNoise(filter('bandpass',600,weather));
    staticGain=gain(0,master);
    loopNoise(filter('highpass',1550,staticGain));
    engineGain=gain(0,master);
    const engineFilter=filter('lowpass',235,engineGain);
    engine=context.createOscillator();engine.type='triangle';engine.connect(engineFilter);engine.start();
    engineTone=context.createOscillator();engineTone.type='sawtooth';engineTone.connect(gain(.27,engineFilter));engineTone.start();
    nextBeat=context.currentTime+.08;
    return true;
  }
  function enable(on) {
    if(on&&!context&&!setup()) return false;
    enabled=on;
    if(!context)return false;
    if(on)context.resume().catch(()=>{});
    master.gain.setTargetAtTime(on?.66:0,context.currentTime,.09);
    return enabled;
  }
  function beat(t) {
    const s=step%16;
    const chord=chords[Math.floor(step/16)%chords.length];
    if(s===0){
      for(const key of chord.slice(1)){
        const hz=hertz(key);
        voice('sine',hz,hz,t,3.35,.033,music,.27);
        voice('triangle',hz*.998,hz*.998,t,2.9,.012,music,.36);
      }
    }
    if([0,6,8,13].includes(s)){
      voice('sine',106,41,t,.32,.17,music,.009);
      const hz=hertz(chord[0]+(s===13?12:0));
      voice('triangle',hz,hz,t,.55,.089,music,.035);
    }
    if(pattern[s]>=0){
      const hz=hertz(chord[pattern[s]]+12);
      voice('triangle',hz,hz,t,.42,s===0?.054:.035,music,.008);
      voice('sine',hz*2,hz*2,t,.18,.014,music);
    }
    if(s%2===0){
      const tick=context.createBufferSource();
      const level=gain(.0001,music);
      const high=filter('highpass',s%4?6500:4400,level);
      tick.buffer=noise;tick.connect(high);
      level.gain.setValueAtTime(s%4?.024:.038,t);
      level.gain.exponentialRampToValueAtTime(.0001,t+.08);
      tick.start(t,(s*.112)%1.6,.085);
      tick.onended=()=>{tick.disconnect();high.disconnect();level.disconnect();};
    }
    step++;
  }
  function update(view,speed,tuning,drifting) {
    if(!context)return;
    const t=context.currentTime,driving=view==='drive';
    if(enabled&&document.visibilityState!=='hidden'){
      if(nextBeat<t-.25)nextBeat=t+.05;
      while(nextBeat<t+.18){
        beat(nextBeat);
        nextBeat+=.176;
      }
    }
    engine.frequency.setTargetAtTime(37+speed*2.05,t,.11);
    engineTone.frequency.setTargetAtTime(73+speed*4.12,t,.1);
    engineGain.gain.setTargetAtTime(driving?.041+speed*.0012:0,t,.13);
    music.gain.setTargetAtTime(view==='tune'?.37:view==='pause'?.24:.88,t,.21);
    weather.gain.setTargetAtTime(driving?.029+speed*.0011+(drifting?.038:0):.024,t,.23);
    staticGain.gain.setTargetAtTime(view==='tune'?.018+(1-tuning)*.1:0,t,.07);
  }
  function cue(frequency=440) {
    if(!enabled||!context)return;
    const now=context.currentTime;
    [1,1.25,1.5].forEach((ratio,i)=>{
      voice('sine',frequency*ratio,frequency*ratio,now+i*.11,.5,.1,master,.035);
    });
  }
  return {enable,update,cue};
};
