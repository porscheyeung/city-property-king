import assert from 'node:assert/strict';
const endpoint=process.argv[2];
assert.ok(endpoint,'Pass the local browser CDP HTTP endpoint');
const targets=await(await fetch(`${endpoint}/json/list`)).json();
const target=targets.find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:8791/'));
assert.ok(target,'Only use the isolated local preview');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;
const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});
function call(method,params={}){return new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function run(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await call('Runtime.enable');
try{
 await run(`(async()=>{const m=await import('./engine.js?v=4');const s=m.createGame([{name:'你'},{name:'電腦',ai:true}],'junior',123);s.current=1;s.phase='end';s.players[1].turns=1;m.assertState(s);localStorage.setItem('city-property-king.v1',JSON.stringify(s));localStorage.removeItem('city-property-speed')})()`);
 await call('Page.reload',{ignoreCache:true});
 for(let n=0;n<100&&!await run(`!!document.querySelector('[data-action="continue"]')`);n++)await wait(100);
 await run(`document.querySelector('[data-action="continue"]').click();document.querySelector('[data-action="pause-ai"]').click()`);
 assert.ok(await run(`document.querySelector('.ai-status').textContent.includes('已暫停')`));
 const saved=await run(`localStorage.getItem('city-property-king.v1')`);
 await wait(3500);
 assert.equal(await run(`localStorage.getItem('city-property-king.v1')`),saved,'Paused computer must not act');
 assert.equal(await run(`document.querySelector('[data-action="pause-ai"]').getAttribute('aria-pressed')`),'true');
 for(const [width,height] of [[1470,830],[1180,820],[820,1180],[390,844]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await wait(200);
  const layout=await run(`(()=>{const b=document.querySelector('[data-action="pause-ai"]').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,visible:b.left>=0&&b.right<=innerWidth&&b.top>=0,boardBottom:document.querySelector('.board-wrap').getBoundingClientRect().bottom}})()`);
  assert.equal(layout.overflow,false,`${width}: overflow`);assert.ok(layout.visible,`${width}: pause clipped`);
  if(width>1000)assert.ok(layout.boardBottom<=height,`${width}: board clipped`);
  console.log(`PASS paused layout ${width}x${height}`);
 }
 await run(`document.querySelector('[data-action="pause-ai"]').click()`);
 await wait(200);
 assert.equal(await run(`localStorage.getItem('city-property-king.v1')`),saved,'Normal delay preserved');
 await run(`const f=document.querySelector('#fast');f.checked=true;f.dispatchEvent(new Event('change'))`);
 await wait(800);
 assert.notEqual(await run(`localStorage.getItem('city-property-king.v1')`),saved,'Speed changes must reschedule immediately');
 await run(`(async()=>{const m=await import('./engine.js?v=4');const s=m.createGame([{name:'你'},{name:'電腦',ai:true}],'junior',124);s.current=1;s.phase='end';s.players[1].turns=1;localStorage.setItem('city-property-king.v1',JSON.stringify(s));localStorage.removeItem('city-property-speed')})()`);
 await call('Page.reload',{ignoreCache:true});
 for(let n=0;n<100&&!await run(`!!document.querySelector('[data-action="continue"]')`);n++)await wait(100);
 await run(`document.querySelector('[data-action="continue"]').click();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`);
 const hidden=await run(`localStorage.getItem('city-property-king.v1')`);
 await wait(3500);
 assert.equal(await run(`localStorage.getItem('city-property-king.v1')`),hidden,'Hidden page must not advance');
 await run(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`);
 await wait(3500);
 assert.notEqual(await run(`localStorage.getItem('city-property-king.v1')`),hidden,'Visible page resumes');
 assert.deepEqual(errors,[]);
 console.log('PASS pause/resume, immediate speed update, simulated page visibility, no runtime errors');
}finally{ws.close()}
