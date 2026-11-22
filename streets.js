/* Street plan and pedestrian routes used by the WebGL and compatibility cities. */
'use strict';

(() => {
  function district(x,z) {
    if(x>58&&z<0)return 'relay';
    if(Math.abs(x)<154&&z>5&&z<115)return 'market';
    if(z>=115||x< -113)return 'quay';
    return 'signal';
  }

  function architecture(x,z,height) {
    const area=district(x,z), variety=Math.abs(Math.round(x*13+z*7))%5;
    const plans={
      market:['fish-market','corner-cafe','townhouse','corner-cafe','fish-market'],
      quay:['loading-bay','townhouse','fish-market','loading-bay','townhouse'],
      signal:['townhouse','corner-cafe','townhouse','loading-bay','corner-cafe'],
      relay:['loading-bay','loading-bay','corner-cafe','townhouse','loading-bay'],
    };
    const frontage=plans[area][variety];
    if(frontage==='loading-bay')return {frontage,height:Math.min(29,height*.58+5),color:0x8a8580,roof:'industrial'};
    if(frontage==='townhouse')return {frontage,height:Math.min(42,height*.68+9),color:0x987773,roof:'terrace'};
    if(frontage==='fish-market')return {frontage,height:Math.min(36,height*.62+5),color:0x7f918e,roof:'market'};
    return {frontage,height:Math.min(112,height+.5),color:0x84979f,roof:'office'};
  }

  const props=[
    ['stall',14.9,65],['crate',14.3,61],['crate',15.3,60],['bench',-14.4,67],
    ['stall',-14.9,43],['crate',-15.0,47],['planter',-14.3,58],['planter',14.4,79-11],
    ['bench',14.5,107],['bollard',14,112],['bollard',14,116],['pallet',15,124],
    ['pallet',-14.8,131],['crate',-14,133],['planter',14.4,124],['shelter',-15.2,110],
    ['shelter',14.7,-22],['bench',-14.6,-24],['planter',-14.4,-31],['planter',14.5,-35],
    ['pallet',68.75,-102],['crate',69.2,-103],['crate',69.25,-100],['bollard',69.25,-107],
    ['pallet',99,-103],['barrier',98.6,-105],['bollard',98.7,-108],['bench',98.6,-61],
    ['signal',14,98],['signal',-14,70],['signal',14,-70],['signal',70,-98],
  ].map(([kind,x,z])=>({kind,x,z}));
  for(const blockX of [-168,-84,84,168]){
    for(const z of [31,114,-34,-106]){
      props.push({kind:'planter',x:blockX+14.4,z},{kind:'bollard',x:blockX-14.5,z:z+6});
    }
  }

  const pedestrians=[
    ['walk',14.9,105,18,.13],['walk',-14.8,104,23,.61],['porter',-14.4,129,9,.53],
    ['maintenance',-14.6,116,0,.86],['walk',14.7,27,36,.35],['market',14.7,63,0,.4],
    ['market',-14.75,43,0,.12],['walk',-14.65,24,32,.02],['foreman',-14.75,-49,0,.41],
    ['walk',14.6,-67,29,.74],['walk',-14.55,-62,28,.2],['maintenance',14.55,-28,0,.25],
    ['porter',69.4,-104,6,.68],['foreman',68.8,-101,0,.27],['porter',98.65,-108,10.2,.44],
    ['walk',98.75,-63,37,.36],['walk',69.2,-65,36,.67],
  ].map(([role,x,z,length,phase])=>({role,x,z,length,phase,height:1.66+(phase*.22)}));

  function pose(person,time) {
    const moving=person.length>0;
    const phase=(person.phase+(moving?time/(person.length*(person.role==='porter'?2.8:2)):0))%1;
    const forward=phase<.5;
    const run=forward?phase*2:(1-phase)*2;
    const motion=time*(person.role==='maintenance'?1.55:1.05)+person.phase*16;
    return {
      x:person.x+(person.role==='maintenance'?Math.sin(motion)*.31:0),
      z:person.z+person.length*run,
      image:person.role==='walk'?'ped-walk-'+Math.floor((time*5.7+person.phase*7)%4):'ped-'+person.role,
      flip:moving?!forward:person.phase>.5,
      rise:moving?Math.sin(time*11.4+person.phase*23)*.022:Math.sin(motion)*.019,
    };
  }
  window.lucentStreets={architecture,props,pedestrians,pose};
})();
