import * as THREE from './assets/vendor/three.module.js';

const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const phase=x=>((x%1)+1)%1;
export const pullCrouch=distance=>.035+.01*(1-Math.cos(TAU*phase(distance/.72)));

// Rotate a posed joint in the character's coordinate system, regardless of
// the source rig's MMD bone axes and bind rotations.
function rotateInModel(model,bone,axis,angle){
 if(!bone||Math.abs(angle)<1e-9)return;
 model.updateMatrixWorld(true);
 const modelQ=model.getWorldQuaternion(new THREE.Quaternion());
 const worldAxis=new THREE.Vector3(...axis).applyQuaternion(modelQ);
 const delta=new THREE.Quaternion().setFromAxisAngle(worldAxis,angle);
 const world=bone.getWorldQuaternion(new THREE.Quaternion());
 const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
 bone.quaternion.copy(parent.multiply(delta.multiply(world))).normalize();
 model.updateMatrixWorld(true);
}

// Exact two-segment IK. The pole chooses the elbow/knee bending plane; the
// effector target is clamped only when it lies beyond the limb's reach.
export function solveTwoBone(model,upper,lower,effector,target,pole){
 if(!upper||!lower||!effector)return Infinity;
 model.updateMatrixWorld(true);
 const shoulder=upper.getWorldPosition(new THREE.Vector3());
 const elbow=lower.getWorldPosition(new THREE.Vector3());
 const wrist=effector.getWorldPosition(new THREE.Vector3());
 const a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist);
 const direction=target.clone().sub(shoulder),distance=clamp(direction.length(),Math.abs(a-b)+1e-5,a+b-1e-5);direction.normalize();
 const reachable=shoulder.clone().addScaledVector(direction,distance);
 const projection=(a*a-b*b+distance*distance)/(2*distance);
 const height=Math.sqrt(Math.max(0,a*a-projection*projection));
 let plane=pole.clone().sub(shoulder);plane.addScaledVector(direction,-plane.dot(direction));
 if(plane.lengthSq()<1e-8)plane=new THREE.Vector3(0,0,1).cross(direction);plane.normalize();
 const desiredElbow=shoulder.clone().addScaledVector(direction,projection).addScaledVector(plane,height);
 function aim(joint,child,goal){
  model.updateMatrixWorld(true);const origin=joint.getWorldPosition(new THREE.Vector3());
  const from=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),to=goal.clone().sub(origin).normalize();
  const delta=new THREE.Quaternion().setFromUnitVectors(from,to);
  const world=joint.getWorldQuaternion(new THREE.Quaternion()),parent=joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  joint.quaternion.copy(parent.multiply(delta.multiply(world))).normalize();model.updateMatrixWorld(true);
 }
 aim(upper,lower,desiredElbow);aim(lower,effector,reachable);
 return effector.getWorldPosition(new THREE.Vector3()).distanceTo(target);
}

export class CoyoteMotion{
 constructor(model){
  this.model=model;this.bones={};this.rest=new Map();this.footOrientations={};
  model.updateMatrixWorld(true);
  const inv=model.getWorldQuaternion(new THREE.Quaternion()).invert();
  model.traverse(node=>{if(node.isBone){this.bones[node.name]=node;this.rest.set(node,{q:node.quaternion.clone(),p:node.position.clone()});}});
  for(const side of ['L','R']){const foot=this.bones['足首'+side];if(foot)this.footOrientations[side]=inv.clone().multiply(foot.getWorldQuaternion(new THREE.Quaternion()));}
 }
 reset(){for(const[bone,rest]of this.rest){bone.quaternion.copy(rest.q);bone.position.copy(rest.p);}this.model.updateMatrixWorld(true);}
 world(x,y,z){return this.model.localToWorld(new THREE.Vector3(x,y,z));}
 bend(name,axis,angle){rotateInModel(this.model,this.bones[name],axis,angle);}
 arm(side,target,pole){return solveTwoBone(this.model,this.bones['腕'+side],this.bones['ひじ'+side],this.bones['手首'+side],target,pole);}
 leg(side,target,pole){const error=solveTwoBone(this.model,this.bones['足'+side],this.bones['ひざ'+side],this.bones['足首'+side],target,pole);const foot=this.bones['足首'+side];if(foot){const parent=foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),desired=this.model.getWorldQuaternion(new THREE.Quaternion()).multiply(this.footOrientations[side]);foot.quaternion.copy(parent.multiply(desired));this.model.updateMatrixWorld(true);}return error;}
 fingers(side,grip){for(const[name,bone]of Object.entries(this.bones)){if(!name.endsWith(side)||name.includes('_end')||!/[指][１２３]/.test(name))continue;bone.rotateZ((side==='L'?1:-1)*.55*grip);}}
 walk(distance,bob=0,reach=0){
  this.reset();const cycle=phase(distance/1.08),wave=Math.sin(TAU*cycle);
  this.bend('上半身',[1,0,0],.10);this.bend('上半身2',[0,1,0],.05*wave);this.bend('首',[1,0,0],-.06);
  for(const side of ['L','R']){const sign=side==='L'?1:-1,p=phase(cycle+(side==='R'?.5:0));let z,lift=0;if(p<.6)z=.125-.25*p/.6;else{const u=(p-.6)/.4;z=-.125+.25*smooth(u);lift=.105*Math.sin(Math.PI*u);}
   this.leg(side,this.world(sign*.045,.0758+.025-bob+lift,z),this.world(sign*.10,.23,.25));
   const swing=Math.sin(TAU*(cycle+(side==='R'?.5:0)));
   this.arm(side,this.world(sign*.14,.43,.055-.13*swing),this.world(sign*.23,.46,-.01));
  }
  if(reach>0){const walking=new Map([...this.rest.keys()].map(bone=>[bone,bone.quaternion.clone()]));this.pull(0);for(const[bone,q]of walking)bone.quaternion.slerpQuaternions(q,bone.quaternion.clone(),smooth(reach));}
  this.model.updateMatrixWorld(true);
 }
 pull(ropeDistance,completed=false){
  this.reset();const cycle=phase(ropeDistance/.72),effort=Math.sin(TAU*cycle),crouch=pullCrouch(ropeDistance);
  this.bend('上半身',[1,0,0],.16+.055*effort);this.bend('上半身2',[1,0,0],.07+.035*effort);this.bend('上半身3',[0,1,0],.04*effort);this.bend('首',[1,0,0],-.16);this.bend('頭',[0,1,0],.06*Math.sin(TAU*cycle));
  const grips=[];
  for(const side of ['L','R']){const sign=side==='L'?1:-1,p=phase(cycle+(side==='R'?.5:0));let y,z,gripping;if(p<.7){const u=p/.7;y=.65-.20*smooth(u);z=.18-.04*u;gripping=true;}else{const u=(p-.7)/.3;y=.45+.20*smooth(u);z=.14+.075*Math.sin(Math.PI*u);gripping=false;}
   this.arm(side,this.world(sign*(gripping?.035:.07),y,z),this.world(sign*.22,.48,.035));
   this.leg(side,this.world(sign*.045,.0758+crouch,side==='L'?.06:-.10),this.world(sign*.08,.23,.23));
   this.fingers(side,gripping?1:.12);
   const hand=this.bones['手首'+side];if(hand)grips.push({side,gripping,position:hand.getWorldPosition(new THREE.Vector3())});
  }
  this.model.updateMatrixWorld(true);return grips;
 }
 drive(time,speed,thrust,handTargets){
  this.reset();const vibration=Math.sin(time*12)*clamp(Math.abs(speed)/18)*.02;
  this.bend('上半身',[1,0,0],.28+(thrust>0?.045:0)+vibration);this.bend('上半身2',[1,0,0],.09);this.bend('上半身3',[0,0,1],.025*Math.sin(time*4)*clamp(Math.abs(speed)/12));this.bend('首',[1,0,0],-.22);const lookBack=clamp(-speed/2);this.bend('首',[0,1,0],lookBack*.5);this.bend('頭',[0,1,0],lookBack*.55+.035*Math.sin(time*2));
  const errors=[];for(const side of ['L','R']){const sign=side==='L'?1:-1;this.leg(side,this.world(sign*.055,.0758+.10,side==='L'?.04:-.10),this.world(sign*.11,.25,.27));errors.push(this.arm(side,handTargets[side],this.world(sign*.20,.44,.03)));this.fingers(side,.9);}
  this.model.updateMatrixWorld(true);return errors;
 }
}

export class RoadrunnerMotion{
 constructor(model,clips=[]){this.model=model;this.bones={};this.rest=new Map();this.previous=null;this.distance=0;this.gaitPhase=0;this.mixer=clips.length?new THREE.AnimationMixer(model):null;this.clips=clips;this.actions=null;model.traverse(node=>{if(node.isBone){this.bones[node.name]=node;this.rest.set(node,{q:node.quaternion.clone(),p:node.position.clone()});}});}
 resetTravel(){this.previous=null;this.distance=0;this.gaitPhase=0;this.mixer?.stopAllAction();this.actions=null;for(const[bone,rest]of this.rest){bone.quaternion.copy(rest.q);bone.position.copy(rest.p);}}
 animate(position,time,speed){
  const delta=this.previous&&time!==this.previous.time?position.distanceTo(this.previous.position):0;this.distance+=delta;
  this.previous={position:position.clone(),time};
  if(this.mixer){if(!this.actions)this.actions=['Walk','Run'].map(name=>{const clip=this.clips.find(c=>c.name===name)||this.clips[0],action=this.mixer.clipAction(clip);action.play();return action;});const weight=smooth((Math.abs(speed)-1.2)/2.4),scale=this.model.scale.y/2.2;this.gaitPhase+=delta/((.88+.32*weight)*scale);this.actions.forEach((action,i)=>{action.setEffectiveWeight(i===0?1-weight:weight);action.time=phase(this.gaitPhase)*action.getClip().duration;});this.mixer.update(0);this.model.updateMatrixWorld(true);return;}
  for(const[bone,rest]of this.rest)bone.quaternion.copy(rest.q);
  const cycle=this.distance/.88,amplitude=clamp(Math.abs(speed)/2,.25,1),wave=Math.sin(TAU*cycle);
  for(const side of ['L','R']){const p=phase(cycle+(side==='R'?.5:0)),hip=this.bones['rrHip'+side],knee=this.bones['rrKnee'+side],ankle=this.bones['rrAnkle'+side];if(hip)hip.rotation.x=(-.75*Math.cos(TAU*p))*amplitude;if(knee)knee.rotation.x=(.15+.90*Math.max(0,Math.sin(TAU*p)))*amplitude;if(ankle)ankle.rotation.x=-(hip?.rotation.x||0)-(knee?.rotation.x||0)+.1*Math.sin(TAU*p);}
  for(const[name,angle]of [['rrBody',.055*wave],['rrNeck',-.055*wave],['rrHead',.05*Math.sin(time*2)],['rrTail',.09*wave],['rrWingL',.08*Math.sin(TAU*cycle)],['rrWingR',-.08*Math.sin(TAU*cycle)]]){const bone=this.bones[name];if(bone)bone.rotation.x+=angle;}
  this.model.updateMatrixWorld(true);
 }
}
