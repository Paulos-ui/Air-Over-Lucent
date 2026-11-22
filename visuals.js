/* Local photographic materials shared by both renderers. */
'use strict';

(() => {
  const names=['asphalt','concrete','brick','glass','steel','paving','coupe-rear','lucent-dawn'];
  const assets=new Map();
  if(typeof Image==='function'){
    for(const name of names){
      const image=new Image();
      image.decoding='async';
      image.src='assets/'+name+'.webp';
      assets.set(name,image);
    }
  }
  window.lucentVisuals={
    get(name){
      const image=assets.get(name);
      return image?.complete&&image.naturalWidth>0?image:null;
    },
    onReady(name,apply){
      const image=assets.get(name);
      if(!image)return;
      if(image.complete&&image.naturalWidth){apply(image);return;}
      image.addEventListener('load',()=>apply(image),{once:true});
    },
  };
})();
