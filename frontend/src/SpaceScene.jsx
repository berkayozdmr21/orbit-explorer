import React,{useMemo,useRef,useEffect,useState,Component} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Stars,Line,Html} from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import Rocket from './Rocket';
import {PLANETS,planet,position,transferPoint} from './orbits';

function hash(x,y,s){const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n);}
function noise(x,y,s){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,fx=u*u*(3-2*u),fy=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b,s),hash(a+1,b,s),fx),THREE.MathUtils.lerp(hash(a,b+1,s),hash(a+1,b+1,s),fx),fy);}
function surface(p){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height),base=new THREE.Color(p.color),land=new THREE.Color('#718e68');
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const u=x/canvas.width,v=y/canvas.height,n=noise(u*14,v*10,p.seed)*.65+noise(u*42,v*30,p.seed+1)*.25+noise(u*100,v*80,p.seed+2)*.1;
  const color=base.clone();let factor=.45+n*.75;
  if(p.id==='earth'){
   const continental=noise(u*9,v*6,12)*.7+noise(u*24,v*18,13)*.3;
   color.set(continental>.53?'#568264':'#174875');if(continental>.66)color.copy(land);
   if(v<.07||v>.93)color.set('#dde6d9');factor=.8+n*.4;
  }else if(['jupiter','saturn'].includes(p.id)){
   factor=.63+.24*Math.sin(v*90+noise(u*18,v*12,p.seed)*3)+.13*n;
   if(p.id==='jupiter'&&Math.pow((u-.61)/.06,2)+Math.pow((v-.59)/.035,2)<1){color.set('#a36040');factor=.9;}
  }else if(['uranus','neptune'].includes(p.id))factor=.7+.11*Math.sin(v*65+n*2)+n*.18;
  color.convertLinearToSRGB();const i=(y*canvas.width+x)*4;image.data[i]=Math.min(255,color.r*255*factor);image.data[i+1]=Math.min(255,color.g*255*factor);image.data[i+2]=Math.min(255,color.b*255*factor);image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function Atmosphere({color,radius}){return <mesh scale={radius*1.045}><sphereGeometry args={[1,48,32]}/><shaderMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} uniforms={{tint:{value:new THREE.Color(color)}}} vertexShader={`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`} fragmentShader={`uniform vec3 tint;varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),3.5);gl_FragColor=vec4(tint,a*.7);}`}/></mesh>}
function PlanetBody({p,focus=false,reduced,selected,onSelect,labels}){
 const mesh=useRef(),group=useRef(),cloud=useRef();const texture=useMemo(()=>surface(p),[p]);const radius=focus?2.7:p.radius;const cloudMap=useMemo(()=>{if(p.id!=='earth')return null;const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(512,256);for(let y=0;y<256;y++)for(let x=0;x<512;x++){const n=noise(x/22+Math.sin(y/17)*2,y/12,91)*.7+noise(x/8,y/9,92)*.3,i=(y*512+x)*4;im.data[i]=230;im.data[i+1]=241;im.data[i+2]=248;im.data[i+3]=Math.max(0,(n-.52))*470;}ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;},[p]);
 useEffect(()=>()=>{texture.dispose();cloudMap?.dispose();},[texture,cloudMap]);
 useEffect(()=>{if(focus&&!reduced){group.current.scale.setScalar(.65);gsap.to(group.current.scale,{x:1,y:1,z:1,duration:1.5,ease:'power3.out'});}return()=>gsap.killTweensOf(group.current?.scale);},[focus,reduced]);
 useFrame((_,dt)=>{if(mesh.current&&!reduced)mesh.current.rotation.y+=Math.min(dt,.05)*.055;if(cloud.current&&!reduced)cloud.current.rotation.y+=Math.min(dt,.05)*.065;});
 return <group ref={group} rotation={[0,0,p.tilt*Math.PI/180]}><mesh ref={mesh} onClick={e=>{e.stopPropagation();onSelect?.(p.id);}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='auto';}}><sphereGeometry args={[radius,64,48]}/><meshStandardMaterial map={texture} roughness={.9}/></mesh>{p.id!=='mercury'&&<Atmosphere color={p.id==='earth'?'#559bff':p.color} radius={radius}/>}{p.id==='saturn'&&<group rotation={[Math.PI/2,0,0]}>{[[1.45,1.82,'#a99677',.55],[1.85,2.35,'#d8c39a',.7],[2.38,2.55,'#7d725e',.35]].map(([a,b,c,o],i)=><mesh key={i}><ringGeometry args={[radius*a,radius*b,128]}/><meshStandardMaterial color={c} side={THREE.DoubleSide} transparent opacity={o} roughness={.95}/></mesh>)}</group>}{p.id==='earth'&&<mesh ref={cloud} scale={radius*1.012}><sphereGeometry args={[1,64,48]}/><meshStandardMaterial map={cloudMap} transparent opacity={.7} depthWrite={false}/></mesh>}{!focus&&labels&&<Html position={[0,radius+1,0]} center distanceFactor={25}><button className={'planet-label '+(selected?'active':'')} onClick={()=>onSelect(p.id)}>{p.name}</button></Html>}</group>;
}
function Sun({reduced}){const glow=useRef();useFrame(({clock})=>{if(glow.current&&!reduced)glow.current.scale.setScalar(1+Math.sin(clock.elapsedTime*.7)*.025);});return <group><mesh><sphereGeometry args={[2.1,48,32]}/><meshBasicMaterial color="#ffce7b"/></mesh><group ref={glow}>{[2.3,2.7,3.2].map((r,i)=><mesh key={r}><sphereGeometry args={[r,40,24]}/><meshBasicMaterial color="#e58c39" transparent opacity={.09/(i+1)} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>)}</group><pointLight intensity={350} decay={1} distance={100}/></group>}
function RouteTrail({route,progress}){
 const ship=useRef(),from=planet(route.origin),to=planet(route.destination);
 const points=useMemo(()=>Array.from({length:121},(_,i)=>transferPoint(from,to,i/120)),[from,to]);
 useFrame(()=>{if(ship.current){const point=transferPoint(from,to,progress.current),near=transferPoint(from,to,Math.min(.9999,progress.current)+.0001);ship.current.position.fromArray(point);const direction=new THREE.Vector3(...near).sub(new THREE.Vector3(...point));if(direction.lengthSq()>.000001)ship.current.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}});
 return <group><Line points={points} color="#ffad73" lineWidth={2}/><group ref={ship} scale={.17}><Rocket mini/><pointLight color="#b8daff" intensity={2}/></group><Html position={points[0]} center><span className="route-marker">KALKIŞ</span></Html><Html position={points.at(-1)} center><span className="route-marker">VARIŞ</span></Html></group>;
}
function Capture({onCapture,name}){
 const {gl,scene,camera}=useThree();
 useEffect(()=>{onCapture((width=2560)=>{const size=gl.getSize(new THREE.Vector2()),ratio=gl.getPixelRatio(),height=Math.round(width/camera.aspect);if(Math.max(width,height)>gl.capabilities.maxTextureSize)throw Error('Cihaz daha düşük çözünürlük gerektiriyor.');try{gl.setPixelRatio(1);gl.setSize(width,height,false);gl.render(scene,camera);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height+72;const ctx=canvas.getContext('2d');ctx.fillStyle='#070c14';ctx.fillRect(0,0,width,height+72);ctx.drawImage(gl.domElement,0,0);ctx.fillStyle='#b8c5d5';ctx.font='18px system-ui';ctx.fillText('ORBIT EXPLORER / '+name+' / Procedural educational visualization',24,height+43);return canvas.toDataURL('image/png');}finally{gl.setPixelRatio(ratio);gl.setSize(size.x,size.y,false);gl.render(scene,camera);}});return()=>onCapture(null);},[gl,scene,camera,onCapture,name]);return null;
}
function World({selected,mode,days,route,progress,reduced,labels,onSelect,onCapture,onReady,cameraKey}){
 const controls=useRef(),planetGroups=useRef({}),{camera}=useThree();const stars=useRef();
 useEffect(()=>{onReady(true);return()=>onReady(false);},[onReady]);
 useEffect(()=>{
  const to=mode==='focus'?[selected==='saturn'?12:8,selected==='saturn'?4:2.4,selected==='saturn'?13:8]:[0,32,mode==='mission'?38:45];
  if(reduced){camera.position.fromArray(to);controls.current?.target.set(0,0,0);return;}
  if(controls.current)controls.current.enabled=false;
  const timeline=gsap.timeline({onComplete:()=>{if(controls.current)controls.current.enabled=true;}});
  timeline.to(camera.position,{x:to[0],y:to[1],z:to[2],duration:1.8,ease:'power3.inOut'},0);
  if(controls.current)timeline.to(controls.current.target,{x:0,y:0,z:0,duration:1.8,ease:'power3.inOut'},0);
  return()=>{timeline.kill();if(controls.current)controls.current.enabled=true;};
 },[mode,selected,reduced,camera,cameraKey]);
 useFrame((_,dt)=>{for(const p of PLANETS){const group=planetGroups.current[p.id];if(group){if(mode==='mission'&&route){const first=planet(route.origin),last=planet(route.destination);if(p.id===first.id)group.position.set(first.orbit,0,0);else if(p.id===last.id)group.position.set(-last.orbit,0,0);else group.position.fromArray(position(p,days.current));}else group.position.fromArray(position(p,days.current));}}if(stars.current&&!reduced)stars.current.rotation.y+=Math.min(dt,.05)*.002;});
 return <><color attach="background" args={['#070b13']}/><ambientLight intensity={mode==='focus'?.7:.55}/><group ref={stars}><Stars radius={150} depth={70} count={3200} factor={3} saturation={.12} fade speed={reduced?0:.12}/></group>{mode==='focus'?<><directionalLight position={[-3,5,8]} intensity={3.8} color="#fff4df"/><directionalLight position={[6,-1,-5]} intensity={.25} color="#7299dd"/><PlanetBody key={selected} p={planet(selected)} focus reduced={reduced}/></>:<><Sun reduced={reduced}/>{PLANETS.map(p=><group key={p.id}><Line points={Array.from({length:129},(_,i)=>[Math.cos(i/128*Math.PI*2)*p.orbit,0,Math.sin(i/128*Math.PI*2)*p.orbit])} color={p.id===selected?'#456d99':'#202e42'} lineWidth={p.id===selected?1.25:.65}/><group ref={el=>{planetGroups.current[p.id]=el;}}><PlanetBody p={p} selected={p.id===selected} onSelect={onSelect} labels={labels} reduced={reduced}/></group></group>)}{mode==='mission'&&route&&<RouteTrail route={route} progress={progress}/>}</>}<OrbitControls ref={controls} makeDefault enablePan minDistance={mode==='focus'?5:12} maxDistance={mode==='focus'?20:110} enableDamping={!reduced} dampingFactor={.06} maxPolarAngle={Math.PI*.94}/><Capture onCapture={onCapture} name={mode==='focus'?planet(selected).english:'SOLAR SYSTEM'}/></>;
}
function Fallback({selected,onSelect}){return <div className="space-fallback"><div className="fallback-sun"/>{PLANETS.map((p,i)=><button key={p.id} className={selected===p.id?'selected':''} style={{'--p':p.color,left:(10+i*11)+'%',top:(43+Math.sin(i)*10)+'%'}} onClick={()=>onSelect(p.id)}><i style={{width:12+p.radius*18,height:12+p.radius*18}}/><span>{p.name}</span></button>)}<p>2D harita · WebGL 2 kullanılamıyor. Gezegen bilgileri ve görev planlama kullanılabilir.</p></div>}
class Boundary extends Component{constructor(p){super(p);this.state={failed:false};}static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function SpaceScene(props){const [available]=useState(()=>{try{const c=document.createElement('canvas'),g=c.getContext('webgl2');if(!g)return false;g.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}});const fallback=<Fallback selected={props.selected} onSelect={props.onSelect}/>;if(!available)return fallback;return <Boundary fallback={fallback}><Canvas dpr={[1,1.6]} camera={{position:[0,32,45],fov:44,near:.1,far:400}} gl={{antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'}}><World {...props}/></Canvas></Boundary>}
