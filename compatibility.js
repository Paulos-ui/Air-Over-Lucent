/* Canvas-rendered city for browsers that cannot initialize WebGL. */
'use strict';

window.makeCompatibilityCity = function makeCompatibilityCity(container) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const images=window.lucentVisuals;
  const streets=window.lucentStreets;
  const models=window.lucentMotion;
  const block = 84;
  const cityLimit = 366;
  const halfRoad = 13;
  const near = 1.1;
  const buildings = [];
  const lights = [];
  const signs = [
    { x: 0, z: 109, y: 8.4, text: 'LUCENT BAY', color: '#8de9dc' },
    { x: 12, z: 48, y: 7.1, text: 'FERRY CONTROL', color: '#fac599' },
    { x: -13, z: -46, y: 8, text: 'SIGNAL ROW', color: '#a9e1ed' },
    { x: 74, z: -98, y: 13, text: 'HARBOUR RELAY', color: '#93f0e0' },
  ];
  const cars = Array.from({ length: 14 }, (_, i) => {
    const horizontal = i % 3 === 1;
    const direction = i % 2 ? 1 : -1;
    return {
      horizontal, direction, offset: (Math.floor(i / 3) - 2) * block + direction * (horizontal ? 4.6 : -4.6),
      along: (i * 47) % 550 - 275, speed: 13 + i % 5 * 2.1, paint: ['#5e596b', '#344c59', '#69514d', '#758385'][i % 4],
    };
  });
  let seed = 74479;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let row = -4; row < 4; row++) {
    for (let col = -4; col < 4; col++) {
      for (const dx of [-13, 13]) {
        for (const dz of [-13, 13]) {
          const x=(col+.5)*block+dx,z=(row+.5)*block+dz;
          const w=8+random()*4,d=8+random()*4,nominal=13+random()**1.7*(row<0?92:64);
          const design=streets.architecture(x,z,nominal);
          buildings.push({x,z,w,d,h:design.height,design,
            hue: Math.round(189+random()*43),lit:random(),color:random()>.52?'#efbc89':'#89b9c3',
          });
        }
      }
      lights.push({ x: col * block + 11.6, z: row * block + 25 });
    }
  }
  const skyline = Array.from({ length: 52 }, () => [6 + random() * 26, 11 + random() ** 1.65 * 88, random()]);
  const camera = { x: 0, y: 0, z: 0, sin: 0, cos: 1, pitchSin: 0, pitchCos: 1 };
  let width=1,height=1,focal=1,horizon=0,ratio=1,viewDistance=315,cameraYaw=0;

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    focal = height / 1.17;
  }
  function setQuality(quality) {
    ratio = quality === 'low' ? .78 : quality === 'high' ? 1.18 : 1;
    viewDistance = quality === 'low' ? 250 : quality === 'high' ? 375 : 310;
    resize();
  }
  function local([x, y, z]) {
    const dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
    const forward = dx * camera.sin - dz * camera.cos;
    return [dx * camera.cos + dz * camera.sin, dy * camera.pitchCos - forward * camera.pitchSin, forward * camera.pitchCos + dy * camera.pitchSin];
  }
  function screen(p) {
    return [width / 2 + p[0] * focal / p[2], height / 2 - p[1] * focal / p[2]];
  }
  function texturedQuad(vertices,image,opacity) {
    if(!image)return;
    const points=vertices.map(local);
    if(points.every(v=>v[2]<=near))return;
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    const uv=[[0,0],[iw,0],[iw,ih],[0,ih]];
    const clipped=[];
    for(let i=0;i<4;i++){
      const j=(i+3)%4,a=points[j],b=points[i];
      if((a[2]>=near)!==(b[2]>=near)){
        const t=(near-a[2])/(b[2]-a[2]);
        clipped.push({point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,near],
          uv:[uv[j][0]+(uv[i][0]-uv[j][0])*t,uv[j][1]+(uv[i][1]-uv[j][1])*t]});
      }
      if(b[2]>=near)clipped.push({point:b,uv:uv[i]});
    }
    for(const item of clipped)item.screen=screen(item.point);
    if (clipped.every(v=>v.screen[0]<0)||clipped.every(v=>v.screen[0]>width)||
        clipped.every(v=>v.screen[1]<0)||clipped.every(v=>v.screen[1]>height))return;
    for(let i=1;i<clipped.length-1;i++){
      const [a,b,c]=[clipped[0],clipped[i],clipped[i+1]];
      const du=b.uv[0]-a.uv[0],dv=b.uv[1]-a.uv[1],eu=c.uv[0]-a.uv[0],ev=c.uv[1]-a.uv[1];
      const det=du*ev-eu*dv;
      if(Math.abs(det)<.001)continue;
      const dx=b.screen[0]-a.screen[0],dy=b.screen[1]-a.screen[1];
      const ex=c.screen[0]-a.screen[0],ey=c.screen[1]-a.screen[1];
      const ax=(dx*ev-ex*dv)/det,ay=(dy*ev-ey*dv)/det,bx=(ex*du-dx*eu)/det,by=(ey*du-dy*eu)/det;
      ctx.save();
      ctx.globalAlpha=opacity;
      ctx.beginPath();ctx.moveTo(...a.screen);ctx.lineTo(...b.screen);ctx.lineTo(...c.screen);ctx.closePath();ctx.clip();
      ctx.transform(ax,ay,bx,by,a.screen[0]-ax*a.uv[0]-bx*a.uv[1],a.screen[1]-ay*a.uv[0]-by*a.uv[1]);
      ctx.drawImage(image,0,0);
      ctx.restore();
    }
  }
  const groundPatterns=new Map();
  function groundTexture(image,x1,z1,x2,z2,opacity,y=.025) {
    if(!image)return;
    if(!groundPatterns.has(image)){
      const pattern=ctx.createPattern(image,'repeat');
      if(typeof pattern?.setTransform==='function'&&typeof DOMMatrix==='function')pattern.setTransform(new DOMMatrix().scale(.28));
      groundPatterns.set(image,pattern);
    }
    const pattern=groundPatterns.get(image);
    if(!pattern)return;
    ctx.save();
    ctx.globalAlpha=opacity;
    polygon([[x1,y,z1],[x2,y,z1],[x2,y,z2],[x1,y,z2]],pattern);
    ctx.restore();
  }
  function point(x, y, z) {
    const p = local([x, y, z]);
    if (p[2] < near || p[2] > viewDistance + 55) return null;
    const [sx, sy] = screen(p);
    if (sx < -100 || sx > width + 100 || sy < -200 || sy > height + 160) return null;
    return [sx, sy, p[2]];
  }
  function polygon(vertices, color, seam = 0) {
    const coordinates = vertices.map(local);
    const clipped = [];
    let last = coordinates[coordinates.length - 1];
    for (const p of coordinates) {
      if ((p[2] >= near) !== (last[2] >= near)) {
        const fraction = (near - last[2]) / (p[2] - last[2]);
        clipped.push([last[0] + (p[0] - last[0]) * fraction, last[1] + (p[1] - last[1]) * fraction, near]);
      }
      if (p[2] >= near) clipped.push(p);
      last = p;
    }
    if (clipped.length < 3) return;
    const points = clipped.map(screen);
    if (points.every(p => p[0] < 0) || points.every(p => p[0] > width) || points.every(p => p[1] < 0) || points.every(p => p[1] > height)) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
    ctx.closePath();
    ctx.fill();
    if(seam){
      ctx.strokeStyle=color;
      ctx.lineWidth=seam;
      ctx.lineJoin='round';
      ctx.stroke();
    }
  }
  function ground(x1, z1, x2, z2, color, y = 0) {
    polygon([[x1,y,z1],[x2,y,z1],[x2,y,z2],[x1,y,z2]], color);
  }
  function glow(x, y, radius, color) {
    radius = Math.max(1, Math.min(radius, 95));
    const brush = ctx.createRadialGradient(x, y, 0, x, y, radius);
    brush.addColorStop(0, color + 'ac');
    brush.addColorStop(.27, color + '39');
    brush.addColorStop(1, color + '00');
    ctx.fillStyle = brush;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function backdrop(heading) {
    const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon + 32));
    sky.addColorStop(0, '#10202f');
    sky.addColorStop(.65, '#344656');
    sky.addColorStop(1, '#9a6d65');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const water = ctx.createLinearGradient(0, horizon, 0, height);
    water.addColorStop(0, '#534e58');
    water.addColorStop(1, '#182531');
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, width, height - horizon);
    const dawn=images?.get('lucent-dawn');
    const sunX=width*.7-Math.sin(heading)*width*.35;
    if(dawn){
      const skyHeight=Math.max(1,horizon+2);
      const skyWidth=Math.max(width*1.4,skyHeight*dawn.naturalWidth/dawn.naturalHeight);
      const left=Math.max(width-skyWidth,Math.min(0,sunX-skyWidth*.66));
      ctx.drawImage(dawn,left,0,skyWidth,skyHeight);
    }else{
      const sunY=horizon-height*.11;
      glow(sunX,sunY,height*.16,'#efae87');
      ctx.fillStyle='#ffe1ad';
      ctx.beginPath();ctx.arc(sunX,sunY,Math.max(1,height*.016),0,Math.PI*2);ctx.fill();
    }
    const interval = Math.max(15, width / 27);
    const slide = heading * 6;
    for (let i = -2; i < Math.ceil(width / interval) + 2; i++) {
      const index = ((i + Math.floor(slide)) % skyline.length + skyline.length) % skyline.length;
      const [w, h, lit] = skyline[index];
      const x = (i - (slide - Math.floor(slide))) * interval;
      const rise = h * height / 630;
      ctx.fillStyle = lit < .5 ? '#263642' : '#2e3d49';
      ctx.fillRect(x, horizon - rise, Math.max(interval + 1, w), rise + 3);
    }
  }
  function roadway(state) {
    const ix = Math.round(state.x / block), iz = Math.round(state.z / block);
    const firstX = Math.max(-4, ix - 4), lastX = Math.min(4, ix + 4);
    const firstZ = Math.max(-4, iz - 4), lastZ = Math.min(4, iz + 4);
    ground(-351, -351, 351, 351, '#222931');
    const asphalt=images?.get('asphalt'), pavement=images?.get('paving');
    for (let col = firstX; col <= lastX; col++) {
      const x = col * block;
      ground(x-halfRoad, firstZ*block-halfRoad, x+halfRoad, lastZ*block+halfRoad, '#29343b');
    }
    for (let row = firstZ; row <= lastZ; row++) {
      const z = row * block;
      ground(firstX*block-halfRoad, z-halfRoad, lastX*block+halfRoad, z+halfRoad, '#29343b');
    }
    for (let col = firstX; col <= lastX; col++) {
      for (let row = firstZ; row <= lastZ; row++) {
        const x = col * block, z = row * block;
        if (Math.hypot(x - state.x, z - state.z) > viewDistance + 44) continue;
        const [side,,depth] = local([x + block * .43, 0, z + block * .43]);
        const margin = block * .87;
        if (depth < -margin || Math.abs(side) > Math.max(0,depth) * width / (2*focal) + margin) continue;
        if (col < 4 && row < 4) {
          ground(x + halfRoad, z + halfRoad, x + block - halfRoad, z + block - halfRoad, '#68666a', .08);
          ground(x + halfRoad + .9, z + halfRoad + .9, x + block - halfRoad - .9, z + block - halfRoad - .9, '#454951', .13);
          if (depth < 137)groundTexture(pavement,x+13.3,z+13.3,x+70.7,z+70.7,.19,.14);
        }
        if (depth < 155 && asphalt) {
          const opacity=.23-Math.max(0,depth)/1100;
          groundTexture(asphalt,x-13,z+13,x+13,z+71,opacity);
          groundTexture(asphalt,x+13,z-13,x+71,z+13,opacity);
          groundTexture(asphalt,x-13,z-13,x+13,z+13,opacity);
        }
        if ((row+col)%2===0&&depth<182) {
          for(let offset=-8.25;offset<=8.25;offset+=1.65){
            ground(x+offset,z+8.7,x+offset+.88,z+11.05,'#b6b9b199',.029);
            ground(x+offset,z-11.05,x+offset+.88,z-8.7,'#b6b9b199',.029);
          }
          ground(x-10.8,z+12.4,x+10.8,z+12.66,'#b9b6ac87',.029);
        }
        for (const d of [-11.2, 11.2]) {
          ground(x+d-.1, z+13, x+d+.1, z+71, '#737676');
          ground(x+13, z+d-.1, x+71, z+d+.1, '#737676');
        }
        for (let d = 17; d < 68; d += 8) {
          ground(x-.14, z+d, x+.14, z+d+3.4, '#b39873');
          ground(x+d, z-.14, x+d+3.4, z+.14, '#b39873');
        }
        ground(x+4.7,z+18,x+7.7,z+33,'#7188870c');
        ground(x+6,z+23,x+7.2,z+47,'#bb9b7809');
        ground(x+11,z+23,x+12,z+48,'#f1b67c12');
      }
    }
  }
  const masonryTiles=new Map();
  function wallImage(name){
    const photo=images?.get(name);
    if(!photo||name!=='brick')return photo;
    if(!masonryTiles.has(photo)){
      const tile=document.createElement('canvas');
      tile.width=768;tile.height=384;
      const tileContext=tile.getContext('2d');
      for(let row=0;row<4;row++)for(let col=0;col<12;col++){
        tileContext.drawImage(photo,col*64,row*96,64,96);
      }
      masonryTiles.set(photo,tile);
    }
    return masonryTiles.get(photo);
  }
  function towerFace(a, b, tall, color, lit, distance, tint, design) {
    polygon([[...a],[...b],[b[0],tall,b[2]],[a[0],tall,a[2]]], color);
    if(distance>177)return;
    const wall=wallImage(design.roof==='office'?'glass':design.roof==='terrace'?'brick':design.roof==='industrial'?'steel':'concrete');
    const xAt=t=>a[0]+(b[0]-a[0])*t;
    const zAt=t=>a[2]+(b[2]-a[2])*t;
    if(wall){
      const tiers=Math.ceil(tall/(tall>44?17:10));
      for(let i=0;i<tiers;i++){
        const top=tall*(i+1)/tiers, bottom=tall*i/tiers;
        texturedQuad([[a[0],top,a[2]],[b[0],top,b[2]],[b[0],bottom,b[2]],[a[0],bottom,a[2]]],wall,tall>44?.72:.54);
      }
      if(distance<132){
        const groundFront=images?.get(design.frontage);
        const sections=design.roof==='industrial'?1:2;
        for(let slot=0;slot<sections;slot++){
          const start=(slot+.045)/sections,end=(slot+.955)/sections;
          texturedQuad([[xAt(start),4.3,zAt(start)],[xAt(end),4.3,zAt(end)],
            [xAt(end),.16,zAt(end)],[xAt(start),.16,zAt(start)]],groundFront,.91);
        }
        polygon([[xAt(0),4.28,zAt(0)],[xAt(1),4.28,zAt(1)],[xAt(1),4.52,zAt(1)],[xAt(0),4.52,zAt(0)]],'#5b514d');
      }
    }
    const across = 4;
    const floors = Math.min(16, Math.floor(tall / 3.65));
    for (let floor = 1; floor < floors; floor++) {
      const y = 2.15 + floor * 3.65;
      for (let col = 0; col < across; col++) {
        const center = (col + .5) / across;
        const randomLight = Math.sin((floor * 33 + col * 57 + lit * 103) * 2.13);
        if(design.roof==='industrial'&&(floor>2||col%2===0))continue;
        if(design.roof==='office'&&randomLight<.5)continue;
        const left = center - .073, right = center + .073;
        const x = t => a[0] + (b[0] - a[0]) * t;
        const z = t => a[2] + (b[2] - a[2]) * t;
        polygon([[x(left),y,z(left)],[x(right),y,z(right)],[x(right),y+1.23,z(right)],[x(left),y+1.23,z(left)]],
          randomLight>.56?tint+(design.roof==='office'?'74':'a2'):randomLight<-.32?'#142530ba':'#46576261');
      }
    }
  }
  function building(b, distance) {
    const a = [b.x-b.w,.13,b.z-b.d], p = [b.x+b.w,.13,b.z-b.d];
    const q = [b.x+b.w,.13,b.z+b.d], r = [b.x-b.w,.13,b.z+b.d];
    const fade = Math.min(13, distance / 20);
    const warm=b.design.roof==='terrace';
    const hue=warm?17:b.hue;
    const dark='hsl('+hue+' 19% '+(18+fade)+'%)';
    const bright='hsl('+hue+' 18% '+(26+fade)+'%)';
    if(camera.z<=b.z)towerFace(p,a,b.h,bright,b.lit,distance,b.color,b.design);
    else towerFace(r,q,b.h,bright,b.lit,distance,b.color,b.design);
    if(camera.x<=b.x)towerFace(a,r,b.h,dark,b.lit+.21,distance,b.color,b.design);
    else towerFace(q,p,b.h,dark,b.lit+.21,distance,b.color,b.design);
    polygon([a,p,q,r].map(v=>[v[0],b.h,v[2]]),'#454b4c');
    if(b.design.roof==='terrace'){
      const ridgeA=[b.x-b.w,b.h+2.25,b.z],ridgeB=[b.x+b.w,b.h+2.25,b.z];
      const face=camera.z<b.z?[a,p]:[r,q];
      polygon([[face[0][0],b.h,face[0][2]],[face[1][0],b.h,face[1][2]],ridgeB,ridgeA],'#595759');
    }else{
      solid(b.x,b.z,b.w*.73,b.d*.7,b.h,1.5,['#596369','#39454d','#303a3d']);
    }
    if (b.h > 62) {
      const antenna = point(b.x,b.h + 3,b.z);
      if (antenna) glow(antenna[0],antenna[1],focal / antenna[2] * .62,'#fc8065');
    }
  }
  const colors={glass:0x182b36,rubber:0x171b21,plate:0xbac0b9,chrome:0x949c9d,
    wheelInner:0x292e31,hub:0x606c73,alloy:0x858d91,headlight:0xc7eaf0,tail:0xc32936};
  function cross(a,b){
    return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  }
  function normal(v){
    const len=Math.hypot(...v)||1;
    return v.map(component=>component/len);
  }
  function subtract(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
  function shade(color,n,view,gloss,emissive){
    if(emissive)return '#'+color.toString(16).padStart(6,'0');
    const diffuse=Math.max(0,n[0]*.42+n[1]*.67-n[2]*.61);
    const facing=Math.max(0,n[0]*view[0]+n[1]*view[1]+n[2]*view[2]);
    const edge=gloss*Math.pow(1-facing,2.3);
    const sky=gloss*(.14+Math.max(0,n[1])*.62)+edge;
    const light=.62+diffuse*.53+Math.max(0,n[1])*.16;
    const r=Math.min(255,Math.round((color>>16)*light+sky*84));
    const g=Math.min(255,Math.round((color>>8&255)*light+sky*110));
    const b=Math.min(255,Math.round((color&255)*light+sky*125));
    return 'rgb('+r+','+g+','+b+')';
  }
  function mesh(queue,shape,transform,color,gloss=0,emissive=false){
    const vertices=shape.vertices.map(transform);
    for(const face of shape.faces){
      const a=vertices[face[0]],b=vertices[face[1]],c=vertices[face[2]];
      let n=normal(cross(subtract(b,a),subtract(c,a)));
      const center=[(a[0]+c[0])*.5,(a[1]+c[1])*.5,(a[2]+c[2])*.5];
      const view=normal(subtract([camera.x,camera.y,camera.z],center));
      const facing=n[0]*view[0]+n[1]*view[1]+n[2]*view[2];
      if(facing<0){
        if(shape.faces.length>1)continue;
        n=n.map(value=>-value);
      }
      const depth=local(center)[2];
      if(depth<.55)continue;
      queue.push({depth,vertices:face.map(index=>vertices[index]),fill:shade(color,n,view,gloss,emissive)});
    }
  }
  function finishMesh(queue){
    queue.sort((a,b)=>b.depth-a.depth);
    for(const face of queue)polygon(face.vertices,face.fill,.48);
  }
  function pavementShadow(x,z,heading,w,d,strength){
    const outline=(radius)=>Array.from({length:14},(_,i)=>{
      const theta=i*Math.PI/7;
      const p=models.turn([w*Math.cos(theta)*radius,.019,d*Math.sin(theta)*radius],heading);
      return [x+p[0],p[1],z+p[2]];
    });
    ctx.save();
    ctx.globalAlpha=strength*.5;polygon(outline(1.21),'#071017');
    ctx.globalAlpha=strength;polygon(outline(1),'#070d13');
    ctx.restore();
  }
  function car(x,z,heading,paint,driver,time,distance) {
    const player=!!driver, brake=driver?.brake;
    const motion=driver?models.dynamics(driver):{steer:0,roll:0,pitch:0};
    const spin=driver?-(driver.wheelAngle||0):-time*7.5;
    const locate=p=>{
      const q=models.turn(p,heading);
      return [x+q[0],q[1]+.025,z+q[2]];
    };
    pavementShadow(x,z,heading,1.02,2.13,player?.47:.31);
    if(player){
      for(const side of [-1,1]){
        const near=point(...locate([side*.64,.04,-2.45]));
        const far=point(...locate([side*1.65,.04,-18]));
        if(near&&far){
          const brush=ctx.createLinearGradient(near[0],near[1],far[0],far[1]);
          brush.addColorStop(0,'#d7eee52d');brush.addColorStop(.29,'#adcfd018');brush.addColorStop(1,'#a0d6d400');
          polygon([[side*.66-.35,.033,-2.46],[side*.66+.35,.033,-2.46],[side*1.6+1.53,.035,-18],[side*1.6-1.53,.035,-18]].map(locate),brush);
        }
        const reflection=point(...locate([side*.69,.02,3.35]));
        if(reflection){
          ctx.save();ctx.translate(reflection[0],reflection[1]);ctx.scale(.52,2.7);
          ctx.globalAlpha=brake?.7:.41;
          glow(0,0,focal/reflection[2]*.46,'#f34c54');ctx.restore();
        }
      }
    }
    const faces=[];
    for(const [kind,shape] of models.parts){
      const color=kind==='paint'?paint:kind==='tail'&&brake?0xff4955:colors[kind];
      const gloss=kind==='paint'?.27:kind==='glass'?.31:kind==='chrome'?.2:0;
      mesh(faces,shape,p=>locate(models.suspended(p,motion.pitch,motion.roll)),color,gloss,kind==='tail'||kind==='headlight');
    }
    if(player||distance<56){
      for(const side of [-1,1])for(const axle of [-1.49,1.49]){
        for(const [kind,shape] of models.wheel){
          if(!player&&distance>26&&kind!=='rubber'&&kind!=='alloy')continue;
          const steer=axle<0?motion.steer:0;
          mesh(faces,shape,p=>{
            const q=models.turn(models.rotateX(p,spin),steer);
            return locate([q[0]+side*.93,q[1]+models.radius,q[2]+axle]);
          },colors[kind],kind==='alloy'?.25:0);
        }
      }
    }
    finishMesh(faces);
    if(player&&Math.abs(driver.speed)>11){
      ctx.strokeStyle='#a6c8ca3a';ctx.lineWidth=1;
      ctx.beginPath();
      for(let i=0;i<24;i++){
        const s=i%2===0?-1:1, phase=(time*3.7+i*.247)%1;
        const p=point(...locate([s*(.94+phase*.43),.01+phase*.31,1.53+phase*2.78]));
        if(!p)continue;
        ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+s*phase*3,p[1]+1+phase*3);
      }
      ctx.stroke();
    }
  }
  function solid(x,z,w,d,y,h,colors) {
    const l=x-w/2,r=x+w/2,f=z-d/2,b=z+d/2,u=y+h;
    const side=camera.x<x?l:r, end=camera.z<z?f:b;
    polygon([[side,y,f],[side,y,b],[side,u,b],[side,u,f]],colors[1]);
    polygon([[l,y,end],[r,y,end],[r,u,end],[l,u,end]],colors[2]);
    polygon([[l,u,f],[r,u,f],[r,u,b],[l,u,b]],colors[0]);
  }
  const streetColors={
    tar:['#555f60','#394346','#424a4a'], cedar:['#8a6d56','#5b473c','#70594a'],
    concrete:['#858786','#565e5e','#686d69'], amber:['#ddb475','#8d663e','#b0804b'],
    bottle:['#4d6f65','#304b45','#3f5850'], cream:['#a6a897','#6c7268','#878d81'],
  };
  function prop(item,time) {
    const {x,z,kind}=item;
    const {tar,cedar,concrete,amber,bottle,cream}=streetColors;
    if(kind==='crate'||kind==='pallet'){
      if(kind==='pallet'){
        solid(x,z,1.16,1.45,.13,.18,cedar);
        solid(x+.13,z-.16,.87,.83,.31,.58,cedar);
        solid(x-.12,z+.53,.62,.58,.29,.45,amber);
      }else{
        solid(x,z,.68,.72,.13,.54,cedar);
        solid(x,z,.71,.74,.64,.036,amber);
      }
    }else if(kind==='planter'){
      solid(x,z,1.1,1.1,.13,.52,concrete);
      solid(x,z,.86,.91,.65,.22,bottle);
      solid(x,z,.115,.13,.83,1.25,cedar);
      const crown=point(x,2.25,z);
      if(crown){
        const size=Math.min(41,focal/crown[2]*.54);
        ctx.fillStyle='#526d58';
        for(let i=0;i<6;i++){
          const angle=i*Math.PI/3;
          ctx.beginPath();ctx.arc(crown[0]+size*.45*Math.cos(angle),crown[1]+size*.41*Math.sin(angle),size*.57,0,Math.PI*2);ctx.fill();
        }
      }
    }else if(kind==='stall'){
      for(const offset of [-.75,.75])solid(x,z+offset,.09,.09,.13,2.65,tar);
      solid(x,z,1.75,2.55,2.71,.15,bottle);
      for(let i=-2;i<=2;i++)solid(x,z+i*.46,1.78,.17,2.84,.035,cream);
      solid(x,z,1.03,1.89,.16,.87,cedar);
      solid(x,z,1.26,2.1,1.02,.11,cream);
      solid(x-.08,z-.6,.58,.61,1.14,.26,bottle);
      solid(x+.04,z+.52,.60,.68,1.14,.24,amber);
    }else if(kind==='shelter'){
      solid(x,z,1.4,3.6,2.53,.15,tar);
      for(const offset of [-1.6,1.6])solid(x,z+offset,.1,.1,.13,2.5,tar);
      solid(x+.55,z,.09,3.36,.6,1.88,['#30484f99','#31505899','#44656c99']);
      solid(x+.18,z,.46,2.03,.58,.09,amber);
    }else if(kind==='bench'){
      for(const offset of [-.68,.68])solid(x,z+offset,.31,.11,.13,.47,tar);
      solid(x,z,.55,1.8,.59,.11,cedar);
      solid(x+.23,z,.12,1.8,.71,.43,cedar);
    }else if(kind==='barrier'){
      solid(x,z,.28,1.8,.13,.61,concrete);
      for(const offset of [-.7,0,.7])solid(x,z+offset,.3,.21,.43,.26,amber);
    }else if(kind==='signal'){
      solid(x,z,.13,.13,0,3.52,tar);
      solid(x,z,.42,.33,3.12,1.03,tar);
      const p=point(x,3.33+((time%17)>11?.58:0),z);
      if(p)glow(p[0],p[1],Math.max(3,focal/p[2]*.34),(time%17)>11?'#ef6455':'#77be94');
    }else{
      solid(x,z,.17,.17,.13,1.02,tar);
      solid(x,z,.19,.19,.84,.13,amber);
    }
  }
  function pedestrian(person,pose,time) {
    const foot=point(pose.x,.15,pose.z);
    if(!foot)return;
    const model=models.human(person,pose,time);
    const locate=p=>{
      const q=models.turn(p.map(value=>value*model.scale),model.heading);
      return [pose.x+q[0],.145+q[1],pose.z+q[2]];
    };
    pavementShadow(pose.x,pose.z,model.heading,.26,.23,.30);
    const faces=[];
    for(const part of model.parts){
      if(foot[2]>51&&part.mesh==='round'&&part.scale[1]<.05)continue;
      if(part.a){
        const d=subtract(part.b,part.a),axis=normal(d);
        const right=normal(cross(axis,Math.abs(axis[1])>.81?[0,0,1]:[0,1,0]));
        const forward=cross(right,axis);
        const length=Math.hypot(...d);
        const center=part.a.map((value,i)=>value+d[i]*.5);
        mesh(faces,models.primitive.limb,p=>locate(center.map((value,i)=>
          value+(p[0]*right[i]+p[2]*forward[i])*part.width+p[1]*axis[i]*length
        )),part.color);
      }else{
        mesh(faces,models.primitive[part.mesh],p=>locate(p.map((value,i)=>value*part.scale[i]+part.center[i])),part.color);
      }
    }
    finishMesh(faces);
  }
  function streetlight(light) {
    const p = point(light.x,6.7,light.z);
    if (!p) return;
    polygon([[light.x-.09,0,light.z],[light.x+.09,0,light.z],[light.x+.09,6.7,light.z],[light.x-.09,6.7,light.z]],'#424b52');
    polygon([[light.x-1.45,6.67,light.z],[light.x,6.67,light.z],[light.x,6.79,light.z],[light.x-1.45,6.79,light.z]],'#6c6b65');
    const lamp = point(light.x-1.38,6.6,light.z);
    if (!lamp) return;
    glow(lamp[0],lamp[1],focal/lamp[2]*3.8,'#ffc489');
    const bulb = Math.max(.75, focal / lamp[2] * .22);
    ctx.fillStyle = '#ffe1bc';
    ctx.fillRect(lamp[0]-bulb,lamp[1],bulb*2,Math.max(1,bulb*.48));
  }
  function signage(mark) {
    const p = point(mark.x,mark.y,mark.z);
    if (!p) return;
    const size = Math.min(39, Math.max(2,1.45*focal/p[2]));
    if (size < 5) return;
    ctx.font = '800 '+size+'px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(mark.text).width + size * .78;
    if (mark.x === 0) {
      for (const side of [-1,1]) {
        const x = side * 11.5;
        polygon([[x-.14,0,mark.z],[x+.14,0,mark.z],[x+.14,mark.y,mark.z],[x-.14,mark.y,mark.z]],'#647476');
      }
    }
    glow(p[0],p[1],w*.7,mark.color);
    ctx.fillStyle = '#13242d';
    ctx.fillRect(p[0]-w/2,p[1]-size*.69,w,size*1.38);
    ctx.strokeStyle = mark.color;
    ctx.lineWidth = Math.max(.75,size*.04);
    ctx.strokeRect(p[0]-w/2,p[1]-size*.69,w,size*1.38);
    ctx.fillStyle = mark.color;
    ctx.fillText(mark.text,p[0],p[1]);
  }
  function beacon(target,time,groundOnly) {
    if (groundOnly) {
      const perimeter = radius => Array.from({length:32},(_,i)=>{
        const angle = i * Math.PI / 16;
        return [target.x+radius*Math.cos(angle),.035,target.z+radius*Math.sin(angle)];
      });
      const radius = 6.6 + Math.sin(time * 2.7) * .63;
      polygon(perimeter(radius),'#9bfff166');
      polygon(perimeter(radius-.28),'#153330aa');
      return;
    }
    const low = point(target.x,0,target.z);
    if (!low) return;
    polygon([[target.x-.42,0,target.z],[target.x+.42,0,target.z],[target.x+.2,27,target.z],[target.x-.2,27,target.z]],'#70fff34b');
    const marker = point(target.x,4.4+Math.sin(time*3)*.55,target.z);
    if (!marker) return;
    const size = Math.max(3, Math.min(36,focal/marker[2]*.73));
    glow(marker[0],marker[1],size*3,'#8bffec');
    ctx.fillStyle = '#bdfff6'; ctx.beginPath(); ctx.moveTo(marker[0],marker[1]-size);
    ctx.lineTo(marker[0]+size*.68,marker[1]); ctx.lineTo(marker[0],marker[1]+size);
    ctx.lineTo(marker[0]-size*.68,marker[1]); ctx.closePath(); ctx.fill();
  }
  function carLocation(item) {
    return item.horizontal ? [item.along,item.offset] : [item.offset,item.along];
  }
  function updateTraffic(dt) {
    for (const item of cars) {
      item.along += item.direction * item.speed * dt;
      if (item.along > 335) item.along = -335;
      if (item.along < -335) item.along = 335;
    }
  }
  function draw(state, dt, time, objective, immediate=false) {
    const speed = Math.min(1, Math.abs(state.speed)/45);
    const back = 9.7 + speed * 2.4;
    const menu=state.view==='menu';
    const drift=Math.max(-.78,Math.min(.78,(state.steer||0)*speed*.72));
    const side=menu?-4.4+Math.sin(time*.41)*1.4:drift;
    const goalYaw=state.heading+(menu?.23:-drift*.038);
    const turn=Math.atan2(Math.sin(goalYaw-cameraYaw),Math.cos(goalYaw-cameraYaw));
    cameraYaw+=turn*(immediate||!dt?1:1-Math.exp(-dt*10));
    const heading=cameraYaw;
    const s=Math.sin(heading),c=Math.cos(heading);
    camera.x = state.x - s*back + c*side;
    camera.z = state.z + c*back + s*side;
    camera.y = 4.55 + speed*.75;
    camera.sin = Math.sin(heading); camera.cos = Math.cos(heading);
    const pitch = state.view === 'menu' ? -.1 : -.185;
    camera.pitchSin = Math.sin(pitch); camera.pitchCos = Math.cos(pitch);
    horizon = height / 2 + Math.tan(pitch) * focal;
    backdrop(heading);
    roadway(state);
    if (objective) beacon(objective,time,true);
    const objects = [];
    function visible(x,z,margin,kind,data) {
      const p = local([x,0,z]);
      if (p[2] > -margin && p[2] < viewDistance && Math.abs(p[0]) < (Math.max(0,p[2]) + margin) * width/(2*focal) + margin) {
        objects.push([p[2],kind,data]);
      }
    }
    for (const b of buildings) visible(b.x,b.z,18,'building',b);
    for (const light of lights) visible(light.x,light.z,7,'lamp',light);
    for (const mark of signs) visible(mark.x,mark.z,10,'sign',mark);
    for(const item of streets.props){
      if(Math.hypot(item.x-state.x,item.z-state.z)<125)visible(item.x,item.z,3,'prop',item);
    }
    for(const person of streets.pedestrians){
      const pose=streets.pose(person,time);
      if(Math.hypot(pose.x-state.x,pose.z-state.z)<104)visible(pose.x,pose.z,1,'person',{person,pose});
    }
    for (const item of cars) {
      const [x,z] = carLocation(item);
      visible(x,z,4,'car',[x,z,item.horizontal?item.direction*Math.PI/2:item.direction===1?Math.PI:0,parseInt(item.paint.slice(1),16),null]);
    }
    visible(state.x,state.z,6,'car',[state.x,state.z,state.heading,0x254550,state]);
    if (objective) visible(objective.x,objective.z,7,'beacon',objective);
    objects.sort((a,b)=>b[0]-a[0]);
    for (const [distance,kind,data] of objects) {
      if (kind === 'building') building(data,distance);
      else if (kind === 'lamp') streetlight(data);
      else if (kind === 'sign') signage(data);
      else if(kind==='prop')prop(data,time);
      else if(kind==='person')pedestrian(data.person,data.pose,time);
      else if (kind === 'car') car(...data,time,distance);
      else if (kind === 'beacon') beacon(data,time,false);
    }
  }
  function blocked(x,z) {
    if (Math.abs(x) > cityLimit-14 || Math.abs(z) > cityLimit-14) return true;
    return buildings.some(b=>Math.abs(x-b.x)<b.w+1.1 && Math.abs(z-b.z)<b.d+1.1);
  }
  function trafficCollision(x,z) {
    return cars.some(item=>{
      const [cx,cz] = carLocation(item);
      return Math.abs(x-cx)<(item.horizontal?2.65:1.45) && Math.abs(z-cz)<(item.horizontal?1.45:2.65);
    });
  }
  resize();
  return { resize, setQuality, draw, updateTraffic, blocked, trafficCollision, block, cityLimit };
};
