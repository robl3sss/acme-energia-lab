const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function roadTileCenters(x,size=80,radius=4){const tile=Math.floor(x/size);return Array.from({length:radius*2+1},(_,i)=>(tile+i-radius)*size);}
export function desertPropX(base,x){return base+Math.round((x-base)/600)*600;}
export function pulleyRunnerRoute(s,p){
 const height=1.9,speed=3.8,left=-6,right=1.5,r=2.6,straight=right-left,arc=Math.PI*r;
 const length=2*(straight+arc),travel=Math.max(0,s.t)*speed;let d=travel%length,x,z,heading;
 if(d<straight){x=left+d;z=0;heading=Math.PI/2;}
 else if(d<straight+arc){const a=-Math.PI/2+(d-straight)/r;x=right+r*Math.cos(a);z=r+r*Math.sin(a);heading=-a;}
 else if(d<2*straight+arc){x=right-(d-straight-arc);z=2*r;heading=-Math.PI/2;}
 else{const a=Math.PI/2+(d-2*straight-arc)/r;x=left+r*Math.cos(a);z=r+r*Math.sin(a);heading=-a;}
 return {x,z,height,speed,heading,travel};
}
export function trackRunnerX(s){return clamp(s.x+5*Math.tanh(s.v/2),0,48);}
export function trackHeightAtX(x,p){const points=[[0,p.height],[12,.6],[23,p.height*.72],[35,.6],[48,p.height*1.12]];x=clamp(x,0,48);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return points.at(-1)[1];}
