/* Canvas-rendered city for browsers that cannot initialize WebGL. */
'use strict';

window.makeCompatibilityCity = function makeCompatibilityCity(container) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

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
          buildings.push({
            x: (col + .5) * block + dx, z: (row + .5) * block + dz,
            w: 8 + random() * 4, d: 8 + random() * 4, h: 13 + random() ** 1.7 * (row < 0 ? 92 : 64),
            hue: Math.round(189 + random() * 43), lit: random(), color: random() > .52 ? '#efbc89' : '#89b9c3',
          });
        }
      }
      lights.push({ x: col * block + 11.6, z: row * block + 25 });
    }
  }
  const skyline = Array.from({ length: 52 }, () => [6 + random() * 26, 11 + random() ** 1.65 * 88, random()]);
  const camera = { x: 0, y: 0, z: 0, sin: 0, cos: 1, pitchSin: 0, pitchCos: 1 };
  let width = 1, height = 1, focal = 1, horizon = 0, ratio = 1, viewDistance = 315;

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
  function point(x, y, z) {
    const p = local([x, y, z]);
    if (p[2] < near || p[2] > viewDistance + 55) return null;
    const [sx, sy] = screen(p);
    if (sx < -100 || sx > width + 100 || sy < -200 || sy > height + 160) return null;
    return [sx, sy, p[2]];
  }
  function polygon(vertices, color) {
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
    const moonX = width * .72 - Math.sin(heading) * width * .33;
    const moonY = horizon - height * .155;
    glow(moonX, moonY, height * .12, '#db9c80');
    ctx.fillStyle = '#ecc8aa';
    ctx.beginPath(); ctx.arc(moonX, moonY, Math.max(1, height * .013), 0, Math.PI * 2); ctx.fill();
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
    ground(-351, -351, 351, 351, '#25343b');
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
          ground(x + halfRoad, z + halfRoad, x + block - halfRoad, z + block - halfRoad, '#4b5153', .08);
          ground(x + halfRoad + .9, z + halfRoad + .9, x + block - halfRoad - .9, z + block - halfRoad - .9, '#394348', .13);
        }
        for (const d of [-11.2, 11.2]) {
          ground(x+d-.1, z+13, x+d+.1, z+71, '#737676');
          ground(x+13, z+d-.1, x+71, z+d+.1, '#737676');
        }
        for (let d = 17; d < 68; d += 8) {
          ground(x-.14, z+d, x+.14, z+d+3.4, '#b39873');
          ground(x+d, z-.14, x+d+3.4, z+.14, '#b39873');
        }
        ground(x+4.7, z+18, x+7.7, z+33, '#7188872b');
        ground(x+6, z+23, x+7.2, z+47, '#bb9b782b');
        ground(x+11, z+23, x+12, z+48, '#f1b67c30');
      }
    }
  }
  function towerFace(a, b, tall, color, lit, distance, tint) {
    polygon([[...a],[...b],[b[0],tall,b[2]],[a[0],tall,a[2]]], color);
    if (distance > 177) return;
    const across = 4;
    const floors = Math.min(12, Math.floor(tall / 3.65));
    for (let floor = 0; floor < floors; floor++) {
      const y = 2.15 + floor * 3.65;
      for (let col = 0; col < across; col++) {
        const center = (col + .5) / across;
        const randomLight = Math.sin((floor * 33 + col * 57 + lit * 103) * 2.13);
        const left = center - .065, right = center + .065;
        const x = t => a[0] + (b[0] - a[0]) * t;
        const z = t => a[2] + (b[2] - a[2]) * t;
        polygon([[x(left),y,z(left)],[x(right),y,z(right)],[x(right),y+1.23,z(right)],[x(left),y+1.23,z(left)]],
          randomLight > .43 ? tint : randomLight < -.24 ? '#1b2730' : '#465762');
      }
    }
  }
  function building(b, distance) {
    const a = [b.x-b.w,.13,b.z-b.d], p = [b.x+b.w,.13,b.z-b.d];
    const q = [b.x+b.w,.13,b.z+b.d], r = [b.x-b.w,.13,b.z+b.d];
    const fade = Math.min(13, distance / 20);
    const dark = 'hsl(' + b.hue + ' 18% ' + (19 + fade) + '%)';
    const bright = 'hsl(' + b.hue + ' 15% ' + (25 + fade) + '%)';
    if (camera.z <= b.z) towerFace(p, a, b.h, bright, b.lit, distance, b.color);
    else towerFace(r, q, b.h, bright, b.lit, distance, b.color);
    if (camera.x <= b.x) towerFace(a, r, b.h, dark, b.lit + .21, distance, b.color);
    else towerFace(q, p, b.h, dark, b.lit + .21, distance, b.color);
    polygon([a,p,q,r].map(v => [v[0],b.h,v[2]]), '#45525a');
    if (b.h > 62) {
      const antenna = point(b.x,b.h + 3,b.z);
      if (antenna) glow(antenna[0],antenna[1],focal / antenna[2] * .62,'#fc8065');
    }
  }
  function car(x,z,heading,paint,player=false) {
    const c = Math.cos(heading), s = Math.sin(heading);
    const pose = (side,h,front) => [x+side*c+front*s,h,z+side*s-front*c];
    const quad = (points, color) => polygon(points.map(p => pose(...p)),color);
    quad([[-1.3,.01,-2.5],[1.3,.01,-2.5],[1.3,.01,2.35],[-1.3,.01,2.35]],'#070e18b8');
    if (player) quad([[-1,.013,2],[1,.013,2],[4,.013,18],[-4,.013,18]],'#b2dfe020');
    quad([[-1.04,.36,-2.2],[1.04,.36,-2.2],[1.04,.87,-2.2],[-1.04,.87,-2.2]],'#26353d');
    for (const side of [-1,1]) {
      for (const f of [-1.45,1.46]) {
        quad([[side*1.08,.1,f-.43],[side*1.08,.73,f-.43],[side*1.08,.73,f+.43],[side*1.08,.1,f+.43]],'#0b1118');
      }
      quad([[side*1.04,.47,-2.19],[side*.99,.47,2.24],[side*.99,.88,2.24],[side*1.04,.88,-2.19]],paint);
    }
    quad([[-1.04,.88,-2.19],[1.04,.88,-2.19],[.99,.88,2.24],[-.99,.88,2.24]],paint);
    quad([[-.88,.88,-1.36],[.88,.88,-1.36],[.72,1.49,-.53],[-.72,1.49,-.53]],'#162731');
    quad([[-.72,1.49,-.53],[.72,1.49,-.53],[.71,1.5,.69],[-.71,1.5,.69]],'#638694');
    quad([[-.71,1.5,.69],[.71,1.5,.69],[.85,.89,1.44],[-.85,.89,1.44]],'#233b45');
    for (const side of [-1,1]) {
      const outer=side*.94, inner=side*.38;
      quad([[outer,.68,-2.22],[inner,.68,-2.22],[inner,.79,-2.22],[outer,.79,-2.22]],'#fa6c75');
      const lamp = point(...pose(side*.67,.76,-2.25));
      if (lamp) glow(lamp[0],lamp[1],focal/lamp[2]*.57,'#f14b5e');
      quad([[outer,.64,2.25],[inner,.64,2.25],[inner,.79,2.25],[outer,.79,2.25]],'#ccedf0');
    }
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
    const size = Math.min(61, Math.max(2,1.8*focal/p[2]));
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
  function draw(state, dt, time, objective) {
    const speed = Math.min(1, Math.abs(state.speed)/45);
    const back = 9.7 + speed * 2.4;
    const side = state.view === 'menu' ? -5.9 + Math.sin(time*.33)*.45 : 0;
    const heading = state.heading + (state.view === 'menu' ? .17 : 0);
    const s = Math.sin(state.heading), c = Math.cos(state.heading);
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
    for (const item of cars) {
      const [x,z] = carLocation(item);
      visible(x,z,4,'car',[x,z,item.horizontal?item.direction*Math.PI/2:item.direction===1?Math.PI:0,item.paint,false]);
    }
    visible(state.x,state.z,6,'car',[state.x,state.z,state.heading,'#3e7082',true]);
    if (objective) visible(objective.x,objective.z,7,'beacon',objective);
    objects.sort((a,b)=>b[0]-a[0]);
    for (const [distance,kind,data] of objects) {
      if (kind === 'building') building(data,distance);
      else if (kind === 'lamp') streetlight(data);
      else if (kind === 'sign') signage(data);
      else if (kind === 'car') car(...data);
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
