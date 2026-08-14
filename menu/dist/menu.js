var RodMenu=(function(){var e=Object.defineProperty,t=((t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r})({});(function(e){"use strict";let t=`RodMenu`,n=`data-rod-menu-active`,r={shadowRoot:!0,defaultPresentation:`bottom-sheet`,zIndex:2147482500,autoLoadDependencies:!0,dependencyTimeoutMs:8e3,dependencyUrls:{elements:[`https://rod.migos.club/elements/dist/elements.js`,`https://rod.migos.club/elements/elements.js`,`https://raw.githubusercontent.com/rodkisten/rodkisten.github.io/master/elements/elements.js`],toaster:[`https://rod.migos.club/userscripts/toaster.js?v=4.7.0`,`https://rod.migos.club/userscripts/toaster.js`],cipo:[`https://rod.migos.club/bundler/cipo.iife.js`],broto:[`https://rod.migos.club/bundler/broto.iife.js`]},toasterErrors:!0},i=0,a=new Map,o=new WeakMap,s={elements:{name:`elements`,state:`fallback`},toaster:{name:`toaster`,state:`fallback`},cipo:{name:`cipo`,state:`fallback`},broto:{name:`broto`,state:`fallback`}},c=new Map,l=new WeakMap;function u(){let t=[],n=e=>{if(!e||typeof e!=`object`&&typeof e!=`function`)return;let n=e;t.includes(n)||t.push(n)};n(globalThis),n(e);try{n(typeof unsafeWindow<`u`?unsafeWindow:globalThis.unsafeWindow)}catch{}try{n(e.parent)}catch{}try{n(e.top)}catch{}try{n(e.opener)}catch{}return t}function d(e){for(let t of u())for(let n of e)try{let e=t[n];if(e!=null)return e}catch{}return null}function f(){let e=d([`RodElements`]);return e&&typeof e.el==`function`?e:null}function p(){let e=d([`Cipo`,`CIPO`]);return e&&typeof e==`object`?e:null}function m(){let e=d([`Broto`,`broto`]);return e&&typeof e.store==`function`?e:null}function h(){let e=d([`RodToaster`,`toast`]);return e&&typeof e==`object`||typeof e==`function`?e:null}function g(e,t,n,r){s[e]={name:e,state:t,source:n,error:r==null?void 0:r instanceof Error?r.message:String(r)}}function _(e){switch(e){case`elements`:return f();case`toaster`:return h();case`cipo`:return p();case`broto`:return m()}}function v(t,n){let r=Date.now();return new Promise(i=>{let a=()=>{let o=_(t);if(o){i(o);return}if(Date.now()-r>=n){i(null);return}e.setTimeout(a,32)};a()})}function y(t){return new Promise(n=>{let i=z(),a=i.createElement(`script`);a.src=t,a.async=!0,a.crossOrigin=`anonymous`,a.dataset.rodMenuDependency=`true`;let o=!1,s=e.setTimeout(()=>c(!1),r.dependencyTimeoutMs),c=t=>{o||(o=!0,e.clearTimeout(s),a.onload=null,a.onerror=null,t||a.remove(),n(t))};a.onload=()=>c(!0),a.onerror=()=>c(!1),(i.head||i.documentElement).append(a)})}async function b(e){let t=typeof GM_addElement==`function`?GM_addElement:d([`GM_addElement`]);if(typeof t!=`function`)return!1;try{return t(`script`,{src:e,type:`text/javascript`}),!0}catch{return!1}}function x(e){let t=typeof GM_xmlhttpRequest==`function`?GM_xmlhttpRequest:d([`GM_xmlhttpRequest`]);if(typeof t==`function`)return new Promise(n=>{try{t({method:`GET`,url:e,timeout:r.dependencyTimeoutMs,onload:e=>{let t=e?.responseText;n(typeof t==`string`?t:null)},onerror:()=>n(null),ontimeout:()=>n(null)})}catch{n(null)}});let n=typeof GM<`u`?GM:d([`GM`]);return n&&typeof n.xmlHttpRequest==`function`?n.xmlHttpRequest({method:`GET`,url:e,timeout:r.dependencyTimeoutMs}).then(e=>{let t=e?.responseText;return typeof t==`string`?t:null}).catch(()=>null):Promise.resolve(null)}function S(t){let n=(()=>{try{let e=typeof unsafeWindow<`u`?unsafeWindow:globalThis.unsafeWindow;if(e&&typeof e==`object`)return e}catch{}return e})();try{let e=n.document,r=e.createElement(`script`);return r.textContent=`${t}\n//# sourceURL=rod-menu-dependency.js`,(e.head||e.documentElement).append(r),r.remove(),!0}catch{}try{let e=n.Function;return e(`${t}\n//# sourceURL=rod-menu-dependency.js`).call(n),!0}catch{}return!1}async function C(e){try{return await Function(`url`,`return import(url)`)(e),!0}catch{return!1}}async function w(e){let t=typeof require==`function`?require:d([`require`]);if(typeof t!=`function`)return!1;try{let n=t(e);return n&&typeof n.then==`function`&&await n,!0}catch{}try{return await new Promise((n,r)=>{t([e],()=>n(),e=>r(e))}),!0}catch{return!1}}async function T(e){let t=_(e);if(t)return g(e,`native`,`window`),t;let n=c.get(e);if(n)return n;let i=(async()=>{g(e,`loading`);let t=r.dependencyUrls[e],n=null;for(let r of t)try{if(await y(r)){let t=await v(e,500);if(t)return g(e,`loaded`,`script:${r}`),t}if(await b(r)){let t=await v(e,700);if(t)return g(e,`loaded`,`GM_addElement:${r}`),t}let t=await x(r);if(t&&S(t)){let t=await v(e,150);if(t)return g(e,`loaded`,`GM_xhr:${r}`),t}if(await C(r)){let t=await v(e,250);if(t)return g(e,`loaded`,`import:${r}`),t}if(await w(r)){let t=await v(e,250);if(t)return g(e,`loaded`,`require:${r}`),t}}catch(e){n=e}return g(e,`fallback`,void 0,n),null})();return c.set(e,i),i.finally(()=>c.delete(e))}async function E(){return await T(`cipo`),await Promise.allSettled([T(`elements`),T(`broto`),T(`toaster`)]),{elements:{...s.elements},toaster:{...s.toaster},cipo:{...s.cipo},broto:{...s.broto}}}function D(e,t){let n=f();if(n)try{try{n.configure?.({document:e,cipo:p()})}catch{}let r=l.get(e);r||(r=n,l.set(e,r));let i=r.el(t,{$document:e});if(i&&i.ownerDocument===e)return i}catch{}return e.createElement(t)}function O(e){if(typeof e==`string`)return e;if(!e||typeof e!=`object`)return``;let t=e;for(let e of[`cssText`,`css`,`text`,`code`,`compiled`,`value`]){let n=t[e];if(typeof n==`string`&&n.includes(`{`))return n}try{let t=String(e);return t!==`[object Object]`&&t.includes(`{`)?t:``}catch{return``}}function k(e){let t=p();if(!t)return e;try{let n=t.sheet?.css;if(typeof n==`function`){let r=[e];Object.defineProperty(r,"raw",{value:[e]});let i=O(n.call(t.sheet,r));if(i)return i}}catch{}for(let n of[t.compileCss,t.compile])if(typeof n==`function`)try{let r=O(n.call(t,e,{mode:`sheet`}));if(r)return r}catch{}return e}function A(e,t,n){if(!e||typeof e!=`object`)return!1;let r=e[t];return r&&typeof r.set==`function`?(r.set(n),!0):!1}function j(e){let t={...e},n=m(),r=null;if(n?.store)try{r=n.store({...t})}catch{}let i=e=>{if(n?.batch)try{n.batch(e);return}catch{}e()};return{backend:r?`broto`:`fallback`,snapshot:()=>t,replace(e){t={...e},r&&i(()=>{for(let[e,n]of Object.entries(t))A(r,e,n)})},set(e,n){t[e]=n,r&&i(()=>{A(r,e,n)})},patch(e){Object.assign(t,e),r&&i(()=>{for(let[t,n]of Object.entries(e))A(r,t,n)})}}}function M(e,t,n){let r=h(),i=r?.[e];if(typeof i!=`function`)return!1;try{return i.call(r,{title:t,description:n}),!0}catch{try{return i.call(r,t,n),!0}catch{}}return!1}let N=String.raw`
:host, .rm-host {
  all: initial;
  color-scheme: light dark;
  --rm-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  --rm-bg: color-mix(in srgb, Canvas 94%, transparent);
  --rm-panel: color-mix(in srgb, Canvas 98%, transparent);
  --rm-elevated: color-mix(in srgb, Canvas 92%, CanvasText 8%);
  --rm-text: CanvasText;
  --rm-muted: color-mix(in srgb, CanvasText 58%, transparent);
  --rm-border: color-mix(in srgb, CanvasText 14%, transparent);
  --rm-accent: #ff7a18;
  --rm-accent-strong: #ff5b00;
  --rm-danger: #ff453a;
  --rm-success: #30d158;
  --rm-radius: 26px;
  --rm-shadow: 0 28px 90px rgba(0, 0, 0, .24), 0 10px 30px rgba(0, 0, 0, .14);
  --rm-ease: cubic-bezier(.2,.8,.2,1);
  font-family: var(--rm-font);
}
* {
  box-sizing: border-box;
}
button, input, textarea, select {
  font: inherit;
}
button {
  -webkit-tap-highlight-color: transparent;
}
.rm-root {
  position: fixed;
  inset: 0;
  z-index: var(--rm-z);
  pointer-events: none;
  font-family: var(--rm-font);
  color: var(--rm-text);
}
.rm-root[data-open="true"] {
  pointer-events: auto;
}
.rm-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.38);
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  opacity: 0;
  transition: opacity 240ms var(--rm-ease);
}
.rm-root[data-open="true"] .rm-backdrop {
  opacity: 1;
}
.rm-shell {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--rm-panel);
  border: 1px solid var(--rm-border);
  box-shadow: var(--rm-shadow);
  overflow: hidden;
  opacity: 0;
  transform: translate3d(0, 30px, 0) scale(.985);
  transition: transform 280ms var(--rm-ease), opacity 220ms ease;
  will-change: transform, opacity;
}
.rm-root[data-open="true"] .rm-shell {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}
.rm-root[data-presentation="bottom-sheet"] .rm-shell {
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-height: min(92dvh, calc(var(--rm-vvh, 100vh) - 8px));
  border-radius: var(--rm-radius) var(--rm-radius) 0 0;
  --rm-sheet-x: 0px;
  --rm-drag-y: 0px;
  opacity: 0;
  transform: translate3d(var(--rm-sheet-x), calc(100% + 24px + var(--rm-drag-y)), 0);
}
.rm-root[data-presentation="bottom-sheet"][data-open="true"] .rm-shell {
  opacity: 1;
  transform: translate3d(var(--rm-sheet-x), var(--rm-drag-y), 0);
}
.rm-root[data-presentation="modal"] .rm-shell {
  left: 50%;
  top: 50%;
  width: min(calc(100vw - 28px), var(--rm-width, 640px));
  max-height: min(86dvh, calc(var(--rm-vvh, 100vh) - 28px));
  border-radius: var(--rm-radius);
  transform: translate3d(-50%, calc(-50% + 24px), 0) scale(.97);
}
.rm-root[data-presentation="modal"][data-open="true"] .rm-shell {
  transform: translate3d(-50%, -50%, 0) scale(1);
}
.rm-root[data-presentation="drawer"] .rm-shell {
  border-radius: 0;
}
.rm-root[data-presentation="drawer"][data-side="right"] .rm-shell {
  top: 0;
  right: 0;
  bottom: 0;
  width: min(92vw, var(--rm-width, 520px));
  transform: translate3d(105%, 0, 0);
}
.rm-root[data-presentation="drawer"][data-side="left"] .rm-shell {
  top: 0;
  left: 0;
  bottom: 0;
  width: min(92vw, var(--rm-width, 520px));
  transform: translate3d(-105%, 0, 0);
}
.rm-root[data-presentation="drawer"][data-side="top"] .rm-shell {
  top: 0;
  left: 0;
  right: 0;
  max-height: 86dvh;
  transform: translate3d(0, -105%, 0);
}
.rm-root[data-presentation="drawer"][data-side="bottom"] .rm-shell {
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 86dvh;
  transform: translate3d(0, 105%, 0);
}
.rm-root[data-presentation="drawer"][data-open="true"] .rm-shell {
  transform: translate3d(0,0,0);
}
.rm-root[data-presentation="popover"] .rm-shell {
  left: 50%;
  top: 50%;
  width: min(calc(100vw - 24px), var(--rm-width, 520px));
  max-height: 80dvh;
  border-radius: 22px;
  transform: translate3d(-50%, calc(-50% + 18px), 0) scale(.96);
}
.rm-root[data-presentation="popover"][data-open="true"] .rm-shell {
  transform: translate3d(-50%,-50%,0) scale(1);
}
.rm-handle-wrap {
  display: flex;
  justify-content: center;
  padding: 10px 12px 0;
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
.rm-handle-wrap:active {
  cursor: grabbing;
}
.rm-handle {
  width: 42px;
  height: 5px;
  border-radius: 99px;
  background: var(--rm-border);
}
.rm-header {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 18px 20px 14px;
}
.rm-heading {
  min-width: 0;
}
.rm-eyebrow {
  font: 700 11px/1.2 var(--rm-font);
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--rm-accent);
  margin-bottom: 7px;
}
.rm-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rm-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--rm-accent) 15%, transparent);
  flex: 0 0 auto;
}
.rm-title {
  margin: 0;
  font: 760 22px/1.12 var(--rm-font);
  letter-spacing: -.025em;
}
.rm-description {
  margin: 8px 0 0;
  font: 450 14px/1.45 var(--rm-font);
  color: var(--rm-muted);
}
.rm-close {
  appearance: none;
  border: 0;
  border-radius: 999px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: var(--rm-elevated);
  color: var(--rm-text);
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease;
}
.rm-close:active {
  transform: scale(.92);
}
.rm-body {
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 16px 8px;
  scrollbar-width: thin;
}
.rm-section {
  margin: 0 0 14px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--rm-elevated) 58%, transparent);
  border: 1px solid var(--rm-border);
  overflow: hidden;
}
.rm-section-head {
  padding: 14px 14px 6px;
}
.rm-section-title {
  margin: 0;
  font: 700 13px/1.25 var(--rm-font);
}
.rm-section-description {
  margin: 4px 0 0;
  color: var(--rm-muted);
  font: 430 12px/1.4 var(--rm-font);
}
.rm-section-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:0;
}
.rm-fields {
  display: grid;
  gap: 0;
}
.rm-field {
  position: relative;
  padding: 12px 14px;
  border-top: 1px solid var(--rm-border);
  min-width: 0;
}
.rm-field:first-child {
  border-top: 0;
}
.rm-field[data-hidden="true"] {
  display: none !important;
}
.rm-label-row {
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:baseline;
  margin-bottom:7px;
}
.rm-label {
  font: 650 13px/1.25 var(--rm-font);
}
.rm-required {
  color: var(--rm-danger);
  margin-left: 3px;
}
.rm-help, .rm-description-field {
  font: 430 12px/1.35 var(--rm-font);
  color: var(--rm-muted);
}
.rm-help {
  margin-top: 7px;
}
.rm-error {
  margin-top: 7px;
  color: var(--rm-danger);
  font: 600 12px/1.35 var(--rm-font);
  display:none;
}
.rm-field[data-error="true"] .rm-error {
  display:block;
}
.rm-control, .rm-textarea, .rm-select {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--rm-border);
  border-radius: 13px;
  background: color-mix(in srgb, Canvas 87%, transparent);
  color: var(--rm-text);
  outline: none;
  padding: 10px 12px;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.rm-control:focus, .rm-textarea:focus, .rm-select:focus {
  border-color: color-mix(in srgb, var(--rm-accent) 72%, white 10%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rm-accent) 18%, transparent);
}
.rm-textarea {
  resize: vertical;
  min-height: 96px;
}
.rm-check-row {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
}
.rm-check-label {
  min-width:0;
}
.rm-native-check {
  width:20px;
  height:20px;
  accent-color: var(--rm-accent);
}
.rm-switch {
  appearance:none;
  width:48px;
  height:28px;
  border:0;
  border-radius:999px;
  background: var(--rm-border);
  position:relative;
  cursor:pointer;
  transition:background 180ms ease;
  flex:0 0 auto;
}
.rm-switch::after {
  content:"";
  position:absolute;
  width:22px;
  height:22px;
  top:3px;
  left:3px;
  border-radius:50%;
  background:white;
  box-shadow:0 2px 8px rgba(0,0,0,.25);
  transition:transform 180ms var(--rm-ease);
}
.rm-switch:checked {
  background: var(--rm-accent);
}
.rm-switch:checked::after {
  transform: translateX(20px);
}
.rm-options {
  display:flex;
  flex-direction:column;
  gap:8px;
}
.rm-options[data-direction="horizontal"] {
  flex-direction:row;
  flex-wrap:wrap;
}
.rm-option {
  display:flex;
  gap:9px;
  align-items:flex-start;
  font: 500 13px/1.35 var(--rm-font);
}
.rm-option input {
  accent-color: var(--rm-accent);
  margin-top:2px;
}
.rm-option-copy {
  display:grid;
  gap:2px;
}
.rm-option-desc {
  font-size:11px;
  color:var(--rm-muted);
}
.rm-segmented {
  display:grid;
  grid-auto-flow:column;
  grid-auto-columns:minmax(0,1fr);
  gap:4px;
  padding:4px;
  background:var(--rm-elevated);
  border-radius:13px;
}
.rm-segment {
  border:0;
  border-radius:10px;
  padding:9px 10px;
  color:var(--rm-muted);
  background:transparent;
  cursor:pointer;
  font-weight:650;
}
.rm-segment[data-selected="true"] {
  background:var(--rm-panel);
  color:var(--rm-text);
  box-shadow:0 2px 9px rgba(0,0,0,.1);
}
.rm-range-wrap {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:10px;
  align-items:center;
}
.rm-range {
  width:100%;
  accent-color:var(--rm-accent);
}
.rm-range-value {
  min-width:44px;
  text-align:right;
  font:650 12px/1 var(--rm-font);
  color:var(--rm-muted);
}
.rm-color-row {
  display:flex;
  gap:10px;
  align-items:center;
}
.rm-color {
  width:54px;
  height:42px;
  border:1px solid var(--rm-border);
  border-radius:11px;
  padding:3px;
  background:transparent;
}
.rm-presets {
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}
.rm-swatch {
  width:28px;
  height:28px;
  border-radius:50%;
  border:2px solid color-mix(in srgb, CanvasText 18%, transparent);
  cursor:pointer;
}
.rm-stars {
  display:flex;
  gap:4px;
}
.rm-star {
  border:0;
  background:transparent;
  color:var(--rm-border);
  font-size:27px;
  padding:2px;
  cursor:pointer;
  line-height:1;
}
.rm-star[data-on="true"] {
  color:#ffb020;
}
.rm-chipbox {
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}
.rm-chip {
  border:1px solid var(--rm-border);
  background:var(--rm-panel);
  color:var(--rm-text);
  border-radius:999px;
  padding:8px 11px;
  cursor:pointer;
  font:600 12px/1 var(--rm-font);
}
.rm-chip[data-selected="true"] {
  border-color:var(--rm-accent);
  background:color-mix(in srgb, var(--rm-accent) 13%, var(--rm-panel));
}
.rm-divider {
  height:1px;
  background:var(--rm-border);
  margin:4px 0;
}
.rm-field-button {
  border:0;
  border-radius:13px;
  min-height:42px;
  padding:10px 13px;
  cursor:pointer;
  font-weight:700;
}
.rm-actions {
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-end;
  gap:9px;
  padding:12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top:1px solid var(--rm-border);
  background:color-mix(in srgb, var(--rm-panel) 88%, transparent);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
}
.rm-action {
  position:relative;
  border:0;
  min-height:44px;
  padding:10px 16px;
  border-radius:14px;
  cursor:pointer;
  font:700 13px/1 var(--rm-font);
  transition:transform 140ms ease, opacity 140ms ease, filter 140ms ease;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
}
.rm-action:active {
  transform:scale(.96);
}
.rm-action:disabled {
  opacity:.46;
  cursor:not-allowed;
}
.rm-action[data-variant="primary"] {
  background:linear-gradient(135deg,var(--rm-accent),var(--rm-accent-strong));
  color:white;
}
.rm-action[data-variant="secondary"] {
  background:var(--rm-elevated);
  color:var(--rm-text);
}
.rm-action[data-variant="ghost"] {
  background:transparent;
  color:var(--rm-text);
}
.rm-action[data-variant="danger"] {
  background:var(--rm-danger);
  color:white;
}
.rm-action[data-variant="success"] {
  background:var(--rm-success);
  color:#07250f;
}
.rm-spinner {
  width:14px;
  height:14px;
  border:2px solid currentColor;
  border-right-color:transparent;
  border-radius:50%;
  animation:rm-spin .65s linear infinite;
}
.rm-root[data-loading="true"] .rm-body {
  opacity:.66;
  pointer-events:none;
}
.rm-global-error {
  margin: 0 16px 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--rm-danger) 12%, transparent);
  color: var(--rm-danger);
  font: 600 12px/1.4 var(--rm-font);
  display:none;
}
.rm-global-error[data-show="true"] {
  display:block;
}
@keyframes rm-spin {
  to {
    transform:rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rm-backdrop, .rm-shell, .rm-action, .rm-close, .rm-switch, .rm-switch::after {
    transition-duration:.001ms !important;
    animation-duration:.001ms !important;
  }
}
@media (min-width: 760px) {
  .rm-root[data-presentation="bottom-sheet"] .rm-shell {
    left: 50%;
    right: auto;
    bottom: max(12px, env(safe-area-inset-bottom));
    width: min(calc(100vw - 40px), 720px);
    border-radius: var(--rm-radius);
    --rm-sheet-x: -50%;
  }
}

`;function P(e){return!!e&&typeof e==`object`&&!Array.isArray(e)}function F(e){return Array.isArray(e)?e.slice():e instanceof Date?new Date(e.getTime()):P(e)?{...e}:e}function I(){return i+=1,`rod-menu-${Date.now().toString(36)}-${i.toString(36)}`}function L(t){return t.defaultView||e}function R(e){let t=e;for(;;){try{if(t.parent&&t.parent!==t&&t.parent.document){t=t.parent;continue}}catch{}return t}}function z(){let t=R(e);try{return t.document}catch{return e.document}}function B(n){let r=new Set,i=[e];try{let t=R(e);i.includes(t)||i.push(t)}catch{}for(;i.length;){let e=i.shift();if(!(!e||r.has(e))){r.add(e);try{Object.defineProperty(e,t,{configurable:!0,enumerable:!1,writable:!0,value:n})}catch{try{e[t]=n}catch{}}try{e.parent&&e.parent!==e&&i.push(e.parent)}catch{}try{e.top&&e.top!==e&&i.push(e.top)}catch{}try{for(let t=0;t<e.frames.length;t+=1)i.push(e.frames[t])}catch{}try{e.opener&&!e.opener.closed&&i.push(e.opener)}catch{}}}}function V(e){let t=D((e instanceof ShadowRoot,e.ownerDocument),`style`);t.dataset.rodMenuStyle=`v2`,t.textContent=k(N),e.append(t)}function H(e,t){if(t)for(let[n,r]of Object.entries(t))r!=null&&r!==!1&&(r===!0?e.setAttribute(n,``):e.setAttribute(n,String(r)))}function U(e){let t=o.get(e)??{count:0,overflow:e.documentElement.style.overflow,paddingRight:e.documentElement.style.paddingRight};if(t.count===0){let n=L(e),r=Math.max(0,n.innerWidth-e.documentElement.clientWidth);t.overflow=e.documentElement.style.overflow,t.paddingRight=e.documentElement.style.paddingRight,e.documentElement.style.overflow=`hidden`,r>0&&(e.documentElement.style.paddingRight=`${r}px`)}t.count+=1,o.set(e,t)}function W(e){let t=o.get(e);t&&(t.count=Math.max(0,t.count-1),t.count===0&&(e.documentElement.style.overflow=t.overflow,e.documentElement.style.paddingRight=t.paddingRight,o.delete(e)))}function G(e){switch(e){case`sm`:return`440px`;case`lg`:return`760px`;case`xl`:return`960px`;case`fullscreen`:return`calc(100vw - 16px)`;default:return`640px`}}function K(e,t){let n=e??r.defaultPresentation;return n===`auto`?t.matchMedia?.(`(max-width: 720px)`).matches?`bottom-sheet`:`modal`:n}class q{id;doc;win;host;root;result;handle;context;schemaValue;valuesValue;stateStore;initialValues;errorsValue={};actionLoading=new Set;loading=!1;settled=!1;destroyed=!1;resolveResult;previousFocus=null;listeners=[];fieldNodes=new Map;inputNodes=new Map;customNodes=new Map;constructor(e){this.schemaValue={...e},this.id=e.id||I(),this.doc=z(),this.win=L(this.doc),this.valuesValue=this.buildInitialValues(e),this.stateStore=j(this.valuesValue),this.valuesValue=this.stateStore.snapshot(),this.initialValues=this.cloneValues(this.valuesValue),this.host=D(this.doc,`div`),this.host.setAttribute(`data-rod-menu-host`,this.id),this.host.className=`rm-host`;let t=r.shadowRoot&&typeof this.host.attachShadow==`function`;this.root=t?this.host.attachShadow({mode:`open`}):this.host,V(this.root),this.result=new Promise(e=>{this.resolveResult=e});let n=this;this.context={get id(){return n.id},get values(){return n.valuesValue},get errors(){return n.errorsValue},get schema(){return n.schemaValue},get host(){return n.host},get root(){return n.root},get surface(){return n.handle},get(e){return n.valuesValue[e]},set(e,t){n.setValue(e,t)},setValues(e){n.setValues(e)},reset(){n.reset()},validate(){return n.validate()},close(e){n.finish(`dismiss`,e,`api`)},dismiss(e){n.finish(`dismiss`,void 0,e??`api`)},setLoading(e){n.setLoading(e)},setActionLoading(e,t){n.setActionLoading(e,t)},setFieldError(e,t){n.setFieldError(e,t)},clearErrors(){n.clearErrors()},update(e){n.update(e)}},this.handle={id:this.id,result:this.result,element:this.host,context:this.context,close:e=>this.finish(`dismiss`,e,`api`),dismiss:e=>this.finish(`dismiss`,void 0,e??`api`),update:e=>this.update(e),setValue:(e,t)=>this.setValue(e,t),setValues:e=>this.setValues(e),getValue:e=>this.valuesValue[e],validate:()=>this.validate(),setLoading:e=>this.setLoading(e),destroy:()=>this.destroy()},this.mount()}buildInitialValues(e){let t={...e.initialValues||{}},n=this.getAllFields(e);for(let e of n)e.type!==`divider`&&e.type!==`html`&&e.type!==`button`&&(Object.prototype.hasOwnProperty.call(t,e.name)||(e.value===void 0?e.defaultValue===void 0?t[e.name]=this.defaultForField(e):t[e.name]=F(e.defaultValue):t[e.name]=F(e.value)));return t}defaultForField(e){switch(e.type){case`checkbox`:case`switch`:return!1;case`multiselect`:case`checkbox-group`:return[];case`range`:return e.min??0;case`number`:return``;case`rating`:return+(e.allowZero===!1);case`file`:return[];default:return``}}cloneValues(e){let t={};for(let[n,r]of Object.entries(e))t[n]=F(r);return t}getAllFields(e=this.schemaValue){let t=e.fields?Array.from(e.fields):[],n=e.sections?.flatMap(e=>Array.from(e.fields))??[];return[...t,...n]}mount(){this.previousFocus=this.doc.activeElement,(r.mount?.(this.doc)||this.doc.body||this.doc.documentElement).append(this.host),this.render(),a.set(this.id,this.handle),this.schemaValue.scrollLock!==!1&&U(this.doc),this.bindGlobalEvents(),this.setupVisualViewport(),requestAnimationFrame(()=>{let e=this.getRootElement();e.dataset.open=`true`,this.host.setAttribute(n,`true`),this.focusInitial();try{this.schemaValue.onOpen?.(this.context)}catch(e){this.reportError(e)}})}render(){this.fieldNodes.clear(),this.inputNodes.clear(),this.customNodes.clear(),this.root.querySelector?.(`.rm-root`)?.remove();let e=D(this.doc,`div`);e.className=`rm-root ${this.schemaValue.className||``}`.trim(),e.dataset.open=`false`,e.dataset.loading=String(this.loading),e.dataset.presentation=K(this.schemaValue.presentation,this.win),e.dataset.side=this.schemaValue.drawerSide||`right`,e.style.setProperty(`--rm-z`,String(this.schemaValue.zIndex??r.zIndex)),e.style.setProperty(`--rm-width`,G(this.schemaValue.size));let t=D(this.doc,`div`);t.className=`rm-backdrop`,this.schemaValue.closeOnBackdrop!==!1&&this.schemaValue.dismissible!==!1&&t.addEventListener(`pointerdown`,e=>{e.target===t&&this.finish(`dismiss`,void 0,`backdrop`)});let n=D(this.doc,`section`);if(n.className=`rm-shell`,n.setAttribute(`role`,`dialog`),n.setAttribute(`aria-modal`,`true`),n.setAttribute(`aria-label`,this.schemaValue.title||`Menu`),this.schemaValue.showHandle!==!1&&e.dataset.presentation===`bottom-sheet`){let e=D(this.doc,`div`);e.className=`rm-handle-wrap`,e.innerHTML=`<div class="rm-handle" aria-hidden="true"></div>`,n.append(e),(this.schemaValue.draggable!==!1||this.schemaValue.swipeToDismiss!==!1)&&this.bindSwipe(e,n)}n.append(this.renderHeader());let i=D(this.doc,`div`);i.className=`rm-global-error`,i.dataset.show=`false`,n.append(i);let a=D(this.doc,`div`);a.className=`rm-body`,this.schemaValue.fields?.length&&a.append(this.renderSection({fields:this.schemaValue.fields}));for(let e of this.schemaValue.sections||[])a.append(this.renderSection(e));n.append(a),this.schemaValue.actions?.length&&n.append(this.renderActions()),e.append(t,n),this.root.append(e),this.refreshDynamicState()}renderHeader(){let e=D(this.doc,`header`);e.className=`rm-header`;let t=D(this.doc,`div`);if(t.className=`rm-heading`,this.schemaValue.eyebrow){let e=D(this.doc,`div`);e.className=`rm-eyebrow`,e.textContent=this.schemaValue.eyebrow,t.append(e)}if(this.schemaValue.title||this.schemaValue.icon){let e=D(this.doc,`div`);if(e.className=`rm-title-row`,this.schemaValue.icon){let t=D(this.doc,`div`);t.className=`rm-icon`,t.innerHTML=this.schemaValue.icon,e.append(t)}if(this.schemaValue.title){let t=D(this.doc,`h2`);t.className=`rm-title`,t.textContent=this.schemaValue.title,e.append(t)}t.append(e)}if(this.schemaValue.description){let e=D(this.doc,`p`);e.className=`rm-description`,e.textContent=this.schemaValue.description,t.append(e)}if(e.append(t),this.schemaValue.dismissible!==!1){let t=D(this.doc,`button`);t.type=`button`,t.className=`rm-close`,t.setAttribute(`aria-label`,`Fechar`),t.innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`,t.addEventListener(`click`,()=>this.finish(`dismiss`,void 0,`api`)),e.append(t)}return e}renderSection(e){let t=D(this.doc,`section`);t.className=`rm-section`,e.id&&(t.dataset.section=e.id),e.visibleWhen&&!this.safePredicate(e.visibleWhen)&&(t.hidden=!0);let n=!!e.collapsed,r;if(e.title||e.description){let i=D(this.doc,`div`);i.className=`rm-section-head`;let a=()=>{let t=D(this.doc,`div`);if(e.title){let n=D(this.doc,`h3`);n.className=`rm-section-title`,n.textContent=e.title,t.append(n)}if(e.description){let n=D(this.doc,`p`);n.className=`rm-section-description`,n.textContent=e.description,t.append(n)}return t};if(e.collapsible){let e=D(this.doc,`button`);e.type=`button`,e.className=`rm-section-toggle`,e.append(a());let t=D(this.doc,`span`);t.textContent=n?`+`:`−`,e.append(t),e.addEventListener(`click`,()=>{n=!n,r.hidden=n,t.textContent=n?`+`:`−`}),i.append(e)}else i.append(a());t.append(i)}r=D(this.doc,`div`),r.className=`rm-fields`,r.hidden=n;for(let t of e.fields)r.append(this.renderField(t));return t.append(r),t}renderField(e){let t=D(this.doc,`div`);if(t.className=`rm-field ${e.className||``}`.trim(),t.dataset.field=e.name,t.dataset.hidden=String(!!e.hidden),this.fieldNodes.set(e.name,t),e.type===`divider`)return t.innerHTML=`<div class="rm-divider" aria-hidden="true"></div>`,t;if(e.type!==`checkbox`&&e.type!==`switch`&&e.type!==`hidden`&&e.type!==`button`&&e.type!==`html`){let n=D(this.doc,`div`);n.className=`rm-label-row`;let r=D(this.doc,`label`);if(r.className=`rm-label`,r.htmlFor=`${this.id}-${e.name}`,r.textContent=e.label||e.name,e.required){let e=D(this.doc,`span`);e.className=`rm-required`,e.textContent=`*`,r.append(e)}if(n.append(r),e.description){let t=D(this.doc,`span`);t.className=`rm-description-field`,t.textContent=e.description,n.append(t)}t.append(n)}if(t.append(this.createControl(e)),e.help){let n=D(this.doc,`div`);n.className=`rm-help`,n.textContent=e.help,t.append(n)}let n=D(this.doc,`div`);return n.className=`rm-error`,n.setAttribute(`role`,`alert`),t.append(n),t}createControl(e){let t=this.valuesValue[e.name],n=t=>{let n=D(this.doc,`input`);return n.id=`${this.id}-${e.name}`,n.name=e.name,n.type=t,n.className=`rm-control`,n.placeholder=e.placeholder||``,n.disabled=!!e.disabled,n.readOnly=!!e.readonly,n.required=!!e.required,n.autofocus=!!e.autoFocus,H(n,e.attributes),this.inputNodes.set(e.name,n),n};switch(e.type){case`text`:case`email`:case`password`:case`search`:case`url`:case`tel`:{let r=n(e.type);return r.value=String(t??``),e.minLength!=null&&(r.minLength=e.minLength),e.maxLength!=null&&(r.maxLength=e.maxLength),e.pattern&&(r.pattern=e.pattern),e.autocomplete&&r.setAttribute(`autocomplete`,e.autocomplete),e.inputmode&&r.setAttribute(`inputmode`,e.inputmode),e.spellcheck!=null&&(r.spellcheck=e.spellcheck),r.addEventListener(`input`,()=>this.commitField(e,r.value)),r}case`number`:{let r=n(`number`);return r.value=t===``||t==null?``:String(t),e.min!=null&&(r.min=String(e.min)),e.max!=null&&(r.max=String(e.max)),e.step!=null&&(r.step=String(e.step)),r.addEventListener(`input`,()=>this.commitField(e,r.value===``?``:r.valueAsNumber)),r}case`textarea`:{let n=D(this.doc,`textarea`);return n.id=`${this.id}-${e.name}`,n.name=e.name,n.className=`rm-textarea`,n.placeholder=e.placeholder||``,n.value=String(t??``),n.rows=e.rows??4,n.disabled=!!e.disabled,n.readOnly=!!e.readonly,n.required=!!e.required,n.autofocus=!!e.autoFocus,e.minLength!=null&&(n.minLength=e.minLength),e.maxLength!=null&&(n.maxLength=e.maxLength),n.style.resize=e.resize||`vertical`,H(n,e.attributes),n.addEventListener(`input`,()=>this.commitField(e,n.value)),this.inputNodes.set(e.name,n),n}case`select`:{let n=D(this.doc,`select`);n.id=`${this.id}-${e.name}`,n.name=e.name,n.className=`rm-select`,n.disabled=!!e.disabled;for(let t of e.options){let e=D(this.doc,`option`);e.value=t.value,e.textContent=t.label,e.disabled=!!t.disabled,n.append(e)}return n.value=String(t??``),n.addEventListener(`change`,()=>this.commitField(e,n.value)),this.inputNodes.set(e.name,n),n}case`multiselect`:{let n=D(this.doc,`div`);n.className=`rm-chipbox`;let r=new Set(Array.isArray(t)?t.map(String):[]);for(let t of e.options){let i=D(this.doc,`button`);i.type=`button`,i.className=`rm-chip`,i.textContent=t.label,i.disabled=!!t.disabled;let a=()=>i.dataset.selected=String(r.has(t.value));a(),i.addEventListener(`click`,()=>{r.has(t.value)?r.delete(t.value):r.add(t.value),a(),this.commitField(e,Array.from(r))}),n.append(i)}return this.inputNodes.set(e.name,n),n}case`radio`:case`checkbox-group`:{let n=D(this.doc,`div`);n.className=`rm-options`,n.dataset.direction=e.direction||`vertical`;let r=e.type===`checkbox-group`?new Set(Array.isArray(t)?t.map(String):[]):null;for(let i of e.options){let a=D(this.doc,`label`);a.className=`rm-option`;let o=D(this.doc,`input`);o.type=e.type===`radio`?`radio`:`checkbox`,o.name=e.type===`radio`?e.name:`${e.name}[]`,o.value=i.value,o.disabled=!!i.disabled,o.checked=e.type===`radio`?String(t??``)===i.value:r.has(i.value),o.addEventListener(`change`,()=>{e.type===`radio`?this.commitField(e,i.value):(o.checked?r.add(i.value):r.delete(i.value),this.commitField(e,Array.from(r)))});let s=D(this.doc,`span`);s.className=`rm-option-copy`;let c=D(this.doc,`span`);if(c.textContent=i.label,s.append(c),i.description){let e=D(this.doc,`span`);e.className=`rm-option-desc`,e.textContent=i.description,s.append(e)}a.append(o,s),n.append(a)}return this.inputNodes.set(e.name,n),n}case`checkbox`:case`switch`:{let n=D(this.doc,`label`);n.className=`rm-check-row`;let r=D(this.doc,`span`);r.className=`rm-check-label`;let i=D(this.doc,`span`);if(i.className=`rm-label`,i.textContent=e.label||e.name,r.append(i),e.description){let t=D(this.doc,`div`);t.className=`rm-description-field`,t.textContent=e.description,r.append(t)}let a=D(this.doc,`input`);return a.id=`${this.id}-${e.name}`,a.name=e.name,a.type=`checkbox`,a.checked=!!t,a.disabled=!!e.disabled,a.className=e.type===`switch`?`rm-switch`:`rm-native-check`,a.addEventListener(`change`,()=>this.commitField(e,a.checked)),this.inputNodes.set(e.name,a),n.append(r,a),n}case`range`:{let n=D(this.doc,`div`);n.className=`rm-range-wrap`;let r=D(this.doc,`input`);r.id=`${this.id}-${e.name}`,r.name=e.name,r.type=`range`,r.className=`rm-range`,r.min=String(e.min??0),r.max=String(e.max??100),r.step=String(e.step??1),r.value=String(t??e.min??0);let i=D(this.doc,`output`);return i.className=`rm-range-value`,i.textContent=r.value,r.addEventListener(`input`,()=>{i.textContent=r.value,this.commitField(e,r.valueAsNumber)}),n.append(r),e.showValue!==!1&&n.append(i),this.inputNodes.set(e.name,r),n}case`date`:case`datetime-local`:case`time`:case`month`:case`week`:{let r=n(e.type);return r.value=String(t??``),e.min&&(r.min=e.min),e.max&&(r.max=e.max),e.step!=null&&(r.step=String(e.step)),r.addEventListener(`input`,()=>this.commitField(e,r.value)),r}case`color`:{let n=D(this.doc,`div`);n.className=`rm-color-row`;let r=D(this.doc,`input`);if(r.id=`${this.id}-${e.name}`,r.name=e.name,r.type=`color`,r.className=`rm-color`,r.value=typeof t==`string`&&/^#[0-9a-f]{6}$/i.test(t)?t:`#ff7a18`,r.addEventListener(`input`,()=>this.commitField(e,r.value)),n.append(r),e.presets?.length){let t=D(this.doc,`div`);t.className=`rm-presets`;for(let n of e.presets){let i=D(this.doc,`button`);i.type=`button`,i.className=`rm-swatch`,i.style.background=n,i.setAttribute(`aria-label`,n),i.addEventListener(`click`,()=>{r.value=n,this.commitField(e,n)}),t.append(i)}n.append(t)}return this.inputNodes.set(e.name,r),n}case`file`:{let t=n(`file`);return e.accept&&(t.accept=e.accept),t.multiple=!!e.multiple,e.capture&&t.setAttribute(`capture`,e.capture),t.addEventListener(`change`,()=>this.commitField(e,Array.from(t.files||[]))),t}case`hidden`:{let r=n(`hidden`);return r.value=String(t??``),r.addEventListener(`change`,()=>this.commitField(e,r.value)),r}case`segmented`:{let t=D(this.doc,`div`);t.className=`rm-segmented`;for(let n of e.options){let r=D(this.doc,`button`);r.type=`button`,r.className=`rm-segment`,r.textContent=n.label,r.disabled=!!n.disabled,r.dataset.selected=String(String(this.valuesValue[e.name]??``)===n.value),r.addEventListener(`click`,()=>{this.commitField(e,n.value),t.querySelectorAll(`.rm-segment`).forEach(e=>e.dataset.selected=String(e===r))}),t.append(r)}return this.inputNodes.set(e.name,t),t}case`rating`:{let t=D(this.doc,`div`);t.className=`rm-stars`;let n=Math.max(1,e.max??5);for(let r=1;r<=n;r+=1){let n=D(this.doc,`button`);n.type=`button`,n.className=`rm-star`,n.textContent=`★`,n.dataset.on=String(Number(this.valuesValue[e.name]||0)>=r),n.addEventListener(`click`,()=>{let n=e.allowZero!==!1&&Number(this.valuesValue[e.name])===r?0:r;this.commitField(e,n),t.querySelectorAll(`.rm-star`).forEach((e,t)=>e.dataset.on=String(t<n))}),t.append(n)}return this.inputNodes.set(e.name,t),t}case`button`:{let t=D(this.doc,`button`);return t.type=`button`,t.className=`rm-field-button rm-action`,t.dataset.variant=e.variant||`secondary`,t.textContent=e.text||e.label||e.name,t.addEventListener(`click`,async()=>{try{await e.onPress?.(this.context)}catch(e){this.reportError(e)}}),t}case`html`:{let t=D(this.doc,`div`);return t.innerHTML=typeof e.html==`function`?e.html(this.context):e.html,t}case`custom`:{let t=D(this.doc,`div`);t.dataset.customField=e.name;let n=e.render(this.context,e);return typeof n==`string`?t.innerHTML=n:n&&t.append(n),this.customNodes.set(e.name,t),t}}throw Error(`Unsupported RodMenu field type: ${e.type}`)}renderActions(){let e=D(this.doc,`footer`);e.className=`rm-actions`;for(let t of this.schemaValue.actions||[]){let n=D(this.doc,`button`);if(n.type=t.role===`submit`?`submit`:`button`,n.className=`rm-action`,n.dataset.action=t.id,n.dataset.variant=t.variant||(t.role===`destructive`?`danger`:t.role===`cancel`?`secondary`:`primary`),t.icon){let e=D(this.doc,`span`);e.innerHTML=t.icon,n.append(e)}let r=D(this.doc,`span`);r.textContent=t.label,n.append(r),n.addEventListener(`click`,()=>void this.runAction(t)),e.append(n)}return e}commitField(e,t){let n=e.transform?e.transform(t,this.context):t;this.valuesValue[e.name]=n,this.setFieldError(e.name,null);try{e.onChange?.(n,this.context)}catch(e){this.reportError(e)}try{this.schemaValue.onChange?.(this.context)}catch(e){this.reportError(e)}this.refreshDynamicState()}async runAction(e){if(!(this.actionLoading.has(e.id)||this.loading)&&!(e.validate!==!1&&e.role!==`cancel`&&!await this.validate())){this.setActionLoading(e.id,!0);try{let t=e.handler?await e.handler(this.context):void 0;(e.close??[`submit`,`cancel`,`destructive`].includes(e.role||`custom`))&&this.finish(e.id,t,`action`)}catch(e){this.reportError(e)}finally{this.setActionLoading(e.id,!1)}}}safePredicate(e){try{return!!e(this.valuesValue,this.context)}catch(e){return this.reportError(e),!0}}refreshDynamicState(){for(let e of this.getAllFields()){let t=this.fieldNodes.get(e.name);if(!t)continue;let n=!e.hidden&&(!e.visibleWhen||this.safePredicate(e.visibleWhen));t.dataset.hidden=String(!n);let r=!!e.disabled||!!e.disabledWhen?.(this.valuesValue,this.context),i=this.inputNodes.get(e.name);i&&`disabled`in i&&(i.disabled=r)}for(let e of this.schemaValue.actions||[]){let t=this.root.querySelector(`.rm-action[data-action="${CSS.escape(e.id)}"]`);t&&(t.hidden=!(!e.hidden&&(!e.visibleWhen||e.visibleWhen(this.valuesValue,this.context))),t.disabled=this.loading||this.actionLoading.has(e.id)||!!e.disabled||!!e.disabledWhen?.(this.valuesValue,this.context))}}async validate(){this.clearErrors();let e=null,t=this.getAllFields();for(let n of t){if([`divider`,`html`,`button`,`hidden`].includes(n.type))continue;let t=this.fieldNodes.get(n.name);if(t?.dataset.hidden===`true`)continue;let r=this.readFieldValue(n);if(n.required&&this.isEmptyValue(r)){this.setFieldError(n.name,`Campo obrigatório.`),e||=this.inputNodes.get(n.name)||t||null;continue}if(n.validate)try{let i=await n.validate(r,this.valuesValue,this.context);i&&(this.setFieldError(n.name,i),e||=this.inputNodes.get(n.name)||t||null)}catch(r){this.setFieldError(n.name,r instanceof Error?r.message:`Valor inválido.`),e||=this.inputNodes.get(n.name)||t||null}}if(this.schemaValue.validate)try{let e=await this.schemaValue.validate(this.valuesValue,this.context);if(typeof e==`string`&&e)this.setGlobalError(e);else if(e&&typeof e==`object`)for(let[t,n]of Object.entries(e))n&&this.setFieldError(t,n)}catch(e){this.setGlobalError(e instanceof Error?e.message:`Não foi possível validar o formulário.`)}let n=Object.keys(this.errorsValue).length===0&&!this.getGlobalError();return!n&&e&&(e.scrollIntoView({behavior:`smooth`,block:`center`}),`focus`in e&&e.focus({preventScroll:!0})),n}readFieldValue(e){if(e.type===`custom`&&e.read){let t=this.customNodes.get(e.name);if(t){let n=e.read(t,this.context);return this.valuesValue[e.name]=n,n}}return this.valuesValue[e.name]}isEmptyValue(e){return e==null||e===``||Array.isArray(e)&&e.length===0||e===!1}setFieldError(e,t){let n=this.fieldNodes.get(e);if(!t){if(delete this.errorsValue[e],n){n.dataset.error=`false`;let e=n.querySelector(`.rm-error`);e&&(e.textContent=``)}return}if(this.errorsValue[e]=t,n){n.dataset.error=`true`;let e=n.querySelector(`.rm-error`);e&&(e.textContent=t)}}clearErrors(){this.errorsValue={},this.setGlobalError(``);for(let e of this.fieldNodes.values()){e.dataset.error=`false`;let t=e.querySelector(`.rm-error`);t&&(t.textContent=``)}}setGlobalError(e){let t=this.root.querySelector(`.rm-global-error`);t&&(t.textContent=e,t.dataset.show=String(!!e),e?this.errorsValue.__global=e:delete this.errorsValue.__global)}getGlobalError(){return this.errorsValue.__global||``}setValue(e,t){this.stateStore.set(e,t),this.valuesValue=this.stateStore.snapshot(),this.writeValueToControl(e,t),this.refreshDynamicState();try{this.schemaValue.onChange?.(this.context)}catch(e){this.reportError(e)}}setValues(e){this.stateStore.patch(e),this.valuesValue=this.stateStore.snapshot();for(let[t,n]of Object.entries(e))this.writeValueToControl(t,n);this.refreshDynamicState();try{this.schemaValue.onChange?.(this.context)}catch(e){this.reportError(e)}}writeValueToControl(e,t){let n=this.getAllFields().find(t=>t.name===e);if(!n)return;if(n.type===`custom`&&n.write){let r=this.customNodes.get(e);r&&n.write(r,t,this.context);return}let r=this.inputNodes.get(e);r&&(r instanceof HTMLInputElement||r instanceof HTMLTextAreaElement||r instanceof HTMLSelectElement?r instanceof HTMLInputElement&&[`checkbox`,`radio`].includes(r.type)?r.checked=!!t:r instanceof HTMLInputElement&&r.type===`file`||(r.value=String(t??``)):(this.render(),requestAnimationFrame(()=>{let e=this.getRootElement();e.dataset.open=`true`})))}reset(){this.stateStore.replace(this.cloneValues(this.initialValues)),this.valuesValue=this.stateStore.snapshot(),this.render(),requestAnimationFrame(()=>{this.getRootElement().dataset.open=`true`})}update(e){this.schemaValue={...this.schemaValue,...e},this.render(),requestAnimationFrame(()=>{this.getRootElement().dataset.open=`true`})}setLoading(e){this.loading=e;let t=this.getRootElement();t.dataset.loading=String(e),this.refreshDynamicState()}setActionLoading(e,t){t?this.actionLoading.add(e):this.actionLoading.delete(e);let n=this.root.querySelector(`.rm-action[data-action="${CSS.escape(e)}"]`);if(!n)return;let r=n.querySelector(`.rm-spinner`);if(t&&!r){let e=D(this.doc,`span`);e.className=`rm-spinner`,n.prepend(e)}else!t&&r&&r.remove();this.refreshDynamicState()}bindGlobalEvents(){let e=e=>{if(!(this.destroyed||this.settled)){if(e.key===`Escape`&&this.schemaValue.dismissible!==!1&&this.schemaValue.closeOnEscape!==!1){e.preventDefault(),this.finish(`dismiss`,void 0,`escape`);return}if(e.key===`Tab`&&this.schemaValue.trapFocus!==!1&&this.handleTab(e),e.key===`Enter`&&this.schemaValue.submitOnEnter!==!1){let t=e.target;if(t?.tagName===`TEXTAREA`||t?.isContentEditable)return;let n=this.schemaValue.actions?.find(e=>e.role===`submit`);n&&(e.preventDefault(),this.runAction(n))}}};this.doc.addEventListener(`keydown`,e,!0),this.listeners.push(()=>this.doc.removeEventListener(`keydown`,e,!0))}handleTab(e){let t=this.getFocusable();if(!t.length){e.preventDefault();return}let n=t[0],r=t[t.length-1],i=this.doc.activeElement;e.shiftKey&&i===n?(e.preventDefault(),r.focus()):!e.shiftKey&&i===r&&(e.preventDefault(),n.focus())}getFocusable(){return Array.from(this.root.querySelectorAll(`button:not([disabled]):not([hidden]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])`)).filter(e=>!e.hidden&&e.offsetParent!==null)}focusInitial(){(this.root.querySelector(`[autofocus]`)||this.getFocusable()[0])?.focus({preventScroll:!0})}setupVisualViewport(){let e=this.win.visualViewport;if(!e)return;let t=()=>this.getRootElement().style.setProperty(`--rm-vvh`,`${e.height}px`);t(),e.addEventListener(`resize`,t),e.addEventListener(`scroll`,t),this.listeners.push(()=>{e.removeEventListener(`resize`,t),e.removeEventListener(`scroll`,t)})}bindSwipe(e,t){let n=0,r=0,i=!1,a=-1,o=o=>{o.button===0&&(i=!0,a=o.pointerId,n=o.clientY,r=0,e.setPointerCapture?.(a),t.style.transition=`none`)},s=e=>{!i||e.pointerId!==a||(r=Math.max(0,e.clientY-n),t.style.setProperty(`--rm-drag-y`,`${r}px`))},c=e=>{!i||e.pointerId!==a||(i=!1,t.style.transition=``,r>Math.min(140,t.getBoundingClientRect().height*.22)&&this.schemaValue.swipeToDismiss!==!1&&this.schemaValue.dismissible!==!1?this.finish(`dismiss`,void 0,`swipe`):t.style.removeProperty(`--rm-drag-y`))};e.addEventListener(`pointerdown`,o),e.addEventListener(`pointermove`,s),e.addEventListener(`pointerup`,c),e.addEventListener(`pointercancel`,c),this.listeners.push(()=>{e.removeEventListener(`pointerdown`,o),e.removeEventListener(`pointermove`,s),e.removeEventListener(`pointerup`,c),e.removeEventListener(`pointercancel`,c)})}finish(e,t,r){if(this.settled)return;this.settled=!0;let i={action:e,values:this.cloneValues(this.valuesValue),data:t,reason:r},a=this.getRootElement();a.dataset.open=`false`,this.host.removeAttribute(n),this.win.setTimeout(()=>{try{this.schemaValue.onClose?.(i)}catch(e){this.reportError(e)}this.resolveResult(i),this.destroy(!1)},300)}destroy(e=!0){if(!this.destroyed){this.destroyed=!0;for(let e of this.listeners.splice(0))try{e()}catch{}if(a.delete(this.id),this.schemaValue.scrollLock!==!1&&W(this.doc),this.host.remove(),this.schemaValue.restoreFocus!==!1&&this.previousFocus instanceof HTMLElement&&this.previousFocus.isConnected)try{this.previousFocus.focus({preventScroll:!0})}catch{}e&&!this.settled&&(this.settled=!0,this.resolveResult({action:`dismiss`,values:this.cloneValues(this.valuesValue),reason:`api`}))}}getRootElement(){let e=this.root.querySelector(`.rm-root`);if(!e)throw Error(`RodMenu root is not mounted.`);return e}reportError(e){try{this.schemaValue.onError?.(e,this.context)}catch{}try{r.onError?.(e)}catch{}let t=e instanceof Error?e.message:String(e),n=this.schemaValue.errorMode??(r.toasterErrors?`both`:`inline`);(n===`inline`||n===`both`)&&this.setGlobalError(t),(n===`toaster`||n===`both`)&&!M(`error`,this.schemaValue.title||`RodMenu`,t)&&r.autoLoadDependencies&&T(`toaster`);try{console.error(`[RodMenu]`,e)}catch{}}}for(let e of[`elements`,`toaster`,`cipo`,`broto`])_(e)&&g(e,`native`,`window`);let J=e[t],Y={version:`2.0.0`,get config(){return Object.freeze({...r,dependencyUrls:{...r.dependencyUrls}})},get runtime(){return Object.freeze({elements:{...s.elements},toaster:{...s.toaster},cipo:{...s.cipo},broto:{...s.broto}})},ready:r.autoLoadDependencies?E():Promise.resolve({elements:{...s.elements},toaster:{...s.toaster},cipo:{...s.cipo},broto:{...s.broto}}),open(e){return new q(e).handle},async form(e){let t=e.actions||[{id:`cancel`,label:`Cancelar`,role:`cancel`,variant:`secondary`},{id:`submit`,label:`Continuar`,role:`submit`,variant:`primary`}];return Y.open({...e,actions:t}).result},async confirm(e){return(await Y.open({title:e.title,description:e.description,presentation:e.presentation,actions:[{id:`cancel`,label:e.cancelLabel||`Cancelar`,role:`cancel`,variant:`secondary`},{id:`confirm`,label:e.confirmLabel||`Confirmar`,role:e.danger?`destructive`:`submit`,variant:e.danger?`danger`:`primary`}]}).result).action===`confirm`},async actions(e){let t=await Y.open({title:e.title,description:e.description,presentation:e.presentation,actions:[...e.items.map(e=>({id:e.value,label:e.label,icon:e.icon,variant:e.variant||`secondary`,role:`custom`,close:!0})),{id:`cancel`,label:`Cancelar`,variant:`ghost`,role:`cancel`}]}).result;return t.action===`dismiss`||t.action===`cancel`?null:t.action},configure(e){r={...r,...e,dependencyUrls:e.dependencyUrls?{...r.dependencyUrls,...e.dependencyUrls}:r.dependencyUrls},e.autoLoadDependencies===!0&&E()},loadDependencies:E,get(e){return a.get(e)},closeAll(e=`replaced`){for(let t of Array.from(a.values()))t.dismiss(e)},noConflict(){try{e[t]=J}catch{}return Y}};B(Y)})(window);let n=`RodMenu`,r=[];function i(e){!e||typeof e!=`object`&&typeof e!=`function`||r.includes(e)||r.push(e)}i(globalThis);try{typeof window<`u`&&i(window)}catch{}try{typeof self<`u`&&i(self)}catch{}try{typeof unsafeWindow<`u`&&i(unsafeWindow)}catch{}try{typeof window<`u`&&i(window.parent)}catch{}try{typeof window<`u`&&i(window.top)}catch{}let a;for(let e of r)try{let t=e[n];if(t!==void 0){a=t;break}}catch{}let o=Object.keys(t).length>0,s=Object.prototype.hasOwnProperty.call(t,`default`)?void 0:Object.prototype.hasOwnProperty.call(t,n)?t[n]:o?t:a;function c(e){if(s!==void 0){try{Object.defineProperty(e,n,{value:s,configurable:!0,writable:!0});return}catch{}try{e[n]=s}catch{}}}for(let e of r)c(e);return s})();
//# sourceMappingURL=menu.js.map