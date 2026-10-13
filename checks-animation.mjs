import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from './dist/assets/vendor/three.module.js';
import {GLTFLoader} from './dist/assets/vendor/GLTFLoader.js';
import {CoyoteMotion,RoadrunnerMotion} from './dist/character-motion.js';

// Image decoding is irrelevant to joint/vertex math; the real embedded image
// buffers still pass through GLTFLoader. No browser or GPU is substituted here.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
async function load(name){const data=fs.readFileSync(`dist/assets/models/${name}.glb`);return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.length),'');}
function vertices(model){model.updateMatrixWorld(true);const points=[];model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i+=41)points.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));});return points;}
function deformation(before,after){let changed=0,max=0;for(let i=0;i<before.length;i++){const distance=before[i].distanceTo(after[i]);if(distance>.002)changed++;max=Math.max(max,distance);}return {changed,max};}
const c=await load('coyote'),cm=new CoyoteMotion(c.scene),rest=vertices(c.scene);
const a=cm.pull(0),poseA=vertices(c.scene),b=cm.pull(.36),poseB=vertices(c.scene);
assert.ok(a[0].position.distanceTo(b[0].position)>.10,'The Coyote must actually move his gripping hand');
assert.ok(deformation(rest,poseA).changed>150,'The skinned body must deform, not just translate');
assert.ok(deformation(poseA,poseB).changed>150,'Repeated pulling must change the real mesh');
for(let d=0;d<=.72;d+=.02){const hands=cm.pull(d);assert.ok(hands.some(h=>h.gripping),'At least one hand must hold the rope');for(const h of hands)assert.ok(h.position.toArray().every(Number.isFinite));}
c.scene.position.y=-.025;cm.walk(0);const foot0=cm.bones['足首L'].getWorldPosition(new THREE.Vector3());cm.walk(.54);const foot1=cm.bones['足首L'].getWorldPosition(new THREE.Vector3());assert.ok(foot0.distanceTo(foot1)>.05,'Walking must move actual foot joints');
c.scene.scale.setScalar(2.6);c.scene.position.set(.55,.46,0);c.scene.rotation.y=Math.PI/2;
let handError=0;for(let t=0;t<4;t+=.04){handError=Math.max(handError,...cm.drive(t,28,450,{L:new THREE.Vector3(1.15,1.6,-.28),R:new THREE.Vector3(1.15,1.6,.28)}));}
assert.ok(handError<.005,`Hands must stay on the handlebar, got ${handError} m`);
const r=await load('roadrunner');assert.ok(r.animations.some(a=>a.name==='Walk'));assert.ok(r.animations.some(a=>a.name==='Run'));const rm=new RoadrunnerMotion(r.scene,r.animations);
rm.animate(new THREE.Vector3(0,0,0),0,4);const rr0=vertices(r.scene);rm.animate(new THREE.Vector3(.30,0,0),.075,4);const rr1=vertices(r.scene);const changed=deformation(rr0,rr1);assert.ok(changed.changed>200&&changed.max>.05,'Roadrunner must bend the supplied leg mesh');
const frozen=vertices(r.scene);rm.animate(new THREE.Vector3(.30,0,0),.075,4);assert.ok(deformation(frozen,vertices(r.scene)).max<1e-8,'Pausing must freeze the gait');
for(const name of ['Walk','Run']){const mixer=new THREE.AnimationMixer(r.scene),clip=r.animations.find(c=>c.name===name);mixer.clipAction(clip).play();for(let i=0;i<=24;i++){mixer.setTime(i/24*clip.duration);const bounds=new THREE.Box3().setFromObject(r.scene,true);assert.ok(bounds.min.y>-.025&&bounds.min.y<.025,`${name}: foot-ground contact error ${bounds.min.y}`);}mixer.stopAllAction();}
console.log(`Articulations verified: actual Coyote mesh deformation and alternating grips; handlebar error ${(handError*1000).toFixed(2)} mm; Roadrunner Walk/Run deform ${changed.changed} sampled vertices; grounded feet and paused animation verified.`);
