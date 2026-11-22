/* Original procedural city and vehicle assets for Dead Air Over Lucent. */
'use strict';
window.makeCity = function makeCity(container) {
  const T = window.THREE;
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x46505c, 0.0035);
  const camera = new T.PerspectiveCamera(58, 1, .1, 1250);
  const renderer = new T.WebGLRenderer({alpha:true, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  scene.add(new T.HemisphereLight(0xa8cddb, 0x564e57, 1.7));
  const sunset = new T.DirectionalLight(0xffc5a0, 2.1);
  sunset.position.set(140,90,-130);
  scene.add(sunset);
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
  wet.wrapS=wet.wrapT=T.RepeatWrapping;wet.repeat.set(42,42);
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
    color:0x8d9aa0,map:wet,roughness:.74,roughnessMap:asphalt,
    bumpMap:asphalt,bumpScale:.085,metalness:.08,clearcoat:.46,clearcoatRoughness:.17,envMapIntensity:.58
  });
  const sidewalk = material(0x353d43);
  const curb = material(0x76787b);
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
  function building(x,z,w,d,h,i) {
    box(scene,faces[i],x,h/2,z,w,h,d);
    box(scene,roof,x,h+.24,z,w+.6,.52,d+.6);
    colliders.push({x,z,w:w/2+1.1,d:d/2+1.1});
    if(h>60) {
      box(scene,roof,x,h+2,z,w*.47,4.2,d*.5);
      box(scene,roof,x,h+7,z,.25,10,.25);
      box(scene,neonMats[1],x,h+12,z,.45,.45,.45);
      halo(scene,x,h+12,z,4,4,neon[1],.43);
    }
    if(random()<.62) {
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

  const moon=new T.Mesh(new T.SphereGeometry(13,36,20),new T.MeshBasicMaterial({color:0xffbca9,fog:false}));
  moon.position.set(120,107,-690);scene.add(moon);
  const moonHalo=halo(scene,120,107,-696,180,150,0xf77d9e,.66);
  moonHalo.material.fog=false;staticHalos.splice(staticHalos.indexOf(moonHalo),1);
  for(let i=0;i<48;i++) {
    const x=-520+i*23,z=-445-random()*120,h=16+random()**1.55*130;
    box(scene,faces[i%6],x,h/2,z,10+random()*7,h,12+random()*10);
  }
  for(const side of [-1,1]){
    box(scene,pole,side*351,.17,0,1.4,1.6,708);
    box(scene,neonMats[2],side*351,.8,0,.12,.1,708);
    box(scene,pole,0,.17,side*351,708,1.6,1.4);
  }

  batchBoxes=false;
  for(const [mat,list] of staticBoxes){
    const mesh=new T.InstancedMesh(unitBox,mat,list.length);
    list.forEach(([x,y,z,w,h,d],i)=>{
      dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    });
    scene.add(mesh);
  }
  staticBoxes.clear();

  const paint=new T.MeshPhysicalMaterial({color:0x244553,metalness:.55,roughness:.25,clearcoat:.74,clearcoatRoughness:.21,envMapIntensity:1.04});
  const glass=material(0x171c34,{metalness:.56,roughness:.24});
  const rubber=material(0x171421), trim=material(0x383951,{metalness:.64,roughness:.27});
  const tails=flat(0xff5063), heads=flat(0xe4ffff);
  const wheelGeo=new T.CylinderGeometry(.43,.43,.36,16);
  wheelGeo.rotateZ(Math.PI/2);
  const rimGeo=new T.CylinderGeometry(.26,.26,.38,12);
  rimGeo.rotateZ(Math.PI/2);
  function shell(parent,sections,mat) {
    const positions=[];
    sections.forEach(([z,w,lo,hi])=>positions.push(-w,lo,z,w,lo,z,w,hi,z,-w,hi,z));
    const indices=[];
    for(let i=0;i<sections.length-1;i++){
      for(let a=0;a<4;a++){
        const b=(a+1)%4,p=i*4,q=p+4;
        indices.push(p+a,q+a,p+b,p+b,q+a,q+b);
      }
    }
    const end=(sections.length-1)*4;
    indices.push(0,1,2,0,2,3,end,end+2,end+1,end,end+3,end+2);
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    const surface=mat.clone();surface.side=T.DoubleSide;
    parent.add(new T.Mesh(geo,surface));
  }
  function car(color,player=false) {
    const g=new T.Group(), body=player ? paint : material(color,{metalness:.48,roughness:.32});
    const shade=new T.Mesh(new T.PlaneGeometry(4.25,6.7),new T.MeshBasicMaterial({map:glow,color:0x0b0719,transparent:true,opacity:.95,depthWrite:false}));
    shade.rotation.x=-Math.PI/2;shade.position.y=.025;g.add(shade);
    shell(g,[[-2.37,.91,.39,.74],[-1.86,1.04,.38,.93],[1.68,1.05,.36,.92],[2.23,.99,.42,.82]],body);
    shell(g,[[-1.13,.86,.82,.85],[-.55,.73,.85,1.5],[.63,.74,.85,1.51],[1.36,.88,.83,.87]],glass);
    box(g,body,0,1.508,.05,1.49,.063,1.19);
    box(g,trim,0,.48,2.23,1.92,.19,.13);
    box(g,glass,0,.65,2.247,.51,.18,.03);
    for(const side of [-1,1]) {
      box(g,tails,side*.64,.77,2.265,.59,.108,.055);
      box(g,heads,side*.65,.66,-2.37,.37,.085,.045);
      box(g,body,side*1.02,1.05,-.7,.25,.13,.29);
      for(const z of [-1.45,1.43]){
        const wheel=new T.Mesh(wheelGeo,rubber),rim=new T.Mesh(rimGeo,trim);
        wheel.position.set(side*.9,.43,z);rim.position.copy(wheel.position);g.add(wheel,rim);
      }
      if(player){halo(g,side*.63,.75,2.29,1.55,.82,0xff3f65,.72);}
    }
    if(player){
      box(g,trim,0,1.0,1.87,1.96,.095,.27);
      box(g,neonMats[0],0,.618,2.277,.28,.065,.018);
      const lights=new T.SpotLight(0xc6edf7,510,51,.43,.71,1.32);
      lights.position.set(0,.75,-2.02);lights.target.position.set(0,.03,-21);
      g.add(lights,lights.target);
    }
    scene.add(g);return g;
  }
  const player=car(0x275884,true);
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
    player.position.set(state.x,.018,state.z);player.rotation.y=-state.heading;
    beacon.visible=!!target;
    if(target){beacon.position.set(target.x,.025,target.z);diamond.rotation.y=time*1.55;diamond.position.y=4+.6*Math.sin(time*3);ring.scale.setScalar(1+.13*Math.sin(time*2.5));}
    const sx=Math.sin(state.heading),sz=-Math.cos(state.heading);
    const moving=Math.min(1,Math.abs(state.speed)/54);
    const back=8.9+moving*2.6;
    const menu=state.view==='menu';
    const side=menu ? -6.3+Math.sin(time*.35)*.85 : 0;
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