import PLANETS from '../planets.json';
export {PLANETS};
export const AU_KM=149597870.7,MU=132712440018;
export const planet=id=>PLANETS.find(p=>p.id===id);
export function position(p,days){const angle=(days/p.period*Math.PI*2)+(p.seed*.47);return [Math.cos(angle)*p.orbit,0,Math.sin(angle)*p.orbit];}
export function transfer(fromId,toId,date){
 const from=planet(fromId),to=planet(toId);if(!from||!to||from===to)throw Error('İki farklı gezegen seç.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Geçerli bir tarih seç.');
 const r1=from.distance*1e6,r2=to.distance*1e6,a=(r1+r2)/2;
 const seconds=Math.PI*Math.sqrt(a*a*a/MU),days=seconds/86400;
 const departure=Math.abs(Math.sqrt(MU/r1)*(Math.sqrt(2*r2/(r1+r2))-1));
 const arrival=Math.abs(Math.sqrt(MU/r2)*(1-Math.sqrt(2*r1/(r1+r2))));
 return {days,departure,arrival,total:departure+arrival,phase:((180-360*days/to.period)%360+360)%360,synodic:1/Math.abs(1/from.period-1/to.period),arrival_date:new Date(Date.parse(date+'T00:00:00Z')+seconds*1000).toISOString().slice(0,10),educational:true};
}
export function transferPoint(from,to,t){const r1=from.orbit,r2=to.orbit,a=(r1+r2)/2,e=(r2-r1)/(r1+r2);const M=Math.PI*Math.max(0,Math.min(1,t));let E=M;for(let i=0;i<12;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return [a*(Math.cos(E)-e),0,a*Math.sqrt(1-e*e)*Math.sin(E)];}
export async function api(path,body,method){const response=await fetch('/api'+path,body===undefined&&!method?{}:{method:method||'POST',headers:{'Content-Type':'application/json','X-Explorer-Client':'orbit-explorer'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!response.ok){let msg='İşlem tamamlanamadı.';try{const json=await response.json();if(typeof json.detail==='string')msg=json.detail;}catch{}throw Error(msg);}return response.status===204?null:response.json();}
