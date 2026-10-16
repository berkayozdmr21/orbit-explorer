import React,{useRef,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {flightAt} from './launch';
function Cylinder({position,radius,height,color,metal=.3}){return <mesh position={position} castShadow><cylinderGeometry args={[radius,radius,height,40]}/><meshStandardMaterial color={color} metalness={metal} roughness={.32}/></mesh>}
function Engine({x=0}){return <group position={[x,.1,0]}><mesh><cylinderGeometry args={[.21,.37,.5,24,1,true]}/><meshStandardMaterial color="#37444d" metalness={.9} side={THREE.DoubleSide} roughness={.25}/></mesh><Cylinder position={[0,.38,0]} radius={.24} height={.22} color="#202a34"/></group>}
function Exhaust({active,reduced}){
 const group=useRef(),smoke=useRef(),dummy=useMemo(()=>new THREE.Object3D(),[]);
 useFrame(({clock})=>{if(!group.current)return;group.current.visible=active;const t=reduced?0:clock.elapsedTime;group.current.scale.set(1,1+Math.sin(t*31)*.11,1);if(smoke.current){for(let i=0;i<60;i++){const age=(t*.65+i/60)%1,a=i*2.399;dummy.position.set(Math.sin(a)*age*1.8,-.5-age*7,Math.cos(a)*age*1.8);dummy.scale.setScalar(.10+age*.65);dummy.updateMatrix();smoke.current.setMatrixAt(i,dummy.matrix);}smoke.current.instanceMatrix.needsUpdate=true;}});
 return <group ref={group}><mesh position={[0,-1.6,0]} rotation={[Math.PI,0,0]}><coneGeometry args={[.38,3.2,24]}/><meshBasicMaterial color="#ffb24d" transparent opacity={.8} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh><mesh position={[0,-.75,0]} rotation={[Math.PI,0,0]}><coneGeometry args={[.24,1.5,24]}/><meshBasicMaterial color="#c6e5ff"/></mesh><pointLight color="#ff973d" intensity={15} distance={10}/><instancedMesh ref={smoke} args={[null,null,60]} frustumCulled={false}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#909baf" transparent opacity={.065} depthWrite={false}/></instancedMesh></group>;
}
export default function Rocket({variant='orbit',accent='#c78d5b',time,flight=false,reduced=false,mini=false}){
 const stage=useRef(),fairing=useRef(),boosters=useRef(),flame=useRef();
 useFrame(()=>{const t=time?.current||0,s=flightAt(t),separation=Math.max(0,t-90);if(stage.current){stage.current.position.set(-separation*.035,-separation*.075,0);stage.current.rotation.z=separation*.009;}if(fairing.current){fairing.current.position.x=Math.max(0,t-130)*.035;fairing.current.position.y=Math.max(0,t-130)*.012;fairing.current.rotation.z=-Math.max(0,t-130)*.012;}if(boosters.current){boosters.current.position.y=-Math.max(0,t-70)*.07;}if(flame.current)flame.current.visible=mini||(flight&&s.engine);});
 return <group scale={variant==='pioneer'?.78:1}>
  <group ref={stage}><Cylinder position={[0,2.05,0]} radius={.52} height={3.6} color="#e2e5e5"/><Cylinder position={[0,3.7,0]} radius={.53} height={.26} color="#23313f"/><Cylinder position={[0,.55,0]} radius={.53} height={.38} color="#222f3b"/>{[0,1,2].map(i=><Cylinder key={i} position={[0,1.1+i*.75,0]} radius={.525} height={.025} color="#87949b"/>)}<Cylinder position={[0,2.25,0]} radius={.527} height={.45} color={accent}/><Engine/>{[0,1,2,3].map(i=><mesh key={i} position={[Math.sin(i*Math.PI/2)*.55,.75,Math.cos(i*Math.PI/2)*.55]} rotation={[0,i*Math.PI/2,0]} castShadow><boxGeometry args={[.065,.9,.65]}/><meshStandardMaterial color="#263645" metalness={.6}/></mesh>)}</group>
  <Cylinder position={[0,4.9,0]} radius={.5} height={2.05} color="#e7ebed"/><Cylinder position={[0,4.0,0]} radius={.51} height={.3} color={accent}/><Cylinder position={[0,5.8,0]} radius={.51} height={.20} color="#263643"/>
  <group ref={fairing}><mesh position={[0,6.6,0]} castShadow><coneGeometry args={[.62,1.65,40]}/><meshStandardMaterial color="#e8edef" metalness={.25} roughness={.3}/></mesh><Cylinder position={[0,5.95,0]} radius={.62} height={.35} color="#e0e6e9"/></group>
  <group position={[0,5.8,0]}><Cylinder position={[0,.2,0]} radius={.28} height={.4} color="#d0b476" metal={.7}/>{[-1,1].map(s=><mesh key={s} position={[s*.55,.1,0]}><boxGeometry args={[.6,.4,.025]}/><meshStandardMaterial color="#264c7b" metalness={.6}/></mesh>)}</group>
  {variant==='ares'&&<group ref={boosters}>{[-1,1].map(s=><group key={s} position={[s*1.05,0,0]}><Cylinder position={[0,2.0,0]} radius={.36} height={3.7} color="#d6dfe3"/><mesh position={[0,4.2,0]}><coneGeometry args={[.36,.8,28]}/><meshStandardMaterial color="#dbe4e7"/></mesh><Cylinder position={[0,1.7,0]} radius={.365} height={.4} color={accent}/><Engine/></group>)}</group>}
  <group ref={flame}><Exhaust active={mini||flight} reduced={reduced}/></group>
 </group>;
}
