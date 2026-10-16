import React,{useRef,useEffect,useState,Component,useMemo} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Stars,Line} from '@react-three/drei';
import * as THREE from 'three';
import Rocket from './Rocket';
import {flightAt,ROCKETS} from './launch';
function LaunchWorld({time,variant,view,reduced,onReady,onCapture,cameraKey}){
 const rocket=useRef(),controls=useRef(),{camera,gl,scene}=useThree(),flight=useMemo(()=>new THREE.Vector3(),[]),goal=useMemo(()=>new THREE.Vector3(),[]),target=useMemo(()=>new THREE.Vector3(),[]),manual=useRef(false),color=useMemo(()=>new THREE.Color(),[]);
 const preset=ROCKETS.find(x=>x.id===variant)||ROCKETS[0];
 useEffect(()=>{onReady(true);return()=>onReady(false);},[onReady]);
 useEffect(()=>{manual.current=false;},[view,cameraKey]);
 useFrame((_,dt)=>{const f=flightAt(time.current);rocket.current.position.set(f.x,f.y,0);rocket.current.rotation.z=-f.pitch;flight.set(f.x,f.y+4,0);
  color.set('#13283b').lerp(new THREE.Color('#040912'),Math.min(1,f.altitude/95));scene.background=color;
  if(!manual.current){if(view==='pad'){goal.set(21,14,24);target.set(0,5,0);}else if(view==='chase'){goal.copy(flight).add(new THREE.Vector3(-12,4,12));target.copy(flight);}else{goal.copy(flight).add(new THREE.Vector3(15,8,19));target.copy(flight);}const alpha=reduced?1:1-Math.exp(-Math.min(dt,.06)*2.4);camera.position.lerp(goal,alpha);controls.current?.target.lerp(target,alpha);}
 });
 useEffect(()=>{onCapture((width=1920)=>{const size=gl.getSize(new THREE.Vector2()),ratio=gl.getPixelRatio(),height=Math.round(width/camera.aspect);if(Math.max(width,height)>gl.capabilities.maxTextureSize)throw Error('Daha küçük render boyutu seç.');try{gl.setPixelRatio(1);gl.setSize(width,height,false);gl.render(scene,camera);const out=document.createElement('canvas');out.width=width;out.height=height+72;const ctx=out.getContext('2d');ctx.fillStyle='#080f1a';ctx.fillRect(0,0,width,height+72);ctx.drawImage(gl.domElement,0,0);ctx.fillStyle='#c4d4e6';ctx.font='18px system-ui';ctx.fillText('ORBIT EXPLORER / '+preset.name+' / Stylized launch simulation',24,height+44);return out.toDataURL('image/png');}finally{gl.setPixelRatio(ratio);gl.setSize(size.x,size.y,false);gl.render(scene,camera);}});return()=>onCapture(null);},[onCapture,gl,scene,camera,preset]);
 return <><ambientLight intensity={.75}/><directionalLight position={[-15,30,18]} intensity={3.5} color="#c9e3ff" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30}/><directionalLight position={[20,8,-10]} intensity={1.5} color="#ffbe85"/><Stars radius={170} depth={90} count={1800} factor={2} fade speed={0}/>
  <mesh position={[0,-600.1,0]} receiveShadow><sphereGeometry args={[600,96,64]}/><meshStandardMaterial color="#183b4c" roughness={.85}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.04,0]} receiveShadow><circleGeometry args={[22,64]}/><meshStandardMaterial color="#2f4443" roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,0]} receiveShadow><circleGeometry args={[4.5,48]}/><meshStandardMaterial color="#606d72" roughness={.95}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]}><ringGeometry args={[3.4,3.48,64]}/><meshBasicMaterial color="#b7a47c" side={THREE.DoubleSide}/></mesh>
  <mesh position={[-2,5.2,-.8]} castShadow><boxGeometry args={[.5,10.4,.5]}/><meshStandardMaterial color="#627683" metalness={.7}/></mesh>{[1,3,5,7,9].map(y=><group key={y}><mesh position={[-2,y,-.8]}><boxGeometry args={[1.2,.12,1.2]}/><meshStandardMaterial color="#82929b" metalness={.8}/></mesh><mesh position={[-1.05,y,-.8]}><boxGeometry args={[1.8,.09,.14]}/><meshStandardMaterial color="#9faaa9"/></mesh></group>)}
  {[-1,1].map(s=><mesh key={s} position={[s*8,2,-9]} castShadow><boxGeometry args={[3,4,4]}/><meshStandardMaterial color="#637781" roughness={.8}/></mesh>)}
  <Line points={Array.from({length:61},(_,i)=>{const f=flightAt(i*4);return [f.x,f.y,0];})} color="#7e9ab5" lineWidth={.65} dashed dashSize={.8} gapSize={1.5}/>
  <group ref={rocket}><Rocket key={variant} variant={variant} accent={preset.accent} time={time} flight reduced={reduced}/></group><OrbitControls ref={controls} makeDefault minDistance={8} maxDistance={170} maxPolarAngle={Math.PI*.56} enableDamping={!reduced} onStart={()=>{manual.current=true;}}/>
 </>;
}
class Boundary extends Component{constructor(p){super(p);this.state={failed:false};}static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="launch-fallback">3D fırlatma sahnesi yüklenemedi. Zaman çizelgesi ve uçuş göstergeleri kullanılabilir.</div>:this.props.children;}}
export default function LaunchScene(props){const [available]=useState(()=>{try{const g=document.createElement('canvas').getContext('webgl2');if(!g)return false;g.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}});if(!available)return <div className="launch-fallback">3D roket uçuşu için WebGL 2 gerekiyor. Zaman çizelgesiyle uçuş aşamalarını inceleyebilirsin.</div>;return <Boundary><Canvas shadows dpr={[1,1.6]} camera={{position:[21,14,24],fov:44,near:.1,far:1800}} gl={{antialias:true,preserveDrawingBuffer:true}}><LaunchWorld {...props}/></Canvas></Boundary>}
