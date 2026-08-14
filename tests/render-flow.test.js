const fs=require('fs'),vm=require('vm'),assert=require('assert'),{webcrypto}=require('crypto');
const source=fs.readFileSync('app.js','utf8');
function harness(bootResult){
 const elements=new Map(),listeners={};
 class El{constructor(){this.innerHTML='';this.textContent='';this.dataset={};this.style={};this.disabled=false;this.classList={values:new Set(),add:x=>this.classList.values.add(x),remove:x=>this.classList.values.delete(x),toggle:(x,on)=>on?this.classList.values.add(x):this.classList.values.delete(x),contains:x=>this.classList.values.has(x)};this.elements=new Proxy({photo:new El.Basic()}, {get:(o,k)=>o[k]||(o[k]=new El.Basic())});} addEventListener(){} showModal(){} close(){} reset(){} querySelector(){return new El.Basic();}}
 El.Basic=class{constructor(){this.value='';this.dataset={};this.style={};this.classList={add(){},remove(){},toggle(){},contains(){return false}};} addEventListener(){} focus(){} querySelector(){return new El.Basic()} closest(){return null}};
 const get=s=>{if(!elements.has(s))elements.set(s,new El());return elements.get(s)};
 const document={querySelector:get,querySelectorAll:s=>s==='.nav-item'?[]:[],addEventListener:(n,f)=>listeners[n]=f};
 const location={hash:'',pathname:'/PawPass/',search:'',origin:'https://example.test'};
 const history={replaceState(_a,_b,url){const i=url.indexOf('#');location.hash=i<0?'':url.slice(i);}};
 const backend={demo:()=>false,sync:()=>Promise.resolve(),init:()=>Promise.resolve(bootResult),signOut:()=>Promise.resolve(),client:null};
 const context={window:{addEventListener:(n,f)=>listeners[n]=f},document,location,history,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},PawPassBackend:backend,structuredClone,crypto:webcrypto,console,setTimeout:()=>0,clearTimeout(){},Intl,Date,URLSearchParams,Blob,URL,navigator:{},FormData:class{},FileReader:class{}};
 context.window.PawPassBackend=backend;vm.createContext(context);vm.runInContext(source,context);return new Promise(resolve=>setImmediate(()=>resolve({get,listeners,location})));
}
(async()=>{
 const data={user:{name:'Taylor Test',email:'t@example.test'},selectedPetId:1,lastView:'dashboard',pets:[{id:1,name:'Milo',species:'dog',animal:'🐕',breed:'Retriever',age:'3 years',weight:'31 kg',status:'Home'}],tasks:[],records:[],emergency:{}};
 const app=await harness({user:{id:'u1'},data});
 assert(!app.get('#app').classList.values.has('hidden'));assert(app.get('#welcome').classList.values.has('hidden'));assert.match(app.get('#view').innerHTML,/daily pawprint/i);
 for(const [route,pattern] of Object.entries({pets:/Your pets/,health:/Health records/,schedule:/Care schedule/,emergency:/Lost-pet profile/,settings:/Settings/})){app.location.hash='#'+route;app.listeners.hashchange();assert.match(app.get('#view').innerHTML,pattern,route)}
 const loggedOut=await harness({user:null,data:null});assert(loggedOut.get('#app').classList.values.has('hidden'));assert(!loggedOut.get('#welcome').classList.values.has('hidden'));
 const failed=await harness(Promise.reject(new Error('database unavailable')));assert(failed.get('#app').classList.values.has('hidden'));assert.match(failed.get('#startupError').textContent,/database unavailable/);
 console.log('render/auth regression checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
