// ==UserScript==
// @name         Rod Inspector · DOM + Network + Console
// @namespace    https://rod.migos.club/
// @version      0.7.0
// @description  Dock de diagnóstico para userscripts no Safari
// @match        http://*/*
// @match        https://*/*
// @run-at       document-end
// @noframes
// @grant        none
// ==/UserScript==
(()=>{"use strict";
if(location.hostname==="rod.migos.club"&&location.pathname.startsWith("/userscripts/inspector"))return;
const TARGET="https://rod.migos.club/userscripts/inspector.html",session=(globalThis.crypto?.randomUUID?.()||"rod-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)),network=[],logs=[];let popup=null,pickerActive=false,pickerOverlay=null,pickerTarget=null;
const clean=(v)=>{try{return JSON.parse(JSON.stringify(v,(k,x)=>/authorization|cookie|token|secret|password|session|api.?key/i.test(k)?"[REDACTED]":x));}catch{return String(v).slice(0,3000);}};

const nodePath=(node)=>{const indices=[];let n=node;while(n&&n!==document.documentElement&&indices.length<128){const p=n.parentNode;if(!p)break;indices.unshift(Array.prototype.indexOf.call(p.childNodes,n));n=p;}return n===document.documentElement?indices:null;};
const nodeByPath=(indices)=>{let n=document.documentElement;for(const i of indices||[]){n=n?.childNodes?.[i];if(!n)return null;}return n;};
function clearOverlay(){pickerOverlay?.remove();pickerOverlay=null;pickerTarget=null;}
function showOverlay(node){if(!(node instanceof Element))return;pickerTarget=node;if(!pickerOverlay){pickerOverlay=document.createElement("div");pickerOverlay.style.cssText="position:fixed!important;z-index:2147483646!important;pointer-events:none!important;border:2px solid #7aa2f7!important;background:#7aa2f722!important";document.documentElement.append(pickerOverlay);}const r=node.getBoundingClientRect();Object.assign(pickerOverlay.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});}
function stopPicker(){pickerActive=false;document.removeEventListener("pointermove",hoverPicker,true);document.removeEventListener("click",selectPicker,true);document.removeEventListener("touchstart",touchPicker,true);clearOverlay();}
function hoverPicker(e){if(pickerActive&&!e.target.closest?.("#rod-inspector-dock"))showOverlay(e.target);}
function touchPicker(e){if(pickerActive&&!e.target.closest?.("#rod-inspector-dock"))showOverlay(document.elementFromPoint(e.touches[0].clientX,e.touches[0].clientY));}
function cssSelector(node){if(!(node instanceof Element))return "";const parts=[];let n=node;while(n&&n.nodeType===1&&parts.length<24){let part=n.localName;if(n.id){part+="#"+CSS.escape(n.id);parts.unshift(part);break;}const siblings=n.parentElement?Array.from(n.parentElement.children).filter(x=>x.localName===n.localName):[];if(siblings.length>1)part+=":nth-of-type("+(siblings.indexOf(n)+1)+")";parts.unshift(part);n=n.parentElement;}return parts.join(" > ");}
function selectPicker(e){if(!pickerActive||e.target.closest?.("#rod-inspector-dock"))return;e.preventDefault();e.stopImmediatePropagation();const node=pickerTarget||e.target;const path=nodePath(node);stopPicker();if(path)send({kind:"selection",session,path,selector:cssSelector(node),outerHTML:node.outerHTML?.slice(0,30000)});}
function startPicker(){stopPicker();pickerActive=true;document.addEventListener("pointermove",hoverPicker,true);document.addEventListener("touchstart",touchPicker,true);document.addEventListener("click",selectPicker,true);}
function send(payload){if(popup&&!popup.closed)popup.postMessage({rodInspector:1,payload},"https://rod.migos.club");}
const push=(channel,data)=>{const list=channel==="network"?network:logs;list.push(data);if(list.length>400)list.shift();if(popup&&!popup.closed)popup.postMessage({rodInspector:1,payload:{kind:"event",session,channel,data}},"https://rod.migos.club");};
function openInspector(){popup=window.open(TARGET,"rod-inspector");if(!popup){alert("Rod Inspector: permita pop-ups no Safari.");return;}setTimeout(transmit,750);}
function mount(){
  if(document.getElementById("rod-inspector-dock"))return;
  const root=document.body||document.documentElement;
  if(!root)return;
  const button=document.createElement("button");
  button.id="rod-inspector-dock";
  button.type="button";
  button.textContent="◈ DEV";
  button.setAttribute("aria-label","Abrir Rod Inspector");
  button.style.setProperty("all","initial","important");
  const styles={
    position:"fixed",right:"0px",bottom:"25%",top:"auto",left:"auto",
    display:"block",visibility:"visible",opacity:"1",zIndex:"2147483647",
    width:"64px",height:"54px",padding:"0",margin:"0",border:"2px solid #7aa2f7",
    borderRight:"0",borderRadius:"14px 0 0 14px",background:"#24283b",
    color:"#c0caf5",font:"bold 13px -apple-system, sans-serif",
    textAlign:"center",cursor:"pointer",pointerEvents:"auto",touchAction:"manipulation",
    boxShadow:"0 4px 20px #0008",transform:"none"
  };
  for(const [key,value] of Object.entries(styles))button.style.setProperty(key.replace(/[A-Z]/g,c=>"-"+c.toLowerCase()),value,"important");
  button.addEventListener("click",openInspector);
  root.appendChild(button);
}
function ensureDock(){
  try{mount();}catch(error){console.error("[Rod Inspector] Dock mount failed",error);}
}
ensureDock();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureDock,{once:true});
window.addEventListener("pageshow",ensureDock);
setInterval(ensureDock,2500);
console.info("[Rod Inspector] v0.7.0 bootstrap",location.href);

try{
const originalFetch=window.fetch;
if(originalFetch)window.fetch=function(...args){const request=args[0],url=String(request?.url||request),method=String(args[1]?.method||request?.method||"GET"),start=performance.now();return originalFetch.apply(this,args).then(response=>{const item={method,url,status:response.status,ms:Math.round(performance.now()-start),time:new Date().toISOString()};push("network",item);return response;},error=>{push("network",{method,url,error:String(error),ms:Math.round(performance.now()-start)});throw error;});};
const xhrOpen=XMLHttpRequest.prototype.open,xhrSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url,...rest){this.__rodRequest={method,url:String(url),start:0};return xhrOpen.call(this,method,url,...rest);};
XMLHttpRequest.prototype.send=function(...args){const record=this.__rodRequest;if(record){record.start=performance.now();this.addEventListener("loadend",()=>push("network",{method:record.method,url:record.url,status:this.status,ms:Math.round(performance.now()-record.start)}),{once:true});}return xhrSend.apply(this,args);};
for(const level of ["log","warn","error","info"]){const old=console[level];console[level]=function(...args){push("console",{level,time:new Date().toISOString(),args:args.map(x=>typeof x==="string"?x.slice(0,2000):clean(x))});return old.apply(this,args);};}
function snapshot(){return{kind:"snapshot",session,url:location.href,title:document.title,time:new Date().toISOString(),userAgent:navigator.userAgent,html:document.documentElement?.outerHTML||"",network:network.slice(),console:logs.slice()};}
function transmit(){if(!popup||popup.closed)return;popup.postMessage({rodInspector:1,payload:snapshot()},"https://rod.migos.club");}
window.addEventListener("message",e=>{if(e.origin!=="https://rod.migos.club"||e.source!==popup||e.data?.rodInspector!==1)return;if(e.data.kind==="ready")transmit();else if(e.data.kind==="pick")startPicker();else if(e.data.kind==="highlight"){const node=(e.data.selector?document.querySelector(e.data.selector):null)||nodeByPath(e.data.path);if(node instanceof Element){node.scrollIntoView({block:"center",inline:"nearest"});showOverlay(node);setTimeout(()=>{if(!pickerActive)clearOverlay();},2500);}}});
}catch(error){console.error("[Rod Inspector] Hooks failed; dock remains available",error);}
})();