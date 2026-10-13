import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {defaults,initialState,advance,metrics,G} from './dist/physics.js';
function run(mode,overrides={},duration=30){const p={...defaults[mode],...overrides};let s=initialState(mode,p),maxError=0;for(let i=0;i<Math.ceil(duration/.008)&&!s.finished;i++){s=advance(s,p,.008);const m=metrics(s,p);assert.ok(Number.isFinite(s.v)&&Number.isFinite(s.t));assert.ok(m.K>=-1e-9&&m.U>=-1e-9&&m.loss>=0);maxError=Math.max(maxError,Math.abs(m.energyError));}assert.ok(maxError<1e-6,`${mode}: energy error ${maxError}`);return {s,p,m:metrics(s,p)};}
const fixed=run('pulley',{ratio:1}),mobile=run('pulley',{ratio:2});
assert.equal(fixed.s.h,6);assert.equal(fixed.s.finished,true);assert.equal(fixed.m.input,100*G*6);assert.equal(mobile.m.tension,fixed.m.tension/2);assert.equal(mobile.m.rope,fixed.m.rope*2);assert.equal(mobile.m.input,fixed.m.input);assert.equal(fixed.m.workNet,0);
const trackFree=run('track',{mu:0});assert.equal(trackFree.s.finished,false);assert.ok(trackFree.s.x>=0&&trackFree.s.x<48);assert.equal(trackFree.m.loss,0);assert.ok(Math.abs(trackFree.m.K+trackFree.m.U-trackFree.m.initial)<1e-6);
const trackFriction=run('track');assert.ok(trackFriction.m.loss>0);assert.ok(trackFriction.m.K+trackFriction.m.U<trackFriction.m.initial);
const trackMass=run('track',{mass:100});assert.ok(Math.abs(trackMass.s.x-trackFriction.s.x)<1e-9);assert.ok(Math.abs(trackMass.s.v-trackFriction.s.v)<1e-9);assert.ok(Math.abs(trackMass.m.loss-trackFriction.m.loss*2)<1e-6);
const rocket=run('rocket',{mass:60,thrust:450,burn:4,mu:.08},4);const acceleration=(450-.08*60*G)/60;assert.ok(Math.abs(rocket.s.v-acceleration*4)<1e-7);assert.ok(Math.abs(rocket.s.x-.5*acceleration*16)<1e-7);assert.ok(Math.abs(rocket.m.input-450*rocket.s.x)<1e-6);
const stopped=run('rocket',{mass:100,thrust:250,burn:2,mu:.2});assert.equal(stopped.s.v,0);assert.ok(stopped.s.finished);assert.ok(Math.abs(stopped.m.loss-stopped.m.input)<1e-6);
const insufficient=run('rocket',{mass:150,thrust:50,burn:4,mu:.4});assert.equal(insufficient.s.x,0);assert.equal(insufficient.m.input,0);assert.equal(insufficient.s.v,0);
const free=run('rocket',{mu:0,thrust:300,mass:60,burn:2});assert.ok(Math.abs(free.s.v-10)<1e-7);assert.equal(free.m.loss,0);
for(const mass of [20,50,120])for(const height of [3,8,12])for(const mu of [0,.01,.1,.3])run('track',{mass,height,mu},60);
for(const mass of [20,100,150])for(const thrust of [50,1000])for(const mu of [0,.4])run('rocket',{mass,thrust,mu,burn:8},31);
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/styles.css','utf8'),app=fs.readFileSync('dist/app.js','utf8');
assert.ok(html.includes('lang="es"'));assert.ok(html.includes('name="viewport"'));assert.ok(css.includes('@media(max-width:600px)'));assert.ok(css.includes('@media(max-width:900px)'));
for(const match of app.matchAll(/\$\('([^']+)'\)/g)){const id=match[1];if(id.startsWith('param-'))continue;assert.ok(html.includes(`id="${id}"`),`Missing static UI id ${id}`);}
for(const filename of ['app.js','scene.js','physics.js','assets/vendor/three.module.js','assets/vendor/GLTFLoader.js','assets/vendor/OrbitControls.js','assets/models/coyote.glb','assets/models/roadrunner.glb'])assert.ok(fs.existsSync(path.join('dist',filename)),`Missing ${filename}`);
for(const file of ['coyote.glb','roadrunner.glb']){const buf=fs.readFileSync('dist/assets/models/'+file);assert.equal(buf.readUInt32LE(0),0x46546c67);assert.equal(buf.readUInt32LE(4),2);assert.equal(buf.readUInt32LE(8),buf.length);const length=buf.readUInt32LE(12),data=JSON.parse(buf.toString('utf8',20,20+length));assert.ok(data.meshes.length>0);assert.ok(data.images.every(img=>img.bufferView!==undefined),'Textures must be embedded');}
console.log('Physics verified: pulley advantage, exact energy balance, track reversals and mass independence, rocket acceleration, stopping and insufficient thrust.');
console.log('Checked 108 track parameter combinations and 12 rocket combinations; assets, page structure and responsive styles verified.');
