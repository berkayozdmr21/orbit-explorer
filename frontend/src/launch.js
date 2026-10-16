export const ROCKETS=[
 {id:'orbit',name:'Orbit MK I',subtitle:'İki kademeli keşif roketi',accent:'#c78d5b',cores:1},
 {id:'ares',name:'Ares Heavy',subtitle:'Üç çekirdekli ağır taşıyıcı',accent:'#cf6958',cores:3},
 {id:'pioneer',name:'Pioneer Probe',subtitle:'Kompakt bilim taşıyıcısı',accent:'#7095c0',cores:1}
];
export const FLIGHT_DURATION=240;
export const EVENTS=[{time:0,label:'Geri sayım'},{time:5,label:'Kalkış'},{time:45,label:'Dönüş manevrası'},{time:90,label:'Kademe ayrılması'},{time:130,label:'Kaporta ayrılması'},{time:220,label:'Motor kesimi'},{time:240,label:'Yörünge sunumu'}];
export function flightAt(seconds){
 const t=Math.max(0,Math.min(FLIGHT_DURATION,Number.isFinite(seconds)?seconds:0));
 let altitude=0,verticalSpeed=0;
 if(t>5&&t<=90){altitude=.006*(t-5)**2;verticalSpeed=.012*(t-5);}
 else if(t>90&&t<=220){const u=t-90;altitude=43.35+1.02*u-.0003*u*u;verticalSpeed=1.02-.0006*u;}
 else if(t>220){altitude=170.88+.32*(t-220);verticalSpeed=.32;}
 const pitch=Math.max(0,Math.min(1,(t-35)/185))*1.14;
 return {time:t,altitude,verticalSpeed,speed:Math.hypot(verticalSpeed,7.4*Math.max(0,(t-35)/205)),fuel:Math.min(1,Math.max(0,1-(t-5)/215)),pitch,x:Math.max(0,(t-30))*Math.max(0,(t-30))*.0024,y:altitude*.23,stage:t<90?1:2,engine:t>=5&&t<220,phase:[...EVENTS].reverse().find(e=>t>=e.time).label};
}
