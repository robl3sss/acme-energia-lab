import * as THREE from './assets/vendor/three.module.js';
import {OrbitControls} from './assets/vendor/OrbitControls.js';
import {GLTFLoader} from './assets/vendor/GLTFLoader.js';
import {trackGeometry,trackPosition,metrics,G} from './physics.js?v=responsive-4';
import {CoyoteMotion,RoadrunnerMotion,pullCrouch} from './character-motion.js?v=responsive-4';
import {roadTileCenters,desertPropX,pulleyRunnerRoute,trackRunnerX,trackHeightAtX} from './routes.js?v=responsive-4';

export class LabScene{
 constructor(mount,onReady,onError){
  this.mount=mount;this.mode='pulley';this.cameraView='perspective';this.showForces=true;this.bones={};this.params=null;this.state=null;this.motion={approach:0,motionTime:0};
  try{
   this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.matchMedia?.('(pointer:coarse)').matches?1.35:1.75));this.renderer.setClearColor(0xe6ddc5);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;mount.appendChild(this.renderer.domElement);
   this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xe6ddc5);this.scene.fog=new THREE.Fog(0xe6ddc5,60,170);
   this.camera=new THREE.PerspectiveCamera(40,1,.1,300);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.maxPolarAngle=Math.PI*.49;this.controls.minDistance=6;this.controls.maxDistance=100;this.controls.enablePan=true;
   this.materials={sand:new THREE.MeshStandardMaterial({color:0xcfc09c,roughness:1}),rock:new THREE.MeshStandardMaterial({color:0x907960,roughness:1}),wood:new THREE.MeshStandardMaterial({color:0x826347,roughness:.85}),steel:new THREE.MeshStandardMaterial({color:0x5a6256,roughness:.65,metalness:.4}),road:new THREE.MeshStandardMaterial({color:0x68685b,roughness:.9,side:THREE.DoubleSide}),yellow:new THREE.MeshStandardMaterial({color:0xe2b548,roughness:.7}),red:new THREE.MeshStandardMaterial({color:0xb94b29,roughness:.65}),rubber:new THREE.MeshStandardMaterial({color:0x333a34,roughness:.8}),rope:new THREE.MeshStandardMaterial({color:0xc8ad70,roughness:1}),cactus:new THREE.MeshStandardMaterial({color:0x75816a,roughness:.9}),flame:new THREE.MeshBasicMaterial({color:0xed9d40}),blue:new THREE.MeshBasicMaterial({color:0x3d788c}),weight:new THREE.MeshBasicMaterial({color:0xbe5a37})};
   this.scene.add(new THREE.HemisphereLight(0xfff6df,0x8a826b,2.4));const sun=new THREE.DirectionalLight(0xffeed4,3);sun.position.set(-15,30,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=65;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-25;sun.shadow.normalBias=.04;sun.shadow.bias=-.0001;this.scene.add(sun);this.scene.add(sun.target);this.sun=sun;this.scene.add(new THREE.AmbientLight(0xffffff,.25));
   this.world=new THREE.Group();this.scene.add(this.world);this.buildDesert();this.dynamic=new THREE.Group();this.scene.add(this.dynamic);this.characters=new THREE.Group();this.scene.add(this.characters);
   this.arrows=new THREE.Group();this.scene.add(this.arrows);
   this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(mount);this.resize();
   const loader=new GLTFLoader();Promise.all([loader.loadAsync('./assets/models/coyote.glb'),loader.loadAsync('./assets/models/roadrunner.glb?v=articulaciones-2')]).then(([c,r])=>{
    this.coyote=c.scene;this.roadrunner=r.scene;this.coyote.scale.setScalar(2.6);this.roadrunner.scale.setScalar(2.2);
    for(const model of [this.coyote,this.roadrunner]){model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;node.frustumCulled=false;}if(node.isBone)this.bones[node.name]=node;});this.characters.add(model);}
    this.coyoteMotion=new CoyoteMotion(this.coyote);this.roadrunnerMotion=new RoadrunnerMotion(this.roadrunner,r.animations);this.bones=this.coyoteMotion.bones;
    if(this.params)this.update(this.state,this.params);onReady();
   }).catch(onError);
  }catch(error){onError(error);}
 }
 mesh(geo,mat,x=0,y=0,z=0,parent=this.dynamic){const obj=new THREE.Mesh(geo,mat);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
 box(w,h,d,mat,x,y,z=0,parent=this.dynamic){return this.mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
 cylinder(r,h,mat,x,y,z=0,parent=this.dynamic){return this.mesh(new THREE.CylinderGeometry(r,r,h,12),mat,x,y,z,parent);}
 buildDesert(){
  const ground=this.mesh(new THREE.PlaneGeometry(900,900),this.materials.sand,20,-.2,0,this.world);ground.rotation.x=-Math.PI/2;ground.castShadow=false;this.ground=ground;
  const mesas=[[-35,9,-32,8],[-12,13,-45,11],[21,8,-36,9],[59,14,-48,12],[82,10,-28,10],[-32,6,25,9],[85,7,22,9]];
  for(const[x,h,z,r]of mesas){const base=this.mesh(new THREE.CylinderGeometry(r*.6,r,h,6),new THREE.MeshStandardMaterial({color:0xb6a080,roughness:1}),x,h/2-.2,z,this.world);base.rotation.y=.3;this.mesh(new THREE.CylinderGeometry(r*.5,r*.62,1.1,6),this.materials.rock,x,h+.2,z,this.world);}
  for(const[x,z,s]of[[-10,-8,1],[9,-13,.9],[38,-12,1.3],[57,-10,1],[-8,14,1],[22,17,.8],[60,16,1.2]]){const cactus=new THREE.Group();cactus.position.set(x,0,z);cactus.scale.setScalar(s);this.world.add(cactus);this.cylinder(.22,2.8,this.materials.cactus,0,1.2,0,cactus);this.cylinder(.16,1.3,this.materials.cactus,-.65,1.4,0,cactus);const arm=this.cylinder(.15,.65,this.materials.cactus,-.35,.85,0,cactus);arm.rotation.z=Math.PI/2;this.cylinder(.15,.9,this.materials.cactus,.6,1.9,0,cactus);const arm2=this.cylinder(.15,.6,this.materials.cactus,.3,1.5,0,cactus);arm2.rotation.z=Math.PI/2;}
  this.desertProps=this.world.children.filter(n=>n!==ground).map(node=>({node,x:node.position.x}));
 }
 clearDynamic(){this.dynamic.traverse(n=>{if(n.geometry)n.geometry.dispose();});this.dynamic.clear();this.arrows.clear();}
 label(text,x,y,z,width=2.7){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f6edce';ctx.fillRect(0,0,512,128);ctx.fillStyle='#383b2d';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex}));sprite.position.set(x,y,z);sprite.scale.set(width,width/4,1);this.dynamic.add(sprite);return sprite;}
 line(points,r=.055,mat=this.materials.rope){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');return this.mesh(new THREE.TubeGeometry(curve,Math.max(20,points.length*5),r,6,false),mat);}
 wheel(x,y,z,parent,r=.42){const obj=this.mesh(new THREE.CylinderGeometry(r,r,.22,16),this.materials.rubber,x,y,z,parent);obj.rotation.x=Math.PI/2;this.mesh(new THREE.CylinderGeometry(r*.42,r*.42,.24,12),this.materials.steel,x,y,z,parent).rotation.x=Math.PI/2;return obj;}
 makeCart(rocket=false){const cart=new THREE.Group();this.dynamic.add(cart);this.box(2.9,.35,1.65,this.materials.red,0,.45,0,cart);this.box(2.5,.1,1.5,this.materials.wood,0,.67,0,cart);this.wheels=[];for(const x of [-.9,.9])for(const z of [-.86,.86])this.wheels.push(this.wheel(x,.28,z,cart));this.box(.08,1.1,.08,this.materials.steel,1.15,1.1,-.6,cart);this.box(.08,1.1,.08,this.materials.steel,1.15,1.1,.6,cart);this.box(.1,.1,1.35,this.materials.steel,1.15,1.6,0,cart);if(rocket){const body=this.mesh(new THREE.CylinderGeometry(.35,.35,2.7,20),this.materials.steel,-.1,1,-1.13,cart);body.rotation.z=-Math.PI/2;const nose=this.mesh(new THREE.ConeGeometry(.35,.65,20),this.materials.red,1.6,1,-1.13,cart);nose.rotation.z=-Math.PI/2;this.flame=this.mesh(new THREE.ConeGeometry(.3,1.4,12),this.materials.flame,-2.1,1,-1.13,cart);this.flame.rotation.z=Math.PI/2;this.box(.5,.7,.06,this.materials.yellow,-1.2,1.2,-1.13,cart);}
  this.cart=cart;return cart;
 }
 makePulley(x,y,movable=false){const group=new THREE.Group();group.position.set(x,y,0);this.dynamic.add(group);const rotor=new THREE.Group();group.add(rotor);group.userData.rotor=rotor;this.mesh(new THREE.TorusGeometry(.55,.12,8,24),this.materials.steel,0,0,0,rotor);this.mesh(new THREE.CylinderGeometry(.47,.47,.3,20),this.materials.yellow,0,0,0,rotor).rotation.x=Math.PI/2;for(const angle of [0,Math.PI/3,Math.PI*2/3]){const spoke=this.box(.05,.85,.04,this.materials.steel,0,0,.18,rotor);spoke.rotation.z=angle;}this.box(.1,1.2,.1,this.materials.steel,0,0,.25,group);if(!movable)this.box(.15,1.1,.15,this.materials.wood,x,y+.9,0);return group;}
 rebuild(mode,p){
  if(!this.renderer)return;this.mode=mode;this.params={...p};this.clearDynamic();this.cart=null;this.flame=null;this.ropeMesh=null;this.mobile=null;this.roadTiles=[];this.runnerTime=null;this.runnerYaw=Math.PI/2;this.motion={approach:0,motionTime:0};this.roadrunnerMotion?.resetTravel();this.ground.position.x=20;for(const prop of this.desertProps)prop.node.position.x=prop.x;this.sun.position.set(-15,30,20);this.sun.target.position.set(0,0,0);
  if(mode==='pulley'){
   this.box(.6,15.5,.65,this.materials.wood,-5,7.55,-1.8);this.box(.6,15.5,.65,this.materials.wood,1.2,7.55,-1.8);this.box(7.1,.55,2.4,this.materials.wood,-1.9,15.3,-.4);this.box(1.8,.24,3,this.materials.wood,-5,.08,-1.8);this.box(1.8,.24,3,this.materials.wood,1.2,.08,-1.8);
   this.fixed=this.makePulley(p.ratio===1?-2:-1.45,13.6);if(p.ratio===2)this.mobile=this.makePulley(-2,2,true);
   this.rock=this.mesh(new THREE.DodecahedronGeometry(1.03,0),this.materials.rock,-2,1,0);this.rock.scale.set(1.15,.85,1);this.rock.rotation.set(.3,.1,.2);this.box(7.5,.025,1.35,this.materials.rope,-2.25,-.16,0);for(let x=-6;x<1.5;x+=.8)this.box(.25,.018,.065,this.materials.yellow,x,-.13,0);
  }else if(mode==='track'){
   const geo=trackGeometry(p);for(const seg of geo.segments){const road=this.box(seg.length,.25,3.8,this.materials.road,seg.x+seg.dx/2,seg.y+seg.dy/2-.12);road.rotation.z=Math.atan2(seg.dy,seg.dx);const stripe=this.box(seg.length,.026,.09,this.materials.yellow,seg.x+seg.dx/2,seg.y+seg.dy/2+.035);stripe.rotation.z=road.rotation.z;
    for(const x of [seg.x+seg.dx*.18,seg.x+seg.dx*.72]){const y=seg.y+seg.dy*(x-seg.x)/seg.dx;this.box(.25,Math.max(.1,y),2.8,this.materials.wood,x,y/2-.15);}}
   this.makeCart();this.label('IDA / VUELTA',0,p.height+1.4,2.6,3.5);this.label('REGRESO',48,p.height*1.12+1.4,2.6,3);
  }else{
   for(const x of roadTileCenters(0)){const tile=new THREE.Group();tile.position.x=x;this.dynamic.add(tile);this.box(80,.12,4.7,this.materials.road,0,-.02,0,tile);for(let stripe=-38;stripe<40;stripe+=4)this.box(1.8,.025,.11,this.materials.yellow,stripe,.06,0,tile);this.roadTiles.push(tile);}this.makeCart(true);this.label('ACME ROCKET',-4,2.6,-3,4);this.box(.15,2,.15,this.materials.wood,-4,1.1,-3);
  }
  this.setCamera(this.cameraView,true);
 }
 setCamera(view,force=false){this.cameraView=view;if(!this.renderer)return;const aspect=this.mount.clientWidth/Math.max(1,this.mount.clientHeight),narrow=aspect<1.2;
  if(this.mode==='pulley'){this.controls.target.set(0,5.3,0);this.camera.position.set(view==='side'?0:11,view==='side'?6:9,narrow?29:27);}
  else if(this.mode==='track'){this.controls.target.set(24,4,0);this.camera.position.set(view==='side'?24:37,view==='side'?8:25,narrow?86:68);}
  else{this.controls.target.set(8,1.3,0);this.camera.position.set(view==='side'?8:17,view==='side'?4:10,narrow?33:25);}
  this.controls.update();
 }
 vector(origin,direction,length,color,label){const arrow=new THREE.ArrowHelper(new THREE.Vector3(...direction).normalize(),new THREE.Vector3(...origin),length,color,.28,.13);this.arrows.add(arrow);}
 update(s,p,motion){
  this.state=s;this.params=p;if(motion)this.motion=motion;if(!this.renderer)return;
  const actionTime=this.motion.motionTime??s.t;
  const m=metrics(s,p);this.arrows.traverse(n=>{if(n.material)n.material.dispose();});this.arrows.clear();this.arrows.visible=this.showForces;
  if(this.mode==='pulley'){
   const rockY=3.4+s.h;this.rock.position.y=rockY;if(this.mobile){this.mobile.position.y=rockY+1.55;this.mobile.userData.rotor.rotation.z=-s.h/.55;}this.fixed.userData.rotor.rotation.z=-p.ratio*s.h/.55;
   if(this.ropeMesh){this.dynamic.remove(this.ropeMesh);this.ropeMesh.geometry.dispose();}
   const approach=this.motion.approach??1,distance=2.3*approach*approach*(3-2*approach),bob=approach<1?.008*Math.cos(distance/1.08*Math.PI*4):0;
   let grips=[];
   if(this.coyote){this.coyote.position.set(7-distance,(approach<1?-.025+bob:-pullCrouch(p.ratio*s.h))*2.6,.3);this.coyote.rotation.set(0,-Math.PI/2,0,'ZYX');if(approach<1)this.coyoteMotion.walk(distance,bob,Math.max(0,(approach-.82)/.18));else grips=this.coyoteMotion.pull(p.ratio*s.h,s.finished);}
   const hand=new THREE.Vector3(4.25,1.4,.3);const activeHands=grips.filter(g=>g.gripping).sort((a,b)=>b.position.y-a.position.y);if(activeHands.length)hand.copy(activeHands.at(-1).position);
   const coil=.2+p.ratio*s.h*.045,tail=[hand.toArray(),[hand.x+.15,.15,hand.z],[hand.x+coil,.15,hand.z+coil],[hand.x,.15,hand.z+coil*1.6],[hand.x-coil,.15,hand.z+coil],[hand.x,.15,hand.z+.15]];
   if(activeHands.length>1)tail.unshift(...activeHands.slice(0,-1).map(g=>g.position.toArray()));
   const pts=p.ratio===1?[[-2,rockY+.7,0],[-2,13.4,0],[-2.55,13.6,0],[-2,14.16,0],[-1.45,13.6,0],...tail]:[[-2.55,14.95,0],[-2.55,rockY+1.55,0],[-2,rockY+1,0],[-1.45,rockY+1.55,0],[-1.45,13.1,0],[-1.98,13.6,0],[-1.45,14.16,0],[-.9,13.6,0],...tail];
   this.ropeMesh=this.line(pts,.045);
   if(this.roadrunner){const route=pulleyRunnerRoute(s,p);this.roadrunner.scale.setScalar(route.height);this.roadrunner.position.set(route.x,0,route.z);this.roadrunner.rotation.set(0,route.heading,0,'ZYX');this.roadrunnerMotion.animate(this.roadrunner.position,actionTime,route.speed);}
   this.vector([-2.1,rockY,1.15],[0,-1,0],1.9,0xbe5a37);this.vector([-1.8,rockY,1.15],[0,1,0],1.9,0x3d788c);
   if(this.cameraView==='follow'){const target=new THREE.Vector3(0,rockY+.7,0),delta=target.clone().sub(this.controls.target);this.controls.target.copy(target);this.camera.position.add(delta);}
  }else{
   const pos=this.mode==='track'?trackPosition(s.q,p,Math.sign(s.v)||1):{x:s.x,y:0,angle:0};if(this.mode==='track')pos.angle=Math.atan2(trackHeightAtX(pos.x+.9,p)-trackHeightAtX(pos.x-.9,p),1.8);this.cart.position.set(pos.x,pos.y+.14,0);this.cart.rotation.z=pos.angle;
   if(this.coyote){const local=new THREE.Vector3(.55,.46,0).applyAxisAngle(new THREE.Vector3(0,0,1),pos.angle).add(this.cart.position);this.coyote.position.copy(local);this.coyote.rotation.set(0,Math.PI/2,pos.angle,'ZYX');this.cart.updateMatrixWorld(true);const targets={L:this.cart.localToWorld(new THREE.Vector3(1.15,1.6,-.28)),R:this.cart.localToWorld(new THREE.Vector3(1.15,1.6,.28))};this.coyoteMotion.drive(s.t,s.v,m.thrust,targets);}
   if(this.roadrunner){let x=this.mode==='track'?trackRunnerX(s):Math.max(16+3*s.t,s.x+9),y=0,angle=0;if(this.mode==='track'){const segment=trackGeometry(p).segments.find(seg=>x<=seg.x+seg.dx)||trackGeometry(p).segments.at(-1);y=segment.y+segment.dy*(x-segment.x)/segment.dx;angle=Math.atan2(segment.dy,segment.dx);}this.roadrunner.scale.setScalar(2.2);this.roadrunner.position.set(x,y+.04,-1.5);const desired=s.v<0?-Math.PI/2:Math.PI/2,dt=this.runnerTime===null?0:Math.max(0,Math.min(.1,actionTime-this.runnerTime));if(this.runnerTime===null)this.runnerYaw=desired;else{const delta=Math.atan2(Math.sin(desired-this.runnerYaw),Math.cos(desired-this.runnerYaw));this.runnerYaw+=Math.max(-dt*7,Math.min(dt*7,delta));}this.runnerTime=actionTime;this.roadrunner.rotation.set(0,this.runnerYaw,angle,'ZYX');this.roadrunnerMotion.animate(this.roadrunner.position,actionTime,this.mode==='rocket'?Math.max(3,Math.abs(s.v)):Math.abs(s.v));}
   if(this.mode==='rocket'){const centers=roadTileCenters(s.x);this.roadTiles.forEach((tile,i)=>{tile.position.x=centers[i];});this.ground.position.x=s.x;for(const prop of this.desertProps)prop.node.position.x=desertPropX(prop.x,s.x);this.sun.position.x=s.x-15;this.sun.target.position.x=s.x;}
   if(this.flame){this.flame.visible=m.thrust>0;this.flame.scale.y=1+.12*Math.sin(s.t*42);}
   for(const w of this.wheels||[])w.rotation.set(Math.PI/2,(this.mode==='track'?s.q:s.x)/.42,0);
   const origin=[pos.x,pos.y+1.5,1.25],sin=Math.sin(pos.angle),cos=Math.cos(pos.angle);this.vector(origin,[0,-1,0],1.8,0xbe5a37);this.vector(origin,[-sin,cos,0],1.7,0x3d788c);
   if(p.mu>0&&Math.abs(s.v)>1e-6)this.vector(origin,[-cos*Math.sign(s.v),-sin*Math.sign(s.v),0],1.45,0xd98a3f);
   if(this.mode==='rocket'&&m.thrust>0)this.vector(origin,[1,0,0],2.3,0x6b8757);
   if(this.mode==='rocket'||this.cameraView==='follow'){const follow=this.mode==='rocket'||this.cameraView==='follow';if(follow){const target=new THREE.Vector3(pos.x+3,pos.y+2,0),delta=target.clone().sub(this.controls.target);this.controls.target.copy(target);this.camera.position.add(delta);}}
  }
 }
 zoom(factor){if(!this.renderer)return;const offset=this.camera.position.clone().sub(this.controls.target),length=Math.max(6,Math.min(100,offset.length()*factor));offset.setLength(length);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();}
 resize(){if(!this.renderer)return;const width=Math.max(1,this.mount.clientWidth),height=Math.max(1,this.mount.clientHeight),oldAspect=this.camera.aspect;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();if(this.params&&Math.abs(this.camera.aspect-oldAspect)>.3){this.setCamera(this.cameraView);this.update(this.state,this.params);}}
 render(){if(!this.renderer)return;this.controls.update();this.renderer.render(this.scene,this.camera);}
}
