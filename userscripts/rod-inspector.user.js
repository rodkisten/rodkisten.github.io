// ==UserScript==
// @name         Rod Inspector · DOM + Network + Console
// @namespace    https://rod.migos.club/
// @version      0.1.0
// @description  Dock de diagnóstico para userscripts no Safari
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(()=>{"use strict";
if(location.hostname==="rod.migos.club"&&location.pathname.startsWith("/userscripts/inspector"))return;
const TARGET="https://rod.migos.club/userscripts/inspector.html",session=Math.random().toString(36).slice(2),network=[],logs=[];let popup=null;
const clean=(v)=>{try{return JSON.parse(JSON.stringify(v,(k,x)=>/authorization|cookie|token|secret|password|session|api.?key/i.test(k)?"[REDACTED]":x));}catch{return String(v).slice(0,3000);}};
const push=(channel,data)=>{const list=channel==="network"?network:logs;list.push(data);if(list.length>400)list.shift();if(popup&&!popup.closed)popup.postMessage({rodInspector:1,payload:{kind:"event",session,channel,data}},"https://rod.migos.club");};
const originalFetch=window.fetch;
if(originalFetch)window.fetch=function(...args){const request=args[0],url=String(request?.url||request),method=String(args[1]?.method||request?.method||"GET"),start=performance.now();return originalFetch.apply(this,args).then(response=>{const item={method,url,status:response.status,ms:Math.round(performance.now()-start),time:new Date().toISOString()};push("network",item);return response;},error=>{push("network",{method,url,error:String(error),ms:Math.round(performance.now()-start)});throw error;});};
const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url,...rest){this.__rodRequest={method,url:String(url),start:0};return open.call(this,method,url,...rest);};
XMLHttpRequest.prototype.send=function(...args){const record=this.__rodRequest;if(record){record.start=performance.now();this.addEventListener("loadend",()=>push("network",{method:record.method,url:record.url,status:this.status,ms:Math.round(performance.now()-record.start)}),{once:true});}return send.apply(this,args);};
for(const level of ["log","warn","error","info"]){const old=console[level];console[level]=function(...args){push("console",{level,time:new Date().toISOString(),args:args.map(x=>typeof x==="string"?x.slice(0,2000):clean(x))});return old.apply(this,args);};}
function snapshot(){return{kind:"snapshot",session,url:location.href,title:document.title,time:new Date().toISOString(),userAgent:navigator.userAgent,html:document.documentElement?.outerHTML||"",network:network.slice(),console:logs.slice()};}
function transmit(){if(!popup||popup.closed)return;popup.postMessage({rodInspector:1,payload:snapshot()},"https://rod.migos.club");}
window.addEventListener("message",e=>{if(e.origin!=="https://rod.migos.club"||e.source!==popup||e.data?.rodInspector!==1)return;if(e.data.kind==="ready")transmit();});
function mount(){if(document.getElementById("rod-inspector-dock"))return;const host=document.createElement("div");host.id="rod-inspector-dock";host.style.cssText="position:fixed!important;right:0!important;top:42%!important;z-index:2147483647!important";const shadow=host.attachShadow({mode:"open"});shadow.innerHTML='<style>button{font:700 12px -apple-system,sans-serif;border:1px solid #7aa2f7;border-right:0;border-radius:12px 0 0 12px;background:#24283b;color:#c0caf5;padding:13px 9px;box-shadow:0 4px 20px #0008;touch-action:manipulation}</style><button type="button" aria-label="Abrir Rod Inspector">◈<br>DEV</button>';shadow.querySelector("button").onclick=()=>{popup=window.open(TARGET,"_blank");if(!popup)alert("Permita pop-ups para abrir o Rod Inspector.");else setTimeout(transmit,750);};document.documentElement.append(host);}
if(document.documentElement)mount();else new MutationObserver((observer)=>{if(document.documentElement){observer.disconnect();mount();}}).observe(document,{childList:true});
})();