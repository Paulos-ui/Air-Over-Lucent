/* Shared world-space meshes and joint animation for both game renderers. */
'use strict';

(() => {
  const TAU=2*Math.PI;
  const radius=.414;
  function loft(rings){
    const vertices=rings.flat();
    const faces=[], n=rings[0].length;
    for(let row=0;row<rings.length-1;row++){
      for(let i=0;i<n;i++){
        const next=(i+1)%n, a=row*n, b=a+n;
        faces.push([a+i,a+next,b+next,b+i]);
      }
    }
    faces.push(Array.from({length:n},(_,i)=>n-1-i));
    faces.push(Array.from({length:n},(_,i)=>vertices.length-n+i));
    return {vertices,faces};
  }
  function section(z,w,lo,hi,shoulder=.84){
    const bevel=Math.min(.13,(hi-lo)*.33);
    return [
      [-w*.72,lo,z],[w*.72,lo,z],[w*.97,lo+bevel,z],[w,hi-bevel,z],
      [w*.95,hi-bevel*.33,z],[w*shoulder,hi,z],[-w*shoulder,hi,z],
      [-w*.95,hi-bevel*.33,z],[-w,hi-bevel,z],[-w*.97,lo+bevel,z],
    ];
  }
  function box(x,y,z,w,h,d){
    return loft([
      [[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2]],
      [[x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2]],
    ]);
  }
  function facetedStrip(vertices){
    return {vertices,faces:[vertices.map((_,i)=>i)]};
  }
  const parts=[
    ['paint',loft([
      [-2.42,.72,.46,.69],[-2.31,.94,.37,.78],[-2.06,1.015,.346,.855],[-1.57,1.065,.33,.938],
      [-.77,1.032,.325,.95],[.57,1.048,.327,.954],[1.21,1.09,.335,.967],[1.76,1.096,.346,.946],
      [2.09,1.052,.36,.891],[2.32,.978,.402,.827],[2.4,.835,.442,.735],
    ].map(args=>section(...args)))],
    ['glass',loft([
      [-1.28,.856,.885,.909,.79],[-1.01,.813,.899,1.128,.73],[-.55,.758,.909,1.438,.85],
      [-.28,.748,.916,1.491,.88],[.21,.755,.916,1.503,.87],[.55,.79,.914,1.453,.87],
      [.94,.826,.907,1.276,.85],[1.36,.907,.899,1.019,.82],[1.57,.912,.904,.932,.81],
    ].map(args=>section(...args)))],
    ['paint',loft([
      [-.52,.689,1.426,1.455,.91],[-.32,.704,1.452,1.505,.9],
      [.25,.711,1.463,1.515,.9],[.53,.696,1.416,1.463,.91],
    ].map(args=>section(...args)))],
    ['rubber',box(0,.485,2.386,1.48,.145,.075)],
    ['rubber',box(0,.557,-2.37,1.26,.173,.062)],
    ['plate',box(0,.588,2.43,.39,.118,.014)],
    ['chrome',box(-.61,.442,2.4,.19,.06,.11)],
    ['chrome',box(.61,.442,2.4,.19,.06,.11)],
    ['paint',box(0,.871,2.23,1.88,.037,.2)],
  ];
  for(const side of [-1,1]){
    parts.push(
      ['tail',facetedStrip([[side*.38,.727,2.407],[side*.86,.725,2.396],[side*.98,.767,2.338],[side*.92,.817,2.327],[side*.43,.801,2.393]])],
      ['headlight',facetedStrip([[side*.37,.646,-2.425],[side*.76,.645,-2.418],[side*.96,.731,-2.307],[side*.91,.784,-2.289],[side*.45,.709,-2.400]])],
      ['paint',box(side*.995,1.034,-.75,.29,.116,.23)],
      ['chrome',box(side*1.064,.856,.27,.034,.028,.18)],
      ['rubber',facetedStrip([[side*.97,.919,1.2],[side*1.016,.893,1.27],[side*.785,1.442,.381],[side*.754,1.464,.335]])],
    );
  }
  function axle(profile,steps=16,closed=true){
    const shape=loft(profile.map(([x,r])=>Array.from({length:steps},(_,i)=>{
      const t=i*TAU/steps;
      return [x,Math.cos(t)*r,Math.sin(t)*r];
    })));
    if(!closed)shape.faces.splice(-2,2);
    return shape;
  }
  const wheel=[
    ['rubber',axle([[-.18,.349],[-.167,.395],[-.125,radius],[.125,radius],[.167,.395],[.18,.349]])],
    ['wheelInner',axle([[-.186,.271],[.186,.271]])],
    ['chrome',axle([[-.198,.246],[-.19,.262],[.19,.262],[.198,.246]],16,false)],
    ['hub',axle([[-.207,.082],[.207,.082]],12)],
  ];
  for(const x of [-.201,.201]){
    for(let i=0;i<7;i++){
      const theta=TAU*i/7, a=Math.cos(theta),b=Math.sin(theta);
      wheel.push(['alloy',facetedStrip([
        [x,a*.061-b*.023,b*.061+a*.023],[x,a*.23-b*.018,b*.23+a*.018],
        [x,a*.23+b*.026,b*.23-a*.026],[x,a*.061+b*.023,b*.061-a*.023],
      ])]);
    }
  }
  // Shared rest-pose primitives are scaled into clothing, joints and small props.
  const rounded=loft(Array.from({length:7},(_,row)=>{
    const phi=.022+(Math.PI-.044)*row/6;
    return Array.from({length:9},(_,i)=>{
      const t=-TAU*i/9;
      return [Math.sin(phi)*Math.cos(t), -Math.cos(phi), Math.sin(phi)*Math.sin(t)];
    });
  }));
  const limb=loft([-.5,-.39,.35,.5].map((y,i)=>Array.from({length:7},(_,j)=>{
    const t=-TAU*j/7, r=[.74,1,.94,.67][i];
    return [Math.cos(t)*r,y,Math.sin(t)*r];
  })));
  const primitive={round:rounded,limb,box:box(0,0,0,2,2,2)};
  function ringsY(levels,sides){
    return loft(levels.map(([y,r])=>Array.from({length:sides},(_,i)=>{
      const theta=-TAU*i/sides;
      return [Math.cos(theta)*r,y,Math.sin(theta)*r];
    })));
  }
  const distantPrimitive={
    round:ringsY([[-1,.19],[-.55,.82],[0,1],[.61,.8],[1,.19]],6),
    limb:ringsY([[-.5,.78],[.5,.79]],6),
    box:primitive.box,
  };
  const trafficWheel=[
    ['rubber',axle([[-.175,.36],[-.12,radius],[.12,radius],[.175,.36]],10)],
    ['hub',axle([[-.185,.23],[.185,.23]],10)],
  ];
  const clothing={
    walk:[0x333d52,0x292d33,0xb9977f,0x383134],
    porter:[0xdc772d,0x3a454f,0xa87962,0x302d31],
    maintenance:[0xc5a33a,0x897c43,0xb89074,0x343437],
    market:[0x74434b,0x34383d,0x9e6e58,0x302726],
    foreman:[0x3f6256,0x252b34,0xac7a64,0x42302a],
  };
  function human(person,position,time){
    const [jacket,pants,skin,hair]=clothing[person.role]||clothing.walk;
    const moving=person.length>0;
    const cycle=time*(person.role==='porter'?6.7:8.3)+person.phase*TAU;
    const worker=person.role!=='walk';
    const movingHead=moving?Math.sin(cycle*2)*.019:Math.sin(cycle*.2)*.006;
    const height=person.height/1.7;
    const localParts=[];
    const shape=(mesh,center,scale,color)=>localParts.push({mesh,center,scale,color});
    const join=(a,b,width,color)=>localParts.push({mesh:'limb',a,b,width,color});
    const hip=.875+movingHead;
    const shoulder=1.363+movingHead;
    shape('round',[0,hip+.073,.006],[.157,.165,.118],pants);
    shape('round',[0,1.198+movingHead,-.019],[.195,.269,.129],jacket);
    shape('round',[0,1.494+movingHead,-.039],[.057,.085,.06],skin);
    shape('round',[0,1.596+movingHead,-.05],[.091,.119,.088],skin);
    shape('round',[0,1.654+movingHead,-.032],[.093,.073,.09],hair);
    shape('round',[0,1.588+movingHead,-.135],[.021,.025,.021],skin);
    if(worker&&['porter','maintenance'].includes(person.role)){
      shape('box',[0,1.176+movingHead,-.139],[.181,.018,.016],0xaeb9b8);
      shape('box',[0,1.079+movingHead,-.132],[.161,.014,.014],0xaeb9b8);
    }
    for(const side of [-1,1]){
      const stride=moving?Math.sin(cycle)*side:0;
      const lift=moving?Math.max(0,Math.cos(cycle)*side)*.14:0;
      const shoe=[side*.099,.076+lift,stride*.28];
      const knee=[side*.101,.474+lift*.55,stride*.136-.095];
      join([side*.095,hip,0],knee,.087,pants);
      join(knee,shoe,.067,pants);
      shape('round',[shoe[0],shoe[1]-.041,shoe[2]-.053],[.067,.036,.133],0x26282b);
      const start=[side*.165,shoulder,-.016];
      const fixed=person.role==='porter'||person.role==='foreman'||person.role==='maintenance';
      const workSway=person.role==='maintenance'?Math.sin(time*2.7+person.phase*5)*.14:0;
      const elbow=[side*(fixed?.216:.203),fixed?1.17:1.116+movingHead,fixed?-.137:-stride*.152];
      const hand=[fixed?side*.142+workSway:side*.201,fixed?1.075:.936+movingHead,fixed?-.294:-stride*.22-.031];
      join(start,elbow,.062,jacket);
      join(elbow,hand,.048,jacket);
      shape('round',hand,[.044,.041,.049],skin);
    }
    if(person.role==='porter')shape('box',[0,1.111,-.304],[.182,.139,.106],0x977054);
    if(person.role==='foreman')shape('box',[.007,1.114,-.303],[.123,.092,.014],0x4b504d);
    if(person.role==='maintenance'){
      const sway=Math.sin(time*2.7+person.phase*5)*.18;
      join([-.14+sway,1.273,-.293],[.43+sway,.091,-.59],.022,0x8d7652);
      shape('box',[.43+sway,.055,-.592],[.146,.043,.089],0x303934);
    }
    const direction=position.flip?Math.PI:0;
    const heading=moving?direction:Math.sign(Math.round(position.x/84)*84-position.x)*Math.PI/2;
    return {heading,scale:height,parts:localParts};
  }
  function rotateX(p,a){
    const s=Math.sin(a),c=Math.cos(a);
    return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c];
  }
  function turn(p,heading){
    const s=Math.sin(heading),c=Math.cos(heading);
    return [p[0]*c-p[2]*s,p[1],p[0]*s+p[2]*c];
  }
  function suspended(p,pitch,roll){
    const [x,y,z]=rotateX([p[0],p[1]-.44,p[2]],pitch);
    return [x*Math.cos(roll)-y*Math.sin(roll),.44+x*Math.sin(roll)+y*Math.cos(roll),z];
  }
  function dynamics(state){
    const steer=state.steer||0;
    const speed=Math.min(1,Math.abs(state.speed||0)/25);
    return {steer:steer*(.43-.17*speed),roll:steer*speed*.10,pitch:state.suspension||0};
  }
  window.lucentMotion={parts,wheel,radius,primitive,distantPrimitive,trafficWheel,human,rotateX,turn,suspended,dynamics};
})();
