/* Original procedural city and vehicle assets for Dead Air Over Lucent. */
'use strict';
window.makeCity = function makeCity(container) {
  const T = window.THREE;
  const images=window.lucentVisuals;
  const streets=window.lucentStreets;
  const models=window.lucentMotion;
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x72757e, 0.00285);
  const camera = new T.PerspectiveCamera(58, 1, .1, 1250);
  const renderer = new T.WebGLRenderer({alpha:true, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  scene.add(new T.HemisphereLight(0xb0cbdd, 0x58505a, 1.55));
  const sunrise = new T.DirectionalLight(0xffba88, 2.8);
  sunrise.position.set(155,58,-510);
  scene.add(sunrise,sunrise.target);
  sunrise.castShadow=true;
  sunrise.shadow.mapSize.set(1536,1536);
  Object.assign(sunrise.shadow.camera,{left:-59,right:59,top:59,bottom:-59,near:2,far:285});
  sunrise.shadow.camera.updateProjectionMatrix();
  sunrise.shadow.normalBias=.11;
  if(renderer.shadowMap)renderer.shadowMap.type=T.PCFSoftShadowMap;
  const fill = new T.DirectionalLight(0x87bde9, 1.2);
  fill.position.set(-90,30,110);
  scene.add(fill);

  let seed = 90217;
  function random() {
    seed = Math.imul(seed,1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  }
  function material(color, extra={}) { return new T.MeshStandardMaterial({color,roughness:.72,...extra}); }
  function flat(color) { return new T.MeshBasicMaterial({color}); }
  const unitBox = new T.BoxGeometry(1,1,1);
  const staticBoxes = new Map();
  let batchBoxes = true;
  function box(parent, mat, x,y,z,w,h,d) {
    if(batchBoxes && parent===scene) {
      if(!staticBoxes.has(mat))staticBoxes.set(mat,[]);
      staticBoxes.get(mat).push([x,y,z,w,h,d]);
      return;
    }
    const mesh = new T.Mesh(unitBox,mat);
    mesh.position.set(x,y,z);
    mesh.scale.set(w,h,d);
    parent.add(mesh);
    return mesh;
  }
  function texture(w,h,draw) {
    const canvas = document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    draw(canvas.getContext('2d'),w,h);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return map;
  }
  function applyPhoto(map,name,opacity=1,blend='source-over'){
    images?.onReady(name,photo=>{
      const canvas=map.image, context=canvas.getContext('2d');
      context.save();
      context.globalAlpha=opacity;
      context.globalCompositeOperation=blend;
      context.drawImage(photo,0,0,canvas.width,canvas.height);
      context.restore();
      map.needsUpdate=true;
    });
  }
  const environment = texture(512,256,(c,w,h)=>{
    const sky=c.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#102333'); sky.addColorStop(.39,'#3d5969'); sky.addColorStop(.49,'#947468');
    sky.addColorStop(.53,'#35434a'); sky.addColorStop(1,'#161f2a');
    c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(let i=0;i<52;i++){
      const x=(i*37)%w,y=h*.48+i%9;
      c.fillStyle=['#263846','#deb98b','#64899a','#4c7f8b'][i%4];
      c.fillRect(x,y-2-i%6,2+i%6,2+i%6);
    }
  });
  environment.mapping=T.EquirectangularReflectionMapping;
  const glow = texture(128,128,(c,w,h)=>{
    const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'#fff'); g.addColorStop(.18,'#ffffff81'); g.addColorStop(.47,'#ffffff20'); g.addColorStop(1,'#ffffff00');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  });
  const staticHalos=[];
  function halo(parent,x,y,z,w,h,color,opacity=.65) {
    const sprite = new T.Sprite(new T.SpriteMaterial({map:glow,color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,fog:true}));
    sprite.position.set(x,y,z);sprite.scale.set(w,h,1);parent.add(sprite);if(parent===scene)staticHalos.push(sprite);return sprite;
  }
  const wet = texture(256,256,(c,w,h)=>{
    c.fillStyle='#343738';c.fillRect(0,0,w,h);
    for(let i=0;i<10000;i++) {
      const shade=Math.floor(27+random()*43);
      c.fillStyle='rgba('+shade+','+shade+','+(shade+9)+',.34)';
      c.fillRect(random()*w,random()*h,1+random()*3,1+random()*5);
    }
    for(let i=0;i<35;i++) {
      c.fillStyle='#53506618'; c.fillRect(random()*w,random()*h,1+random()*3,random()*30);
    }
  });
  wet.wrapS=wet.wrapT=T.RepeatWrapping;wet.repeat.set(104,104);
  applyPhoto(wet,'asphalt');
  const asphalt=texture(256,256,(c,w,h)=>{
    c.fillStyle='#929292';c.fillRect(0,0,w,h);
    for(let i=0;i<5900;i++){
      const gray=Math.floor(70+random()*120);
      c.fillStyle='rgb('+gray+','+gray+','+gray+')';
      c.fillRect(random()*w,random()*h,1+random()*2,1+random()*2);
    }
    for(let i=0;i<12;i++){
      const x=random()*w,y=random()*h,r=8+random()*33;
      const puddle=c.createRadialGradient(x,y,0,x,y,r);
      puddle.addColorStop(0,'#383838');puddle.addColorStop(1,'#38383800');
      c.fillStyle=puddle;c.fillRect(x-r,y-r,r*2,r*2);
    }
  });
  asphalt.colorSpace=T.NoColorSpace;
  asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;
  asphalt.repeat.set(52,52);
  const road = new T.MeshPhysicalMaterial({
    color:0xb7b8bb,map:wet,roughness:.67,roughnessMap:asphalt,
    bumpMap:asphalt,bumpScale:.053,metalness:.10,clearcoat:.56,clearcoatRoughness:.12,envMapIntensity:.76
  });
  const paving=texture(192,192,(c,w,h)=>{c.fillStyle='#5a6164';c.fillRect(0,0,w,h);});
  paving.wrapS=paving.wrapT=T.RepeatWrapping;
  paving.repeat.set(5,5);
  applyPhoto(paving,'paving');
  const sidewalk=material(0x8e969d,{map:paving});
  const curb=material(0x99918b);
  const stripes=flat(0x9d899c), centerStripe=flat(0xb28c61), roof=material(0x30273e);
  const neon=[0x7df8ed,0xf964a7,0x8b9aff,0xffa875];
  const neonMats=neon.map(flat);
  const block=84, roadWidth=26, min=-4,max=4, cityLimit=366;
  box(scene,road,0,-.37,0,736,.55,736);
  const sea=material(0x262443,{roughness:.27,metalness:.31});
  box(scene,sea,0,-1.05,0,1800,.45,1800);
  const colliders=[];
  const staticSigns = new Map();

  function facade(index) {
    const wall=['#252d35','#343840','#303d46','#414145','#353333','#263039'][index];
    const colors=['#95b7cc','#e5b58d','#c2bcc3','#ffe1ad','#9fb4b8'];
    const map=texture(192,256,(c,w,h)=>{
      c.fillStyle=wall;c.fillRect(0,0,w,h);
      for(let y=4;y<h-8;y+=25) {
        c.fillStyle='#141525';c.fillRect(0,y+19,w,5);
        for(let x=8;x<w-10;x+=25) {
          c.fillStyle='#171e25';c.fillRect(x-2,y-1,19,17); c.fillStyle='#72808634';c.fillRect(x-2,y+15,19,2);
          c.fillStyle=random()<.35 ? colors[Math.floor(random()*colors.length)] : '#343653';
          c.globalAlpha=.45+random()*.55;c.fillRect(x,y,14,13);c.globalAlpha=1;
          c.fillStyle='#2b273a';c.fillRect(x+7,y,1,14);
        }
      }
    });
    return new T.MeshBasicMaterial({map,color:[0xc3bed0,0xa4b7c7,0xc3bacf,0xcbabbe,0x968aa1,0xa8b3cf][index]});
  }
  const walls=Array.from({length:6},(_,i)=>facade(i));
  ['concrete','brick','glass','steel','concrete','glass'].forEach((name,index)=>{
    const map=walls[index].map;
    applyPhoto(map,name,name==='glass'?.57:.46,'soft-light');
  });
  const shutterMap=texture(192,192,(c,w,h)=>{c.fillStyle='#455960';c.fillRect(0,0,w,h);});
  applyPhoto(shutterMap,'steel');
  const shutter=material(0x87919b,{map:shutterMap,metalness:.24});
  const lintel=material(0x77746e);
  const faces=walls.map(w=>[w,w,roof,roof,w,w]);
  const streaks=[];
  const reflection=texture(96,256,(c,w,h)=>{
    const end=c.createLinearGradient(0,0,0,h);
    end.addColorStop(0,'#ffffffc0');end.addColorStop(.3,'#ffffff87');end.addColorStop(1,'#ffffff00');
    for(let i=0;i<38;i++){
      c.globalAlpha=.08+random()*.24;c.fillStyle=end;
      c.fillRect(w*.2+random()*w*.6,random()*h*.36,1+random()*8,h*.39+random()*h*.35);
    }
  });
  function reflect(x,z,color,w=7,length=21,angle=0) {
    const mat=new T.MeshBasicMaterial({map:reflection,color,transparent:true,opacity:.62,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1});
    const mesh=new T.Mesh(new T.PlaneGeometry(w,length),mat);
    mesh.rotation.set(-Math.PI/2,0,angle);mesh.position.set(x,.011,z);
    scene.add(mesh);streaks.push(mat);
  }
  function sign(label,color) {
    const key=label+'|'+color;
    if(staticSigns.has(key)) return staticSigns.get(key);
    const map=texture(512,128,(c,w,h)=>{
      c.fillStyle='#181124';c.fillRect(0,0,w,h);
      c.strokeStyle=color;c.lineWidth=4;c.strokeRect(9,9,w-18,h-18);
      c.font='900 62px Arial';c.textAlign='center';c.textBaseline='middle';
      c.shadowColor=color;c.shadowBlur=15;c.fillStyle=color;c.fillText(label,w/2,h/2,w-52);
      c.shadowBlur=0;c.fillStyle='#ffffff';c.globalAlpha=.5;c.fillText(label,w/2,h/2,w-52);
    });
    const mat=new T.MeshBasicMaterial({map});
    staticSigns.set(key,mat);return mat;
  }
  function billboard(label,x,y,z,w,h,i,rotation=0) {
    const mat=sign(label,['#6affea','#ff67aa','#9a9cff','#ffb876'][i]);
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);
    halo(scene,x,y,z+.2,w*1.6,w*.62,neon[i],.42);
    reflect(x,z+4,neon[i],w*.8,21,rotation);
  }
  const streetFrontages=new Map();
  for(const name of ['fish-market','townhouse','loading-bay','corner-cafe']){
    const map=texture(384,256,(c,w,h)=>{c.fillStyle='#5b625f';c.fillRect(0,0,w,h);});
    applyPhoto(map,name);
    streetFrontages.set(name,material(0xbec4bf,{map,emissive:0x826951,emissiveMap:map,emissiveIntensity:.25}));
  }
  const rooftopAir=material(0x696e6a,{metalness:.25}), coping=material(0x6c6865);
  const industrialWall=material(0x627273,{map:shutterMap,metalness:.32});
  function building(x,z,w,d,h,i) {
    const design=streets.architecture(x,z,h);
    h=design.height;
    const sideX=Math.sign(Math.round(x/block)*block-x);
    const sideZ=Math.sign(Math.round(z/block)*block-z);
    const streetFace=streetFrontages.get(design.frontage);
    const modules=design.roof==='industrial'?1:2;
    const wall=design.roof==='industrial'?industrialWall:faces[i];
    box(scene,wall,x,h/2,z,w,h,d);
    box(scene,roof,x,h+.24,z,w+.6,.52,d+.6);
    for(let slot=0;slot<modules;slot++){
      const offset=(slot+.5)/modules-.5;
      box(scene,streetFace,x+w*offset,2.2,z+sideZ*(d/2+.068),w/modules*.92,4.15,.1);
      box(scene,streetFace,x+sideX*(w/2+.068),2.2,z+d*offset,.1,4.15,d/modules*.92);
    }
    box(scene,coping,x,4.42,z+sideZ*(d/2+.10),w,.21,.38);
    box(scene,coping,x+sideX*(w/2+.10),4.42,z,.38,.21,d);
    if(design.roof==='market'){
      box(scene,shutter,x,3.55,z+sideZ*(d/2+.58),w*.64,.12,1.18);
      box(scene,shutter,x+sideX*(w/2+.58),3.55,z,1.18,.12,d*.64);
    }
    if(design.roof==='terrace'){
      for(let step=0;step<4;step++)box(scene,roof,x,h+.4+step*.38,z,w+.4,.4,d*(1-step*.18));
    }else{
      box(scene,rooftopAir,x+w*.18,h+.86,z+d*.12,w*.26,1.29,d*.29);
      if(design.roof==='industrial')box(scene,rooftopAir,x-w*.2,h+1.0,z-d*.18,w*.16,1.6,d*.16);
    }
    if(h>33){
      box(scene,lintel,x,h*.44,z+d/2+.08,w+.18,.22,.31);
      box(scene,lintel,x,h*.72,z+d/2+.08,w+.18,.22,.31);
    }
    colliders.push({x,z,w:w/2+1.1,d:d/2+1.1});
    if(h>58&&design.roof==='office') {
      box(scene,roof,x,h+2,z,w*.47,4.2,d*.5);
      box(scene,roof,x,h+7,z,.25,10,.25);
      box(scene,neonMats[1],x,h+12,z,.45,.45,.45);
      halo(scene,x,h+12,z,4,4,neon[1],.43);
    }
    if(random()<.46&&design.roof==='office') {
      const n=Math.floor(random()*4);
      box(scene,neonMats[n],x,h*.74,z+d/2+.08,w*.93,.14,.19);
      box(scene,neonMats[n],x-w/2+.3,h*.62,z+d/2+.09,.15,h*.23,.16);
    }
  }
  for(let row=min;row<max;row++) {
    for(let col=min;col<max;col++) {
      const x=(col+.5)*block,z=(row+.5)*block;
      box(scene,curb,x,.02,z,block-roadWidth,.22,block-roadWidth);
      box(scene,sidewalk,x,.12,z,block-roadWidth-.75,.14,block-roadWidth-.75);
      for(const dx of [-13,13]) for(const dz of [-13,13]) {
        const skyline = row<0 ? 1.35 : .78;
        const height = (12+random()**1.65*85)*skyline;
        building(x+dx,z+dz,14+random()*9,15+random()*8,height,Math.floor(random()*6));
      }
    }
  }

  const roadLineMeshes=[];
  for(let lane=min;lane<=max;lane++) {
    const x=lane*block;
    for(let row=min;row<max;row++){
      const start=row*block;
      for(let offset=-3;offset<=3;offset++) {
        const z=start+block/2+offset*6.5;
        roadLineMeshes.push([x-.34,z,.10,3.4,1],[x+.34,z,.10,3.4,1],[z,x-.34,3.4,.10,1],[z,x+.34,3.4,.10,1]);
      }
      for(const edge of [-11.3,11.3]){
        roadLineMeshes.push([x+edge,start+block/2,.11,54,0],[start+block/2,x+edge,54,.11,0]);
      }
      if(lane%2===0 && row%2===0) {
        for(let k=-4;k<=4;k++) {
          roadLineMeshes.push([x+k*1.8,start+10.6,1.02,2.7,0],[start+10.6,x+k*1.8,2.7,1.02,0]);
        }
      }
    }
  }
  const dummy=new T.Object3D();
  for(let type=0;type<2;type++){
    const list=roadLineMeshes.filter(item=>item[4]===type);
    const mesh=new T.InstancedMesh(unitBox,type ? centerStripe : stripes,list.length);
    list.forEach(([x,z,w,d],i)=>{
      dummy.position.set(x,.004,z);dummy.scale.set(w,.009,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });scene.add(mesh);
  }

  const pole=material(0x3b3348), bulb=flat(0xffd9ba);
  for(let col=-3;col<=3;col++) for(let row=-4;row<4;row++) {
    const x=col*block+13.6,z=row*block+23;
    box(scene,pole,x,3.4,z,.2,6.8,.2);
    box(scene,pole,x-1.2,6.7,z,2.5,.14,.17);
    box(scene,bulb,x-2.2,6.6,z,.82,.13,.41);
    halo(scene,x-2.2,6.55,z,8,7,0xffbea1,.57);
    reflect(x-2.6,z,0xe39279,6.2,15);
  }
  box(scene,pole,-10.8,4.2,110,.27,8.4,.34);
  box(scene,pole,10.8,4.2,110,.27,8.4,.34);
  box(scene,neonMats[0],0,8.9,110,21.8,.1,.3);
  billboard('LUCENT BAY',0,7.6,110,15,2.75,0);
  billboard('NIGHT MARKET',22,7.3,102,17,3.5,1);
  billboard('LOWER QUAY',-22,5.2,93,14,3,2);
  billboard('FERRY CONTROL',12,7.0,52,13,3.1,3);
  billboard('FM 87.9',-23,8.2,-53,16,3.7,0);
  billboard('RELAY',106,12,-59,16,4,1);
  billboard('HARBOUR RELAY',75,12,-96,16,3.9,0);
  const towerMetal=material(0x566971,{metalness:.6});
  const towerX=64,towerZ=-101;
  for(const dx of [-5,5])for(const dz of [-5,5]){
    box(scene,towerMetal,towerX+dx,20,towerZ+dz,.5,40,.5);
  }
  for(let y=5;y<=40;y+=5){
    for(const side of [-5,5]){
      box(scene,towerMetal,towerX,y,towerZ+side,10,.22,.22);
      box(scene,towerMetal,towerX+side,y,towerZ,.22,.22,10);
    }
  }
  box(scene,roof,towerX,40,towerZ,11,2.0,11);
  box(scene,pole,towerX,47,towerZ,.28,14,.28);
  box(scene,neonMats[1],towerX,54,towerZ,.43,.43,.43);
  const aviationLamp=halo(scene,towerX,54,towerZ,9,9,0xfc6650,.58);
  billboard('FERRY',-68,7,113,14,3.5,2,-Math.PI/2);
  billboard('NIGHT MARKET',19,8,-138,15,3.8,1);

  const sun=new T.Mesh(new T.SphereGeometry(9.4,32,16),new T.MeshBasicMaterial({color:0xffde9a,fog:false}));
  sun.position.set(155,58,-690);scene.add(sun);
  const sunHalo=halo(scene,155,58,-694,132,104,0xffb487,.72);
  sunHalo.material.fog=false;staticHalos.splice(staticHalos.indexOf(sunHalo),1);
  images?.onReady('lucent-dawn',()=>{sun.visible=false;sunHalo.visible=false;});
  for(let i=0;i<48;i++) {
    const x=-520+i*23,z=-445-random()*120,h=16+random()**1.55*130;
    box(scene,faces[i%6],x,h/2,z,10+random()*7,h,12+random()*10);
  }
  for(const side of [-1,1]){
    box(scene,pole,side*351,.17,0,1.4,1.6,708);
    box(scene,neonMats[2],side*351,.8,0,.12,.1,708);
    box(scene,pole,0,.17,side*351,708,1.6,1.4);
  }

  const streetHardware=material(0x394644,{metalness:.28}), timber=material(0x806553);
  const signAmber=material(0xb69559), enamel=material(0x446a60), curbStone=material(0x81837a);
  const shelterGlass=material(0x71949c,{transparent:true,opacity:.28});
  const leaves=material(0x4f7159);
  const roadLampRed=flat(0xd65e54),roadLampGreen=flat(0x75bb79);
  const signalMeshes=[];
  for(const {kind,x,z} of streets.props){
    if(kind==='planter'){
      box(scene,curbStone,x,.4,z,1.1,.53,1.1);
      box(scene,timber,x,1.09,z,.15,1.27,.15);
      const geometry=new T.IcosahedronGeometry(.72,1);
      const tree=new T.Mesh(geometry,leaves);
      tree.position.set(x,2.11,z);tree.scale.set(.82,1.25,.91);scene.add(tree);
    }else if(kind==='stall'){
      for(const offset of [-.75,.75])box(scene,streetHardware,x,1.42,z+offset,.09,2.57,.09);
      box(scene,enamel,x,2.78,z,1.8,.17,2.5);
      for(let i=-2;i<=2;i++)box(scene,curbStone,x,2.874,z+i*.46,1.82,.035,.16);
      box(scene,timber,x,.59,z,1.08,.83,1.9);
      box(scene,curbStone,x,1.06,z,1.2,.12,2.08);
      box(scene,enamel,x,.18+1.06,z-.62,.59,.22,.55);
      box(scene,signAmber,x,.18+1.06,z+.56,.54,.22,.61);
    }else if(kind==='shelter'){
      box(scene,streetHardware,x,2.6,z,1.36,.16,3.56);
      for(const offset of [-1.6,1.6])box(scene,streetHardware,x,1.38,z+offset,.09,2.48,.09);
      box(scene,shelterGlass,x+.52,1.56,z,.07,1.88,3.3);
      box(scene,timber,x+.18,.63,z,.44,.12,1.99);
    }else if(kind==='bench'){
      for(const offset of [-.64,.64])box(scene,streetHardware,x,.38,z+offset,.34,.48,.12);
      box(scene,timber,x,.65,z,.54,.11,1.8);
      box(scene,timber,x+.21,.91,z,.12,.39,1.8);
    }else if(kind==='signal'){
      box(scene,streetHardware,x,1.77,z,.13,3.54,.13);
      box(scene,streetHardware,x,3.68,z,.42,1.04,.33);
      const dot=new T.Mesh(new T.SphereGeometry(.112,8,6),roadLampGreen);
      dot.position.set(x,3.41,z+.16);signalMeshes.push(dot);scene.add(dot);
    }else if(kind==='barrier'){
      box(scene,curbStone,x,.45,z,.28,.62,1.8);
      for(const offset of [-.61,0,.61])box(scene,signAmber,x,.65,z+offset,.3,.24,.22);
    }else if(kind==='pallet'){
      box(scene,timber,x,.23,z,1.15,.18,1.45);
      box(scene,timber,x+.12,.6,z-.16,.86,.55,.82);
      box(scene,signAmber,x-.12,.51,z+.53,.6,.42,.56);
    }else if(kind==='crate'){
      box(scene,timber,x,.4,z,.68,.53,.72);
      box(scene,signAmber,x,.671,z,.7,.032,.73);
    }else{
      box(scene,streetHardware,x,.62,z,.17,.98,.17);
      box(scene,signAmber,x,.95,z,.19,.13,.19);
    }
  }
  batchBoxes=false;
  for(const [mat,list] of staticBoxes){
    const mesh=new T.InstancedMesh(unitBox,mat,list.length);
    list.forEach(([x,y,z,w,h,d],i)=>{
      dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.receiveShadow=true;
    mesh.castShadow=mat!==road&&mat!==sidewalk&&mat!==sea;
    scene.add(mesh);
  }
  staticBoxes.clear();

  const geometryCache=new Map();
  function geometry(shape){
    if(geometryCache.has(shape))return geometryCache.get(shape);
    const geo=new T.BufferGeometry(),indices=[];
    for(const face of shape.faces){
      for(let i=1;i<face.length-1;i++)indices.push(face[0],face[i],face[i+1]);
    }
    geo.setAttribute('position',new T.Float32BufferAttribute(shape.vertices.flat(),3));
    geo.setIndex(indices);geo.computeVertexNormals();
    geometryCache.set(shape,geo);
    return geo;
  }
  const skinCache=new Map();
  function bodyMaterial(color){
    if(!skinCache.has(color))skinCache.set(color,new T.MeshStandardMaterial({color,roughness:.89,side:T.DoubleSide}));
    return skinCache.get(color);
  }
  const vertical=new T.Vector3(0,1,0), bone=new T.Vector3();
  const walkers=streets.pedestrians.map(person=>{
    const figure=new T.Group();
    const shade=new T.Mesh(new T.PlaneGeometry(.89,.68),new T.MeshBasicMaterial({
      map:glow,transparent:true,depthWrite:false,color:0x101a20,opacity:.52
    }));
    shade.rotation.x=-Math.PI/2;
    scene.add(figure,shade);
    return {person,figure,shade,limbs:[]};
  });
  function walkStreets(state,time,quality){
    const limit=quality==='low'?65:95;
    for(const {person,figure,shade,limbs} of walkers){
      const pose=streets.pose(person,time);
      const visible=Math.hypot(state.x-pose.x,state.z-pose.z)<limit;
      figure.visible=shade.visible=visible;
      if(!visible)continue;
      const model=models.human(person,pose,time);
      figure.position.set(pose.x,.146,pose.z);
      figure.rotation.y=-model.heading;
      figure.scale.setScalar(model.scale);
      shade.position.set(pose.x,.153,pose.z);
      for(const [index,part] of model.parts.entries()){
        if(!limbs[index]){
          const segment=new T.Mesh(geometry(models.primitive[part.mesh]),bodyMaterial(part.color));
          segment.castShadow=true;
          figure.add(segment);limbs.push(segment);
        }
        const segment=limbs[index];
        if(part.a){
          bone.set(part.b[0]-part.a[0],part.b[1]-part.a[1],part.b[2]-part.a[2]);
          const length=bone.length();
          segment.position.set((part.a[0]+part.b[0])*.5,(part.a[1]+part.b[1])*.5,(part.a[2]+part.b[2])*.5);
          segment.scale.set(part.width,length,part.width);
          segment.quaternion.setFromUnitVectors(vertical,bone.normalize());
        }else{
          segment.position.set(...part.center);
          segment.scale.set(...part.scale);
        }
      }
    }
    for(const dot of signalMeshes){
      const stop=time%17>11;
      dot.material=stop?roadLampRed:roadLampGreen;
      dot.position.y=stop?4.0:3.42;
    }
  }
  const vehicleMaterials={
    glass:new T.MeshPhysicalMaterial({color:0x314550,metalness:.28,roughness:.18,clearcoat:.76,side:T.DoubleSide}),
    rubber:new T.MeshStandardMaterial({color:0x171b21,roughness:.9,side:T.DoubleSide}),
    plate:new T.MeshStandardMaterial({color:0xbac0b9,roughness:.64,side:T.DoubleSide}),
    chrome:new T.MeshStandardMaterial({color:0x919898,metalness:.67,roughness:.25,side:T.DoubleSide}),
    wheelInner:new T.MeshStandardMaterial({color:0x292e31,roughness:.81,side:T.DoubleSide}),
    hub:new T.MeshStandardMaterial({color:0x606c73,metalness:.5,roughness:.45,side:T.DoubleSide}),
    alloy:new T.MeshStandardMaterial({color:0x858d91,metalness:.54,roughness:.3,side:T.DoubleSide}),
    headlight:new T.MeshBasicMaterial({color:0xd9f4f5,side:T.DoubleSide,toneMapped:false}),
    tail:new T.MeshBasicMaterial({color:0xbc2532,side:T.DoubleSide,toneMapped:false}),
  };
  function car(color,player=false){
    const root=new T.Group(),body=new T.Group(),pivot=new T.Group();
    pivot.position.y=-.44;body.position.y=.44;body.add(pivot);root.add(body);
    const paint=new T.MeshPhysicalMaterial({color,metalness:.59,roughness:.27,clearcoat:.91,clearcoatRoughness:.13,side:T.DoubleSide});
    const tail=player?vehicleMaterials.tail.clone():vehicleMaterials.tail;
    for(const [kind,shape] of models.parts){
      const mesh=new T.Mesh(geometry(shape),kind==='paint'?paint:kind==='tail'?tail:vehicleMaterials[kind]);
      mesh.castShadow=kind==='paint';
      pivot.add(mesh);
    }
    const wheels=[];
    for(const side of [-1,1])for(const axle of [-1.49,1.49]){
      const steering=new T.Group(), spin=new T.Group();
      steering.position.set(side*.93,models.radius,axle);
      for(const [kind,shape] of models.wheel){
        if(!player&&kind==='hub')continue;
        if(!player&&kind==='alloy')continue;
        const mesh=new T.Mesh(geometry(shape),vehicleMaterials[kind]);
        mesh.castShadow=kind==='rubber';spin.add(mesh);
      }
      steering.add(spin);root.add(steering);
      wheels.push({steering,spin,front:axle<0});
    }
    root.userData={body,wheels,tail,tailGlows:[],bounce:[]};
    const shade=new T.Mesh(new T.PlaneGeometry(3.83,5.94),new T.MeshBasicMaterial({
      map:glow,color:0x080c11,transparent:true,opacity:.9,depthWrite:false
    }));
    shade.rotation.x=-Math.PI/2;shade.position.y=.018;root.add(shade);
    if(player){
      for(const side of [-1,1]){
        const trail=halo(pivot,side*.65,.745,2.44,1.27,.58,0xfa4351,.52);
        root.userData.tailGlows.push(trail);
        const bounce=new T.Mesh(new T.PlaneGeometry(1.31,3.8),new T.MeshBasicMaterial({
          map:glow,color:0xea4554,transparent:true,opacity:.26,depthWrite:false,blending:T.AdditiveBlending
        }));
        bounce.rotation.x=-Math.PI/2;bounce.position.set(side*.69,.009,3.32);root.add(bounce);
        root.userData.bounce.push(bounce);
        const beam=new T.SpotLight(0xc2e5eb,360,49,.34,.72,1.33);
        beam.position.set(side*.61,.692,-2.39);
        beam.target.position.set(side*1.38,.03,-20);
        root.add(beam,beam.target);
      }
    }
    scene.add(root);
    return root;
  }
  function driveRig(car,state,rollAngle){
    const input=models.dynamics(state);
    const {body,wheels,tail,tailGlows,bounce}=car.userData;
    body.rotation.x=input.pitch;body.rotation.z=input.roll;
    for(const wheel of wheels){
      wheel.steering.rotation.y=wheel.front?-input.steer:0;
      wheel.spin.rotation.x=-rollAngle;
    }
    if(tailGlows.length){
      tail.color.setHex(state.brake?0xff4654:0xbc2532);
      for(const glow of tailGlows)glow.material.opacity=state.brake?.86:.52;
      for(const light of bounce)light.material.opacity=state.brake?.55:.26;
    }
  }
  const player=car(0x315c6a,true);
  const traffic=[];
  for(let i=0;i<15;i++) {
    const horizontal=i%3===1;
    const row=Math.floor(i/3)-2;
    const direction=i%2 ? 1 : -1;
    const offset=row*block+direction*(horizontal?4.65:-4.65);
    const along=(i*47)%550-275 + (row===0 ? 24 : 0);
    const vehicle=car([0x74436b,0x304c60,0x724b4f,0x566477][i%4]);
    vehicle.rotation.y=horizontal ? -direction*Math.PI/2 : direction===1 ? Math.PI : 0;
    traffic.push({vehicle,horizontal,offset,along,direction,speed:13+i%5*2.1});
  }

  const beacon=new T.Group();
  const ring=new T.Mesh(new T.TorusGeometry(6,.115,8,54),flat(0x99fff0));
  ring.rotation.x=-Math.PI/2;ring.position.y=.04;beacon.add(ring);
  const beam=new T.Mesh(new T.CylinderGeometry(.22,.58,32,16,1,true),new T.MeshBasicMaterial({color:0x76faeb,transparent:true,opacity:.39,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));
  beam.position.y=16;beacon.add(beam);
  const diamond=new T.Mesh(new T.OctahedronGeometry(1.15),flat(0xacfff0));
  diamond.position.y=4.5;beacon.add(diamond);
  halo(beacon,0,4.5,0,11,11,0x77ffee,.78);
  scene.add(beacon);
  const focus=new T.Vector3(),nextCamera=new T.Vector3(),nextFocus=new T.Vector3();
  let graphics='balanced';
  function setQuality(quality) {
    graphics=quality;
    const profile={low:.78,balanced:1.04,high:1.6};
    renderer.setPixelRatio(Math.min(profile[quality],quality==='low'?1:Math.max(1,devicePixelRatio)));
    scene.environment=quality==='high'?environment:null;
    if(renderer.shadowMap)renderer.shadowMap.enabled=quality==='high';
    road.bumpScale=quality==='low'?0:.085;
    resize();
  }
  function resize() {
    const w=container.clientWidth,h=Math.max(1,container.clientHeight);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  }
  function updateTraffic(dt) {
    for(const item of traffic) {
      item.along+=item.speed*item.direction*dt;
      if(item.along>335) item.along=-335;
      if(item.along< -335) item.along=335;
      item.vehicle.position.set(item.horizontal?item.along:item.offset,.01,item.horizontal?item.offset:item.along);
    }
  }
  function draw(state,dt,time,target,immediate=false) {
    player.position.set(state.x,.022,state.z);player.rotation.y=-state.heading;
    driveRig(player,state,state.wheelAngle||0);
    for(const item of traffic)driveRig(item.vehicle,item,item.along*item.direction/models.radius);
    if(graphics==='high'){
      const x=Math.round(state.x/3)*3,z=Math.round(state.z/3)*3;
      sunrise.target.position.set(x,0,z);
      sunrise.position.set(x+71,80,z-91);
    }
    beacon.visible=!!target;
    if(target){beacon.position.set(target.x,.025,target.z);diamond.rotation.y=time*1.55;diamond.position.y=4+.6*Math.sin(time*3);ring.scale.setScalar(1+.13*Math.sin(time*2.5));}
    const sx=Math.sin(state.heading),sz=-Math.cos(state.heading);
    const moving=Math.min(1,Math.abs(state.speed)/54);
    const back=8.9+moving*2.6;
    const menu=state.view==='menu';
    const side=menu?-4.6+Math.sin(time*.48)*1.2:(state.steer||0)*moving*.48;
    const ahead=menu ? 12 : 7.5;
    const next=nextCamera.set(state.x-sx*back-sz*side,menu?4.35:4.65+moving*.8,state.z-sz*back+sx*side);
    const look=nextFocus.set(state.x+sx*ahead-sz*(menu?-3.8:0),menu?3.4:1.45,state.z+sz*ahead+sx*(menu?-3.8:0));
    const ease=immediate?1:1-Math.exp(-dt*(menu?2.7:7.5));
    camera.position.lerp(next,ease);
    focus.lerp(look,ease);
    camera.lookAt(focus);
    const fov=58+moving*7;
    if(Math.abs(camera.fov-fov)>.025){camera.fov+=(fov-camera.fov)*ease;camera.updateProjectionMatrix();}
    const lightDistance=graphics==='low'?125:graphics==='balanced'?220:420;
    for(const light of staticHalos) light.visible=light.position.distanceToSquared(camera.position)<lightDistance*lightDistance;
    aviationLamp.material.opacity=.32+.4*Math.pow(Math.max(0,Math.sin(time*2.9)),4);
    walkStreets(state,time,graphics);
    renderer.render(scene,camera);
  }
  function blocked(x,z) {
    if(Math.abs(x)>cityLimit-14 || Math.abs(z)>cityLimit-14) return true;
    return colliders.some(b=>Math.abs(x-b.x)<b.w&&Math.abs(z-b.z)<b.d);
  }
  function trafficCollision(x,z) {
    return traffic.some(({vehicle,horizontal})=>{
      const p=vehicle.position;
      return Math.abs(x-p.x)<(horizontal?2.65:1.45)&&Math.abs(z-p.z)<(horizontal?1.45:2.65);
    });
  }
  updateTraffic(0);
  resize();
  return {resize,draw,updateTraffic,blocked,trafficCollision,setQuality,block,cityLimit};
};
