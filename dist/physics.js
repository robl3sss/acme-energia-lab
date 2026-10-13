export const G=9.81;
export const defaults={pulley:{mass:100,height:6,duration:10,ratio:1},track:{mass:50,height:8,mu:0.04},rocket:{mass:60,thrust:450,burn:4,mu:0.08}};
export function trackGeometry(p){
 const points=[[0,p.height],[12,0.6],[23,p.height*0.72],[35,0.6],[48,p.height*1.12]];
 let sum=0;const segments=[];
 for(let i=0;i<points.length-1;i++){const [x,y]=points[i],[nx,ny]=points[i+1],dx=nx-x,dy=ny-y,length=Math.hypot(dx,dy);segments.push({x,y,dx,dy,length,start:sum,end:sum+length,sin:dy/length,cos:dx/length});sum+=length;}
 return {points,segments,length:sum};
}
export function segmentAt(q,p,direction=1){const geo=trackGeometry(p);return geo.segments.find(s=>direction<0?q>s.start+1e-8&&q<=s.end+1e-8:q>=s.start-1e-8&&q<s.end-1e-8)|| (q<=0?geo.segments[0]:geo.segments.at(-1));}
export function trackPosition(q,p,direction=1){const s=segmentAt(q,p,direction),fraction=Math.max(0,Math.min(1,(q-s.start)/s.length));return {x:s.x+s.dx*fraction,y:s.y+s.dy*fraction,angle:Math.atan2(s.dy,s.dx)};}
export function initialState(mode,p){return {mode,t:0,q:0,v:mode==='pulley'?p.height/p.duration:0,x:0,h:mode==='track'?p.height:0,loss:0,input:0,finished:false,status:'Listo para comenzar'};}
function firstBoundaryTime(v,a,d){if(Math.abs(d)<1e-12)return Infinity;if(Math.abs(a)<1e-10)return Math.abs(v)>1e-10?d/v:Infinity;const disc=v*v+2*a*d;if(disc<0)return Infinity;const sqrt=Math.sqrt(disc),q=-.5*(v+(v>=0?sqrt:-sqrt));const roots=[q/(.5*a),d===0?0:-d/q].filter(t=>t>1e-12);return roots.length?Math.min(...roots):Infinity;}
function stepTrack(s,p,dt){
 const total=trackGeometry(p).length;let remaining=dt,iterations=0;
 while(remaining>1e-9&&!s.finished&&iterations++<24){
  let dir=Math.sign(s.v);if(!dir){const seg=segmentAt(s.q,p);if(Math.abs(seg.sin)<=p.mu*seg.cos){s.finished=true;s.status='El rozamiento mantiene el carrito detenido';break;}dir=-Math.sign(seg.sin);}
  if(s.q<=1e-8&&dir<0){s.q=0;s.v=0;continue;}
  if(s.q>=total-1e-8&&dir>0){s.q=total;s.v=0;continue;}
  const seg=segmentAt(s.q,p,dir),a=-G*seg.sin-p.mu*G*seg.cos*dir;
  const boundary=dir>0?seg.end:seg.start;
  const tEdge=firstBoundaryTime(s.v,a,boundary-s.q);
  const tTurn=s.v*a<0?-s.v/a:Infinity;
  const step=Math.min(remaining,tEdge,tTurn);
  if(!Number.isFinite(step)||step<1e-10){s.finished=true;s.status='Carrito detenido';break;}
  const distance=s.v*step+0.5*a*step*step;
  s.q=Math.max(0,Math.min(total,s.q+distance));s.loss+=p.mu*p.mass*G*seg.cos*Math.abs(distance);s.v+=a*step;s.t+=step;remaining-=step;
  if(step===tTurn)s.v=0;
  if(step===tEdge)s.q=boundary;
 }
 const pos=trackPosition(s.q,p,Math.sign(s.v)||1);s.x=pos.x;s.h=pos.y;
 // Keep event integration on the work–energy surface near repeated valley reversals.
 const available=p.mass*G*(p.height-s.h)-s.loss;
 if(available<0){s.loss=Math.max(0,p.mass*G*(p.height-s.h));s.v=0;s.finished=true;s.status='El carrito se detuvo en la pista';}
 else s.v=(Math.sign(s.v)||1)*Math.sqrt(2*available/p.mass);
 if(!s.finished)s.status=s.v>=0?'Recorrido de ida: subidas y bajadas':'Recorrido de vuelta: regresa por gravedad';
}
function stepRocket(s,p,dt){
 let remaining=dt;
 while(remaining>1e-10&&!s.finished){
  const on=s.t<p.burn-1e-9,F=on?p.thrust:0,friction=p.mu*p.mass*G;
  let step=remaining;if(on)step=Math.min(step,p.burn-s.t);
  const a=s.v<=1e-9?Math.max(0,(F-friction)/p.mass):(F-friction)/p.mass;
  if(s.v>0&&a<0)step=Math.min(step,-s.v/a);
  const dx=Math.max(0,s.v*step+0.5*a*step*step);
  s.x+=dx;s.input+=F*dx;s.loss+=friction*dx;s.v=Math.max(0,s.v+a*step);s.t+=step;remaining-=step;
  if(!on&&s.v<1e-8){s.v=0;s.finished=true;s.status='El carrito se detuvo';}
  else if(s.t>=30){s.finished=true;s.status='Fin de la observación (30 s)';}
  else s.status=on?(s.v>0?'Cohete encendido':'El empuje no vence el rozamiento'):'Cohete apagado: frenado por rozamiento';
 }
}
export function advance(state,p,dt){const s={...state};if(s.finished||dt<=0)return s;
 if(s.mode==='pulley'){s.t=Math.min(p.duration,s.t+dt);s.h=p.height*s.t/p.duration;s.input=p.mass*G*s.h;s.finished=s.t>=p.duration;s.status=s.finished?'Roca elevada a la altura elegida':'Elevando a rapidez constante';}
 else if(s.mode==='track')stepTrack(s,p,dt);else stepRocket(s,p,dt);
 return s;
}
export function metrics(s,p){
 const mass=p.mass,K=0.5*mass*s.v*s.v,U=mass*G*s.h;
 const N=s.mode==='track'?mass*G*segmentAt(s.q,p,Math.sign(s.v)||1).cos:mass*G;
 const thrust=s.mode==='rocket'&&s.t<p.burn-1e-9?p.thrust:0;
 const tension=s.mode==='pulley'?mass*G/p.ratio:0;
 const initial=s.mode==='track'?mass*G*p.height:s.mode==='pulley'?K:0;
 const workNet=s.mode==='pulley'?0:K;
 return {K,U,loss:s.loss,input:s.input,initial,N,thrust,tension,rope:s.mode==='pulley'?p.ratio*s.h:0,power:s.mode==='pulley'&&!s.finished?mass*G*p.height/p.duration:thrust*Math.abs(s.v),workNet,energyError:K+U+s.loss-initial-s.input};
}
