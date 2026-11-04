import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const args=Object.fromEntries(process.argv.slice(2).map((v,i,a)=>v.startsWith('--')?[v.slice(2),a[i+1]]:[]).filter(x=>x.length));
const playerNames=args['long-names']?['快樂小學一年級小明和他的火箭探險隊','每天喜歡種花看書的小芳城市建造小隊','來自太空勇敢又有愛心的火箭市長小隊','一起愛護環境建立綠色城市的樹苗小隊']:['小明','小芳','火箭隊','小葉'];
const endpoint=args.cdp??'http://127.0.0.1:18305';
const targets=await (await fetch(`${endpoint}/json/list`)).json();
const target=targets.find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:8791'));
assert.ok(target,'Local preview tab must already be open');
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
let serial=0;
const pending=new Map(),errors=[];
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)});
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error(`${method} timed out`))},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(await evaluate(expression))return;await delay(100)}const seen=await evaluate(`({url:location.href,ready:document.readyState,text:document.body.innerText.slice(0,200),save:(localStorage.getItem('city-property-king.v1')||'').slice(0,120)})`).catch(e=>String(e));throw Error(`Condition timed out: ${expression}\n${JSON.stringify(seen)}\nerrors: ${errors.join(' | ')}`)}
const out=new URL('../docs/qa/',import.meta.url);
await mkdir(out,{recursive:true});
await call('Runtime.enable');
await call('Page.enable');
async function viewport(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(200)}
async function fixture(mode,phase,kind=''){await evaluate(`(async()=>{const m=await import('./engine.js?v=2');const s=m.createGame(${JSON.stringify(playerNames.map(name=>({name})))},${JSON.stringify(mode)},1234);s.phase=${JSON.stringify(phase)};s.players[0].pos=3;s.dice=[1,2];s.logs=['小明 停在「晨光街」。','小明 擲出 1 + 2 = 3'];s.roundStart=1500;if(${JSON.stringify(kind)}==='build'){s.assets[1].owner=0;s.assets[3].owner=0;s.assets[4].owner=0;s.assets[3].level=1;s.players[0].cash=700}if(s.phase==='card'){s.card=11;s.players[0].pos=11}if(s.phase==='over')s.players.forEach(p=>p.turns=12);if(s.phase==='auction')s.auction={tile:3,active:[0,1,2,3],turn:0,high:null,bid:0};if(s.phase==='debt'){s.players[0].cash=0;s.assets[1].owner=0;s.debt={amount:100,to:null,reason:'城市稅',next:{type:'endAction'}}}m.assertState(s);localStorage.setItem('city-property-king.v1',JSON.stringify(s));return true})()`);await call('Page.reload',{ignoreCache:true});await until(`!!document.querySelector('[data-action="continue"]')`);await evaluate(`document.querySelector('[data-action="continue"]').click()`);await until(`!!document.querySelector('.center')`);await delay(350)}
async function inspect(label){const r=await evaluate(`(()=>{const c=document.querySelector('.center'),b=c?.querySelector('.actionbox button:not([disabled]):not(.secondary)'),cr=c?.getBoundingClientRect(),br=b?.getBoundingClientRect();return {label:${JSON.stringify(label)},width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,boardBottom:document.querySelector('.board-wrap')?.getBoundingClientRect().bottom,panelScroll:c?.scrollHeight>c?.clientHeight+2,primaryVisible:!b||br.top>=cr.top-1&&br.bottom<=cr.bottom+1,canvas:document.querySelectorAll('canvas.board3d').length,errorText:document.querySelector('.error')?.textContent,heap:performance.memory?.usedJSHeapSize}})()`);assert.equal(r.overflow,false,`${label}: horizontal overflow`);assert.equal(r.primaryVisible,true,`${label}: primary button clipped`);assert.ok(!r.errorText,`${label}: ${r.errorText}`);assert.equal(errors.length,0,errors.join('\n'));return r}
async function screenshot(name){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL(name,out),Buffer.from(r.data,'base64'))}
const results=[];
try{
 for(const [w,h] of (args['compact-only']?[[1024,600]]:args['long-names']?[[1280,720],[1180,820],[820,1180],[390,844],[735,415],[1024,600]]:[[1470,830],[1280,720],[1425,686],[1180,820],[820,1180],[768,1024],[390,844]])){
  await viewport(w,h);
  for(const [phase,kind] of [['handoff',''],['roll',''],['buy',''],['card',''],['end','build'],['over','']]){
   await fixture('junior',phase,kind);results.push(await inspect(`junior ${phase} ${w}x${h}`));console.log(`PASS junior ${phase} ${w}x${h}`);
   if(phase==='buy'&&[1470,820,390].includes(w))await screenshot(`junior-buy-${w}${args['long-names']?'-longnames':''}.png`);
  }
 }
 for(const mode of ['quick','classic'])for(const phase of ['buy','auction','card','debt','end']){await viewport(1470,830);await fixture(mode,phase);results.push(await inspect(`${mode} ${phase}`))}
 await fixture('junior','end','build');
 await evaluate(`document.querySelector('[data-action="assets"]').click()`);
 await until(`document.querySelector('dialog').open`);
 await evaluate(`window.confirm=()=>true;document.querySelector('[data-asset="build"][data-id="1"]').click()`);
 assert.equal(await evaluate(`JSON.parse(localStorage.getItem('city-property-king.v1')).assets[1].level`),1);
 assert.equal(await evaluate(`JSON.parse(localStorage.getItem('city-property-king.v1')).players[0].cash`),650);
 await evaluate(`document.querySelector('dialog').close()`);
 await call('Page.reload',{ignoreCache:true});await until(`!!document.querySelector('[data-action="continue"]')`);await evaluate(`document.querySelector('[data-action="continue"]').click()`);
 assert.equal(await evaluate(`JSON.parse(localStorage.getItem('city-property-king.v1')).assets[1].level`),1);
 await until(`!!document.querySelector('canvas.board3d')`);
 await evaluate(`document.querySelector('canvas.board3d').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))`);
 await until(`!document.querySelector('canvas.board3d')`);
 assert.ok(await evaluate(`document.querySelector('.board .token svg')!==null`),'SVG fallback missing');
 await inspect('WebGL fallback');
 await writeFile(new URL(args['long-names']?'browser-longnames-results.json':'browser-results.json',out),JSON.stringify({date:new Date().toISOString(),results,errors,buildAndRestore:true,webglFallback:true},null,2));
 console.log(JSON.stringify({passed:results.length,buildAndRestore:true,webglFallback:true,errors}));
}finally{socket.close()}
