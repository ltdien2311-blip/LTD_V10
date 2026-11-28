/* ============================================================================
 * js/minmap.js — Mô-đun độc lập 🗺️ MinMap (Sơ đồ trực quan 1920x1080 GV & A4 HS)
 * Khế ước MT-3.2: Cô lập 100% trong #minmap-modal, không rò rỉ DOM ngoài.
 * ============================================================================ */
(function (global) {
    'use strict';

    var LS_DRAFT = 'ltd_minmap_draft_v1';
    var LS_ED_FS = 'ltd_minmap_ed_fs_v1';
    var COLORS = ['#FFF000', '#00FF01', '#FF9F43'];
    var FRAMES = ['#FFF000', '#FFFFFF', '#FFFFFF', '#00FF01'];

    var SAMPLE_MINMAP = [
        '# 🧬 KHÁI NIỆM & BIỂU DIỄN POLYMER',
        '',
        '## 📖 1. ĐỊNH NGHĨA CƠ BẢN',
        '🧱 Polymer:',
        '  Hợp chất có ==phân tử khối lớn==, do nhiều ==mắt xích== liên kết tạo nên',
        '🧩 Monomer:',
        '  Những ==phân tử nhỏ==, phản ứng với nhau để tạo nên ==polymer==',
        '🔢 Hệ số $\\mathrm{n}$:',
        '  ==Hệ số polymer hóa== (chỉ ==số lượng mắt xích== trong công thức)',
        '',
        '## 🧪 2. BIỂU DIỄN CÔNG THỨC POLYMER',
        '🛍️ Polyethene (PE):',
        '  Trùng hợp ethene ($\\mathrm{CH_2=CH_2}$) tạo ==PE==: $\\mathrm{(-CH_2-CH_2-)_n}$',
        '🚿 Poly(vinyl chloride) (PVC):',
        '  Từ vinyl chloride ($\\mathrm{CH_2=CHCl}$) tạo ==PVC==: $\\mathrm{(-CH_2-CHCl-)_n}$',
        '⚠️ Bẫy:',
        '  ⛔ Hay nhầm: Thu gọn mắt xích của PE thành $\\mathrm{-CH_2-}$',
        '  ✅ Nhớ đúng: Giữ đủ bộ khung 2C của ethene là ==$\\mathrm{-CH_2-CH_2-}$=='
    ].join('\n');

    var mmWin = {};
    var modalEl = null;
    var resizeObs = null;
    var state = {
        tab: 'teacher',
        zoom100: false,
        camVisible: false,
        sloganOn: true,
        sloganTheme: 'theme-aurora',
        stageBg: 'bg-obsidian',
        swapCols: false,
        font: 'Segoe UI',
        teacherFont: 'Segoe UI',
        studentFont: 'Segoe UI',
        teacherBodyFs: 40,
        teacherMainTitleFs: 38,
        teacherCardTitleFs: 30,
        splitOverride: null,
        studentBodyFs: 13,
        studentMainTitleFs: 24,
        studentCardTitleFs: 18.5,
        blankScale: 1,
        blankRowGap: 26,
        blankStyle: 'dotted',
        blankWeight: 'medium',
        selectedBlankId: null,
        blankWidths: {},
        blankRows: {},
        lineAligns: {},
        studentLineAligns: {},
        branchAligns: {},
        selectedTeacherRow: null,
        selectedBranch: 0,
        studentSelectedBranch: 0,
        branchImages: {},
        teacherSeq: 1,
        studentSeq: 1,
        history: [],
        historyIdx: -1,
        busyExport: false
    };

    var ICON_GROUPS = [
        { label: 'Kiến thức & Trọng tâm', icons: ['🎯', '📌', '📖', '💡', '🧠', '🔑', '⭐', '📝'] },
        { label: 'Hóa học & Thí nghiệm', icons: ['🧬', '⚛️', '🧪', '⚗️', '🔬', '🧫', '🌡️', '⚡', '🔥', '💧'] },
        { label: 'Cấu trúc & Liên kết', icons: ['🔗', '🧩', '🧱', '📐', '📊', '📈', '⚖️', '🔄'] },
        { label: 'Bẫy & Lưu ý', icons: ['⚠️', '⛔', '❌', '✅', '🔍', '🛡️', '💬', '❗'] },
        { label: 'Điều hướng', icons: ['➡️', '🔹', '🔸', '1️⃣', '2️⃣', '3️⃣', '4️⃣'] }
    ];

    function $(sel) {
        return modalEl ? modalEl.querySelector(sel) : null;
    }
    function $all(sel) {
        return modalEl ? Array.prototype.slice.call(modalEl.querySelectorAll(sel)) : [];
    }
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function showToast(msg, type) {
        if (!modalEl) return;
        var box = $('#mm-toast-box');
        if (!box) return;
        var el = document.createElement('div');
        el.style.cssText = 'padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.35);background:' +
            (type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#059669');
        el.textContent = msg;
        box.appendChild(el);
        setTimeout(function () { try { box.removeChild(el); } catch (e) {} }, 3000);
    }
    function setStatus(msg) {
        var el = $('.vp-export-status');
        if (el) el.textContent = msg;
    }

!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((mmWin.htmlToImage={}))}(this,(function(t){"use strict";function e(t,e,n,r){return new(n||(n=Promise))((function(i,o){function u(t){try{a(r.next(t))}catch(t){o(t)}}function c(t){try{a(r.throw(t))}catch(t){o(t)}}function a(t){var e;t.done?i(t.value):(e=t.value,e instanceof n?e:new n((function(t){t(e)}))).then(u,c)}a((r=r.apply(t,e||[])).next())}))}function n(t,e){var n,r,i,o,u={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:c(0),throw:c(1),return:c(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function c(c){return function(a){return function(c){if(n)throw new TypeError("Generator is already executing.");for(;o&&(o=0,c[0]&&(u=0)),u;)try{if(n=1,r&&(i=2&c[0]?r.return:c[0]?r.throw||((i=r.return)&&i.call(r),0):r.next)&&!(i=i.call(r,c[1])).done)return i;switch(r=0,i&&(c=[2&c[0],i.value]),c[0]){case 0:case 1:i=c;break;case 4:return u.label++,{value:c[1],done:!1};case 5:u.label++,r=c[1],c=[0];continue;case 7:c=u.ops.pop(),u.trys.pop();continue;default:if(!(i=u.trys,(i=i.length>0&&i[i.length-1])||6!==c[0]&&2!==c[0])){u=0;continue}if(3===c[0]&&(!i||c[1]>i[0]&&c[1]<i[3])){u.label=c[1];break}if(6===c[0]&&u.label<i[1]){u.label=i[1],i=c;break}if(i&&u.label<i[2]){u.label=i[2],u.ops.push(c);break}i[2]&&u.ops.pop(),u.trys.pop();continue}c=e.call(t,u)}catch(t){c=[6,t],r=0}finally{n=i=0}if(5&c[0])throw c[1];return{value:c[0]?c[1]:void 0,done:!0}}([c,a])}}}var r,i=(r=0,function(){return r+=1,"u".concat("0000".concat((Math.random()*Math.pow(36,4)<<0).toString(36)).slice(-4)).concat(r)});function o(t){for(var e=[],n=0,r=t.length;n<r;n++)e.push(t[n]);return e}var u=null;function c(t){return void 0===t&&(t={}),u||(u=t.includeStyleProperties?t.includeStyleProperties:o(window.getComputedStyle(document.documentElement)))}function a(t,e){var n=(t.ownerDocument.defaultView||window).getComputedStyle(t).getPropertyValue(e);return n?parseFloat(n.replace("px","")):0}function s(t,e){void 0===e&&(e={});var n,r,i,o=e.width||(r=a(n=t,"border-left-width"),i=a(n,"border-right-width"),n.clientWidth+r+i),u=e.height||function(t){var e=a(t,"border-top-width"),n=a(t,"border-bottom-width");return t.clientHeight+e+n}(t);return{width:o,height:u}}var l=16384;function f(t,e){return void 0===e&&(e={}),t.toBlob?new Promise((function(n){t.toBlob(n,e.type?e.type:"image/png",e.quality?e.quality:1)})):new Promise((function(n){for(var r=window.atob(t.toDataURL(e.type?e.type:void 0,e.quality?e.quality:void 0).split(",")[1]),i=r.length,o=new Uint8Array(i),u=0;u<i;u+=1)o[u]=r.charCodeAt(u);n(new Blob([o],{type:e.type?e.type:"image/png"}))}))}function h(t){return new Promise((function(e,n){var r=new Image;r.onload=function(){r.decode().then((function(){requestAnimationFrame((function(){return e(r)}))}))},r.onerror=n,r.crossOrigin="anonymous",r.decoding="async",r.src=t}))}function d(t){return e(this,void 0,void 0,(function(){return n(this,(function(e){return[2,Promise.resolve().then((function(){return(new XMLSerializer).serializeToString(t)})).then(encodeURIComponent).then((function(t){return"data:image/svg+xml;charset=utf-8,".concat(t)}))]}))}))}function v(t,r,i){return e(this,void 0,void 0,(function(){var e,o,u;return n(this,(function(n){return e="http://www.w3.org/2000/svg",o=document.createElementNS(e,"svg"),u=document.createElementNS(e,"foreignObject"),o.setAttribute("width","".concat(r)),o.setAttribute("height","".concat(i)),o.setAttribute("viewBox","0 0 ".concat(r," ").concat(i)),u.setAttribute("width","100%"),u.setAttribute("height","100%"),u.setAttribute("x","0"),u.setAttribute("y","0"),u.setAttribute("externalResourcesRequired","true"),o.appendChild(u),u.appendChild(t),[2,d(o)]}))}))}var p=function(t,e){if(t instanceof e)return!0;var n=Object.getPrototypeOf(t);return null!==n&&(n.constructor.name===e.name||p(n,e))};function g(t,e,n,r){var i=".".concat(t,":").concat(e),o=n.cssText?function(t){var e=t.getPropertyValue("content");return"".concat(t.cssText," content: '").concat(e.replace(/'|"/g,""),"';")}(n):function(t,e){return c(e).map((function(e){var n=t.getPropertyValue(e),r=t.getPropertyPriority(e);return"".concat(e,": ").concat(n).concat(r?" !important":"",";")})).join(" ")}(n,r);return document.createTextNode("".concat(i,"{").concat(o,"}"))}function m(t,e,n,r){var o=window.getComputedStyle(t,n),u=o.getPropertyValue("content");if(""!==u&&"none"!==u){var c=i();try{e.className="".concat(e.className," ").concat(c)}catch(t){return}var a=document.createElement("style");a.appendChild(g(c,n,o,r)),e.appendChild(a)}}var w="application/font-woff",y="image/jpeg",b={woff:w,woff2:w,ttf:"application/font-truetype",eot:"application/vnd.ms-fontobject",png:"image/png",jpg:y,jpeg:y,gif:"image/gif",tiff:"image/tiff",svg:"image/svg+xml",webp:"image/webp"};function S(t){var e=function(t){var e=/\.([^./]*?)$/g.exec(t);return e?e[1]:""}(t).toLowerCase();return b[e]||""}function E(t){return-1!==t.search(/^(data:)/)}function x(t,e){return"data:".concat(e,";base64,").concat(t)}function C(t,r,i){return e(this,void 0,void 0,(function(){var e,o;return n(this,(function(n){switch(n.label){case 0:return[4,fetch(t,r)];case 1:if(404===(e=n.sent()).status)throw new Error('Resource "'.concat(e.url,'" not found'));return[4,e.blob()];case 2:return o=n.sent(),[2,new Promise((function(t,n){var r=new FileReader;r.onerror=n,r.onloadend=function(){try{t(i({res:e,result:r.result}))}catch(t){n(t)}},r.readAsDataURL(o)}))]}}))}))}var P={};function R(t,r,i){return e(this,void 0,void 0,(function(){var e,o,u,c,a;return n(this,(function(n){switch(n.label){case 0:if(e=function(t,e,n){var r=t.replace(/\?.*/,"");return n&&(r=t),/ttf|otf|eot|woff2?/i.test(r)&&(r=r.replace(/.*\//,"")),e?"[".concat(e,"]").concat(r):r}(t,r,i.includeQueryParams),null!=P[e])return[2,P[e]];i.cacheBust&&(t+=(/\?/.test(t)?"&":"?")+(new Date).getTime()),n.label=1;case 1:return n.trys.push([1,3,,4]),[4,C(t,i.fetchRequestInit,(function(t){var e=t.res,n=t.result;return r||(r=e.headers.get("Content-Type")||""),function(t){return t.split(/,/)[1]}(n)}))];case 2:return u=n.sent(),o=x(u,r),[3,4];case 3:return c=n.sent(),o=i.imagePlaceholder||"",a="Failed to fetch resource: ".concat(t),c&&(a="string"==typeof c?c:c.message),a&&console.warn(a),[3,4];case 4:return P[e]=o,[2,o]}}))}))}function T(t){return e(this,void 0,void 0,(function(){var e;return n(this,(function(n){return"data:,"===(e=t.toDataURL())?[2,t.cloneNode(!1)]:[2,h(e)]}))}))}function A(t,r){return e(this,void 0,void 0,(function(){var e,i,o,u;return n(this,(function(n){switch(n.label){case 0:return t.currentSrc?(e=document.createElement("canvas"),i=e.getContext("2d"),e.width=t.clientWidth,e.height=t.clientHeight,null==i||i.drawImage(t,0,0,e.width,e.height),[2,h(e.toDataURL())]):(o=t.poster,u=S(o),[4,R(o,u,r)]);case 1:return[2,h(n.sent())]}}))}))}function k(t,r){var i;return e(this,void 0,void 0,(function(){return n(this,(function(e){switch(e.label){case 0:return e.trys.push([0,3,,4]),(null===(i=null==t?void 0:t.contentDocument)||void 0===i?void 0:i.body)?[4,I(t.contentDocument.body,r,!0)]:[3,2];case 1:return[2,e.sent()];case 2:return[3,4];case 3:return e.sent(),[3,4];case 4:return[2,t.cloneNode(!1)]}}))}))}var L=function(t){return null!=t.tagName&&"SVG"===t.tagName.toUpperCase()};function N(t,e,n){return p(e,Element)&&(function(t,e,n){var r=e.style;if(r){var i=window.getComputedStyle(t);i.cssText?(r.cssText=i.cssText,r.transformOrigin=i.transformOrigin):c(n).forEach((function(n){var o=i.getPropertyValue(n);if("font-size"===n&&o.endsWith("px")){var u=Math.floor(parseFloat(o.substring(0,o.length-2)))-.1;o="".concat(u,"px")}p(t,HTMLIFrameElement)&&"display"===n&&"inline"===o&&(o="block"),"d"===n&&e.getAttribute("d")&&(o="path(".concat(e.getAttribute("d"),")")),r.setProperty(n,o,i.getPropertyPriority(n))}))}}(t,e,n),function(t,e,n){m(t,e,":before",n),m(t,e,":after",n)}(t,e,n),function(t,e){p(t,HTMLTextAreaElement)&&(e.innerHTML=t.value),p(t,HTMLInputElement)&&e.setAttribute("value",t.value)}(t,e),function(t,e){if(p(t,HTMLSelectElement)){var n=e,r=Array.from(n.children).find((function(e){return t.value===e.getAttribute("value")}));r&&r.setAttribute("selected","")}}(t,e)),e}function I(t,r,i){return e(this,void 0,void 0,(function(){return n(this,(function(u){return i||!r.filter||r.filter(t)?[2,Promise.resolve(t).then((function(t){return function(t,r){return e(this,void 0,void 0,(function(){return n(this,(function(e){return p(t,HTMLCanvasElement)?[2,T(t)]:p(t,HTMLVideoElement)?[2,A(t,r)]:p(t,HTMLIFrameElement)?[2,k(t,r)]:[2,t.cloneNode(L(t))]}))}))}(t,r)})).then((function(i){return function(t,r,i){var u,c;return e(this,void 0,void 0,(function(){var e;return n(this,(function(n){switch(n.label){case 0:return L(r)?[2,r]:(e=[],0===(e=null!=(a=t).tagName&&"SLOT"===a.tagName.toUpperCase()&&t.assignedNodes?o(t.assignedNodes()):p(t,HTMLIFrameElement)&&(null===(u=t.contentDocument)||void 0===u?void 0:u.body)?o(t.contentDocument.body.childNodes):o((null!==(c=t.shadowRoot)&&void 0!==c?c:t).childNodes)).length||p(t,HTMLVideoElement)?[2,r]:[4,e.reduce((function(t,e){return t.then((function(){return I(e,i)})).then((function(t){t&&r.appendChild(t)}))}),Promise.resolve())]);case 1:return n.sent(),[2,r]}var a}))}))}(t,i,r)})).then((function(e){return N(t,e,r)})).then((function(t){return function(t,r){return e(this,void 0,void 0,(function(){var e,i,o,u,c,a,s,l,f,h,d,v,p;return n(this,(function(n){switch(n.label){case 0:if(0===(e=t.querySelectorAll?t.querySelectorAll("use"):[]).length)return[2,t];i={},p=0,n.label=1;case 1:return p<e.length?(o=e[p],(u=o.getAttribute("xlink:href"))?(c=t.querySelector(u),a=document.querySelector(u),c||!a||i[u]?[3,3]:(s=i,l=u,[4,I(a,r,!0)])):[3,3]):[3,4];case 2:s[l]=n.sent(),n.label=3;case 3:return p++,[3,1];case 4:if((f=Object.values(i)).length){for(h="http://www.w3.org/1999/xhtml",(d=document.createElementNS(h,"svg")).setAttribute("xmlns",h),d.style.position="absolute",d.style.width="0",d.style.height="0",d.style.overflow="hidden",d.style.display="none",v=document.createElementNS(h,"defs"),d.appendChild(v),p=0;p<f.length;p++)v.appendChild(f[p]);t.appendChild(d)}return[2,t]}}))}))}(t,r)}))]:[2,null]}))}))}var D=/url\((['"]?)([^'"]+?)\1\)/g,H=/url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g,M=/src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;function F(t,r,i,o,u){return e(this,void 0,void 0,(function(){var e,c,a,s;return n(this,(function(n){switch(n.label){case 0:return n.trys.push([0,5,,6]),e=i?function(t,e){if(t.match(/^[a-z]+:\/\//i))return t;if(t.match(/^\/\//))return window.location.protocol+t;if(t.match(/^[a-z]+:/i))return t;var n=document.implementation.createHTMLDocument(),r=n.createElement("base"),i=n.createElement("a");return n.head.appendChild(r),n.body.appendChild(i),e&&(r.href=e),i.href=t,i.href}(r,i):r,c=S(r),a=void 0,u?[4,u(e)]:[3,2];case 1:return s=n.sent(),a=x(s,c),[3,4];case 2:return[4,R(e,c,o)];case 3:a=n.sent(),n.label=4;case 4:return[2,t.replace((l=r,f=l.replace(/([.*+?^${}()|\[\]\/\\])/g,"\\$1"),new RegExp("(url\\(['\"]?)(".concat(f,")(['\"]?\\))"),"g")),"$1".concat(a,"$3"))];case 5:return n.sent(),[3,6];case 6:return[2,t]}var l,f}))}))}function V(t){return-1!==t.search(D)}function q(t,r,i){return e(this,void 0,void 0,(function(){var e,o;return n(this,(function(n){return V(t)?(e=function(t,e){var n=e.preferredFontFormat;return n?t.replace(M,(function(t){for(;;){var e=H.exec(t)||[],r=e[0],i=e[2];if(!i)return"";if(i===n)return"src: ".concat(r,";")}})):t}(t,i),o=function(t){var e=[];return t.replace(D,(function(t,n,r){return e.push(r),t})),e.filter((function(t){return!E(t)}))}(e),[2,o.reduce((function(t,e){return t.then((function(t){return F(t,e,r,i)}))}),Promise.resolve(e))]):[2,t]}))}))}function U(t,r,i){var o;return e(this,void 0,void 0,(function(){var e,u;return n(this,(function(n){switch(n.label){case 0:return(e=null===(o=r.style)||void 0===o?void 0:o.getPropertyValue(t))?[4,q(e,null,i)]:[3,2];case 1:return u=n.sent(),r.style.setProperty(t,u,r.style.getPropertyPriority(t)),[2,!0];case 2:return[2,!1]}}))}))}function j(t,r){return e(this,void 0,void 0,(function(){var e,i;return n(this,(function(n){switch(n.label){case 0:return[4,U("background",t,r)];case 1:return n.sent()?[3,3]:[4,U("background-image",t,r)];case 2:n.sent(),n.label=3;case 3:return[4,U("mask",t,r)];case 4:return(i=n.sent())?[3,6]:[4,U("-webkit-mask",t,r)];case 5:i=n.sent(),n.label=6;case 6:return(e=i)?[3,8]:[4,U("mask-image",t,r)];case 7:e=n.sent(),n.label=8;case 8:return e?[3,10]:[4,U("-webkit-mask-image",t,r)];case 9:n.sent(),n.label=10;case 10:return[2]}}))}))}function O(t,r){return e(this,void 0,void 0,(function(){var e,i,o;return n(this,(function(n){switch(n.label){case 0:return(e=p(t,HTMLImageElement))&&!E(t.src)||p(t,SVGImageElement)&&!E(t.href.baseVal)?[4,R(i=e?t.src:t.href.baseVal,S(i),r)]:[2];case 1:return o=n.sent(),[4,new Promise((function(n,i){t.onload=n,t.onerror=r.onImageErrorHandler?function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];try{n(r.onImageErrorHandler.apply(r,t))}catch(t){i(t)}}:i;var u=t;u.decode&&(u.decode=n),"lazy"===u.loading&&(u.loading="eager"),e?(t.srcset="",t.src=o):t.href.baseVal=o}))];case 2:return n.sent(),[2]}}))}))}function B(t,r){return e(this,void 0,void 0,(function(){var e,i;return n(this,(function(n){switch(n.label){case 0:return e=o(t.childNodes),i=e.map((function(t){return z(t,r)})),[4,Promise.all(i).then((function(){return t}))];case 1:return n.sent(),[2]}}))}))}function z(t,r){return e(this,void 0,void 0,(function(){return n(this,(function(e){switch(e.label){case 0:return p(t,Element)?[4,j(t,r)]:[3,4];case 1:return e.sent(),[4,O(t,r)];case 2:return e.sent(),[4,B(t,r)];case 3:e.sent(),e.label=4;case 4:return[2]}}))}))}var W={};function $(t){return e(this,void 0,void 0,(function(){var e,r;return n(this,(function(n){switch(n.label){case 0:return null!=(e=W[t])?[2,e]:[4,fetch(t)];case 1:return[4,n.sent().text()];case 2:return r=n.sent(),e={url:t,cssText:r},W[t]=e,[2,e]}}))}))}function G(t,r){return e(this,void 0,void 0,(function(){var i,o,u,c,a=this;return n(this,(function(s){return i=t.cssText,o=/url\(["']?([^"')]+)["']?\)/g,u=i.match(/url\([^)]+\)/g)||[],c=u.map((function(u){return e(a,void 0,void 0,(function(){var e;return n(this,(function(n){return(e=u.replace(o,"$1")).startsWith("https://")||(e=new URL(e,t.url).href),[2,C(e,r.fetchRequestInit,(function(t){var e=t.result;return i=i.replace(u,"url(".concat(e,")")),[u,e]}))]}))}))})),[2,Promise.all(c).then((function(){return i}))]}))}))}function _(t){if(null==t)return[];for(var e=[],n=t.replace(/(\/\*[\s\S]*?\*\/)/gi,""),r=new RegExp("((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})","gi");;){if(null===(u=r.exec(n)))break;e.push(u[0])}n=n.replace(r,"");for(var i=/@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi,o=new RegExp("((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})","gi");;){var u;if(null===(u=i.exec(n))){if(null===(u=o.exec(n)))break;i.lastIndex=o.lastIndex}else o.lastIndex=i.lastIndex;e.push(u[0])}return e}function J(t,r){return e(this,void 0,void 0,(function(){var e,i;return n(this,(function(n){return e=[],i=[],t.forEach((function(e){if("cssRules"in e)try{o(e.cssRules||[]).forEach((function(t,n){if(t.type===CSSRule.IMPORT_RULE){var o=n+1,u=$(t.href).then((function(t){return G(t,r)})).then((function(t){return _(t).forEach((function(t){try{e.insertRule(t,t.startsWith("@import")?o+=1:e.cssRules.length)}catch(e){console.error("Error inserting rule from remote css",{rule:t,error:e})}}))})).catch((function(t){console.error("Error loading remote css",t.toString())}));i.push(u)}}))}catch(o){var n=t.find((function(t){return null==t.href}))||document.styleSheets[0];null!=e.href&&i.push($(e.href).then((function(t){return G(t,r)})).then((function(t){return _(t).forEach((function(t){n.insertRule(t,n.cssRules.length)}))})).catch((function(t){console.error("Error loading remote stylesheet",t)}))),console.error("Error inlining remote css file",o)}})),[2,Promise.all(i).then((function(){return t.forEach((function(t){if("cssRules"in t)try{o(t.cssRules||[]).forEach((function(t){e.push(t)}))}catch(e){console.error("Error while reading CSS rules from ".concat(t.href),e)}})),e}))]}))}))}function Q(t){return t.filter((function(t){return t.type===CSSRule.FONT_FACE_RULE})).filter((function(t){return V(t.style.getPropertyValue("src"))}))}function X(t,r){return e(this,void 0,void 0,(function(){return n(this,(function(e){switch(e.label){case 0:if(null==t.ownerDocument)throw new Error("Provided element is not within a Document");return[4,J(o(t.ownerDocument.styleSheets),r)];case 1:return[2,Q(e.sent())]}}))}))}function K(t){return t.trim().replace(/["']/g,"")}function Y(t,r){return e(this,void 0,void 0,(function(){var e,i;return n(this,(function(n){switch(n.label){case 0:return[4,X(t,r)];case 1:return e=n.sent(),i=function(t){var e=new Set;return function t(n){(n.style.fontFamily||getComputedStyle(n).fontFamily).split(",").forEach((function(t){e.add(K(t))})),Array.from(n.children).forEach((function(e){e instanceof HTMLElement&&t(e)}))}(t),e}(t),[4,Promise.all(e.filter((function(t){return i.has(K(t.style.fontFamily))})).map((function(t){var e=t.parentStyleSheet?t.parentStyleSheet.href:null;return q(t.cssText,e,r)})))];case 2:return[2,n.sent().join("\n")]}}))}))}function Z(t,r){return e(this,void 0,void 0,(function(){var e,i,o,u,c;return n(this,(function(n){switch(n.label){case 0:return null==r.fontEmbedCSS?[3,1]:(i=r.fontEmbedCSS,[3,5]);case 1:return r.skipFonts?(o=null,[3,4]):[3,2];case 2:return[4,Y(t,r)];case 3:o=n.sent(),n.label=4;case 4:i=o,n.label=5;case 5:return(e=i)&&(u=document.createElement("style"),c=document.createTextNode(e),u.appendChild(c),t.firstChild?t.insertBefore(u,t.firstChild):t.appendChild(u)),[2]}}))}))}function tt(t,r){return void 0===r&&(r={}),e(this,void 0,void 0,(function(){var e,i,o,u;return n(this,(function(n){switch(n.label){case 0:return e=s(t,r),i=e.width,o=e.height,[4,I(t,r,!0)];case 1:return[4,Z(u=n.sent(),r)];case 2:return n.sent(),[4,z(u,r)];case 3:return n.sent(),function(t,e){var n=t.style;e.backgroundColor&&(n.backgroundColor=e.backgroundColor),e.width&&(n.width="".concat(e.width,"px")),e.height&&(n.height="".concat(e.height,"px"));var r=e.style;null!=r&&Object.keys(r).forEach((function(t){n[t]=r[t]}))}(u,r),[4,v(u,i,o)];case 4:return[2,n.sent()]}}))}))}function et(t,r){return void 0===r&&(r={}),e(this,void 0,void 0,(function(){var e,i,o,u,c,a,f,d,v;return n(this,(function(n){switch(n.label){case 0:return e=s(t,r),i=e.width,o=e.height,[4,tt(t,r)];case 1:return[4,h(n.sent())];case 2:return u=n.sent(),c=document.createElement("canvas"),a=c.getContext("2d"),f=r.pixelRatio||function(){var t,e;try{e=process}catch(t){}var n=e&&e.env?e.env.devicePixelRatio:null;return n&&(t=parseInt(n,10),Number.isNaN(t)&&(t=1)),t||window.devicePixelRatio||1}(),d=r.canvasWidth||i,v=r.canvasHeight||o,c.width=d*f,c.height=v*f,r.skipAutoScale||function(t){(t.width>l||t.height>l)&&(t.width>l&&t.height>l?t.width>t.height?(t.height*=l/t.width,t.width=l):(t.width*=l/t.height,t.height=l):t.width>l?(t.height*=l/t.width,t.width=l):(t.width*=l/t.height,t.height=l))}(c),c.style.width="".concat(d),c.style.height="".concat(v),r.backgroundColor&&(a.fillStyle=r.backgroundColor,a.fillRect(0,0,c.width,c.height)),a.drawImage(u,0,0,c.width,c.height),[2,c]}}))}))}t.getFontEmbedCSS=function(t,r){return void 0===r&&(r={}),e(this,void 0,void 0,(function(){return n(this,(function(e){return[2,Y(t,r)]}))}))},t.toBlob=function(t,r){return void 0===r&&(r={}),e(this,void 0,void 0,(function(){return n(this,(function(e){switch(e.label){case 0:return[4,et(t,r)];case 1:return[4,f(e.sent())];case 2:return[2,e.sent()]}}))}))},t.toCanvas=et,t.toJpeg=function(t,r){return void 0===r&&(r={}),e(this,void 0,void 0,(function(){return n(this,(function(e){switch(e.label){case 0:return[4,et(t,r)];case 1:return[2,e.sent().toDataURL("image/jpeg",r.quality||1)]}}))}))},t.toPixelData=function(t,r){return void 0===r&&(r={}),e(this,void 0,void 0,(function(){var e,i,o,u;return n(this,(function(n){switch(n.label){case 0:return e=s(t,r),i=e.width,o=e.height,[4,et(t,r)];case 1:return u=n.sent(),[2,u.getContext("2d").getImageData(0,0,i,o).data]}}))}))},t.toPng=function(t,r){return void 0===r&&(r={}),e(this,void 0,void 0,(function(){return n(this,(function(e){switch(e.label){case 0:return[4,et(t,r)];case 1:return[2,e.sent().toDataURL()]}}))}))},t.toSvg=tt}));

    function stripLeadingEmoji(str) {
        return String(str || '').replace(/^\s*#\s+/, '').replace(/^[\s\uFE0F\u200D]*(?:[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF])+[\s\uFE0F\u200D]*/g, '').trim();
    }

    function safeName(title, mode, seq) {
        var clean = stripLeadingEmoji(String(title || '').replace(/==/g, '')) || 'Sơ đồ tư duy';
        var base = clean.normalize('NFC')
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80)
            .replace(/[. ]+$/g, '') || 'Sơ đồ tư duy';
        var n = Math.max(1, parseInt(seq, 10) || 1);
        var prefix = String(n).padStart(2, '0') + (mode === 'student' ? ' HS ' : ' GV ');
        return prefix + base + '.png';
    }

    function ensureTrailingDot(raw) {
        var t = String(raw || '').trim();
        if (!t) return '';
        return /[.!?:;…]$/.test(t) ? t : t + '.';
    }

    function parseInput(md) {
        var lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
        var isExam = lines.some(function (l) { return /^Câu\s+\d+\s*[.:]/i.test(l.trim()); });
        var model = { title: '', cards: [], isExam: isExam };
        var card = null;

        lines.forEach(function (raw, rowIdx) {
            var line = raw.replace(/\u00a0/g, ' ').replace(/\t/g, '  ');
            var t = line.trim();
            if (!t) return;
            if (/^#\s/.test(t)) {
                if (!model.title) model.title = t.replace(/^#\s+/, '');
                return;
            }
            if (isExam) {
                var qm = t.match(/^(Câu\s+\d+\s*[.:])\s*(.*)$/i);
                if (qm) {
                    card = { type: 'exam', title: qm[1].replace(/[.:]$/, ''), stem: qm[2], rowIdx: rowIdx, lines: [] };
                    model.cards.push(card);
                    return;
                }
                var om = t.match(/^(\*?)\s*([a-dA-D])\s*[.)]\s*(.+)$/);
                if (om && card) {
                    card.lines.push({ isOpt: true, ok: om[1] === '*', letter: om[2].toLowerCase(), text: om[3], rowIdx: rowIdx });
                    return;
                }
                if (/^Lời giải\s*:/i.test(t)) return;
                if (card) card.lines.push({ isOpt: false, text: t, rowIdx: rowIdx });
            } else {
                if (/^##\s/.test(t)) {
                    card = { type: 'mm', title: t.replace(/^##\s+/, ''), rowIdx: rowIdx, lines: [] };
                    model.cards.push(card);
                    return;
                }
                if (!card) return;
                var bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
                var indent = (line.match(/^ */) || [''])[0].length;
                card.lines.push({
                    text: bullet ? bullet[2] : t,
                    depth: Math.max(0, Math.floor(indent / 2)),
                    rowIdx: rowIdx
                });
            }
        });

        if (!model.title && isExam) model.title = '🧪 LUYỆN TẬP ĐÚNG / SAI & TỰ LUẬN';
        return model;
    }

    function renderMathText(text) {
        var out = '', last = 0, m;
        var re = /\$([^$\n]+)\$/g;
        while ((m = re.exec(text)) !== null) {
            out += escapeHtml(text.slice(last, m.index));
            try {
                if (global.katex && typeof global.katex.renderToString === 'function') {
                    out += '<span class="vp-math" contenteditable="false">' +
                        global.katex.renderToString(m[1], { throwOnError: false, trust: false, output: 'htmlAndMathml' }) +
                        '</span>';
                } else {
                    out += '<span class="vp-math">' + escapeHtml(m[1]) + '</span>';
                }
            } catch (e) {
                out += '<span class="vp-math">' + escapeHtml(m[0]) + '</span>';
            }
            last = re.lastIndex;
        }
        return out + escapeHtml(text.slice(last));
    }

    function lineEndsWithBlank(text) {
        return /==(?:(?!==)[^\r\n])+==\s*[.]?\s*$/.test(String(text || '').trim());
    }

    function renderInline(text, student, colorState, cardIdx, lineIdx, opts) {
        var trimmed = String(text || '').trim();
        var endsBlank = student && lineEndsWithBlank(trimmed);
        var src = (student && !endsBlank) ? ensureTrailingDot(trimmed) : trimmed;
        var out = '', last = 0, m;
        var re = /==((?:(?!==)[^\r\n])+)==/g;
        var matches = [];
        while ((m = re.exec(src)) !== null) matches.push({ idx: m.index, end: re.lastIndex, inner: m[1] });
        var hasEnd = false;
        matches.forEach(function (item, i) {
            out += renderMathText(src.slice(last, item.idx));
            var color = COLORS[colorState.index++ % 3];
            if (student) {
                var blankId = cardIdx + ':' + lineIdx + ':' + i;
                var custom = state.blankWidths[blankId];
                var isAutoEnd = endsBlank && (i === matches.length - 1) && !custom;
                var isEnd = custom === 'end' || isAutoEnd;
                if (isEnd) hasEnd = true;
                var plain = item.inner.replace(/\$[^$]*\$/g, 'FORMULA');
                var defW = Math.max(3.2, Math.min(13, plain.length * 0.44 * state.blankScale));
                var w = typeof custom === 'number' ? custom : defW;
                var selCls = state.selectedBlankId === blankId ? ' vp-blank-selected' : '';
                var gripHtml = (state.selectedBlankId === blankId) ? '<span class="mm-blank-grip" data-blank-grip="' + blankId + '" title="Kéo ngang để chỉnh độ dài ô chấm"></span>' : '';
                out += '<span class="vp-blank' + (isEnd ? ' vp-blank-end' : '') + selCls + '" data-blank-id="' + blankId + '" data-def-w="' + w.toFixed(1) + '" style="width:' + w.toFixed(1) + 'em">' + gripHtml + '</span>';
                if (isEnd && src.slice(item.end).trim().length > 0) {
                    out += '<span class="vp-blank-break"></span>';
                }
            } else if (opts && opts.hideKey) {
                out += renderMathText(item.inner);
            } else {
                out += '<span class="vp-key" style="color:' + color + '">' + renderMathText(item.inner) + '</span>';
            }
            last = item.end;
        });
        return { html: out + renderMathText(src.slice(last)), hasEnd: hasEnd };
    }

    function renderWritingRows(cardIdx, lineIdx, student, defaultOne) {
        if (!student) return '';
        var prefix = cardIdx + ':' + lineIdx + ':';
        var rowKey = prefix + '0';
        var total = 0;
        var hasCustom = false;
        Object.keys(state.blankRows).forEach(function (k) {
            if (k.indexOf(prefix) === 0) {
                hasCustom = true;
                total += (state.blankRows[k] || 0);
            }
        });
        if (!hasCustom && defaultOne) total = 1;
        if (!total) return '';
        var selCls = (state.selectedBlankId === rowKey) ? ' vp-writing-selected' : '';
        var defAttr = defaultOne ? ' data-default-one="1"' : '';
        var rules = '';
        for (var i = 0; i < total; i++) rules += '<span class="vp-writing-rule"></span>';
        return '<div class="vp-writing-lines' + selCls + '" data-row-key="' + rowKey + '"' + defAttr + '>' + rules + '</div>';
    }

    function getTeacherLineAlignVal(rowIdx, branchIdx, student) {
        if (student) {
            return (state.studentLineAligns && state.studentLineAligns[rowIdx] === 'justify') ? 'justify' : '';
        }
        return state.lineAligns[rowIdx] || (state.branchAligns && state.branchAligns[branchIdx]) || 'justify';
    }
    function getTeacherLineAlignClass(rowIdx, branchIdx, student) {
        if (student) {
            return (state.studentLineAligns && state.studentLineAligns[rowIdx] === 'justify') ? ' mm-justify' : '';
        }
        var al = getTeacherLineAlignVal(rowIdx, branchIdx, student);
        if (al === 'right') return ' mm-align-right';
        if (al === 'left') return ' mm-align-left';
        return ' mm-align-justify';
    }

    function renderCardHtml(c, idx, student, colorState, opts) {
        var activeSelBranch = student ? (state.studentSelectedBranch || 0) : (state.selectedBranch || 0);
        var selCls = idx === activeSelBranch ? ' vp-selected' : '';
        var fs = student ? state.studentBodyFs : state.teacherBodyFs;
        var titleFs = student ? Math.round(fs * 1.23) : Math.round(fs * 1.15);
        var parentFs = student ? Math.round(fs * 1.077) : Math.round(fs * 1.075);
        var stemFs = student ? fs : Math.round(fs * 0.88);
        var OBS_LINE_COLORS = ['#67E8F9', '#FFFFFF', '#FDBA74', '#86EFAC'];
        var h = '<section class="vp-box vp-shape' + selCls + '" data-branch="' + (idx + 1) + '" style="--frame:' + FRAMES[idx] + '">';
        var btAlignVal = (!student && c.type === 'mm' && state.lineAligns[c.rowIdx]) ? state.lineAligns[c.rowIdx] : '';
        var btAlignCss = btAlignVal ? (' style="text-align:' + btAlignVal + ';text-align-last:' + (btAlignVal === 'right' ? 'right' : 'left') + '"') : '';
        var btAlignCls = btAlignVal ? (' mm-align-' + btAlignVal) : '';
        h += '<div class="vp-box-title' + btAlignCls + '"' + btAlignCss + (c.type === 'mm' ? ' data-row="' + c.rowIdx + '"' : '') + (!student && c.type === 'mm' ? ' contenteditable="true" spellcheck="false" data-prefix="## "' : '') + '>' + renderMathText(c.title) + '</div>';
        h += '<div class="vp-lines" style="font-size:' + fs + 'px">';
        if (c.type === 'exam') {
            if (c.stem) {
                var stemTxt = student ? ensureTrailingDot(c.stem) : c.stem;
                var stemCls = getTeacherLineAlignClass(c.rowIdx, idx, student);
                var stemVal = getTeacherLineAlignVal(c.rowIdx, idx, student);
                var stemCss = stemVal ? (';text-align:' + stemVal + ';text-align-last:' + (stemVal === 'right' ? 'right' : 'left')) : '';
                var stemColorCss = !student ? ';color:#FEF08A' : '';
                h += '<div class="vp-line' + stemCls + '" data-depth="0" data-row="' + c.rowIdx + '" style="font-size:' + stemFs + 'px;font-weight:' + (student ? 400 : 700) + ';margin-bottom:0.45em' + stemColorCss + stemCss + '"' + (!student ? ' contenteditable="true" spellcheck="false" data-prefix="' + escapeHtml(c.title) + '. "' : '') + '>' + renderMathText(stemTxt) + '</div>';
            }
            c.lines.forEach(function (l, li) {
                var r = renderInline(l.text, student, colorState, idx, li, opts);
                if (l.isOpt) {
                    var lblCls = (!student && !(opts && opts.hideKey)) ? (l.ok ? 'mm-tf-lbl is-true' : 'mm-tf-lbl is-false') : 'mm-tf-lbl';
                    var pfx = (l.ok ? '*' : '') + l.letter + ') ';
                    var tfCls = getTeacherLineAlignClass(l.rowIdx, idx, student);
                    var tfVal = getTeacherLineAlignVal(l.rowIdx, idx, student);
                    var tfCss = tfVal ? (' style="text-align:' + tfVal + ';text-align-last:' + (tfVal === 'right' ? 'right' : 'left') + '"') : '';
                    var optIdx = 'abcd'.indexOf(String(l.letter || '').toLowerCase());
                    var lineColorCss = !student ? (';color:' + OBS_LINE_COLORS[(optIdx >= 0 ? optIdx : li) % OBS_LINE_COLORS.length]) : '';
                    var tfRowKey = student ? (' data-row-key="' + idx + ':' + li + ':0" data-default-one="' + (!r.hasEnd ? '1' : '0') + '"') : '';
                    h += '<div class="mm-tf-row" style="font-size:' + fs + 'px;font-weight:400' + lineColorCss + '"' + tfRowKey + '><span class="' + lblCls + '">' + l.letter + ')</span><span class="mm-tf-txt' + (r.hasEnd ? ' has-end-blank' : '') + tfCls + '"' + tfCss + (!student ? ' contenteditable="true" spellcheck="false" data-row="' + l.rowIdx + '" data-prefix="' + pfx + '"' : '') + '>' + r.html + '</span></div>' + renderWritingRows(idx, li, student, !r.hasEnd);
                } else {
                    var jCls0 = getTeacherLineAlignClass(l.rowIdx, idx, student);
                    var alVal0 = getTeacherLineAlignVal(l.rowIdx, idx, student);
                    var alCss0 = alVal0 ? (';text-align:' + alVal0 + ';text-align-last:' + (alVal0 === 'right' ? 'right' : 'left')) : '';
                    var lineColorCss0 = !student ? (';color:' + OBS_LINE_COLORS[li % OBS_LINE_COLORS.length]) : '';
                    h += '<div class="vp-line' + (r.hasEnd ? ' has-end-blank' : '') + jCls0 + '" data-depth="0" data-row="' + l.rowIdx + '" style="font-size:' + parentFs + 'px;font-weight:' + (student ? 400 : 700) + lineColorCss0 + alCss0 + '"' + (!student ? ' contenteditable="true" spellcheck="false" data-prefix=""' : '') + '>' + r.html + '</div>' + renderWritingRows(idx, li, student);
                }
            });
        } else {
            c.lines.forEach(function (l, li) {
                var r = renderInline(l.text, student, colorState, idx, li, opts);
                var lineFs = l.depth === 0 ? parentFs : fs;
                var lineFw = student ? 400 : (l.depth === 0 ? 700 : 400);
                var jClsN = getTeacherLineAlignClass(l.rowIdx, idx, student);
                var alValN = getTeacherLineAlignVal(l.rowIdx, idx, student);
                var plN = (alValN === 'right') ? 0 : (l.depth * 1.1);
                var alCssN = alValN ? (';text-align:' + alValN + ';text-align-last:' + (alValN === 'right' ? 'right' : 'left')) : '';
                var lineColorCssN = !student ? (';color:' + OBS_LINE_COLORS[li % OBS_LINE_COLORS.length]) : '';
                h += '<div class="vp-line' + (r.hasEnd ? ' has-end-blank' : '') + jClsN + '" data-depth="' + l.depth + '" data-row="' + l.rowIdx + '" style="padding-left:' + plN + 'em;font-size:' + lineFs + 'px;font-weight:' + lineFw + lineColorCssN + alCssN + '"' + (!student ? ' contenteditable="true" spellcheck="false" data-prefix=""' : '') + '>' + r.html + '</div>' + renderWritingRows(idx, li, student);
            });
        }
        h += '</div>';
        if (state.branchImages[idx]) {
            var wp = state.branchImages[idx].widthPct || 100;
            h += '<div class="mm-branch-img-wrap"><img src="' + state.branchImages[idx].src + '" style="width:' + wp + '%" alt="Ảnh khung ' + (idx + 1) + '"></div>';
        }
        h += '</section>';
        return h;
    }

    function syncInlineEdit(rowIdx, newText, prefix) {
        var ed = $('#markdown-editor');
        if (!ed) return;
        var lines = ed.value.replace(/\r\n?/g, '\n').split('\n');
        if (lines[rowIdx] === undefined) return;
        var indent = (lines[rowIdx].match(/^(\s*)/) || ['', ''])[1];
        lines[rowIdx] = indent + (prefix || '') + String(newText || '').trim();
        ed.value = lines.join('\n');
        saveDraft();
        renderStage(true);
        fitStage();
        checkTeacherOverflow();
    }

    var _syncBlankFloatbarFn = null;
    function renderStage(student, opts) {
        var container = $(student ? '#mm-student-stage-inner' : '#mm-teacher-stage-inner');
        var ed = $('#markdown-editor');
        if (!container || !ed) return;
        var model = parseInput(ed.value);
        var colorState = { index: 0 };
        var activeFont = student ? (state.studentFont || state.font || 'Segoe UI') : (state.teacherFont || state.font || 'Segoe UI');
        var fontStack = '"' + activeFont + '", "Segoe UI", Arial, sans-serif';
        container.style.fontFamily = fontStack;
        var stEl = $(student ? '#mm-stage-student' : '#mm-stage-teacher');
        if (stEl && stEl.style && typeof stEl.style.setProperty === 'function') {
            stEl.style.setProperty('--mm-stage-font', fontStack);
            if (student) {
                stEl.style.setProperty('--mm-stu-main-title-fs', state.studentMainTitleFs + 'px');
                stEl.style.setProperty('--mm-stu-card-title-fs', state.studentCardTitleFs + 'px');
                applyBlankCssVars(stEl);
            } else {
                stEl.style.setProperty('--mm-main-title-fs', state.teacherMainTitleFs + 'px');
                stEl.style.setProperty('--mm-card-title-fs', state.teacherCardTitleFs + 'px');
            }
        } else if (stEl && stEl.style) {
            stEl.style['--mm-stage-font'] = fontStack;
        }

        var cards = model.cards.slice(0, 4);
        var split = (state.splitOverride && cards.length === 3) ? state.splitOverride : (cards.length <= 2 ? 1 : 2);
        var leftCards = cards.slice(0, split);
        var rightCards = cards.slice(split);
        var cols = (student && cards.length === 1) ? [cards, []] : (state.swapCols ? [rightCards, leftCards] : [leftCards, rightCards]);

        var bFs = student ? Math.round(state.studentBodyFs * 1.54) : Math.round(state.teacherBodyFs * 1.1);
        var html = '<div class="vp-banner vp-shape">' + renderMathText(model.title.replace(/==/g, '') || 'Sơ đồ tư duy') + '</div>';
        html += '<div class="vp-cols-grid' + (student && cards.length === 1 ? ' single-col' : '') + '">';
        html += '<div class="vp-col-stack">' + cols[0].map(function (c) { return renderCardHtml(c, cards.indexOf(c), student, colorState, opts); }).join('') + '</div>';
        if (!student) {
            html += '<div class="vp-cam-col"></div>';
        }
        if (!(student && cards.length === 1)) {
            html += '<div class="vp-col-stack">' + cols[1].map(function (c) { return renderCardHtml(c, cards.indexOf(c), student, colorState, opts); }).join('') + '</div>';
        }
        html += '</div>';
        container.innerHTML = html;

        $all((student ? '#mm-student-stage-inner' : '#mm-teacher-stage-inner') + ' .vp-box').forEach(function (box) {
            box.addEventListener('click', function () {
                selectBranch(Number(box.dataset.branch) - 1, student);
            });
        });

        if (student) {
            $all('#mm-student-stage-inner .vp-blank').forEach(function (bl) {
                bl.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    state.selectedBlankId = bl.dataset.blankId;
                    var info = $('#mm-selected-blank-info');
                    if (info) info.textContent = '✓ Đang chọn ô #' + state.selectedBlankId;
                    renderStage(true);
                    fitStage();
                });
            });
            $all('#mm-student-stage-inner .vp-writing-lines[data-row-key]').forEach(function (wl) {
                wl.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    state.selectedBlankId = wl.dataset.rowKey;
                    var info = $('#mm-selected-blank-info');
                    if (info) info.textContent = '✓ Đang chọn dòng viết #' + state.selectedBlankId;
                    renderStage(true);
                    fitStage();
                    if (typeof _syncBlankFloatbarFn === 'function') _syncBlankFloatbarFn();
                });
            });
            $all('#mm-student-stage-inner .mm-tf-row[data-row-key]').forEach(function (rowEl) {
                rowEl.addEventListener('click', function (ev) {
                    if (ev.target && ev.target.closest && ev.target.closest('.vp-blank')) return;
                    ev.stopPropagation();
                    state.selectedBlankId = rowEl.dataset.rowKey;
                    var info = $('#mm-selected-blank-info');
                    if (info) info.textContent = '✓ Đang chọn dòng viết #' + state.selectedBlankId;
                    renderStage(true);
                    fitStage();
                    if (typeof _syncBlankFloatbarFn === 'function') _syncBlankFloatbarFn();
                });
            });
        }
        if (!student) {
            $all('#mm-teacher-stage-inner [contenteditable="true"]').forEach(function (el) {
                el.addEventListener('input', function () {
                    syncInlineEdit(Number(el.dataset.row), el.innerText || el.textContent, el.dataset.prefix);
                });
            });
        }
    }

    function fitStage() {
        var scrollBox = $('.vp-canvas-scroll');
        var vp = $('.vp-viewport');
        var scaler = $('#mm-stage-scaler');
        var st = $(state.tab === 'teacher' ? '#mm-stage-teacher' : '#mm-stage-student');
        if (!vp || !scaler || !st) return;
        var w = state.tab === 'teacher' ? 1920 : 794;
        var h = state.tab === 'teacher' ? 1080 : Math.max(220, st.scrollHeight || 400);
        var availW = Math.max(240, ((scrollBox && scrollBox.clientWidth) || vp.clientWidth || 800) - 28);
        var availH = Math.max(200, ((scrollBox && scrollBox.clientHeight) || vp.clientHeight || 560) - 56);
        var scale = state.tab === 'teacher' ? Math.min(availW / w, availH / h, 1) : Math.min(availW / w, 1);
        scaler.style.width = w + 'px';
        scaler.style.height = h + 'px';
        scaler.style.transform = 'scale(' + scale.toFixed(4) + ')';
        vp.style.height = Math.ceil(h * scale) + 'px';
        scaler.style.marginRight = '-' + Math.round(w * (1 - scale)) + 'px';
        scaler.style.marginBottom = '-' + Math.round(h * (1 - scale)) + 'px';
        var zl = $('#mm-zoom-label');
        if (zl) {
            zl.textContent = 'Vừa khít Cột 3 (' + Math.round(scale * 100) + '% · ' + w + '×' + h + ')';
        }
    }

    function checkTeacherOverflow() {
        var st = $('#mm-stage-teacher');
        var warn = $('#mm-overflow-warn');
        if (!st) return false;
        if (state.tab !== 'teacher') {
            st.classList.remove('is-overflow');
            if (warn) warn.classList.add('hidden');
            return false;
        }
        var over = (st.scrollHeight || 0) > 1082 || (st.scrollWidth || 0) > 1922;
        if (!over && typeof st.getBoundingClientRect === 'function') {
            var stRect = st.getBoundingClientRect();
            $all('#mm-stage-teacher .vp-box').forEach(function (box) {
                if ((box.scrollWidth || 0) > (box.clientWidth || 0) + 2) over = true;
                var br = box.getBoundingClientRect ? box.getBoundingClientRect() : null;
                if (stRect && stRect.height > 0 && br && (br.bottom > stRect.bottom + 2 || br.right > stRect.right + 2)) over = true;
            });
        }
        st.classList.toggle('is-overflow', over);
        if (warn) warn.classList.toggle('hidden', !over);
        return over;
    }

    function renderAll() {
        renderStage(false);
        renderStage(true);
        fitStage();
        checkTeacherOverflow();
    }

    function selectBranch(idx, forStudent) {
        var targetStu = (typeof forStudent === 'boolean') ? forStudent : (state.tab === 'student');
        var clamped = Math.max(0, Math.min(3, idx));
        if (targetStu) {
            state.studentSelectedBranch = clamped;
            $all('#mm-student-stage-inner .vp-box').forEach(function (el) {
                el.classList.toggle('vp-selected', Number(el.dataset.branch) - 1 === state.studentSelectedBranch);
            });
            return;
        }
        state.selectedBranch = clamped;
        $all('#mm-teacher-stage-inner .vp-box').forEach(function (el) {
            el.classList.toggle('vp-selected', Number(el.dataset.branch) - 1 === state.selectedBranch);
        });
        var imgCfg = state.branchImages[state.selectedBranch];
        var wInp = $('#mm-img-w-input');
        if (wInp) wInp.value = imgCfg ? (imgCfg.widthPct || 100) : 100;
        setStatus('✓ Khung ' + (state.selectedBranch + 1) + (imgCfg ? ' (ảnh ' + imgCfg.widthPct + '%)' : ' · Ctrl+V dán ảnh'));
    }

    function saveDraft() {
        try {
            var ed = $('#markdown-editor');
            if (ed && global.localStorage) global.localStorage.setItem(LS_DRAFT, ed.value);
        } catch (e) {}
    }

    function recordHistory() {
        var ed = $('#markdown-editor');
        if (!ed) return;
        var val = ed.value;
        if (state.history[state.historyIdx] === val) return;
        state.history = state.history.slice(0, state.historyIdx + 1);
        state.history.push(val);
        if (state.history.length > 50) state.history.shift();
        state.historyIdx = state.history.length - 1;
    }

    function stepHistory(delta) {
        var ed = $('#markdown-editor');
        if (!ed) return;
        var next = state.historyIdx + delta;
        if (next < 0 || next >= state.history.length) {
            showToast(delta < 0 ? 'Không còn thao tác để hoàn tác.' : 'Không còn thao tác để làm lại.', 'warning');
            return;
        }
        state.historyIdx = next;
        ed.value = state.history[next];
        saveDraft();
        renderAll();
    }

    function toggleHighlightSelection() {
        var ed = $('#markdown-editor');
        if (!ed) return;
        var start = ed.selectionStart || 0;
        var end = ed.selectionEnd || 0;
        if (start === end) {
            showToast('Bôi đen cụm từ cần tô sáng / tạo ô khuyết trước khi bấm Ctrl+H.', 'warning');
            return;
        }
        var val = ed.value;
        var sel = val.slice(start, end);
        var wrapped = (sel.slice(0, 2) === '==' && sel.slice(-2) === '==')
            ? sel.slice(2, -2)
            : '==' + sel + '==';
        var prevScroll = ed.scrollTop || 0;
        ed.value = val.slice(0, start) + wrapped + val.slice(end);
        try {
            if (typeof ed.focus === 'function') ed.focus();
            if (typeof ed.setSelectionRange === 'function') {
                ed.setSelectionRange(start, start + wrapped.length);
            } else {
                ed.selectionStart = start;
                ed.selectionEnd = start + wrapped.length;
            }
            ed.scrollTop = prevScroll;
        } catch (e) {}
        recordHistory();
        saveDraft();
        renderAll();
        try {
            var curRow = (ed.value || '').slice(0, start).split('\n').length - 1;
            if (typeof syncStageToRow === 'function') syncStageToRow(curRow);
            if (typeof updateEditorLineHighlight === 'function') updateEditorLineHighlight(curRow, false);
        } catch (e2) {}
    }

    function switchTab(tab) {
        state.tab = tab === 'student' ? 'student' : 'teacher';
        var btnT = $('#tab-btn-teacher'), btnS = $('#tab-btn-student');
        var stT = $('#mm-stage-teacher'), stS = $('#mm-stage-student');
        if (btnT) btnT.classList.toggle('active', state.tab === 'teacher');
        if (btnS) btnS.classList.toggle('active', state.tab === 'student');
        if (stT) stT.classList.toggle('hidden', state.tab !== 'teacher');
        if (stS) stS.classList.toggle('hidden', state.tab !== 'student');
        var stuPanel = $('#mm-student-blanks-panel');
        if (stuPanel) stuPanel.classList.toggle('hidden', state.tab !== 'student');
        var tAlign = $('#mm-teacher-align-box');
        if (tAlign) tAlign.classList.toggle('hidden', state.tab !== 'teacher');
        var hsExtra = $('#mm-hs-extra-sec');
        if (hsExtra) hsExtra.classList.toggle('hidden', state.tab !== 'student');
        var bgBox = $('#mm-teacher-theme-box'), slBox = $('#mm-teacher-slogan-box');
        if (bgBox) bgBox.classList.toggle('hidden', state.tab !== 'teacher');
        if (slBox) slBox.classList.toggle('hidden', state.tab !== 'teacher');
        var imgBox = $('#mm-teacher-img-box');
        if (imgBox) imgBox.classList.toggle('hidden', state.tab !== 'teacher');
        var fsInp = $('#mm-body-fs-input');
        if (fsInp) fsInp.value = state.tab === 'teacher' ? state.teacherBodyFs : state.studentBodyFs;
        var mtInp = $('#mm-main-title-fs-input');
        if (mtInp) mtInp.value = state.tab === 'teacher' ? state.teacherMainTitleFs : state.studentMainTitleFs;
        var ctInp = $('#mm-card-title-fs-input');
        if (ctInp) ctInp.value = state.tab === 'teacher' ? state.teacherCardTitleFs : state.studentCardTitleFs;
        var fontSel = $('#mm-font-select');
        if (fontSel) fontSel.value = state.tab === 'teacher' ? (state.teacherFont || state.font || 'Segoe UI') : (state.studentFont || state.font || 'Segoe UI');
        checkTeacherOverflow();
        var seqInp = $('#mm-export-seq');
        if (seqInp) seqInp.value = state.tab === 'teacher' ? state.teacherSeq : state.studentSeq;
        var presetSel = $('#mm-export-preset');
        if (presetSel) presetSel.value = state.tab;
        var zoomBtn = $('#vp-zoom');
        if (zoomBtn) zoomBtn.classList.toggle('on', state.tab === 'student' && !!state.zoom100);
        var blankFb = $('#mm-blank-floatbar');
        if (blankFb && state.tab !== 'student') blankFb.classList.add('hidden');
        var scrollBox = $('.vp-canvas-scroll');
        if (scrollBox && state.tab === 'teacher') scrollBox.scrollLeft = 0;
        if (modalEl && typeof modalEl._syncAlignButtonsUi === 'function' && state.tab === 'teacher') {
            modalEl._syncAlignButtonsUi();
        }
        fitStage();
    }

    function buildFontEmbedCSS() {
        var mmFonts = [
            "Segoe UI",
            "Arial",
            "Calibri",
            "Tahoma",
            "Times New Roman"
        ];
        var parts = [];
        mmFonts.forEach(function (f) {
            var compact = f.replace(/\s+/g, "");
            parts.push("@font-face{font-family:'" + f + "';font-style:normal;font-weight:400;src:local('" + f + "'),local('" + compact + "'),local('" + f + " Regular');}");
            parts.push("@font-face{font-family:'" + f + "';font-style:normal;font-weight:700;src:local('" + f + " Bold'),local('" + compact + "-Bold'),local('" + f + "');}");
        });
        parts.push(".katex-mathml{display:none!important;}.hidden{display:none!important;}");
        if (typeof global.OBS_FONT_CSS === "string" && global.OBS_FONT_CSS.trim()) {
            parts.push(global.OBS_FONT_CSS);
        }
        try {
            Array.prototype.slice.call(document.styleSheets || []).forEach(function (sheet) {
                try {
                    Array.prototype.slice.call(sheet.cssRules || []).forEach(function (rule) {
                        if (rule.type === 5 && /KaTeX_/i.test(rule.cssText) && !/url\([^)]*\.woff2?\)/i.test(rule.cssText)) {
                            parts.push(rule.cssText);
                        }
                    });
                } catch (e) {}
            });
        } catch (e) {}
        return parts.join("\n");
    }

    function applyBlankCssVars(targetEl) {
        if (!targetEl || !targetEl.style || typeof targetEl.style.setProperty !== 'function') return;
        var wMap = { thin: '1px', medium: '1.5px', bold: '2.2px' };
        var cMap = { thin: '#64748b', medium: '#334155', bold: '#0f172a' };
        var bw = wMap[state.blankWeight] || '1.5px';
        var bc = cMap[state.blankWeight] || '#334155';
        targetEl.style.setProperty('--mm-blank-row-h', (Number(state.blankRowGap) || 26) + 'px');
        targetEl.style.setProperty('--mm-blank-style', state.blankStyle || 'dotted');
        targetEl.style.setProperty('--mm-blank-border-w', bw);
        targetEl.style.setProperty('--mm-blank-color', bc);
    }

    function cleanCloneForExport(stage, mode, w, h) {
        var clone = stage.cloneNode(true);
        clone.classList.remove("hidden");
        clone.style.width = w + "px";
        clone.style.height = h + "px";
        clone.style.maxHeight = "none";
        clone.style.transform = "none";
        clone.style.margin = "0";
        var expFont = (mode === 'student') ? (state.studentFont || state.font || 'Segoe UI') : (state.teacherFont || state.font || 'Segoe UI');
        var fontStack = "\"" + expFont + "\", \"Segoe UI\", Arial, sans-serif";
        clone.style.fontFamily = fontStack;
        if (clone.style && typeof clone.style.setProperty === "function") {
            clone.style.setProperty("--mm-stage-font", fontStack);
            clone.style.setProperty("--mm-main-title-fs", state.teacherMainTitleFs + "px");
            clone.style.setProperty("--mm-card-title-fs", state.teacherCardTitleFs + "px");
            clone.style.setProperty("--mm-stu-main-title-fs", state.studentMainTitleFs + "px");
            clone.style.setProperty("--mm-stu-card-title-fs", state.studentCardTitleFs + "px");
            applyBlankCssVars(clone);
        }
        Array.prototype.slice.call(clone.querySelectorAll(".mm-blank-grip, #mm-blank-floatbar")).forEach(function (el) {
            try { el.remove(); } catch (e) {}
        });
        Array.prototype.slice.call(clone.querySelectorAll(".vp-selected, .vp-blank-selected, .vp-writing-selected, .mm-sync-active")).forEach(function (el) {
            el.classList.remove("vp-selected", "vp-blank-selected", "vp-writing-selected", "mm-sync-active");
        });
        return clone;
    }

    function renderMinMapPngBlob(stage, mode, w, h, fontCSS) {
        var holder = document.createElement("div");
        holder.style.cssText = "position:fixed;left:0;top:0;width:" + w + "px;height:" + h + "px;opacity:0;pointer-events:none;z-index:-1;overflow:hidden;";
        var clone = cleanCloneForExport(stage, mode, w, h);
        holder.appendChild(clone);
        (modalEl || document.body).appendChild(holder);

        var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        var imgsReady = Promise.all(Array.prototype.slice.call(clone.querySelectorAll("img")).map(function (img) {
            return typeof img.decode === "function" ? img.decode().catch(function () {}) : Promise.resolve();
        }));

        function wait2Frames() {
            if (typeof requestAnimationFrame !== "function") return Promise.resolve();
            return new Promise(function (resolve) {
                requestAnimationFrame(function () { requestAnimationFrame(resolve); });
            });
        }

        return Promise.all([fontsReady, imgsReady]).then(wait2Frames).then(function () {
            if (global.modernScreenshot && typeof global.modernScreenshot.domToBlob === "function") {
                return global.modernScreenshot.domToBlob(clone, {
                    width: w,
                    height: h,
                    scale: mode === "student" ? 2 : 1,
                    backgroundColor: mode === "student" ? "#ffffff" : "#000000",
                    font: { cssText: fontCSS },
                    filter: function (node) {
                        return !(node && node.classList && (node.classList.contains("katex-mathml") || node.classList.contains("vp-camera")));
                    }
                }).then(function (blob) {
                    if (blob) return { blob: blob, dataUrl: null };
                    throw new Error("modernScreenshot returned empty blob");
                });
            }
            if (mmWin.htmlToImage && typeof mmWin.htmlToImage.toPng === "function") {
                return mmWin.htmlToImage.toPng(clone, {
                    width: w,
                    height: h,
                    pixelRatio: mode === "student" ? 2 : 1,
                    skipAutoScale: true,
                    backgroundColor: mode === "student" ? "#ffffff" : "#000000",
                    fontEmbedCSS: fontCSS,
                    filter: function (node) {
                        return !(node && node.classList && (node.classList.contains("katex-mathml") || node.classList.contains("vp-camera")));
                    }
                }).then(function (dataUrl) {
                    return { blob: null, dataUrl: dataUrl };
                });
            }
            return { blob: null, dataUrl: null };
        }).finally(function () {
            try { holder.remove(); } catch (e) {}
        });
    }

    function exportPng() {
        if (state.busyExport) return Promise.resolve(null);
        var ed = $("#markdown-editor");
        var model = parseInput(ed ? ed.value : "");
        var mode = state.tab;
        var seq = mode === "student" ? state.studentSeq : state.teacherSeq;
        var fileName = safeName(model.title, mode, seq);
        var stage = $(mode === "student" ? "#mm-stage-student" : "#mm-stage-teacher");
        if (!stage) return Promise.resolve(null);
        state.busyExport = true;
        setStatus("Đang xuất 1-1 " + fileName + "...");
        var fontCSS = buildFontEmbedCSS();
        var w = mode === "student" ? 794 : 1920;
        var h = mode === "teacher" ? 1080 : Math.max(220, stage.scrollHeight || 400);

        if (!(global.modernScreenshot && typeof global.modernScreenshot.domToBlob === "function") && !(mmWin.htmlToImage && typeof mmWin.htmlToImage.toPng === "function")) {
            state.busyExport = false;
            setStatus("✓ Chuẩn bị xong: " + fileName);
            return Promise.resolve({ name: fileName, width: w, height: h, fontEmbedCSS: fontCSS });
        }

        return renderMinMapPngBlob(stage, mode, w, h, fontCSS).then(function (res) {
            var a = document.createElement("a");
            var objUrl = null;
            if (res && res.blob && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
                objUrl = URL.createObjectURL(res.blob);
                a.href = objUrl;
            } else if (res && res.dataUrl) {
                a.href = res.dataUrl;
            } else {
                throw new Error("Không tạo được dữ liệu ảnh PNG");
            }
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            if (objUrl) {
                setTimeout(function () { try { URL.revokeObjectURL(objUrl); } catch (e) {} }, 2500);
            }
            if (mode === "student") state.studentSeq += 1;
            else state.teacherSeq += 1;
            var seqInp = $("#mm-export-seq");
            if (seqInp) seqInp.value = mode === "student" ? state.studentSeq : state.teacherSeq;
            setStatus("✓ Đã xuất 1-1: " + fileName);
            showToast("Đã xuất " + fileName, "success");
            return { name: fileName, width: w, height: h, fontEmbedCSS: fontCSS };
        }).catch(function (err) {
            setStatus("Lỗi xuất ảnh: " + ((err && err.message) || "Kiểm tra lại nội dung"));
            showToast("Chưa xuất được PNG.", "error");
            return null;
        }).finally(function () {
            state.busyExport = false;
        });
    }

    function buildModal() {
        if (modalEl) return modalEl;
        modalEl = document.createElement('div');
        modalEl.id = 'minmap-modal';
        modalEl.innerHTML = [

            '<div class="mm-main">',
            '  <section class="mm-editor-col">',
            '    <div class="mm-ed-toolbar compact">',
            '      <button type="button" class="mm-tool-btn" id="btn-undo" title="Hoàn tác">↶</button>',
            '      <button type="button" class="mm-tool-btn" id="btn-redo" title="Làm lại">↷</button>',
            '      <button type="button" class="mm-tool-btn" id="btn-quick-paste" title="Dán từ clipboard">📋 Dán</button>',
            '      <button type="button" class="mm-tool-btn accent" id="btn-content-icons" title="Kho Icon">✨ Icon</button>',
            '      <button type="button" class="mm-tool-btn" id="btn-toggle-col2" title="Mở rộng / Thu gọn Cột 1">⇄</button>',
            '      <button type="button" class="mm-tool-btn" id="btn-import-md" title="Mở tệp .md">📂 Mở</button>',
            '      <button type="button" class="mm-tool-btn" id="btn-save-md" title="Lưu tệp .md">💾 Lưu</button>',
            '      <button type="button" class="mm-tool-btn" id="btn-clear-content" title="Xóa toàn bộ" style="color:#fca5a5;border-color:rgba(239,68,68,.4)">🗑️</button>',
            '      <div class="mm-ed-fs-group" title="Cỡ chữ Cột 1 (12px–22px)">',
            '        <button type="button" class="mm-tool-btn" id="btn-ed-fs-down">A−</button>',
            '        <span class="mm-ed-fs-badge" id="mm-ed-fs-val">13px</span>',
            '        <button type="button" class="mm-tool-btn" id="btn-ed-fs-up">A+</button>',
            '      </div>',
            '      <button type="button" class="mm-tool-btn accent hidden" id="btn-toggle-highlight" aria-hidden="true">🎨</button>',
            '      <input type="file" id="mm-import-file" accept=".md,.txt" class="hidden">',
            '    </div>',
            '    <div class="mm-icon-drawer hidden" id="mm-icon-drawer">',
            '      <div class="mm-icon-head"><span>✨ Kho Icon Hóa học &amp; Sư phạm</span><button type="button" class="mm-tool-btn" id="mm-icon-close">Đóng</button></div>',
            '      <div id="mm-icon-body"></div>',
            '    </div>',
            '    <div class="mm-ed-sync-bar hidden" id="mm-ed-sync-bar"></div>',
            '    <div class="mm-ed-wrap">',
            '      <div class="mm-ed-line-hl hidden" id="mm-ed-line-hl"></div>',
            '      <textarea id="markdown-editor" spellcheck="false"></textarea>',
            '    </div>',
            '  </section>',
            '  <section id="visual-preview">',
            '    <div class="vp-topbar">',
            '      <div class="mm-tb-row mm-tb-row-1">',
            '        <div class="mm-tb-side">',
            '          <div class="vp-seg-tabs">',
            '            <button type="button" class="vp-tab-btn active" id="tab-btn-teacher">🎬 GV</button>',
            '            <button type="button" class="vp-tab-btn" id="tab-btn-student">📝 HS</button>',
            '          </div>',
            '          <select class="vp-select" id="mm-font-select" title="Phông chữ">',
            '            <option value="Segoe UI" selected>Segoe UI</option>',
            '            <option value="Arial">Arial</option>',
            '            <option value="Calibri">Calibri</option>',
            '            <option value="Tahoma">Tahoma</option>',
            '            <option value="Times New Roman">Times New Roman</option>',
            '          </select>',
            '          <div class="vp-pill-group" id="mm-teacher-slogan-box">',
            '            <button type="button" class="vp-btn-sm on" id="mm-slogan-toggle">Slogan</button>',
            '            <select class="vp-select" id="mm-slogan-theme-select" title="Nền Slogan">',
            '              <option value="theme-aurora">Aurora</option>',
            '              <option value="theme-emerald">Ngọc Lục Bảo</option>',
            '              <option value="theme-pro">Dark Glass</option>',
            '              <option value="theme-royal">Hoàng gia</option>',
            '            </select>',
            '          </div>',
            '        </div>',
            '        <div class="mm-tb-side">',
            '          <select class="vp-select hidden" id="mm-export-preset" aria-hidden="true" style="display:none !important">',
            '            <option value="teacher">GV · 1920×1080</option>',
            '            <option value="student">HS · A4 300 DPI</option>',
            '          </select>',
            '          <input type="number" class="vp-num-input hidden" id="mm-export-seq" min="1" value="1" aria-hidden="true" style="display:none !important">',
            '          <button type="button" class="vp-btn-png compact hidden" id="vp-download-png" aria-hidden="true" style="display:none !important">↓ PNG</button>',
            '          <button type="button" class="vp-btn-png compact" id="vp-save-obs-deck" style="background:#059669;border-color:#34d399;" title="Lưu hoặc cập nhật đè trang đang chọn (GV + HS + Thiết lập)">💾 Lưu</button>',
            '          <button type="button" class="vp-btn-png compact hidden" id="vp-save-new-obs" style="background:#0284c7;border-color:#38bdf8;" title="Lưu thành trang mới ở cuối danh sách & thoát chế độ sửa">➕ Mới</button>',
            '          <button type="button" class="vp-btn-png compact" id="vp-open-obs-deck" style="background:#7c3aed;border-color:#a78bfa;" title="Mở khung quản lý Bộ bài giảng OBS & Đẩy vào Thư viện">📚 Bài giảng (<span id="mm-deck-count">0</span>)</button>',
            '          <button type="button" class="vp-close-sm" id="btn-close-minmap" title="Đóng MinMap">✕</button>',
            '        </div>',
            '      </div>',
            '      <div class="mm-tb-row mm-tb-row-2">',
            '        <div class="mm-tb-side">',
            '          <div class="vp-pill-group">',
            '            <div class="vp-quick-fs" title="Cỡ chữ nội dung (px)">',
            '              <span style="font-size:10px;color:#94a3b8;padding:0 2px">Chữ</span>',
            '              <button type="button" class="vp-step-btn" id="mm-body-fs-dec">−</button>',
            '              <input type="number" class="vp-num-input" id="mm-body-fs-input" min="12" max="48" value="40">',
            '              <button type="button" class="vp-step-btn" id="mm-body-fs-inc">+</button>',
            '            </div>',
            '            <div class="vp-quick-fs" title="Cỡ chữ Tiêu đề Sơ đồ (px)">',
            '              <span style="font-size:10px;color:#94a3b8;padding:0 2px">TĐ</span>',
            '              <button type="button" class="vp-step-btn" id="mm-main-title-fs-dec">−</button>',
            '              <input type="number" class="vp-num-input" id="mm-main-title-fs-input" min="18" max="52" value="38">',
            '              <button type="button" class="vp-step-btn" id="mm-main-title-fs-inc">+</button>',
            '            </div>',
            '            <div class="vp-quick-fs" title="Cỡ chữ Tiêu đề Nhánh (px)">',
            '              <span style="font-size:10px;color:#94a3b8;padding:0 2px">Nhánh</span>',
            '              <button type="button" class="vp-step-btn" id="mm-card-title-fs-dec">−</button>',
            '              <input type="number" class="vp-num-input" id="mm-card-title-fs-input" min="14" max="42" value="30">',
            '              <button type="button" class="vp-step-btn" id="mm-card-title-fs-inc">+</button>',
            '            </div>',
            '          </div>',
            '          <span class="mm-overflow-badge hidden" id="mm-overflow-warn" style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;">⚠️ Tràn khung</span>',
            '        </div>',
            '        <div class="mm-tb-side">',
            '          <div class="vp-pill-group" id="mm-teacher-align-box" title="Canh lề cho dòng đang đặt con trỏ (khung mặc định Canh đều)">',
            '            <span id="mm-align-row-lbl" style="font-size:10px;color:#38bdf8;font-weight:800;min-width:34px">Lề</span>',
            '            <button type="button" class="vp-btn-sm" id="mm-align-left" title="Canh trái dòng đang chứa con trỏ">⫷ Trái</button>',
            '            <button type="button" class="vp-btn-sm accent" id="mm-align-justify" title="Canh đều dòng đang chứa con trỏ (mặc định)">⫼ Đều</button>',
            '            <button type="button" class="vp-btn-sm" id="mm-align-right" title="Canh phải dòng đang chứa con trỏ">⫸ Phải</button>',
            '          </div>',
            '          <div class="vp-pill-group" id="mm-teacher-img-box" title="Ảnh khung đang chọn">',
            '            <span style="font-size:11px">🖼️</span>',
            '            <button type="button" class="vp-step-btn" id="mm-img-w-dec">−</button>',
            '            <input type="number" class="vp-num-input" id="mm-img-w-input" min="30" max="100" value="100" style="width:44px">',
            '            <button type="button" class="vp-step-btn" id="mm-img-w-inc">+</button>',
            '            <span style="font-size:10px;color:#94a3b8">%</span>',
            '            <button type="button" class="vp-btn-sm" id="mm-img-remove" title="Xóa ảnh khung">🗑️</button>',
            '          </div>',
            '          <div class="vp-pill-group hidden" id="mm-student-blanks-panel">',
            '            <span class="hidden" id="mm-selected-blank-info"></span>',
            '            <button type="button" class="vp-btn-sm" id="mm-blank-shorter">− Ngắn</button>',
            '            <button type="button" class="vp-btn-sm" id="mm-blank-longer">+ Dài</button>',
            '            <button type="button" class="vp-btn-sm accent" id="mm-blank-auto">↔ Cuối hàng</button>',
            '            <button type="button" class="vp-btn-sm" id="mm-blank-add-row">+ Hàng</button>',
            '            <button type="button" class="vp-btn-sm" id="mm-blank-rem-row">− Hàng</button>',
            '            <span style="color:#475569;padding:0 2px">|</span>',
            '            <span style="font-size:10px;color:#94a3b8" title="Co giãn đồng loạt tất cả ô chấm trên trang">Co/Giãn</span>',
            '            <button type="button" class="vp-step-btn" id="mm-blank-scale-dec">−</button>',
            '            <span id="mm-blank-scale-val" style="font-size:11px;font-weight:800;color:#fde047;min-width:34px;text-align:center">100%</span>',
            '            <button type="button" class="vp-step-btn" id="mm-blank-scale-inc">+</button>',
            '            <span style="font-size:10px;color:#94a3b8" title="Độ cao/thưa từng dòng chấm">Dòng</span>',
            '            <button type="button" class="vp-step-btn" id="mm-blank-rowh-dec">−</button>',
            '            <span id="mm-blank-rowh-val" style="font-size:11px;font-weight:800;color:#fde047;min-width:22px;text-align:center">26</span>',
            '            <button type="button" class="vp-step-btn" id="mm-blank-rowh-inc">+</button>',
            '            <select class="vp-select" id="mm-blank-style" title="Kiểu nét in A4 (mặc định Chấm)" style="height:24px;font-size:11px;padding:0 5px">',
            '              <option value="dotted" selected>⋯ Chấm</option>',
            '              <option value="solid">⎯ Liền</option>',
            '              <option value="dashed">┄ Đứt</option>',
            '            </select>',
            '            <select class="vp-select" id="mm-blank-weight" title="Độ đậm nét khi photo A4" style="height:24px;font-size:11px;padding:0 5px">',
            '              <option value="thin">Mảnh</option>',
            '              <option value="medium" selected>Vừa</option>',
            '              <option value="bold">Đậm</option>',
            '            </select>',
            '          </div>',
            '        </div>',
            '      </div>',
            '    </div>',
            '    <div class="vp-canvas-scroll">',
            '      <div class="vp-viewport">',
            '        <div class="vp-stage-scaler" id="mm-stage-scaler">',
            '          <div class="vp-stage teacher bg-obsidian" id="mm-stage-teacher">',
            '            <div class="obs-slogan-bar theme-aurora" id="mm-slogan-bar">',
            '              <span class="obs-sl-text obs-sl-left">Hãy <span class="obs-sl-accent">HỎI, HỎI VÀ HỎI THẬT NHIỀU</span></span>',
            '              <span class="obs-sl-center"><span class="obs-sl-sep">》</span><span class="obs-sl-brand">Team LTĐ</span><span class="obs-sl-sep">《</span></span>',
            '              <span class="obs-sl-text obs-sl-right">Luôn Tin vào Bản Thân và LTĐ nhé <span class="obs-sl-sep">》</span> BÍ MẬT vì đó là BÍ THUẬT</span>',
            '            </div>',
            '            <div class="vp-stage-inner" id="mm-teacher-stage-inner"></div>',
            '          </div>',
            '          <div class="vp-stage student hidden" id="mm-stage-student">',
            '            <div class="vp-stage-inner" id="mm-student-stage-inner"></div>',
            '          </div>',
            '        </div>',
            '      </div>',
            '    </div>',
            '  </section>',
            '</div>',
            '<div id="mm-deck-drawer" class="mm-deck-drawer hidden">',
            '  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">',
            '    <strong style="font-size:12.5px;color:#c4b5fd;">📚 Quản lý Bài giảng</strong>',
            '    <div style="display:flex;gap:4px;">',
            '      <button type="button" class="vp-btn-sm" id="mm-deck-new">+ Bài mới</button>',
            '      <button type="button" class="vp-btn-sm" id="mm-deck-expand" title="Mở rộng / Thu gọn danh sách 2 cột">⤢</button>',
            '      <button type="button" class="vp-btn-sm" id="mm-deck-rename" title="Đổi tên bộ">✎</button>',
            '      <button type="button" class="vp-btn-sm" id="mm-deck-del" title="Xóa bộ">🗑</button>',
            '      <button type="button" class="vp-btn-sm" id="mm-deck-close" title="Đóng">✕</button>',
            '    </div>',
            '  </div>',
            '  <div class="mm-deck-row"><select id="mm-deck-select" class="mm-deck-sel"></select></div>',
            '  <div class="mm-deck-tabs">',
            '    <button type="button" class="mm-deck-tab active" id="mm-tab-gv">🎬 Slide GV (<span id="mm-gv-cnt">0</span>)</button>',
            '    <button type="button" class="mm-deck-tab" id="mm-tab-hs">📄 Phiếu HS A4 (<span id="mm-hs-cnt">0</span>)</button>',
            '  </div>',
            '  <div id="mm-deck-slides" class="mm-deck-slides"></div>',
            '  <div id="mm-gv-export-bar" style="display:flex;gap:6px;">',
            '    <button type="button" class="vp-btn-png compact" id="mm-export-gv-zip" style="flex:1;justify-content:center;background:#0284c7;border-color:#38bdf8;">📦 Xuất ZIP (.png)</button>',
            '  </div>',
            '  <div id="mm-hs-export-bar" class="hidden" style="display:flex;gap:6px;">',
            '    <button type="button" class="vp-btn-png compact" id="mm-export-hs-pdf" style="flex:1;justify-content:center;background:#059669;border-color:#34d399;">📥 Xuất PDF (A4)</button>',
            '    <button type="button" class="vp-btn-png compact" id="mm-export-hs-zip" style="flex:1;justify-content:center;background:#0284c7;border-color:#38bdf8;">📦 Xuất ZIP (.png)</button>',
            '  </div>',
            '  <div style="display:flex;gap:6px;">',
            '    <button type="button" class="vp-btn-png compact" id="mm-deck-push-drive" style="flex:1;justify-content:center;background:#0369a1;border-color:#38bdf8;" title="Lưu toàn bộ Bài giảng đang soạn dở (ảnh + Markdown + thiết lập) lên Drive">☁️ Đẩy lên Drive</button>',
            '    <button type="button" class="vp-btn-png compact" id="mm-deck-pull-drive" style="flex:1;justify-content:center;background:#4338ca;border-color:#818cf8;" title="Kéo bộ Bài giảng đang soạn dở từ Drive về máy này để soạn tiếp">☁️ Kéo từ Drive</button>',
            '  </div>',
            '  <div id="mm-deck-sync-status" style="font-size:11.5px;font-weight:700;color:#93c5fd;min-height:0;"></div>',
            '  <button type="button" class="vp-btn-png compact" id="mm-push-lib-btn" style="width:100%;justify-content:center;background:#d97706;border-color:#fbbf24;">📤 Đẩy vào Thư viện</button>',
            '  <button type="button" class="vp-btn-png compact" id="mm-extract-tf-game" style="width:100%;justify-content:center;background:#db2777;border-color:#f472b6;" title="Gom các câu Đúng/Sai trong bài giảng thành đề thi chơi trực tiếp">🎮 Tách câu Đúng/Sai chơi trực tiếp</button>',
            '</div>',
            '<div id="mm-push-backdrop" class="mm-push-backdrop hidden">',
            '  <div id="mm-push-dialog" class="mm-push-dialog">',
            '    <div class="mm-push-header">',
            '      <strong class="mm-push-title">📤 Cài đặt Đẩy vào Thư viện</strong>',
            '      <button type="button" class="vp-btn-sm" id="mm-push-cancel">✕</button>',
            '    </div>',
            '    <div class="mm-deck-field"><span>Tên bài:</span><input type="text" id="mm-push-title" class="mm-deck-sel" placeholder="VD: Chương 4 Polymer"></div>',
            '    <div class="mm-deck-field"><span>Khối lớp:</span><select id="mm-dest-grade" class="mm-deck-sel"><option value="ALL">🎓 Tất cả khối</option><option value="Lớp 12">Lớp 12</option><option value="Lớp 11">Lớp 11</option><option value="Lớp 10">Lớp 10</option></select></div>',
            '    <div class="mm-deck-field"><span>Tìm thư mục:</span><input type="text" id="mm-dest-folder-q" class="mm-deck-sel" placeholder="🔍 Gõ tên thư mục (VD: Chương 4, Polymer)..."></div>',
            '    <div class="mm-folder-chips-wrap"><div id="mm-dest-folder-meta" class="mm-folder-chips-meta"></div><div id="mm-dest-folder-chips" class="mm-folder-chips-list"></div></div>',
            '    <div class="mm-deck-field hidden" aria-hidden="true"><span>Thư mục:</span><select id="mm-dest-folder" class="mm-deck-sel"></select></div>',
            '    <div class="mm-push-actions">',
            '      <button type="button" class="vp-btn-sm" id="mm-push-cancel-btn">Hủy</button>',
            '      <button type="button" class="vp-btn-png compact" id="mm-push-confirm-btn">✅ Xác nhận đẩy</button>',
            '    </div>',
            '  </div>',
            '</div>',
            '<div id="mm-toast-box"></div>'
        ].join('\n');
        document.body.appendChild(modalEl);

        var iconBody = $('#mm-icon-body');
        ICON_GROUPS.forEach(function (g) {
            var wrap = document.createElement('div');
            wrap.innerHTML = '<div class="mm-icon-cat">' + escapeHtml(g.label) + '</div><div class="mm-icon-grid"></div>';
            var grid = wrap.querySelector('.mm-icon-grid');
            g.icons.forEach(function (ico) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'mm-icon-chip';
                b.textContent = ico;
                b.addEventListener('click', function () {
                    var ed = $('#markdown-editor');
                    var pos = ed.selectionStart || 0;
                    ed.value = ed.value.slice(0, pos) + ico + ' ' + ed.value.slice(pos);
                    $('#mm-icon-drawer').classList.add('hidden');
                    recordHistory();
                    saveDraft();
                    renderAll();
                });
                grid.appendChild(b);
            });
            iconBody.appendChild(wrap);
        });

        var ed = $('#markdown-editor');
        var saved = '';
        try { saved = global.localStorage ? (global.localStorage.getItem(LS_DRAFT) || '') : ''; } catch (e) {}
        ed.value = saved.trim() ? saved : SAMPLE_MINMAP;
        recordHistory();

        var _edRenderTimer = null;
        ed.addEventListener('input', function () {
            saveDraft();
            if (_edRenderTimer) clearTimeout(_edRenderTimer);
            _edRenderTimer = setTimeout(function () {
                _edRenderTimer = null;
                recordHistory();
                renderAll();
            }, 120);
        });
        var edFs = 13;
        try {
            var savedFs = parseInt(global.localStorage ? global.localStorage.getItem(LS_ED_FS) : '', 10);
            if (!isNaN(savedFs)) edFs = savedFs;
        } catch (e) {}
        function applyEditorFontSize(nextFs) {
            edFs = Math.max(12, Math.min(22, parseInt(nextFs, 10) || 13));
            ed.style.fontSize = edFs + 'px';
            var badge = $('#mm-ed-fs-val');
            if (badge) badge.textContent = edFs + 'px';
            try { if (global.localStorage) global.localStorage.setItem(LS_ED_FS, String(edFs)); } catch (e) {}
        }
        applyEditorFontSize(edFs);
        $('#btn-ed-fs-down').addEventListener('click', function () { applyEditorFontSize(edFs - 1); });
        $('#btn-ed-fs-up').addEventListener('click', function () { applyEditorFontSize(edFs + 1); });

        function indentEditorLines(isShift) {
            var start = ed.selectionStart || 0;
            var end = ed.selectionEnd || 0;
            var val = ed.value || '';
            var lineStart = val.lastIndexOf('\n', start - 1) + 1;
            var lineEnd = val.indexOf('\n', end);
            if (lineEnd === -1) lineEnd = val.length;
            var block = val.slice(lineStart, lineEnd);
            var lines = block.split('\n');
            var deltaStart = 0;
            var deltaTotal = 0;
            var updated = lines.map(function (ln, idx) {
                if (!isShift) {
                    if (idx === 0) deltaStart = 2;
                    deltaTotal += 2;
                    return '  ' + ln;
                }
                var rm = ln.indexOf('  ') === 0 ? 2 : (ln.charAt(0) === '\t' || ln.charAt(0) === ' ' ? 1 : 0);
                if (idx === 0) deltaStart = -rm;
                deltaTotal -= rm;
                return ln.slice(rm);
            }).join('\n');
            ed.value = val.slice(0, lineStart) + updated + val.slice(lineEnd);
            var nextStart = Math.max(lineStart, start + deltaStart);
            var nextEnd = Math.max(nextStart, end + deltaTotal);
            ed.selectionStart = nextStart;
            ed.selectionEnd = nextEnd;
            saveDraft();
            recordHistory();
            renderAll();
        }

        function syncStageToRow(rowIdx) {
            $all('.mm-sync-active').forEach(function (el) { el.classList.remove('mm-sync-active'); });
            if (isNaN(rowIdx) || rowIdx < 0) return;
            var stageSel = state.tab === 'student' ? '#mm-student-stage-inner' : '#mm-teacher-stage-inner';
            var stageEl = $(stageSel);
            if (!stageEl || typeof stageEl.querySelector !== 'function') return;
            var target = stageEl.querySelector('[data-row="' + rowIdx + '"]');
            if (target) {
                target.classList.add('mm-sync-active');
                if (typeof target.scrollIntoView === 'function') {
                    try { target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
                }
            }
        }
        var syncedRowIdx = -1;
        function updateEditorLineHighlight(rowIdx, doScroll) {
            var hl = $('#mm-ed-line-hl');
            var bar = $('#mm-ed-sync-bar');
            var lines = (ed.value || '').split('\n');
            if (isNaN(rowIdx) || rowIdx < 0 || rowIdx >= lines.length) {
                if (hl) hl.classList.add('hidden');
                if (bar) bar.classList.add('hidden');
                return;
            }
            syncedRowIdx = rowIdx;
            var cs = (global.getComputedStyle && typeof global.getComputedStyle === 'function') ? global.getComputedStyle(ed) : null;
            var fsPx = cs ? (parseFloat(cs.fontSize) || 13) : (parseFloat(ed.style.fontSize) || 13);
            var lh = cs ? (parseFloat(cs.lineHeight) || Math.round(fsPx * 1.55)) : Math.round(fsPx * 1.55);
            var padTop = cs ? (parseFloat(cs.paddingTop) || 10) : 10;
            var targetY = padTop + rowIdx * lh;
            var rowH = lh;
            if (cs && ed.clientWidth && typeof document.createTextNode === 'function') {
                if (!modalEl._edMirror) {
                    var mr = document.createElement('div');
                    mr.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:pre-wrap;word-wrap:break-word;box-sizing:border-box;';
                    modalEl.appendChild(mr);
                    modalEl._edMirror = mr;
                }
                var m = modalEl._edMirror;
                m.style.width = ed.clientWidth + 'px';
                m.style.fontFamily = cs.fontFamily;
                m.style.fontSize = cs.fontSize;
                m.style.lineHeight = cs.lineHeight;
                m.style.padding = cs.padding;
                m.innerHTML = '';
                var beforeTxt = lines.slice(0, rowIdx).join('\n');
                m.appendChild(document.createTextNode(beforeTxt + (beforeTxt.length ? '\n' : '')));
                var sp = document.createElement('span');
                sp.textContent = lines[rowIdx] || ' ';
                m.appendChild(sp);
                if (typeof sp.offsetTop === 'number' && sp.offsetHeight > 0) {
                    targetY = sp.offsetTop;
                    rowH = sp.offsetHeight;
                }
            }
            if (doScroll) {
                var viewH = ed.clientHeight || 300;
                ed.scrollTop = Math.max(0, targetY - Math.round(viewH * 0.35));
            }
            if (hl) {
                hl.style.top = (targetY - (ed.scrollTop || 0)) + 'px';
                hl.style.height = rowH + 'px';
                hl.classList.remove('hidden');
            }
            if (bar) {
                bar.textContent = '📍 Dòng ' + (rowIdx + 1) + ': ' + lines[rowIdx].trim();
                bar.classList.remove('hidden');
            }
        }
        function syncEditorToRow(rowIdx) {
            if (isNaN(rowIdx) || rowIdx < 0) return;
            var lines = (ed.value || '').split('\n');
            if (rowIdx >= lines.length) return;
            var start = 0;
            for (var i = 0; i < rowIdx; i++) start += lines[i].length + 1;
            var end = start + lines[rowIdx].length;
            ed.selectionStart = start;
            ed.selectionEnd = end;
            updateEditorLineHighlight(rowIdx, true);
        }
        ed.addEventListener('scroll', function () {
            if (syncedRowIdx >= 0) updateEditorLineHighlight(syncedRowIdx, false);
        });
        function getEditorCursorRow() {
            return (ed.value || '').slice(0, ed.selectionStart || 0).split('\n').length - 1;
        }
        ed.addEventListener('keyup', function () { var r = getEditorCursorRow(); syncStageToRow(r); updateEditorLineHighlight(r, false); });
        ed.addEventListener('click', function () { var r = getEditorCursorRow(); syncStageToRow(r); updateEditorLineHighlight(r, false); });
        ['#mm-teacher-stage-inner', '#mm-student-stage-inner'].forEach(function (sel) {
            var box = $(sel);
            if (!box) return;
            box.addEventListener('click', function (e) {
                var rEl = e.target && e.target.closest ? e.target.closest('[data-row]') : null;
                if (!rEl) return;
                var rIdx = parseInt(rEl.getAttribute('data-row'), 10);
                syncStageToRow(rIdx);
                syncEditorToRow(rIdx);
            });
        });
        modalEl._syncRow = function (rIdx) { syncStageToRow(rIdx); syncEditorToRow(rIdx); };

        ed.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                indentEditorLines(!!e.shiftKey);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                var k = e.key.toLowerCase();
                if (k === 'h') { e.preventDefault(); toggleHighlightSelection(); }
                else if (k === 'i') { e.preventDefault(); $('#mm-icon-drawer').classList.toggle('hidden'); }
            }
        });
        ed.addEventListener('paste', function (e) {
            var cb = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
            if (!cb) return;
            var hasImg = false;
            if (cb.items) {
                for (var i = 0; i < cb.items.length; i++) {
                    if (cb.items[i].type && cb.items[i].type.indexOf('image') !== -1) { hasImg = true; break; }
                }
            }
            if (!hasImg) {
                setTimeout(function () { saveDraft(); recordHistory(); renderAll(); }, 0);
            }
        });

        $('#btn-close-minmap').addEventListener('click', close);
        $('#tab-btn-teacher').addEventListener('click', function () { switchTab('teacher'); });
        $('#tab-btn-student').addEventListener('click', function () { switchTab('student'); });
        $('#btn-undo').addEventListener('click', function () { stepHistory(-1); });
        $('#btn-redo').addEventListener('click', function () { stepHistory(1); });
        $('#btn-clear-content').addEventListener('click', function () {
            ed.value = '';
            recordHistory();
            saveDraft();
            renderAll();
        });
        $('#btn-quick-paste').addEventListener('click', function () {
            ed.focus();
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(function (txt) {
                    if (txt) {
                        var s = ed.selectionStart || 0;
                        var en = ed.selectionEnd || 0;
                        if (ed.value && s !== en) {
                            ed.value = ed.value.slice(0, s) + txt + ed.value.slice(en);
                            ed.selectionStart = ed.selectionEnd = s + txt.length;
                        } else {
                            ed.value = txt;
                        }
                        recordHistory(); saveDraft(); renderAll();
                    }
                }).catch(function () {
                    setStatus('Nhấn Ctrl+V trực tiếp trong ô soạn thảo để dán.');
                    showToast('Trình duyệt chặn nút đọc clipboard — hãy nhấn Ctrl+V trực tiếp trong ô soạn thảo.', 'warning');
                });
            } else {
                setStatus('Nhấn Ctrl+V trực tiếp trong ô soạn thảo để dán.');
                showToast('Hãy nhấn Ctrl+V trực tiếp trong ô soạn thảo.', 'warning');
            }
        });
        $('#btn-content-icons').addEventListener('click', function () {
            $('#mm-icon-drawer').classList.toggle('hidden');
        });
        $('#mm-icon-close').addEventListener('click', function () {
            $('#mm-icon-drawer').classList.add('hidden');
        });
        $('#btn-toggle-highlight').addEventListener('click', toggleHighlightSelection);
        var btnCol2 = $('#btn-toggle-col2');
        if (btnCol2) {
            btnCol2.addEventListener('click', function () {
                var wide = modalEl.classList.toggle('wide-col1');
                btnCol2.classList.toggle('accent', wide);
                try { fitStage(); } catch (e) {}
            });
        }

        $('#btn-save-md').addEventListener('click', function () {
            var model = parseInput(ed.value);
            var fname = safeName(model.title, state.tab, state.tab === 'student' ? state.studentSeq : state.teacherSeq).replace(/\.png$/, '.md');
            var blob = new Blob([ed.value], { type: 'text/markdown;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = fname;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
        $('#btn-import-md').addEventListener('click', function () { $('#mm-import-file').click(); });
        $('#mm-import-file').addEventListener('change', function (e) {
            var f = e.target.files && e.target.files[0];
            if (!f) return;
            var r = new FileReader();
            r.onload = function (ev) {
                ed.value = String(ev.target.result || '');
                recordHistory(); saveDraft(); renderAll();
            };
            r.readAsText(f, 'UTF-8');
        });

        function renderActiveStageOnly() {
            if (state.tab === 'student') {
                renderStage(true);
                fitStage();
                if (typeof _syncBlankFloatbarFn === 'function') _syncBlankFloatbarFn();
            } else {
                renderStage(false);
                fitStage();
                checkTeacherOverflow();
            }
        }
        $('#mm-font-select').addEventListener('change', function (e) {
            var val = e.target.value || 'Segoe UI';
            if (state.tab === 'student') {
                state.studentFont = val;
            } else {
                state.teacherFont = val;
            }
            renderActiveStageOnly();
        });
        function applyBodyFs(val) {
            var n = Math.max(12, Math.min(48, parseInt(val, 10) || 16));
            $('#mm-body-fs-input').value = n;
            if (state.tab === 'teacher') state.teacherBodyFs = n;
            else state.studentBodyFs = n;
            renderActiveStageOnly();
        }
        $('#mm-body-fs-dec').addEventListener('click', function () { applyBodyFs((parseInt($('#mm-body-fs-input').value, 10) || 40) - 1); });
        $('#mm-body-fs-inc').addEventListener('click', function () { applyBodyFs((parseInt($('#mm-body-fs-input').value, 10) || 40) + 1); });
        $('#mm-body-fs-input').addEventListener('input', function (e) { applyBodyFs(e.target.value); });
        function applyMainTitleFs(val) {
            var n = Math.max(18, Math.min(52, parseInt(val, 10) || 24));
            var inp = $('#mm-main-title-fs-input');
            if (inp) inp.value = n;
            if (state.tab === 'teacher') state.teacherMainTitleFs = n;
            else state.studentMainTitleFs = n;
            renderActiveStageOnly();
        }
        function applyCardTitleFs(val) {
            var n = Math.max(14, Math.min(42, parseInt(val, 10) || 18));
            var inp = $('#mm-card-title-fs-input');
            if (inp) inp.value = n;
            if (state.tab === 'teacher') state.teacherCardTitleFs = n;
            else state.studentCardTitleFs = n;
            renderActiveStageOnly();
        }
        $('#mm-main-title-fs-dec').addEventListener('click', function () { applyMainTitleFs((parseInt($('#mm-main-title-fs-input').value, 10) || 38) - 2); });
        $('#mm-main-title-fs-inc').addEventListener('click', function () { applyMainTitleFs((parseInt($('#mm-main-title-fs-input').value, 10) || 38) + 2); });
        $('#mm-main-title-fs-input').addEventListener('input', function (e) { applyMainTitleFs(e.target.value); });
        $('#mm-card-title-fs-dec').addEventListener('click', function () { applyCardTitleFs((parseInt($('#mm-card-title-fs-input').value, 10) || 30) - 1); });
        $('#mm-card-title-fs-inc').addEventListener('click', function () { applyCardTitleFs((parseInt($('#mm-card-title-fs-input').value, 10) || 30) + 1); });
        $('#mm-card-title-fs-input').addEventListener('input', function (e) { applyCardTitleFs(e.target.value); });

        function autoFitTeacher16x9() {
            if (state.tab !== 'teacher') {
                state.zoom100 = !state.zoom100;
                $('#vp-zoom').classList.toggle('on', state.zoom100);
                fitStage();
                return;
            }
            var st = $('#mm-stage-teacher');
            if (!st) return;
            var cards = parseInput(($('#markdown-editor') || {}).value || '').cards.slice(0, 4);
            var fits = function () { return st.scrollHeight <= 1080; };
            if (!fits() && cards.length === 3) {
                state.splitOverride = state.splitOverride === 1 ? 2 : 1;
                renderStage(false);
                if (!fits()) {
                    state.swapCols = !state.swapCols;
                    renderStage(false);
                }
            } else if (!fits() && cards.length >= 2) {
                state.swapCols = !state.swapCols;
                renderStage(false);
            }
            var fs = state.teacherBodyFs;
            while (!fits() && fs > 16) {
                fs -= 2;
                state.teacherBodyFs = fs;
                renderStage(false);
            }
            var fsInp = $('#mm-body-fs-input');
            if (fsInp) fsInp.value = state.teacherBodyFs;
            fitStage();
            setStatus('✓ Đã căn vừa trang 16:9 (' + state.teacherBodyFs + 'px)');
        }

        if ($('#vp-zoom')) $('#vp-zoom').addEventListener('click', autoFitTeacher16x9);

        $('#mm-slogan-toggle').addEventListener('click', function () {
            state.sloganOn = !state.sloganOn;
            $('#mm-slogan-bar').classList.toggle('hidden', !state.sloganOn);
            $('#mm-slogan-toggle').textContent = state.sloganOn ? 'Đang BẬT' : 'Đang TẮT';
            $('#mm-slogan-toggle').classList.toggle('on', state.sloganOn);
        });
        $('#mm-slogan-theme-select').addEventListener('change', function (e) {
            var bar = $('#mm-slogan-bar');
            bar.classList.remove('theme-aurora', 'theme-emerald', 'theme-pro', 'theme-royal');
            state.sloganTheme = e.target.value;
            bar.classList.add(state.sloganTheme);
        });

        function applyImgWidth(val) {
            var n = Math.max(30, Math.min(100, parseInt(val, 10) || 100));
            $('#mm-img-w-input').value = n;
            if (state.branchImages[state.selectedBranch]) {
                state.branchImages[state.selectedBranch].widthPct = n;
                renderAll();
            }
        }
        $('#mm-img-w-dec').addEventListener('click', function () { applyImgWidth((parseInt($('#mm-img-w-input').value, 10) || 100) - 10); });
        $('#mm-img-w-inc').addEventListener('click', function () { applyImgWidth((parseInt($('#mm-img-w-input').value, 10) || 100) + 10); });
        $('#mm-img-w-input').addEventListener('input', function (e) { applyImgWidth(e.target.value); });
        $('#mm-img-remove').addEventListener('click', function () {
            delete state.branchImages[state.selectedBranch];
            setStatus('✓ Đã xóa ảnh Khung ' + (state.selectedBranch + 1));
            renderAll();
        });

        (function bindTeacherAlignControls() {
            var tStage = $('#mm-stage-teacher');
            var edEl = $('#markdown-editor');
            function getEditorCursorRow() {
                if (!edEl || typeof edEl.selectionStart !== 'number') return null;
                var val = String(edEl.value || '');
                return val.slice(0, edEl.selectionStart).split('\n').length - 1;
            }
            function resolveActiveTeacherRow() {
                var ae = document.activeElement;
                if (ae && ae === edEl) {
                    var er = getEditorCursorRow();
                    if (er !== null) state.selectedTeacherRow = er;
                } else if (ae && tStage && tStage.contains(ae)) {
                    var ln = ae.closest ? ae.closest('.vp-line[data-row], .vp-box-title[data-row], .mm-tf-txt[data-row]') : null;
                    if (ln) {
                        var sr = parseInt(ln.getAttribute('data-row'), 10);
                        if (!isNaN(sr)) state.selectedTeacherRow = sr;
                    }
                }
                if (state.selectedTeacherRow !== null && !isNaN(state.selectedTeacherRow)) {
                    return state.selectedTeacherRow;
                }
                return getEditorCursorRow();
            }
            function syncAlignButtonsUi() {
                var r = state.selectedTeacherRow;
                var cur = (r !== null && !isNaN(r) && state.lineAligns[r]) ? state.lineAligns[r] : 'justify';
                var bL = $('#mm-align-left'), bJ = $('#mm-align-justify'), bR = $('#mm-align-right'), rLbl = $('#mm-align-row-lbl');
                if (bL) bL.classList.toggle('accent', cur === 'left');
                if (bJ) bJ.classList.toggle('accent', cur === 'justify');
                if (bR) bR.classList.toggle('accent', cur === 'right');
                if (rLbl) rLbl.textContent = (r !== null && !isNaN(r)) ? ('D.' + (r + 1)) : 'Lề';
            }
            function applyTeacherAlignRow(r, al, restoreStageFocus) {
                if (r === null || isNaN(r) || r < 0) {
                    showToast('Hãy đặt con trỏ vào 1 dòng ở Cột 1 hoặc Slide GV trước khi chỉnh lề.', 'warning');
                    return false;
                }
                var ae = document.activeElement;
                var shouldRestoreStage = (typeof restoreStageFocus === 'boolean')
                    ? restoreStageFocus
                    : !!(ae && tStage && tStage.contains(ae));
                state.selectedTeacherRow = r;
                state.lineAligns[r] = al;
                syncAlignButtonsUi();
                renderStage(false);
                fitStage();
                checkTeacherOverflow();
                if (shouldRestoreStage && tStage) {
                    var nextLine = tStage.querySelector('[data-row="' + r + '"]');
                    if (nextLine && typeof nextLine.focus === 'function') {
                        try { nextLine.focus({ preventScroll: true }); } catch (err) { try { nextLine.focus(); } catch (e2) {} }
                    }
                }
                try { if (typeof syncStageToRow === 'function') syncStageToRow(r); } catch (e3) {}
                var lbl = al === 'right' ? 'Canh phải' : (al === 'left' ? 'Canh trái' : 'Canh đều');
                setStatus('✓ ' + lbl + ' Dòng ' + (r + 1));
                return true;
            }
            if (edEl) {
                ['keyup', 'mouseup', 'click', 'focus'].forEach(function (evName) {
                    edEl.addEventListener(evName, function () {
                        var er = getEditorCursorRow();
                        if (er !== null) state.selectedTeacherRow = er;
                        syncAlignButtonsUi();
                    });
                });
            }
            if (tStage) {
                ['focusin', 'mousedown', 'click'].forEach(function (evName) {
                    tStage.addEventListener(evName, function (e) {
                        var ln = e.target && e.target.closest ? e.target.closest('.vp-line[data-row], .vp-box-title[data-row], .mm-tf-txt[data-row]') : null;
                        if (ln) {
                            var r = parseInt(ln.getAttribute('data-row'), 10);
                            if (!isNaN(r)) state.selectedTeacherRow = r;
                        }
                        syncAlignButtonsUi();
                    });
                });
            }
            ['#mm-align-left', '#mm-align-justify', '#mm-align-right'].forEach(function (sel) {
                var el = $(sel);
                if (el) el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
            });
            if ($('#mm-align-left')) $('#mm-align-left').addEventListener('click', function () { applyTeacherAlignRow(resolveActiveTeacherRow(), 'left'); });
            if ($('#mm-align-justify')) $('#mm-align-justify').addEventListener('click', function () { applyTeacherAlignRow(resolveActiveTeacherRow(), 'justify'); });
            if ($('#mm-align-right')) $('#mm-align-right').addEventListener('click', function () { applyTeacherAlignRow(resolveActiveTeacherRow(), 'right'); });
            if (modalEl) {
                modalEl._applyTeacherAlignRow = applyTeacherAlignRow;
                modalEl._syncAlignButtonsUi = syncAlignButtonsUi;
            }
            syncAlignButtonsUi();
        })();

        function ensureBlankFloatbar() {
            var fb = $('#mm-blank-floatbar');
            if (!fb && modalEl) {
                fb = document.createElement('div');
                fb.id = 'mm-blank-floatbar';
                fb.className = 'mm-blank-floatbar hidden';
                fb.innerHTML =
                    '<button type="button" class="mm-bf-btn" data-bf="shorter" title="Thu ngắn ô chấm">− Ngắn</button>' +
                    '<button type="button" class="mm-bf-btn" data-bf="longer" title="Kéo dài ô chấm">+ Dài</button>' +
                    '<button type="button" class="mm-bf-btn accent" data-bf="end" title="Bật/tắt kéo hết hàng">↔ Cuối</button>' +
                    '<button type="button" class="mm-bf-btn" data-bf="addrow" title="Thêm dòng chấm bên dưới">+ Hàng</button>' +
                    '<button type="button" class="mm-bf-btn" data-bf="remrow" title="Bớt dòng chấm bên dưới">− Hàng</button>' +
                    '<button type="button" class="mm-bf-btn" data-bf="reset" title="Đặt lại mặc định">↺</button>' +
                    '<button type="button" class="mm-bf-btn" data-bf="close" title="Bỏ chọn">✕</button>';
                modalEl.appendChild(fb);
                fb.addEventListener('click', function (ev) {
                    var b = ev.target && ev.target.closest ? ev.target.closest('button[data-bf]') : null;
                    if (!b) return;
                    var act = b.getAttribute('data-bf');
                    if (act === 'shorter') resizeSelectedBlank(-1.5);
                    else if (act === 'longer') resizeSelectedBlank(1.5);
                    else if (act === 'end') resizeSelectedBlank('toggle_end');
                    else if (act === 'addrow') stepBlankRows(1);
                    else if (act === 'remrow') stepBlankRows(-1);
                    else if (act === 'reset') resizeSelectedBlank('reset');
                    else if (act === 'close') {
                        state.selectedBlankId = null;
                        renderStage(true);
                        fitStage();
                        syncBlankFloatbar();
                    }
                });
            }
            return fb;
        }
        _syncBlankFloatbarFn = syncBlankFloatbar;
        function syncBlankFloatbar() {
            var fb = ensureBlankFloatbar();
            if (!fb) return;
            if (state.tab !== 'student' || !state.selectedBlankId) {
                fb.classList.add('hidden');
                return;
            }
            var bl = $('#mm-student-stage-inner [data-blank-id="' + state.selectedBlankId + '"]') || $('#mm-student-stage-inner .vp-writing-lines[data-row-key="' + state.selectedBlankId + '"]') || $('#mm-student-stage-inner .mm-tf-row[data-row-key="' + state.selectedBlankId + '"]');
            if (!bl || !bl.getBoundingClientRect) {
                fb.classList.add('hidden');
                return;
            }
            var r = bl.getBoundingClientRect();
            if (!r.width && !r.height) { fb.classList.add('hidden'); return; }
            fb.classList.remove('hidden');
            var fbW = fb.offsetWidth || 310;
            var left = Math.max(8, Math.min((global.innerWidth || 1200) - fbW - 8, r.left + r.width / 2 - fbW / 2));
            var top = r.top > 110 ? (r.top - 42) : (r.bottom + 8);
            fb.style.left = Math.round(left) + 'px';
            fb.style.top = Math.round(top) + 'px';
        }
        function resizeSelectedBlank(delta) {
            if (!state.selectedBlankId) {
                showToast('Hãy bấm chọn 1 ô chấm trên bản Học sinh trước.', 'warning');
                return;
            }
            if (delta === 'reset') {
                delete state.blankWidths[state.selectedBlankId];
                delete state.blankRows[state.selectedBlankId];
            } else if (delta === 'end') {
                state.blankWidths[state.selectedBlankId] = 'end';
            } else if (delta === 'toggle_end') {
                if (state.blankWidths[state.selectedBlankId] === 'end') {
                    delete state.blankWidths[state.selectedBlankId];
                } else {
                    state.blankWidths[state.selectedBlankId] = 'end';
                }
            } else {
                var cur = typeof state.blankWidths[state.selectedBlankId] === 'number' ? state.blankWidths[state.selectedBlankId] : NaN;
                if (isNaN(cur)) {
                    var blEl = $('#mm-student-stage-inner [data-blank-id="' + state.selectedBlankId + '"]');
                    cur = blEl ? parseFloat(blEl.getAttribute('data-def-w') || blEl.style.width || '6') : 6;
                }
                if (isNaN(cur)) cur = 6;
                state.blankWidths[state.selectedBlankId] = Math.max(2.2, Math.min(45, cur + delta));
            }
            renderStage(true);
            fitStage();
            syncBlankFloatbar();
        }
        $('#mm-blank-shorter').addEventListener('click', function () { resizeSelectedBlank(-1.5); });
        $('#mm-blank-longer').addEventListener('click', function () { resizeSelectedBlank(1.5); });
        $('#mm-blank-auto').addEventListener('click', function () { resizeSelectedBlank('toggle_end'); });
        function stepBlankRows(delta) {
            if (!state.selectedBlankId) {
                showToast('Hãy bấm chọn 1 ô chấm hoặc dòng viết trên bản Học sinh trước.', 'warning');
                return;
            }
            var cur = state.blankRows[state.selectedBlankId];
            if (cur === undefined) {
                var defEl = $('#mm-student-stage-inner .vp-writing-lines[data-row-key="' + state.selectedBlankId + '"][data-default-one="1"]') || $('#mm-student-stage-inner .mm-tf-row[data-row-key="' + state.selectedBlankId + '"][data-default-one="1"]');
                cur = defEl ? 1 : 0;
            }
            state.blankRows[state.selectedBlankId] = Math.max(0, Math.min(10, cur + delta));
            renderStage(true);
            fitStage();
            syncBlankFloatbar();
        }
        $('#mm-blank-add-row').addEventListener('click', function () { stepBlankRows(1); });
        $('#mm-blank-rem-row').addEventListener('click', function () { stepBlankRows(-1); });
        function syncBlankGlobalControls() {
            var sv = $('#mm-blank-scale-val');
            if (sv) sv.textContent = Math.round((Number(state.blankScale) || 1) * 100) + '%';
            var rv = $('#mm-blank-rowh-val');
            if (rv) rv.textContent = String(Number(state.blankRowGap) || 26);
            var stSel = $('#mm-blank-style');
            if (stSel) stSel.value = state.blankStyle || 'dotted';
            var wtSel = $('#mm-blank-weight');
            if (wtSel) wtSel.value = state.blankWeight || 'medium';
        }
        if ($('#mm-blank-scale-dec')) $('#mm-blank-scale-dec').addEventListener('click', function () {
            state.blankScale = Math.max(0.6, Math.min(1.8, Number((Number(state.blankScale || 1) - 0.1).toFixed(2))));
            syncBlankGlobalControls(); renderStage(true); fitStage(); syncBlankFloatbar();
        });
        if ($('#mm-blank-scale-inc')) $('#mm-blank-scale-inc').addEventListener('click', function () {
            state.blankScale = Math.max(0.6, Math.min(1.8, Number((Number(state.blankScale || 1) + 0.1).toFixed(2))));
            syncBlankGlobalControls(); renderStage(true); fitStage(); syncBlankFloatbar();
        });
        if ($('#mm-blank-rowh-dec')) $('#mm-blank-rowh-dec').addEventListener('click', function () {
            state.blankRowGap = Math.max(20, Math.min(40, (Number(state.blankRowGap) || 26) - 2));
            syncBlankGlobalControls(); renderStage(true); fitStage(); syncBlankFloatbar();
        });
        if ($('#mm-blank-rowh-inc')) $('#mm-blank-rowh-inc').addEventListener('click', function () {
            state.blankRowGap = Math.max(20, Math.min(40, (Number(state.blankRowGap) || 26) + 2));
            syncBlankGlobalControls(); renderStage(true); fitStage(); syncBlankFloatbar();
        });
        if ($('#mm-blank-style')) $('#mm-blank-style').addEventListener('change', function (e) {
            state.blankStyle = e.target.value || 'dotted';
            renderStage(true); fitStage();
        });
        if ($('#mm-blank-weight')) $('#mm-blank-weight').addEventListener('change', function (e) {
            state.blankWeight = e.target.value || 'medium';
            renderStage(true); fitStage();
        });

        // Kéo mép phải ô chấm bằng chuột + Nhấp đúp bật/tắt kéo hết hàng + Hiện thanh nổi khi chọn
        (function bindDirectBlankInteractions() {
            var stInner = $('#mm-student-stage-inner');
            if (!stInner) return;
            var dragInfo = null;
            stInner.addEventListener('mousedown', function (e) {
                var grip = e.target && e.target.closest ? e.target.closest('.mm-blank-grip[data-blank-grip]') : null;
                if (!grip) return;
                e.preventDefault();
                e.stopPropagation();
                var bid = grip.getAttribute('data-blank-grip');
                var bl = grip.closest('.vp-blank');
                if (!bid || !bl) return;
                var rect = bl.getBoundingClientRect();
                var curEm = parseFloat(bl.style.width || bl.getAttribute('data-def-w') || '6') || 6;
                var pxPerEm = Math.max(6, (rect.width || 60) / Math.max(1, curEm));
                dragInfo = { bid: bid, bl: bl, startX: e.clientX, startEm: curEm, pxPerEm: pxPerEm, curEm: curEm };
            });
            document.addEventListener('mousemove', function (e) {
                if (!dragInfo) return;
                var dx = e.clientX - dragInfo.startX;
                var nextEm = Math.max(2.2, Math.min(45, dragInfo.startEm + dx / dragInfo.pxPerEm));
                dragInfo.curEm = nextEm;
                dragInfo.bl.classList.remove('vp-blank-end');
                dragInfo.bl.style.width = nextEm.toFixed(1) + 'em';
            });
            document.addEventListener('mouseup', function () {
                if (!dragInfo) return;
                state.selectedBlankId = dragInfo.bid;
                state.blankWidths[dragInfo.bid] = Number(dragInfo.curEm.toFixed(1));
                dragInfo = null;
                renderStage(true);
                fitStage();
                syncBlankFloatbar();
            });
            stInner.addEventListener('dblclick', function (e) {
                var bl = e.target && e.target.closest ? e.target.closest('.vp-blank[data-blank-id]') : null;
                if (!bl) return;
                e.preventDefault();
                state.selectedBlankId = bl.getAttribute('data-blank-id');
                resizeSelectedBlank('toggle_end');
            });
            stInner.addEventListener('click', function () {
                setTimeout(syncBlankFloatbar, 0);
            });
        })();

        $('#mm-export-preset').addEventListener('change', function (e) { switchTab(e.target.value); });
        $('#mm-export-seq').addEventListener('change', function (e) {
            var n = Math.max(1, parseInt(e.target.value, 10) || 1);
            if (state.tab === 'student') state.studentSeq = n;
            else state.teacherSeq = n;
            e.target.value = n;
        });
        $('#vp-download-png').addEventListener('click', exportPng);

        /* === [MT-10B/C/D] Kho IndexedDB Bai giang GV+HS, Loc khoi thong minh, PDF A4 2-up & Thu vien === */
        var OBS_DB_NAME = 'LTD_MINMAP_OBS_DB';
        var OBS_LS_DECKS = 'ltd_minmap_obs_decks_v1';
        var _memSlideMap = {};
        var _deckState = { decks: [], activeId: '', loaded: false, viewTab: 'gv' };

        function noAccent(str) {
            return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
        }
        function openObsDb() {
            return new Promise(function (resolve, reject) {
                if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'));
                var req = indexedDB.open(OBS_DB_NAME, 1);
                req.onupgradeneeded = function (ev) {
                    var db = ev.target.result;
                    if (!db.objectStoreNames.contains('slides')) db.createObjectStore('slides', { keyPath: 'id' });
                };
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { reject(req.error || new Error('idb-err')); };
            });
        }
        function putSlideDataUrl(id, dataUrl) {
            _memSlideMap[id] = dataUrl;
            return openObsDb().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction('slides', 'readwrite');
                    tx.objectStore('slides').put({ id: id, dataUrl: dataUrl });
                    tx.oncomplete = function () { resolve(true); };
                    tx.onerror = function () { reject(tx.error); };
                });
            }).catch(function () { return false; });
        }
        function deleteSlideDataUrl(id) {
            if (!id) return Promise.resolve(false);
            try { delete _memSlideMap[id]; } catch (e) {}
            return openObsDb().then(function (db) {
                return new Promise(function (resolve) {
                    var tx = db.transaction('slides', 'readwrite');
                    tx.objectStore('slides').delete(id);
                    tx.oncomplete = function () { resolve(true); };
                    tx.onerror = function () { resolve(false); };
                });
            }).catch(function () { return false; });
        }
        function getSlideDataUrl(id) {
            if (_memSlideMap[id]) return Promise.resolve(_memSlideMap[id]);
            return openObsDb().then(function (db) {
                return new Promise(function (resolve) {
                    var tx = db.transaction('slides', 'readonly');
                    var req = tx.objectStore('slides').get(id);
                    req.onsuccess = function () {
                        var val = req.result && req.result.dataUrl ? req.result.dataUrl : '';
                        if (val) _memSlideMap[id] = val;
                        resolve(val);
                    };
                    req.onerror = function () { resolve(''); };
                });
            }).catch(function () { return _memSlideMap[id] || ''; });
        }
        function loadDecksMeta() {
            if (_deckState.loaded) return _deckState.decks;
            _deckState.loaded = true;
            try {
                var raw = JSON.parse(localStorage.getItem(OBS_LS_DECKS) || '[]');
                if (Array.isArray(raw)) _deckState.decks = raw;
            } catch (e) { _deckState.decks = []; }
            if (!_deckState.decks.length) {
                _deckState.decks.push({ id: 'deck_' + Date.now(), name: 'Bài giảng Hóa học 1', slides: [], hsSlides: [] });
            }
            _deckState.decks.forEach(function (d) {
                if (!Array.isArray(d.slides)) d.slides = [];
                if (!Array.isArray(d.hsSlides)) d.hsSlides = [];
            });
            if (!_deckState.activeId || !_deckState.decks.some(function (d) { return d.id === _deckState.activeId; })) {
                _deckState.activeId = _deckState.decks[0].id;
            }
            return _deckState.decks;
        }
        function saveDecksMeta() {
            try { localStorage.setItem(OBS_LS_DECKS, JSON.stringify(_deckState.decks)); } catch (e) {}
        }
        function getActiveDeck() {
            loadDecksMeta();
            return _deckState.decks.find(function (d) { return d.id === _deckState.activeId; }) || _deckState.decks[0];
        }
        function blobToDataUrl(blob) {
            return new Promise(function (resolve, reject) {
                if (typeof FileReader === 'undefined') return resolve('data:image/png;base64,');
                var fr = new FileReader();
                fr.onloadend = function () { resolve(fr.result || ''); };
                fr.onerror = reject;
                fr.readAsDataURL(blob);
            });
        }
        function getLibFoldersList() {
            var list = [];
            if (global.LTDLibBridge && typeof global.LTDLibBridge.getFolders === 'function') list = global.LTDLibBridge.getFolders();
            if ((!list || !list.length) && Array.isArray(global.savedFolders) && global.savedFolders.length) list = global.savedFolders;
            if (!list || !list.length) {
                try {
                    var raw = JSON.parse(localStorage.getItem('matrix_library_folders_v1') || '[]');
                    if (Array.isArray(raw)) list = raw;
                } catch (e) {}
            }
            return (list || []).filter(function (f) { var pid = String((f && f.parentId) || '').toLowerCase(); return f && pid !== '__subj_meta__' && pid !== '__subjmeta'; });
        }
        function getLibTopicsList() {
            if (global.LTDLibBridge && typeof global.LTDLibBridge.getTopics === 'function') return global.LTDLibBridge.getTopics();
            if (Array.isArray(global.savedTopics)) return global.savedTopics;
            try {
                var raw = JSON.parse(localStorage.getItem('matrix_quiz_topics_v2') || '[]');
                if (Array.isArray(raw)) return raw;
            } catch (e) {}
            return [];
        }
        function detectFolderGrade(folder, fullPath) {
            if (folder && folder.grade && /Lớp\s*(10|11|12)/i.test(folder.grade)) return folder.grade;
            var p = noAccent(fullPath);
            if (/(?:hoa\s*hoc|hoa|lop|h)\s*12\b/.test(p)) return 'Lớp 12';
            if (/(?:hoa\s*hoc|hoa|lop|h)\s*11\b/.test(p)) return 'Lớp 11';
            if (/(?:hoa\s*hoc|hoa|lop|h)\s*10\b/.test(p)) return 'Lớp 10';
            return '';
        }
        function populateDestPickers() {
            var fSel = $('#mm-dest-folder');
            var gSel = $('#mm-dest-grade');
            var qInp = $('#mm-dest-folder-q');
            if (!fSel) return;
            var allF = getLibFoldersList();
            var fMap = {};
            allF.forEach(function (f) { if (f && f.id) fMap[f.id] = f; });
            function pathOf(f) {
                var parts = [f.name || 'Thư mục'], cur = f, g = 0;
                while (cur && cur.parentId && fMap[cur.parentId] && g++ < 8) {
                    cur = fMap[cur.parentId];
                    parts.unshift(cur.name || 'Thư mục');
                }
                return parts.join(' › ');
            }
            var selGrade = (gSel && gSel.value) || 'ALL';
            function isChemistrySubject(sj) {
                if (!sj) return true;
                var s = noAccent(sj).replace(/\s+/g, ' ');
                return /\bhoa\b|hoa\s*hoc/.test(s);
            }
            var qNorm = noAccent(qInp ? qInp.value : '').replace(/\s+/g, ' ');
            var prevVal = fSel.value || '';
            var opts = '<option value="">(Ngoài thư mục — Gốc Hóa học)</option>';
            var matched = allF.filter(function (f) {
                if (!f) return false;
                if (f.subject && !isChemistrySubject(f.subject)) return false;
                var fullP = pathOf(f);
                if (selGrade !== 'ALL') {
                    var fg = detectFolderGrade(f, fullP);
                    if (!fg || fg !== selGrade) return false;
                }
                if (qNorm && noAccent(fullP).replace(/\s+/g, ' ').indexOf(qNorm) === -1) return false;
                return true;
            });
            matched.forEach(function (f) {
                var fullP = pathOf(f);
                opts += '<option value="' + escapeHtml(f.id) + '" title="' + escapeHtml(fullP) + '">' + escapeHtml(fullP) + '</option>';
            });
            fSel.innerHTML = opts;
            var stillValid = matched.some(function (f) { return f.id === prevVal; });
            if (stillValid) fSel.value = prevVal;
            else if (qNorm && matched.length) fSel.value = matched[0].id;
            else fSel.value = '';
            var curVal = fSel.value || '';
            var curOpt = fSel.options && fSel.selectedIndex >= 0 ? fSel.options[fSel.selectedIndex] : null;
            fSel.title = curOpt ? (curOpt.title || curOpt.textContent || '') : '';

            var metaEl = $('#mm-dest-folder-meta');
            var chipsEl = $('#mm-dest-folder-chips');
            if (metaEl) {
                metaEl.textContent = 'Tìm thấy ' + matched.length + ' thư mục (' + (selGrade === 'ALL' ? 'Tất cả khối' : selGrade) + ') — bấm 1 chạm để chọn:';
            }
            if (chipsEl) {
                var chipRows = '<button type="button" class="mm-folder-chip' + (curVal === '' ? ' active' : '') + '" data-fid=""><span>📂 (Ngoài thư mục — Gốc Hóa học)</span><span>' + (curVal === '' ? '✓' : '') + '</span></button>';
                matched.forEach(function (f) {
                    var fullP = pathOf(f);
                    var isAct = (curVal === f.id);
                    chipRows += '<button type="button" class="mm-folder-chip' + (isAct ? ' active' : '') + '" data-fid="' + escapeHtml(f.id) + '"><span>📁 ' + escapeHtml(fullP) + '</span><span>' + (isAct ? '✓' : '') + '</span></button>';
                });
                chipsEl.innerHTML = chipRows;
            }
        }
        var _editingSlideIdx = -1;
        function cloneSettingVal(v, fallback) {
            if (v === undefined || v === null) return fallback;
            if (typeof v !== 'object') return v;
            try { return JSON.parse(JSON.stringify(v)); } catch (e) { return fallback; }
        }
        function snapshotPageSettings() {
            return {
                tab: state.tab,
                zoom100: !!state.zoom100,
                camVisible: !!state.camVisible,
                sloganOn: !!state.sloganOn,
                sloganTheme: state.sloganTheme || 'theme-aurora',
                stageBg: state.stageBg || 'bg-obsidian',
                swapCols: !!state.swapCols,
                font: state.teacherFont || state.font || 'Segoe UI',
                teacherFont: state.teacherFont || state.font || 'Segoe UI',
                studentFont: state.studentFont || state.font || 'Segoe UI',
                teacherBodyFs: Number(state.teacherBodyFs || 40),
                teacherMainTitleFs: Number(state.teacherMainTitleFs || 38),
                teacherCardTitleFs: Number(state.teacherCardTitleFs || 30),
                splitOverride: cloneSettingVal(state.splitOverride, null),
                studentBodyFs: Number(state.studentBodyFs || 13),
                studentMainTitleFs: Number(state.studentMainTitleFs || 24),
                studentCardTitleFs: Number(state.studentCardTitleFs || 18.5),
                blankScale: Number(state.blankScale || 1),
                blankRowGap: Number(state.blankRowGap || 26),
                blankStyle: String(state.blankStyle || 'dotted'),
                blankWeight: String(state.blankWeight || 'medium'),
                blankWidths: cloneSettingVal(state.blankWidths, {}),
                blankRows: cloneSettingVal(state.blankRows, {}),
                lineAligns: cloneSettingVal(state.lineAligns, {}),
                studentLineAligns: cloneSettingVal(state.studentLineAligns, {}),
                branchAligns: cloneSettingVal(state.branchAligns, {}),
                branchImages: cloneSettingVal(state.branchImages, {})
            };
        }
        function applyPageSettings(cfg) {
            if (!cfg || typeof cfg !== 'object') return;
            if (cfg.tab === 'teacher' || cfg.tab === 'student') state.tab = cfg.tab;
            if (typeof cfg.zoom100 === 'boolean') state.zoom100 = cfg.zoom100;
            if (typeof cfg.camVisible === 'boolean') state.camVisible = cfg.camVisible;
            if (typeof cfg.sloganOn === 'boolean') state.sloganOn = cfg.sloganOn;
            if (cfg.sloganTheme) state.sloganTheme = String(cfg.sloganTheme);
            if (cfg.stageBg) state.stageBg = String(cfg.stageBg);
            if (typeof cfg.swapCols === 'boolean') state.swapCols = cfg.swapCols;
            if (cfg.font) {
                state.font = String(cfg.font);
                if (!cfg.teacherFont) state.teacherFont = String(cfg.font);
                if (!cfg.studentFont) state.studentFont = String(cfg.font);
            }
            if (cfg.teacherFont) { state.teacherFont = String(cfg.teacherFont); state.font = state.teacherFont; }
            if (cfg.studentFont) state.studentFont = String(cfg.studentFont);
            if (cfg.teacherBodyFs != null) state.teacherBodyFs = Number(cfg.teacherBodyFs);
            if (cfg.teacherMainTitleFs != null) state.teacherMainTitleFs = Number(cfg.teacherMainTitleFs);
            if (cfg.teacherCardTitleFs != null) state.teacherCardTitleFs = Number(cfg.teacherCardTitleFs);
            if ('splitOverride' in cfg) state.splitOverride = cloneSettingVal(cfg.splitOverride, null);
            if (cfg.studentBodyFs != null) state.studentBodyFs = Number(cfg.studentBodyFs);
            if (cfg.studentMainTitleFs != null) state.studentMainTitleFs = Number(cfg.studentMainTitleFs);
            if (cfg.studentCardTitleFs != null) state.studentCardTitleFs = Number(cfg.studentCardTitleFs);
            if (cfg.blankScale != null) state.blankScale = Number(cfg.blankScale);
            if (cfg.blankRowGap != null) state.blankRowGap = Number(cfg.blankRowGap);
            if (cfg.blankStyle) state.blankStyle = String(cfg.blankStyle);
            if (cfg.blankWeight) state.blankWeight = String(cfg.blankWeight);
            if (typeof syncBlankGlobalControls === 'function') syncBlankGlobalControls();
            state.blankWidths = cloneSettingVal(cfg.blankWidths, {});
            state.blankRows = cloneSettingVal(cfg.blankRows, {});
            state.lineAligns = cloneSettingVal(cfg.lineAligns, {});
            state.studentLineAligns = cloneSettingVal(cfg.studentLineAligns, {});
            state.branchAligns = cloneSettingVal(cfg.branchAligns, {});
            state.branchImages = cloneSettingVal(cfg.branchImages, {});
            try {
                if (typeof switchTab === 'function') switchTab(state.tab);
                if (typeof _syncBlankFloatbarFn === 'function') _syncBlankFloatbarFn();
                var slSel = $('#mm-slogan-theme-select');
                if (slSel) slSel.value = state.sloganTheme;
                var slBar = $('#mm-slogan-bar');
                if (slBar) {
                    slBar.classList.remove('theme-aurora', 'theme-emerald', 'theme-pro', 'theme-royal');
                    slBar.classList.add(state.sloganTheme);
                }
                var prSel = $('#mm-export-preset');
                if (prSel) prSel.value = state.tab;
            } catch (e) {}
        }
        function getSlideGroupNum(arr, idx) {
            if (!Array.isArray(arr) || idx < 0 || idx >= arr.length) return idx + 1;
            var seen = {};
            var grp = 0;
            for (var k = 0; k <= idx; k++) {
                var item = arr[k];
                var pid = (item && item.pairId) ? ('p:' + item.pairId) : ('i:' + k);
                if (!seen[pid]) {
                    seen[pid] = ++grp;
                }
            }
            var cur = arr[idx];
            var curPid = (cur && cur.pairId) ? ('p:' + cur.pairId) : ('i:' + idx);
            return seen[curPid] || (idx + 1);
        }
        function syncSaveButtonsUi() {
            var btn = $('#vp-save-obs-deck');
            var newBtn = $('#vp-save-new-obs');
            var dk = getActiveDeck();
            var arr = dk ? (_deckState.viewTab === 'hs' ? dk.hsSlides : dk.slides) : [];
            if (_editingSlideIdx >= 0 && _editingSlideIdx < arr.length) {
                var grpNum = getSlideGroupNum(arr, _editingSlideIdx);
                if (btn) {
                    btn.textContent = '💾 Cập nhật #' + grpNum;
                    btn.style.background = '#0284c7';
                    btn.style.borderColor = '#38bdf8';
                }
                if (newBtn) newBtn.classList.remove('hidden');
            } else {
                _editingSlideIdx = -1;
                if (btn) {
                    btn.textContent = '💾 Lưu';
                    btn.style.background = '#059669';
                    btn.style.borderColor = '#34d399';
                }
                if (newBtn) newBtn.classList.add('hidden');
            }
        }
        function renderDeckDrawer() {
            loadDecksMeta();
            var d = getActiveDeck();
            var gvCount = d ? d.slides.length : 0;
            var hsCount = d ? d.hsSlides.length : 0;
            var cntEl = $('#mm-deck-count');
            if (cntEl) cntEl.textContent = String(hsCount > 0 ? hsCount : gvCount);
            var gvCntEl = $('#mm-gv-cnt');
            if (gvCntEl) gvCntEl.textContent = String(gvCount);
            var hsCntEl = $('#mm-hs-cnt');
            if (hsCntEl) hsCntEl.textContent = String(hsCount);

            var tGv = $('#mm-tab-gv'), tHs = $('#mm-tab-hs'), hsBar = $('#mm-hs-export-bar'), gvBar = $('#mm-gv-export-bar');
            var isHsTab = _deckState.viewTab === 'hs';
            if (tGv && tGv.classList) tGv.classList.toggle('active', !isHsTab);
            if (tHs && tHs.classList) tHs.classList.toggle('active', isHsTab);
            if (gvBar) {
                if (gvBar.classList) gvBar.classList.toggle('hidden', isHsTab);
                gvBar.style.display = !isHsTab ? 'flex' : 'none';
            }
            if (hsBar) {
                if (hsBar.classList) hsBar.classList.toggle('hidden', !isHsTab);
                hsBar.style.display = isHsTab ? 'flex' : 'none';
            }

            var sel = $('#mm-deck-select');
            if (sel) {
                sel.innerHTML = _deckState.decks.map(function (dk) {
                    return '<option value="' + escapeHtml(dk.id) + '"' + (dk.id === d.id ? ' selected' : '') + '>' + escapeHtml(dk.name) + ' (' + dk.slides.length + ' GV · ' + dk.hsSlides.length + ' HS)</option>';
                }).join('');
            }
            var arr = d ? (isHsTab ? d.hsSlides : d.slides) : [];
            var listEl = $('#mm-deck-slides');
            if (listEl) {
                if (!arr.length) {
                    listEl.innerHTML = '<div style="font-size:11.5px;color:#94a3b8;text-align:center;padding:12px;">Chưa có trang ' + (isHsTab ? 'HS A4' : 'GV') + ' nào. Hãy chọn tab ' + (isHsTab ? 'HS' : 'GV') + ' và bấm "💾 Lưu vào Bài giảng".</div>';
                } else {
                    listEl.innerHTML = arr.map(function (sl, i) {
                        var src = _memSlideMap[sl.id] || '';
                        var edPairId = (_editingSlideIdx >= 0 && arr[_editingSlideIdx] && arr[_editingSlideIdx].pairId) ? arr[_editingSlideIdx].pairId : '';
                        var isEd = (i === _editingSlideIdx) || (!!edPairId && sl.pairId === edPairId);
                        var grpNum = getSlideGroupNum(arr, i);
                        var numLabel = String(grpNum).padStart(2, '0');
                        var roleTag = sl.examRole === 'question' ? ' · Đề' : (sl.examRole === 'answer' ? ' · Đáp án' : '');
                        var badgeHtml = isEd ? '<span class="mm-editing-badge">✏️ Đang sửa</span>' : '';
                        return '<div class="mm-deck-item' + (isEd ? ' is-editing' : '') + '" draggable="true" data-sidx="' + i + '" title="Bấm vào để nạp lại 100% thiết lập & Markdown lên Cột 1">' +
                            '<img class="mm-deck-thumb" data-sid="' + escapeHtml(sl.id) + '" src="' + src + '" alt="slide">' +
                            '<div class="mm-deck-meta">' +
                            '<div class="mm-deck-head"><span class="mm-deck-num">#' + numLabel + roleTag + '</span>' + badgeHtml + '</div>' +
                            '<div class="mm-deck-title">' + escapeHtml(sl.title || 'Trang') + '</div>' +
                            '</div>' +
                            '<div class="mm-deck-acts">' +
                            '<button type="button" class="vp-btn-sm" data-act="up" data-idx="' + i + '" title="Lên">▲</button>' +
                            '<button type="button" class="vp-btn-sm" data-act="dn" data-idx="' + i + '" title="Xuống">▼</button>' +
                            '<button type="button" class="vp-btn-sm" data-act="del" data-idx="' + i + '" title="Xóa">🗑</button>' +
                            '</div></div>';
                    }).join('');
                    arr.forEach(function (sl) {
                        if (!_memSlideMap[sl.id]) {
                            getSlideDataUrl(sl.id).then(function (u) {
                                var im = listEl.querySelector('img[data-sid="' + sl.id + '"]');
                                if (im && u) im.src = u;
                            });
                        }
                    });
                }
            }
            populateDestPickers();
            syncSaveButtonsUi();
        }
        function hideLegacyImagePreview() {
            var box = $('#mm-legacy-img-preview');
            if (box) box.style.display = 'none';
            var vp = $('.vp-viewport');
            if (vp) vp.style.display = '';
        }
        function showLegacyImagePreview(sl, sIdx) {
            if (!sl || !sl.id) return;
            var scrollWrap = $('.vp-canvas-scroll');
            var vp = $('.vp-viewport');
            if (!scrollWrap) return;
            var box = $('#mm-legacy-img-preview');
            if (!box) {
                box = document.createElement('div');
                box.id = 'mm-legacy-img-preview';
                box.style.cssText = 'display:none;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;padding:12px;box-sizing:border-box;background:#0b1220;gap:10px;';
                box.innerHTML = '<div style="display:flex;align-items:center;gap:10px;width:100%;max-width:960px;justify-content:space-between;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:8px 12px;color:#e2e8f0;font-size:12px;font-weight:700;">' +
                    '<span id="mm-legacy-img-caption">🖼️ Ảnh khôi phục (chỉ xem / xuất PDF)</span>' +
                    '<button type="button" id="mm-legacy-img-close" class="vp-btn-sm">✕ Đóng xem ảnh</button></div>' +
                    '<img id="mm-legacy-img-el" alt="Ảnh khôi phục" style="max-width:100%;max-height:calc(100% - 54px);object-fit:contain;border-radius:10px;box-shadow:0 12px 36px rgba(0,0,0,.55);background:#fff;">';
                scrollWrap.appendChild(box);
                var clsBtn = $('#mm-legacy-img-close');
                if (clsBtn) clsBtn.addEventListener('click', hideLegacyImagePreview);
            }
            var applyUrl = function (u) {
                if (!u) {
                    hideLegacyImagePreview();
                    showToast('Không tìm thấy ảnh trang #' + ((sIdx || 0) + 1) + ' trong bộ nhớ.', 'warning');
                    return;
                }
                if (vp) vp.style.display = 'none';
                box.style.display = 'flex';
                var imgEl = $('#mm-legacy-img-el');
                if (imgEl) imgEl.src = u;
                var cap = $('#mm-legacy-img-caption');
                if (cap) cap.textContent = '🖼️ Trang #' + ((sIdx || 0) + 1) + ' — ' + (sl.title || 'Ảnh khôi phục') + ' (không có Markdown gốc)';
            };
            if (_memSlideMap[sl.id]) {
                applyUrl(_memSlideMap[sl.id]);
            } else {
                getSlideDataUrl(sl.id).then(applyUrl);
            }
        }
        function saveCurrentSlideToObsDeck(forceNew) {
            var gvStage = $('#mm-stage-teacher');
            var hsStage = $('#mm-stage-student');
            if (!gvStage && !hsStage) return Promise.resolve(null);
            var edEl = $('#markdown-editor');
            var edVal = edEl ? String(edEl.value || '') : '';
            var model = parseInput(edVal);
            var title = (model.title || 'Sơ đồ MinMap').replace(/==/g, '').trim();
            var fontCSS = buildFontEmbedCSS();
            var hasRenderer = (global.modernScreenshot && typeof global.modernScreenshot.domToBlob === 'function') || (mmWin.htmlToImage && typeof mmWin.htmlToImage.toPng === 'function');
            setStatus('Đang lưu đồng thời Slide GV & Phiếu HS A4 kèm Markdown...');

            function captureStage(stage, kind, w, fixedH) {
                if (!stage) return Promise.resolve({ dataUrl: 'data:image/png;base64,', w: w, h: fixedH || 480 });
                var wasHidden = stage.classList && stage.classList.contains('hidden');
                if (wasHidden) stage.classList.remove('hidden');
                var h = fixedH || Math.max(220, stage.scrollHeight || 480);
                var p = hasRenderer
                    ? renderMinMapPngBlob(stage, kind, w, h, fontCSS).then(function (res) {
                        if (res && res.dataUrl) return res.dataUrl;
                        if (res && res.blob) return blobToDataUrl(res.blob);
                        return 'data:image/png;base64,';
                    })
                    : Promise.resolve('data:image/png;base64,');
                return p.then(function (url) {
                    if (wasHidden) stage.classList.add('hidden');
                    return { dataUrl: url, w: w, h: h };
                }, function (err) {
                    if (wasHidden) stage.classList.add('hidden');
                    throw err;
                });
            }

            var isExamMode = !!model.isExam;
            var gvCapPromise = isExamMode
                ? (function () {
                    renderStage(false, { hideKey: true });
                    return captureStage(gvStage, 'teacher', 1920, 1080).then(function (noKeyRes) {
                        renderStage(false);
                        return captureStage(gvStage, 'teacher', 1920, 1080).then(function (keyRes) {
                            return { dual: true, noKey: noKeyRes, withKey: keyRes };
                        });
                    });
                })()
                : captureStage(gvStage, 'teacher', 1920, 1080).then(function (gvRes) {
                    return { dual: false, single: gvRes };
                });

            return gvCapPromise.then(function (gvPack) {
                return captureStage(hsStage, 'student', 794, 0).then(function (hsRes) {
                    var deck = getActiveDeck();
                    var ts = Date.now();
                    var rnd = Math.random().toString(36).slice(2, 6);
                    var hsId = 'mmhs_' + ts + '_' + rnd;
                    var isOverwrite = (forceNew !== true && _editingSlideIdx >= 0 && (_editingSlideIdx < deck.slides.length || _editingSlideIdx < deck.hsSlides.length));

                    var existingPairId = '';
                    if (isOverwrite) {
                        var refArr = (_deckState.viewTab === 'hs') ? deck.hsSlides : deck.slides;
                        var refSl = refArr[_editingSlideIdx];
                        if (refSl && refSl.pairId) existingPairId = String(refSl.pairId);
                    }
                    var pairId = existingPairId || ('pair_' + ts + '_' + rnd);
                    var pageCfg = snapshotPageSettings();
                    var hsEntry = { id: hsId, pairId: pairId, isExam: isExamMode, title: title, w: hsRes.w, h: hsRes.h, markdown: edVal, settings: cloneSettingVal(pageCfg, {}), createdAt: ts };

                    var putJobs = [putSlideDataUrl(hsId, hsRes.dataUrl)];
                    var gvEntries = [];
                    if (gvPack.dual) {
                        var gvId1 = 'mmsl_' + ts + '_' + rnd + '_q';
                        var gvId2 = 'mmsl_' + ts + '_' + rnd + '_a';
                        putJobs.push(putSlideDataUrl(gvId1, gvPack.noKey.dataUrl));
                        putJobs.push(putSlideDataUrl(gvId2, gvPack.withKey.dataUrl));
                        gvEntries.push({ id: gvId1, pairId: pairId, isExam: true, examRole: 'question', title: title + ' [Đề]', w: gvPack.noKey.w, h: gvPack.noKey.h, markdown: edVal, settings: cloneSettingVal(pageCfg, {}), createdAt: ts });
                        gvEntries.push({ id: gvId2, pairId: pairId, isExam: true, examRole: 'answer', title: title + ' [Đáp án]', w: gvPack.withKey.w, h: gvPack.withKey.h, markdown: edVal, settings: cloneSettingVal(pageCfg, {}), createdAt: ts });
                    } else {
                        var gvId0 = 'mmsl_' + ts + '_' + rnd;
                        putJobs.push(putSlideDataUrl(gvId0, gvPack.single.dataUrl));
                        gvEntries.push({ id: gvId0, pairId: pairId, isExam: false, title: title, w: gvPack.single.w, h: gvPack.single.h, markdown: edVal, settings: pageCfg, createdAt: ts });
                    }

                    return Promise.all(putJobs).then(function () {
                        if (edVal) deck.minMapMarkdown = edVal;
                        if (isOverwrite) {
                            if (existingPairId) {
                                var firstGvIdx = -1;
                                var keptGv = [];
                                deck.slides.forEach(function (s, idx) {
                                    if (s && s.pairId === existingPairId) {
                                        if (firstGvIdx === -1) firstGvIdx = idx;
                                    } else {
                                        keptGv.push(s);
                                    }
                                });
                                if (firstGvIdx === -1) firstGvIdx = keptGv.length;
                                Array.prototype.splice.apply(keptGv, [firstGvIdx, 0].concat(gvEntries));
                                deck.slides = keptGv;

                                var hsIdx = deck.hsSlides.findIndex(function (s) { return s && s.pairId === existingPairId; });
                                if (hsIdx >= 0) deck.hsSlides[hsIdx] = hsEntry;
                                else if (_editingSlideIdx < deck.hsSlides.length) deck.hsSlides[_editingSlideIdx] = hsEntry;
                                else deck.hsSlides.push(hsEntry);
                            } else {
                                var spliceAt = Math.min(_editingSlideIdx, deck.slides.length);
                                Array.prototype.splice.apply(deck.slides, [spliceAt, (_editingSlideIdx < deck.slides.length ? 1 : 0)].concat(gvEntries));
                                if (_editingSlideIdx < deck.hsSlides.length) deck.hsSlides[_editingSlideIdx] = hsEntry;
                                else deck.hsSlides.push(hsEntry);
                            }
                        } else {
                            gvEntries.forEach(function (ge) { deck.slides.push(ge); });
                            deck.hsSlides.push(hsEntry);
                            _editingSlideIdx = -1;
                        }
                        saveDecksMeta();
                        renderDeckDrawer();
                        if (isOverwrite) {
                            var ovGrp = getSlideGroupNum(deck.slides, Math.min(_editingSlideIdx, deck.slides.length - 1));
                            setStatus('✓ Đã cập nhật đè #' + ovGrp + ' trong "' + deck.name + '"');
                            showToast('Đã cập nhật đè #' + ovGrp + (gvPack.dual ? ' (cả 2 ảnh GV Đề/Đáp án + 1 HS)' : ' (GV + HS)'), 'success');
                        } else {
                            setStatus('✓ Đã lưu trang mới vào "' + deck.name + '"');
                            showToast('Đã lưu "' + title + '"' + (gvPack.dual ? ' (2 ảnh GV Đề/Đáp án + 1 HS)' : ' (GV + HS)'), 'success');
                        }
                        return { deckId: deck.id, gvId: gvEntries[0].id, hsId: hsId, pairId: pairId, dual: gvPack.dual, kind: 'both', overwritten: isOverwrite, gvCount: deck.slides.length, hsCount: deck.hsSlides.length };
                    });
                });
            }).catch(function (err) {
                showToast('Lỗi lưu: ' + (err && err.message || ''), 'error');
                return null;
            });
        }
        function packSlidesIntoA4Pages(items, opts) {
            opts = opts || {};
            var pageW = opts.pageW || 1654;
            var pageH = opts.pageH || 2339;
            var marginX = opts.marginX || 84;
            var marginTop = opts.marginTop || 88;
            var marginBot = opts.marginBot || 88;
            var usableW = pageW - marginX * 2;
            var maxImgH = opts.maxImgH || 920;
            var labelH = 48;
            var gapY = 44;
            var pages = [];
            var curPage = { hasDocTitle: true, items: [] };
            var curY = marginTop + 96;

            items.forEach(function (it, idx) {
                var iw = it.w || 794;
                var ih = it.h || 500;
                var scale = Math.min(usableW / iw, maxImgH / ih);
                var drawW = Math.round(iw * scale);
                var drawH = Math.round(ih * scale);
                var blockH = labelH + drawH + gapY;
                if (curPage.items.length > 0 && curY + blockH > pageH - marginBot) {
                    pages.push(curPage);
                    curPage = { hasDocTitle: false, items: [] };
                    curY = marginTop;
                }
                curPage.items.push({
                    num: idx + 1,
                    title: it.title || ('Phiếu ' + (idx + 1)),
                    dataUrl: it.dataUrl || '',
                    x: Math.round((pageW - drawW) / 2),
                    y: curY,
                    drawW: drawW,
                    drawH: drawH
                });
                curY += blockH;
            });
            if (curPage.items.length) pages.push(curPage);
            pages.forEach(function (pg) {
                if (pg.items.length < 2) return;
                var topStart = pg.hasDocTitle ? (marginTop + 96) : marginTop;
                var availH = (pageH - marginBot) - topStart;
                var usedH = 0;
                pg.items.forEach(function (it) { usedH += labelH + it.drawH; });
                var extra = Math.max(0, availH - usedH);
                var gap = extra / pg.items.length;
                var cursor = topStart;
                pg.items.forEach(function (it) {
                    it.y = Math.round(cursor);
                    cursor += labelH + it.drawH + gap;
                });
            });
            return pages;
        }
        function buildA4PdfBytesFromJpegs(jpegPages) {
            var objs = [];
            function addObj(bodyBytes) {
                objs.push(bodyBytes);
                return objs.length;
            }
            function strBytes(s) {
                var arr = new Uint8Array(s.length);
                for (var i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i) & 0xff;
                return arr;
            }
            function concatBytes(parts) {
                var total = 0;
                parts.forEach(function (p) { total += p.length; });
                var out = new Uint8Array(total), off = 0;
                parts.forEach(function (p) { out.set(p, off); off += p.length; });
                return out;
            }
            var catalogId = addObj(strBytes(''));
            var pagesId = addObj(strBytes(''));
            var pageIds = [];

            jpegPages.forEach(function (pg, i) {
                var imgId = addObj(concatBytes([
                    strBytes('<< /Type /XObject /Subtype /Image /Width ' + pg.w + ' /Height ' + pg.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pg.bytes.length + ' >>\nstream\n'),
                    pg.bytes,
                    strBytes('\nendstream')
                ]));
                var streamStr = 'q\n595.28 0 0 841.89 0 0 cm\n/Im' + i + ' Do\nQ\n';
                var contentId = addObj(strBytes('<< /Length ' + streamStr.length + ' >>\nstream\n' + streamStr + 'endstream'));
                var pageId = addObj(strBytes('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im' + i + ' ' + imgId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>'));
                pageIds.push(pageId);
            });
            objs[catalogId - 1] = strBytes('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');
            objs[pagesId - 1] = strBytes('<< /Type /Pages /Kids [' + pageIds.map(function (id) { return id + ' 0 R'; }).join(' ') + '] /Count ' + pageIds.length + ' >>');

            var chunks = [strBytes('%PDF-1.4\n')];
            var offsets = [0];
            var pos = chunks[0].length;
            objs.forEach(function (body, idx) {
                offsets.push(pos);
                var head = strBytes((idx + 1) + ' 0 obj\n');
                var tail = strBytes('\nendobj\n');
                chunks.push(head, body, tail);
                pos += head.length + body.length + tail.length;
            });
            var xrefPos = pos;
            var xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
            for (var j = 1; j <= objs.length; j++) {
                xref += String(offsets[j]).padStart(10, '0') + ' 00000 n \n';
            }
            var trailer = 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalogId + ' 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF';
            chunks.push(strBytes(xref + trailer));
            return concatBytes(chunks);
        }
        function stripHsSuffix(name) {
            return String(name || '')
                .replace(/\s*[—–-]\s*Phiếu học tập\s*$/i, '')
                .replace(/\s*\(Phiếu học tập\)\s*$/i, '')
                .trim();
        }
        function exportHsSlidesToPdf(slidesList, deckTitle) {
            if (!slidesList || !slidesList.length) {
                showToast('Chưa có Phiếu HS A4 nào để xuất PDF!', 'warning');
                return Promise.resolve(null);
            }
            deckTitle = stripHsSuffix(deckTitle) || 'BÀI GIẢNG';
            setStatus('Đang tạo PDF A4 tiết kiệm giấy...');
            return Promise.all(slidesList.map(function (sl) {
                return getSlideDataUrl(sl.id).then(function (url) {
                    return { id: sl.id, title: sl.title, w: sl.w || 794, h: sl.h || 500, dataUrl: url || sl.dataUrl || '' };
                });
            })).then(function (resolved) {
                var pages = packSlidesIntoA4Pages(resolved);
                return Promise.all(pages.map(function (pg) {
                    return new Promise(function (resolve) {
                        var cv = document.createElement('canvas');
                        cv.width = 1654; cv.height = 2339;
                        var ctx = cv.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, 1654, 2339);
                        if (pg.hasDocTitle) {
                            ctx.fillStyle = '#0f172a';
                            ctx.font = 'bold 44px "Times New Roman", Times, serif';
                            ctx.textAlign = 'center';
                            ctx.fillText(String(deckTitle || 'BÀI GIẢNG').toUpperCase(), 827, 132);
                        }
                        Promise.all(pg.items.map(function (it) {
                            return new Promise(function (resItem) {
                                ctx.fillStyle = '#0f172a';
                                ctx.font = 'bold 30px "Times New Roman", Times, serif';
                                ctx.textAlign = 'left';
                                var cleanSub = String(it.title || '').replace(/^[^\p{L}\p{N}]+/gu, '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim();
                                ctx.fillText('Câu ' + it.num + ': ' + cleanSub, 84, it.y + 32);
                                if (!it.dataUrl || typeof Image === 'undefined') { resItem(); return; }
                                var img = new Image();
                                img.onload = function () {
                                    ctx.drawImage(img, it.x, it.y + 48, it.drawW, it.drawH);
                                    resItem();
                                };
                                img.onerror = function () { resItem(); };
                                img.src = it.dataUrl;
                            });
                        })).then(function () {
                            var jpgUrl = cv.toDataURL ? cv.toDataURL('image/jpeg', 0.92) : '';
                            var b64 = jpgUrl.split(',')[1] || '';
                            var bin = typeof atob === 'function' ? atob(b64) : '';
                            var bytes = new Uint8Array(bin.length);
                            for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
                            resolve({ w: 1654, h: 2339, bytes: bytes });
                        });
                    });
                }));
            }).then(function (jpegPages) {
                var pdfBytes = buildA4PdfBytesFromJpegs(jpegPages);
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                var cleanName = String(deckTitle || 'Phieu_HS').replace(/[\\/:*?"<>|]/g, '_') + '_HS_A4.pdf';
                if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                    var u = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = u; a.download = cleanName;
                    document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} }, 3000);
                }
                showToast('Đã xuất PDF A4 (' + jpegPages.length + ' trang tiết kiệm giấy): ' + cleanName, 'success');
                setStatus('✓ Đã xuất PDF A4: ' + cleanName);
                return { fileName: cleanName, pages: jpegPages.length, bytes: pdfBytes.length };
            });
        }
        function exportGvDeckZip() {
            var deck = getActiveDeck();
            if (!deck || !deck.slides.length) {
                showToast('Chưa có Slide GV nào để xuất ZIP!', 'warning');
                return Promise.resolve(null);
            }
            if (typeof global.JSZip !== 'function') {
                showToast('Thiếu thư viện JSZip!', 'error');
                return Promise.resolve(null);
            }
            var zip = new global.JSZip();
            return Promise.all(deck.slides.map(function (sl, i) {
                return getSlideDataUrl(sl.id).then(function (url) {
                    var b64 = String(url || '').split(',')[1] || '';
                    var fn = String(i + 1).padStart(2, '0') + '_GV_' + String(sl.title || 'Slide').replace(/[\\/:*?"<>|]/g, '_') + '.png';
                    zip.file(fn, b64, { base64: true });
                });
            })).then(function () {
                return zip.generateAsync({ type: 'blob' });
            }).then(function (blob) {
                var cleanName = String(deck.name || 'Slide_GV').replace(/[\\/:*?"<>|]/g, '_') + '_GV_1920x1080.zip';
                var u = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = u; a.download = cleanName;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} }, 3000);
                showToast('Đã xuất ZIP Slide GV: ' + cleanName, 'success');
                return cleanName;
            });
        }
        function exportHsDeckZip() {
            var deck = getActiveDeck();
            if (!deck || !deck.hsSlides.length) {
                showToast('Chưa có Phiếu HS A4 nào để xuất ZIP!', 'warning');
                return Promise.resolve(null);
            }
            if (typeof global.JSZip !== 'function') {
                showToast('Thiếu thư viện JSZip!', 'error');
                return Promise.resolve(null);
            }
            var zip = new global.JSZip();
            return Promise.all(deck.hsSlides.map(function (sl, i) {
                return getSlideDataUrl(sl.id).then(function (url) {
                    var b64 = String(url || '').split(',')[1] || '';
                    var fn = String(i + 1).padStart(2, '0') + '_HS_' + String(sl.title || 'Phieu').replace(/[\\/:*?"<>|]/g, '_') + '.png';
                    zip.file(fn, b64, { base64: true });
                });
            })).then(function () {
                return zip.generateAsync({ type: 'blob' });
            }).then(function (blob) {
                var cleanName = String(deck.name || 'Phieu_HS').replace(/[\\/:*?"<>|]/g, '_') + '_HS_A4.zip';
                var u = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = u; a.download = cleanName;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} }, 3000);
                showToast('Đã xuất ZIP Phiếu HS: ' + cleanName, 'success');
                return cleanName;
            });
        }
        function exportTopicHsPdf(topicId) {
            var list = getLibTopicsList();
            var t = list.find(function (x) { return x && x.id === topicId; });
            if (!t || !Array.isArray(t.hsSlideKeys) || !t.hsSlideKeys.length) return Promise.resolve(null);
            var cleanTitle = stripHsSuffix(t.title || t.subtitle || '') || 'BÀI GIẢNG HÓA HỌC';
            return exportHsSlidesToPdf(t.hsSlideKeys, cleanTitle);
        }
        function openPushDialog() {
            var deck = getActiveDeck();
            if (!deck || (!deck.slides.length && !deck.hsSlides.length)) {
                showToast('Bài giảng chưa có trang GV hoặc HS nào!', 'warning');
                return;
            }
            populateDestPickers();
            var tInp = $('#mm-push-title');
            if (tInp) tInp.value = deck.name || 'Bài giảng Hóa học';
            var bd = $('#mm-push-backdrop');
            if (bd) bd.classList.remove('hidden');
        }
        function closePushDialog() {
            var bd = $('#mm-push-backdrop');
            if (bd) bd.classList.add('hidden');
        }
        function pushDeckToLibrary() {
            var deck = getActiveDeck();
            if (!deck || (!deck.slides.length && !deck.hsSlides.length)) {
                showToast('Bài giảng chưa có slide nào!', 'warning');
                return null;
            }
            var customName = ($('#mm-push-title') && $('#mm-push-title').value.trim()) || deck.name;
            deck.name = customName;
            saveDecksMeta();
            var gVal = ($('#mm-dest-grade') && $('#mm-dest-grade').value) || 'Lớp 12';
            var grade = gVal === 'ALL' ? 'Lớp 12' : gVal;
            var folderId = ($('#mm-dest-folder') && $('#mm-dest-folder').value) || null;
            var now = Date.now();
            var rawMarkdown = ($('#markdown-editor') && $('#markdown-editor').value) ? String($('#markdown-editor').value) : (deck.minMapMarkdown || '');
            var unifiedTopic = {
                id: 'mm_deck_' + deck.id,
                subtitle: '📘 ' + customName,
                title: customName,
                subject: 'Hóa học',
                grade: grade,
                folderId: folderId || null,
                isMinMapDeck: true,
                minMapRole: 'both',
                minMapMarkdown: rawMarkdown,
                minMapSlidesMeta: {
                    slides: deck.slides.map(function (s) { return { id: s.id, title: s.title, w: s.w || 1920, h: s.h || 1080, markdown: s.markdown || '' }; }),
                    hsSlides: deck.hsSlides.map(function (s) { return { id: s.id, title: s.title, w: s.w || 794, h: s.h || 500, markdown: s.markdown || '' }; })
                },
                updatedAt: now,
                hsSlideKeys: deck.hsSlides.map(function (s) {
                    return { id: s.id, title: s.title, w: s.w || 794, h: s.h || 500, dataUrl: s.dataUrl || '', markdown: s.markdown || '' };
                }),
                questions: deck.slides.map(function (sl, i) {
                    return { type: 'mc', obsSlideKey: sl.id, obsSlideData: sl.obsSlideData || '', markdown: sl.markdown || '', q: 'Slide ' + (i + 1) + ': ' + (sl.title || ''), opts: [], ans: '' };
                })
            };
            var createdTopics = [unifiedTopic];
            function compressSlideWebp(dataUrl) {
                if (!dataUrl || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(dataUrl || '');
                if (/^data:image\/webp/i.test(dataUrl)) return Promise.resolve(dataUrl);
                return new Promise(function (resolve) {
                    try {
                        var img = new Image();
                        img.onload = function () {
                            try {
                                var cv = document.createElement('canvas');
                                cv.width = img.naturalWidth || img.width;
                                cv.height = img.naturalHeight || img.height;
                                var ctx = cv.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                var wp = cv.toDataURL('image/webp', 0.90);
                                resolve(wp && wp.indexOf('data:image/webp') === 0 ? wp : dataUrl);
                            } catch (e) { resolve(dataUrl); }
                        };
                        img.onerror = function () { resolve(dataUrl); };
                        img.src = dataUrl;
                    } catch (e) { resolve(dataUrl); }
                });
            }
            var packJobs = [];
            if (unifiedTopic.questions.some(function (q) { return !q.obsSlideData; })) {
                packJobs.push(Promise.all(unifiedTopic.questions.map(function (q) {
                    var p = q.obsSlideData ? Promise.resolve(q.obsSlideData) : getSlideDataUrl(q.obsSlideKey);
                    return p.then(compressSlideWebp);
                })).then(function (urls) {
                    urls.forEach(function (u, idx) {
                        if (u && !unifiedTopic.questions[idx].obsSlideData) unifiedTopic.questions[idx].obsSlideData = u;
                    });
                }));
            }
            if (unifiedTopic.hsSlideKeys.some(function (k) { return !k.dataUrl; })) {
                packJobs.push(Promise.all(unifiedTopic.hsSlideKeys.map(function (k) {
                    var p = k.dataUrl ? Promise.resolve(k.dataUrl) : getSlideDataUrl(k.id);
                    return p.then(compressSlideWebp);
                })).then(function (urls) {
                    urls.forEach(function (u, idx) {
                        if (u && !unifiedTopic.hsSlideKeys[idx].dataUrl) unifiedTopic.hsSlideKeys[idx].dataUrl = u;
                    });
                }));
            }
            Promise.all(packJobs).then(function () {
                if (global.LTDLibBridge && typeof global.LTDLibBridge.upsertTopic === 'function') {
                    createdTopics.forEach(function (tObj) { global.LTDLibBridge.upsertTopic(tObj); });
                } else {
                    var list = getLibTopicsList();
                    createdTopics.forEach(function (tObj) {
                        var idx = list.findIndex(function (t) { return t && t.id === tObj.id; });
                        if (idx >= 0) list[idx] = tObj;
                        else list.push(tObj);
                    });
                    if (!Array.isArray(global.savedTopics)) global.savedTopics = list;
                    try { localStorage.setItem('matrix_quiz_topics_v2', JSON.stringify(list)); } catch (e) {}
                    if (typeof global.renderLibraryList === 'function') try { global.renderLibraryList(); } catch (e) {}
                }
                if (global.GasBridge && typeof global.GasBridge.enqueueTopicSync === 'function') {
                    createdTopics.forEach(function (tObj) { if (tObj && tObj.id) global.GasBridge.enqueueTopicSync(tObj.id); });
                }
                closePushDialog();
                renderDeckDrawer();
                showToast('Đã đẩy 1 thẻ Bài giảng "' + customName + '" (' + deck.slides.length + ' Slide GV · ' + deck.hsSlides.length + ' Phiếu học tập) vào Thư viện!', 'success');
                setStatus('✓ Đã đẩy 1 thẻ Bài giảng vào Thư viện: Hóa học • ' + grade);
            });
            return createdTopics;
        }
        function openFromTopic(topicId) {
            var list = getLibTopicsList();
            var t = list.find(function (x) { return x && String(x.id) === String(topicId); });
            open();
            var ed = $('#markdown-editor');
            if (!t || (!t.minMapMarkdown && !(t.minMapSlidesMeta && (t.minMapSlidesMeta.slides || t.minMapSlidesMeta.hsSlides)))) {
                showToast('Đề này chưa có mã Markdown gốc để dựng lại!', 'warning');
                return false;
            }
            var firstMd = t.minMapMarkdown || '';
            var d = getActiveDeck();
            if (d) {
                d.minMapMarkdown = String(firstMd);
                if (t.title) d.name = String(t.title).replace(/\s*[—-]\s*(Slide GV|Phiếu học tập)\s*$/i, '').trim() || d.name;
                var restoreJobs = [];
                if (Array.isArray(t.questions) && t.questions.length) {
                    d.slides = t.questions.map(function (q, idx) {
                        var meta = (t.minMapSlidesMeta && Array.isArray(t.minMapSlidesMeta.slides) && t.minMapSlidesMeta.slides[idx]) || {};
                        var sid = q.obsSlideKey || meta.id || ('mmsl_r_' + idx + '_' + Date.now());
                        if (q.obsSlideData) restoreJobs.push(putSlideDataUrl(sid, q.obsSlideData));
                        return { id: sid, title: meta.title || String(q.q || '').replace(/^Slide\s+\d+:\s*/i, '') || ('Trang ' + (idx + 1)), w: meta.w || 1920, h: meta.h || 1080, markdown: q.markdown || meta.markdown || firstMd };
                    });
                }
                if (Array.isArray(t.hsSlideKeys) && t.hsSlideKeys.length) {
                    d.hsSlides = t.hsSlideKeys.map(function (k, idx) {
                        var meta = (t.minMapSlidesMeta && Array.isArray(t.minMapSlidesMeta.hsSlides) && t.minMapSlidesMeta.hsSlides[idx]) || {};
                        var hid = k.id || meta.id || ('mmhs_r_' + idx + '_' + Date.now());
                        if (k.dataUrl) restoreJobs.push(putSlideDataUrl(hid, k.dataUrl));
                        return { id: hid, title: k.title || meta.title || ('Phiếu ' + (idx + 1)), w: k.w || meta.w || 794, h: k.h || meta.h || 500, markdown: k.markdown || meta.markdown || firstMd };
                    });
                }
                Promise.all(restoreJobs).then(function () {
                    saveDecksMeta();
                    renderDeckDrawer();
                });
                saveDecksMeta();
                renderDeckDrawer();
            }
            if (ed && firstMd) {
                ed.value = String(firstMd);
                try { ed.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
            }
            renderAll();
            setStatus('✓ Đã nạp lại đầy đủ Bài giảng "' + (t.title || 'Bài giảng') + '"');
            showToast('Đã khôi phục đầy đủ Bài giảng "' + (t.title || 'Bài giảng') + '"!', 'success');
            return true;
        }
        global.LTDMinMapObsStore = {
            getSlideDataUrl: getSlideDataUrl,
            saveCurrentSlideToObsDeck: saveCurrentSlideToObsDeck,
            pushDeckToLibrary: pushDeckToLibrary,
            openFromTopic: openFromTopic,
            exportGvDeckZip: exportGvDeckZip,
            exportHsSlidesToPdf: exportHsSlidesToPdf,
            exportTopicHsPdf: exportTopicHsPdf,
            stripHsSuffix: stripHsSuffix,
            packSlidesIntoA4Pages: packSlidesIntoA4Pages,
            buildA4PdfBytesFromJpegs: buildA4PdfBytesFromJpegs,
            getDecks: function () { return loadDecksMeta(); }
        };

        $('#vp-save-obs-deck').addEventListener('click', function () { saveCurrentSlideToObsDeck(false); });
        if ($('#vp-save-new-obs')) {
            $('#vp-save-new-obs').addEventListener('click', function () { saveCurrentSlideToObsDeck(true); });
        }
        $('#vp-open-obs-deck').addEventListener('click', function () {
            var dr = $('#mm-deck-drawer');
            if (!dr) return;
            dr.classList.toggle('hidden');
            if (!dr.classList.contains('hidden')) renderDeckDrawer();
        });
        $('#mm-deck-close').addEventListener('click', function () {
            var dr = $('#mm-deck-drawer'); if (dr) dr.classList.add('hidden');
        });
        if ($('#mm-deck-expand')) {
            $('#mm-deck-expand').addEventListener('click', function () {
                var dr = $('#mm-deck-drawer');
                if (!dr) return;
                dr.classList.toggle('expanded');
                this.textContent = dr.classList.contains('expanded') ? '⤡' : '⤢';
            });
        }
        $('#mm-deck-select').addEventListener('change', function (e) { _deckState.activeId = e.target.value; renderDeckDrawer(); });
        $('#mm-tab-gv').addEventListener('click', function () { _deckState.viewTab = 'gv'; renderDeckDrawer(); });
        $('#mm-tab-hs').addEventListener('click', function () { _deckState.viewTab = 'hs'; renderDeckDrawer(); });
        if ($('#mm-deck-push-drive')) {
            $('#mm-deck-push-drive').addEventListener('click', function () {
                if (!global.GasBridge || !global.GasBridge.isGasEnabled || !global.GasBridge.isGasEnabled() || typeof global.GasBridge.pushMinMapDraftsToDrive !== 'function') {
                    showToast('Cần kết nối GAS #1 để đẩy lên Drive!', 'error');
                    return;
                }
                var activeDk = getActiveDeck();
                var dName = (activeDk && activeDk.name) ? activeDk.name : 'Bài giảng';
                if (typeof global.confirm === 'function' && !global.confirm('Đẩy bài giảng "' + dName + '" lên Google Drive (tự ghi đè nếu đã có bài cùng tên, giữ nguyên các bài khác)?')) return;
                var stEl = $('#mm-deck-sync-status');
                if (stEl) { stEl.style.color = '#93c5fd'; stEl.textContent = '⏳ Đang đẩy "' + dName + '" lên Drive...'; }
                var meta = { activeId: activeDk.id, decks: [activeDk] };
                global.GasBridge.pushMinMapDraftsToDrive(meta, getSlideDataUrl, function (p) {
                    if (stEl && p) stEl.textContent = '⏳ Ảnh: ' + (p.done || 0) + '/' + (p.total || 0) + (p.skipped ? (' (bỏ qua ' + p.skipped + ' ảnh cũ)') : '') + '...';
                }).then(function (r) {
                    if (r && r.ok) {
                        var skipTxt = r.skippedImages ? (' · bỏ qua ' + r.skippedImages + ' ảnh cũ') : '';
                        if (stEl) { stEl.style.color = '#6ee7b7'; stEl.textContent = '✅ Đã đẩy "' + dName + '" (' + (r.imageCount || 0) + ' ảnh mới' + skipTxt + ')!'; }
                        showToast('Đã đẩy bài giảng "' + dName + '" lên Drive!', 'success');
                    } else {
                        if (stEl) { stEl.style.color = '#fca5a5'; stEl.textContent = '⚠️ ' + ((r && r.error) || 'Lỗi đẩy Drive'); }
                    }
                });
            });
        }
        function normDeckTitle(n) {
            if (global.GasBridge && typeof global.GasBridge.normalizeDeckName === 'function') {
                return global.GasBridge.normalizeDeckName(n);
            }
            return String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
        }
        function mergePulledDecksIntoLocal(pulledDecks, opts) {
            if (!Array.isArray(pulledDecks) || !pulledDecks.length) return;
            var replaceOnly = !!(opts && opts.replaceOnly);
            var pulledIds = {};
            if (replaceOnly) {
                _deckState.decks = [];
                _memSlideMap = {};
            } else {
                _deckState.decks = (_deckState.decks || []).filter(function (d) {
                    if (!d) return false;
                    var gvLen = Array.isArray(d.slides) ? d.slides.length : 0;
                    var hsLen = Array.isArray(d.hsSlides) ? d.hsSlides.length : 0;
                    return gvLen > 0 || hsLen > 0;
                });
            }
            pulledDecks.forEach(function (dk) {
                if (!dk || !dk.id) return;
                pulledIds[String(dk.id)] = true;
                var nName = normDeckTitle(dk.name || 'Bài giảng');
                var oldList = [];
                _deckState.decks = _deckState.decks.filter(function (ex) {
                    if (ex && (String(ex.id) === String(dk.id) || normDeckTitle(ex.name) === nName)) {
                        oldList.push(ex);
                        return false;
                    }
                    return true;
                });
                var newSlides = Array.isArray(dk.slides) ? dk.slides : [];
                var newHsSlides = Array.isArray(dk.hsSlides) ? dk.hsSlides : [];
                var keepIds = {};
                newSlides.concat(newHsSlides).forEach(function (s) { if (s && s.id) keepIds[s.id] = true; });
                oldList.forEach(function (oldDk) {
                    (oldDk.slides || []).concat(oldDk.hsSlides || []).forEach(function (os) {
                        if (os && os.id && !keepIds[os.id]) {
                            delete _memSlideMap[os.id];
                            deleteSlideDataUrl(os.id);
                        }
                    });
                });
                _deckState.decks.push({
                    id: String(dk.id),
                    name: String(dk.name || 'Bài giảng'),
                    grade: String(dk.grade || ''),
                    minMapMarkdown: String(dk.minMapMarkdown || ''),
                    updatedAt: Number(dk.updatedAt || Date.now()),
                    slides: newSlides,
                    hsSlides: newHsSlides
                });
                _deckState.activeId = String(dk.id);
            });
            saveDecksMeta();
            renderDeckDrawer();
        }
        function openPullPickerDialog(remoteDecks) {
            var oldDlg = $('#mm-pull-picker-modal');
            if (oldDlg && oldDlg.parentNode) oldDlg.parentNode.removeChild(oldDlg);
            var localDecks = loadDecksMeta();
            var localByNorm = {};
            localDecks.forEach(function (ld) { if (ld && ld.name) localByNorm[normDeckTitle(ld.name)] = true; });
            var dlg = document.createElement('div');
            dlg.id = 'mm-pull-picker-modal';
            dlg.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(2,6,23,.72);display:flex;align-items:center;justify-content:center;padding:16px;';
            var rowsHtml = remoteDecks.map(function (dk, idx) {
                var isDup = !!localByNorm[normDeckTitle(dk.name)];
                var cnt = Number(dk.slideCount != null ? dk.slideCount : 0);
                var hsCnt = Number(dk.hsSlideCount != null ? dk.hsSlideCount : 0);
                var ts = dk.updatedAt ? new Date(dk.updatedAt).toLocaleString('vi-VN') : 'Chưa rõ';
                var badge = isDup ? '<span style="background:#b45309;color:#fef3c7;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;margin-left:6px;">Trùng tên · Ghi đè</span>' : '<span style="background:#065f46;color:#d1fae5;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;margin-left:6px;">Mới</span>';
                return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:#1e293b;border:1px solid #334155;">' +
                    '<label style="display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0;cursor:pointer;">' +
                    '<input type="checkbox" class="mm-pull-chk" value="' + escapeHtml(dk.id) + '" style="margin-top:3px;width:16px;height:16px;">' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:13px;font-weight:700;color:#f8fafc;word-break:break-word;">' + escapeHtml(dk.name || 'Bài giảng') + badge + '</div>' +
                    '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Slide GV: ' + cnt + ' · Phiếu HS: ' + hsCnt + ' · Cập nhật: ' + escapeHtml(ts) + '</div>' +
                    '</div></label>' +
                    '<button type="button" class="vp-btn-sm mm-pull-del-one" data-deck-id="' + escapeHtml(dk.id) + '" data-deck-name="' + escapeHtml(dk.name || 'Bài giảng') + '" title="Xóa bài giảng này khỏi Drive" style="background:#7f1d1d;border-color:#ef4444;color:#fecaca;flex-shrink:0;">🗑</button>' +
                    '</div>';
            }).join('');
            dlg.innerHTML = '<div style="width:min(540px,96vw);max-height:84vh;background:#0f172a;border:1px solid #334155;border-radius:14px;padding:16px;color:#f8fafc;display:flex;flex-direction:column;gap:10px;box-shadow:0 24px 60px rgba(0,0,0,.6);">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
                '<div style="font-size:15px;font-weight:800;color:#38bdf8;">⬇️ Chọn bài giảng kéo từ Google Drive</div>' +
                '<button type="button" id="mm-pull-close-x" class="vp-btn-sm">✕</button></div>' +
                '<div style="font-size:12px;color:#cbd5e1;">Tick chọn bài giảng cần kéo về soạn tiếp. Các bài giảng tên khác đang soạn trên máy được giữ nguyên 100%.</div>' +
                '<div style="display:flex;gap:8px;"><button type="button" id="mm-pull-sel-all" class="vp-btn-sm">✓ Chọn tất cả</button><button type="button" id="mm-pull-sel-none" class="vp-btn-sm">Bỏ chọn</button></div>' +
                '<div id="mm-pull-list" style="display:flex;flex-direction:column;gap:8px;overflow:auto;max-height:48vh;padding-right:4px;">' + rowsHtml + '</div>' +
                '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#fbbf24;font-weight:700;cursor:pointer;padding:6px 8px;border-radius:8px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);"><input type="checkbox" id="mm-pull-replace-only" style="width:15px;height:15px;"> Chỉ giữ bài được chọn (dọn sạch các bài cũ khác trên máy)</label><div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;margin-top:4px;">' +
                '<button type="button" id="mm-pull-del-selected" class="vp-btn-sm" style="background:#991b1b;border-color:#ef4444;color:#fee2e2;margin-right:auto;">🗑 Xóa mục đã chọn trên Drive</button>' +
                '<button type="button" id="mm-pull-cancel" class="vp-btn-sm">Hủy</button>' +
                '<button type="button" id="mm-pull-confirm" class="vp-btn-sm accent">⬇️ Kéo bài đã chọn</button></div></div>';
            modalEl.appendChild(dlg);
            function closeDlg() { if (dlg && dlg.parentNode) dlg.parentNode.removeChild(dlg); }
            dlg.querySelector('#mm-pull-close-x').addEventListener('click', closeDlg);
            dlg.querySelector('#mm-pull-cancel').addEventListener('click', closeDlg);
            dlg.querySelector('#mm-pull-sel-all').addEventListener('click', function () {
                Array.prototype.slice.call(dlg.querySelectorAll('.mm-pull-chk')).forEach(function (c) { c.checked = true; });
            });
            dlg.querySelector('#mm-pull-sel-none').addEventListener('click', function () {
                Array.prototype.slice.call(dlg.querySelectorAll('.mm-pull-chk')).forEach(function (c) { c.checked = false; });
            });
            function handleDeleteDriveDecks(ids, labelText) {
                if (!ids || !ids.length) {
                    showToast('Hãy chọn ít nhất 1 bài giảng trên Drive để xóa.', 'warning');
                    return;
                }
                if (!global.GasBridge || typeof global.GasBridge.deleteMinMapDraftsFromDrive !== 'function') {
                    showToast('Thiếu kết nối xóa Drive (GasBridge.deleteMinMapDraftsFromDrive).', 'error');
                    return;
                }
                var okConfirm = typeof global.confirm === 'function'
                    ? global.confirm('Xóa ' + labelText + ' khỏi Google Drive?\n(Chỉ xóa bản trên Drive, bài giảng đang lưu trên máy này vẫn được giữ nguyên 100%)')
                    : true;
                if (!okConfirm) return;
                var stEl = $('#mm-deck-sync-status');
                if (stEl) { stEl.style.color = '#fca5a5'; stEl.textContent = '⏳ Đang xóa khỏi Drive...'; }
                global.GasBridge.deleteMinMapDraftsFromDrive(ids).then(function (r) {
                    if (r && r.ok) {
                        var delCnt = Number(r.deletedCount || ids.length);
                        if (stEl) { stEl.style.color = '#6ee7b7'; stEl.textContent = '✅ Đã xóa ' + delCnt + ' bài giảng khỏi Drive!'; }
                        showToast('Đã xóa ' + delCnt + ' bài giảng khỏi Drive!', 'success');
                        if (Array.isArray(r.remainingDecks) && r.remainingDecks.length) {
                            openPullPickerDialog(r.remainingDecks);
                        } else {
                            closeDlg();
                        }
                    } else {
                        var errMsg = (r && r.error) || 'Không xóa được bài giảng trên Drive';
                        if (stEl) { stEl.style.color = '#fca5a5'; stEl.textContent = '⚠️ ' + errMsg; }
                        showToast(errMsg, 'error');
                    }
                });
            }
            Array.prototype.slice.call(dlg.querySelectorAll('.mm-pull-del-one')).forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var did = btn.getAttribute('data-deck-id');
                    var dname = btn.getAttribute('data-deck-name') || 'bài giảng này';
                    if (did) handleDeleteDriveDecks([did], 'bài giảng "' + dname + '"');
                });
            });
            dlg.querySelector('#mm-pull-del-selected').addEventListener('click', function () {
                var selectedIds = Array.prototype.slice.call(dlg.querySelectorAll('.mm-pull-chk'))
                    .filter(function (c) { return c.checked; })
                    .map(function (c) { return c.value || (c.getAttribute ? c.getAttribute('value') : ''); });
                handleDeleteDriveDecks(selectedIds, selectedIds.length + ' bài giảng đã chọn');
            });
            dlg.querySelector('#mm-pull-confirm').addEventListener('click', function () {
                var selectedIds = Array.prototype.slice.call(dlg.querySelectorAll('.mm-pull-chk'))
                    .filter(function (c) { return c.checked; })
                    .map(function (c) { return c.value || (c.getAttribute ? c.getAttribute('value') : ''); });
                if (!selectedIds.length) {
                    showToast('Hãy tick chọn ít nhất 1 bài giảng để kéo.', 'warning');
                    return;
                }
                closeDlg();
                var stEl = $('#mm-deck-sync-status');
                if (stEl) { stEl.style.color = '#93c5fd'; stEl.textContent = '⏳ Đang kéo ' + selectedIds.length + ' bài giảng từ Drive...'; }
                global.GasBridge.pullMinMapDraftsFromDrive(putSlideDataUrl, function (p) {
                    if (stEl && p) stEl.textContent = '⏳ Đang tải ảnh: ' + (p.done || 0) + '/' + (p.total || 0) + '...';
                }, selectedIds).then(function (r) {
                    if (r && r.ok && r.data && Array.isArray(r.data.decks) && r.data.decks.length) {
                        var repChk = dlg.querySelector('#mm-pull-replace-only'); mergePulledDecksIntoLocal(r.data.decks, { replaceOnly: !!(repChk && repChk.checked) });
                        if (stEl) { stEl.style.color = '#6ee7b7'; stEl.textContent = '✅ Đã kéo ' + (r.deckCount || 0) + ' bài & ' + (r.imageCount || 0) + ' ảnh về máy!'; }
                        showToast('Đã kéo bài giảng về soạn tiếp!', 'success');
                    } else {
                        if (stEl) { stEl.style.color = '#fca5a5'; stEl.textContent = '⚠️ ' + ((r && r.error) || 'Không tải được bài giảng'); }
                    }
                });
            });
        }
        if (modalEl) modalEl._mergePulledDecksIntoLocal = mergePulledDecksIntoLocal;
        if ($('#mm-deck-pull-drive')) {
            $('#mm-deck-pull-drive').addEventListener('click', function () {
                if (!global.GasBridge || !global.GasBridge.isGasEnabled || !global.GasBridge.isGasEnabled() || typeof global.GasBridge.listMinMapDraftsFromDrive !== 'function') {
                    showToast('Cần kết nối GAS #1 để kéo từ Drive!', 'error');
                    return;
                }
                var stEl = $('#mm-deck-sync-status');
                if (stEl) { stEl.style.color = '#93c5fd'; stEl.textContent = '⏳ Đang đọc danh sách bài giảng trên Drive...'; }
                global.GasBridge.listMinMapDraftsFromDrive().then(function (res) {
                    if (!res || !res.ok || !Array.isArray(res.decks) || !res.decks.length) {
                        if (stEl) { stEl.style.color = '#fca5a5'; stEl.textContent = '⚠️ ' + ((res && res.error) || 'Chưa có bài giảng nào trên Drive'); }
                        return;
                    }
                    if (stEl) { stEl.style.color = '#93c5fd'; stEl.textContent = '✓ Có ' + res.decks.length + ' bài giảng trên Drive. Hãy tick chọn!'; }
                    openPullPickerDialog(res.decks);
                });
            });
        }
        $('#mm-export-hs-pdf').addEventListener('click', function () { var d = getActiveDeck(); exportHsSlidesToPdf(d.hsSlides, d.name); });
        $('#mm-export-gv-zip').addEventListener('click', exportGvDeckZip);
        $('#mm-export-hs-zip').addEventListener('click', exportHsDeckZip);
        $('#mm-dest-grade').addEventListener('change', populateDestPickers);
        $('#mm-dest-folder-q').addEventListener('input', populateDestPickers);
        var _chipsBox = $('#mm-dest-folder-chips');
        if (_chipsBox) {
            _chipsBox.addEventListener('click', function (e) {
                var btn = e.target && e.target.closest ? e.target.closest('button[data-fid]') : null;
                if (!btn) return;
                var fid = btn.getAttribute('data-fid') || '';
                var sel = $('#mm-dest-folder');
                if (sel) sel.value = fid;
                var allBtns = _chipsBox.querySelectorAll('button[data-fid]');
                for (var i = 0; i < allBtns.length; i++) {
                    var act = allBtns[i].getAttribute('data-fid') === fid;
                    allBtns[i].classList.toggle('active', act);
                    var sp = allBtns[i].querySelectorAll('span');
                    if (sp.length > 1) sp[1].textContent = act ? '✓' : '';
                }
            });
        }
        $('#mm-dest-folder').addEventListener('change', function (e) {
            var sel = e.target;
            var opt = sel.options && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
            sel.title = opt ? (opt.title || opt.textContent || '') : '';
        });
        $('#mm-deck-new').addEventListener('click', function () {
            var nm = typeof global.prompt === 'function' ? global.prompt('Nhập tên Bài giảng mới:', 'Bài giảng Quy tắc Octet') : 'Bài giảng mới';
            if (!nm || !nm.trim()) return;
            var nd = { id: 'deck_' + Date.now(), name: nm.trim(), slides: [], hsSlides: [] };
            _deckState.decks.push(nd);
            _deckState.activeId = nd.id;
            saveDecksMeta(); renderDeckDrawer();
        });
        $('#mm-deck-rename').addEventListener('click', function () {
            var d = getActiveDeck();
            var nm = typeof global.prompt === 'function' ? global.prompt('Đổi tên Bài giảng:', d.name) : d.name;
            if (!nm || !nm.trim()) return;
            d.name = nm.trim(); saveDecksMeta(); renderDeckDrawer();
        });
        $('#mm-deck-del').addEventListener('click', function () {
            if (_deckState.decks.length <= 1) { getActiveDeck().slides = []; getActiveDeck().hsSlides = []; saveDecksMeta(); renderDeckDrawer(); return; }
            _deckState.decks = _deckState.decks.filter(function (x) { return x.id !== _deckState.activeId; });
            _deckState.activeId = _deckState.decks[0].id;
            saveDecksMeta(); renderDeckDrawer();
        });
        $('#mm-deck-slides').addEventListener('click', function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
            if (!btn) {
                var item = e.target && e.target.closest ? e.target.closest('.mm-deck-item[data-sidx]') : null;
                if (!item) return;
                var sIdx = parseInt(item.getAttribute('data-sidx'), 10);
                var dk = getActiveDeck();
                var listArr = dk ? (_deckState.viewTab === 'hs' ? dk.hsSlides : dk.slides) : null;
                var sl = listArr && !isNaN(sIdx) ? listArr[sIdx] : null;
                if (sl) {
                    _editingSlideIdx = sIdx;
                    if (sl.markdown) {
                        hideLegacyImagePreview();
                        var ed = $('#markdown-editor');
                        if (ed) {
                            ed.value = String(sl.markdown);
                            try { ed.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {}
                        }
                        if (sl.settings) applyPageSettings(sl.settings);
                        renderAll();
                        renderDeckDrawer();
                        showToast('Đang sửa trang #' + (sIdx + 1) + ': "' + (sl.title || 'Trang') + '" (đã giữ 100% thiết lập)', 'info');
                    } else {
                        if (sl.settings) applyPageSettings(sl.settings);
                        renderAll();
                        renderDeckDrawer();
                        showLegacyImagePreview(sl, sIdx);
                    }
                }
                return;
            }
            var act = btn.getAttribute('data-act');
            var idx = parseInt(btn.getAttribute('data-idx'), 10);
            var d = getActiveDeck();
            var arr = d ? (_deckState.viewTab === 'hs' ? d.hsSlides : d.slides) : null;
            if (!arr || isNaN(idx)) return;
            if (act === 'up' && idx > 0) {
                var t1 = arr[idx]; arr[idx] = arr[idx - 1]; arr[idx - 1] = t1;
                if (_editingSlideIdx === idx) _editingSlideIdx = idx - 1;
                else if (_editingSlideIdx === idx - 1) _editingSlideIdx = idx;
            }
            else if (act === 'dn' && idx < arr.length - 1) {
                var t2 = arr[idx]; arr[idx] = arr[idx + 1]; arr[idx + 1] = t2;
                if (_editingSlideIdx === idx) _editingSlideIdx = idx + 1;
                else if (_editingSlideIdx === idx + 1) _editingSlideIdx = idx;
            }
            else if (act === 'del') {
                var targetSlide = arr[idx];
                var deletedIds = [];
                if (targetSlide && targetSlide.pairId) {
                    var pid = targetSlide.pairId;
                    var curEditSlide = (_editingSlideIdx >= 0 && d.slides[_editingSlideIdx]) ? d.slides[_editingSlideIdx] : null;
                    if (curEditSlide && curEditSlide.pairId === pid) {
                        _editingSlideIdx = -1;
                    } else if (_editingSlideIdx > 0) {
                        var shiftCnt = 0;
                        for (var si = 0; si < _editingSlideIdx; si++) {
                            if (d.slides[si] && d.slides[si].pairId === pid) shiftCnt++;
                        }
                        _editingSlideIdx -= shiftCnt;
                    }
                    d.slides = d.slides.filter(function (s) {
                        if (s && s.pairId === pid) {
                            if (s.id) deletedIds.push(s.id);
                            return false;
                        }
                        return true;
                    });
                    d.hsSlides = d.hsSlides.filter(function (s) {
                        if (s && s.pairId === pid) {
                            if (s.id) deletedIds.push(s.id);
                            return false;
                        }
                        return true;
                    });
                } else {
                    if (targetSlide && targetSlide.id) deletedIds.push(targetSlide.id);
                    arr.splice(idx, 1);
                    if (_deckState.viewTab !== 'hs') {
                        if (_editingSlideIdx === idx) _editingSlideIdx = -1;
                        else if (_editingSlideIdx > idx) _editingSlideIdx--;
                    }
                }
                deletedIds.forEach(function (id) { deleteSlideDataUrl(id); });
            }
            saveDecksMeta(); renderDeckDrawer();
        });
        var _dragSlideIdx = -1;
        $('#mm-deck-slides').addEventListener('dragstart', function (e) {
            var it = e.target && e.target.closest ? e.target.closest('.mm-deck-item') : null;
            if (it) _dragSlideIdx = parseInt(it.getAttribute('data-sidx'), 10);
        });
        $('#mm-deck-slides').addEventListener('dragover', function (e) { if (_dragSlideIdx >= 0) e.preventDefault(); });
        $('#mm-deck-slides').addEventListener('drop', function (e) {
            var it = e.target && e.target.closest ? e.target.closest('.mm-deck-item') : null;
            if (!it || _dragSlideIdx < 0) return;
            var toIdx = parseInt(it.getAttribute('data-sidx'), 10);
            var d = getActiveDeck();
            var arr = d ? (_deckState.viewTab === 'hs' ? d.hsSlides : d.slides) : null;
            if (!isNaN(toIdx) && arr && toIdx !== _dragSlideIdx) {
                var moved = arr.splice(_dragSlideIdx, 1)[0];
                arr.splice(toIdx, 0, moved);
                saveDecksMeta(); renderDeckDrawer();
            }
            _dragSlideIdx = -1;
        });
        $('#mm-push-lib-btn').addEventListener('click', openPushDialog);

        function cleanMinMapHighlight(txt) {
            return String(txt || '').replace(/==/g, '').replace(/\s+/g, ' ').trim();
        }
        function extractTfQuestionsFromDeck(deck, fallbackMarkdown) {
            var out = [];
            var seenPairs = {};
            var seenMd = {};
            var qCounter = 0;
            function collectFromMd(mdText) {
                if (!mdText || !String(mdText).trim()) return;
                var model = parseInput(mdText);
                if (!model || !model.isExam || !Array.isArray(model.cards)) return;
                model.cards.forEach(function (card) {
                    if (!card || card.type !== 'exam' || !Array.isArray(card.lines)) return;
                    var opts = card.lines.filter(function (l) { return l && l.isOpt; });
                    if (!opts.length) return;
                    qCounter++;
                    out.push({
                        id: 'q_mmtf_' + Date.now() + '_' + qCounter,
                        type: 'tf',
                        text: cleanMinMapHighlight(card.stem || card.title || 'Xét các phát biểu sau:'),
                        options: opts.map(function (o) {
                            return { letter: String(o.letter || 'a').toLowerCase(), text: cleanMinMapHighlight(o.text) };
                        }),
                        tfAnswers: opts.map(function (o) { return !!o.ok; })
                    });
                });
            }
            var slides = (deck && Array.isArray(deck.slides)) ? deck.slides : [];
            slides.forEach(function (sl) {
                if (!sl || !sl.markdown) return;
                if (sl.pairId) {
                    if (seenPairs[sl.pairId]) return;
                    seenPairs[sl.pairId] = true;
                } else {
                    var mdKey = String(sl.markdown).trim();
                    if (seenMd[mdKey]) return;
                    seenMd[mdKey] = true;
                }
                collectFromMd(sl.markdown);
            });
            if (!out.length && fallbackMarkdown) {
                collectFromMd(fallbackMarkdown);
            }
            return out;
        }
        function openExtractTfGameDialog() {
            var deck = getActiveDeck();
            var edEl = $('#markdown-editor');
            var qs = extractTfQuestionsFromDeck(deck, edEl ? edEl.value : '');
            if (!qs.length) {
                showToast('Bài giảng này chưa có trang câu hỏi Đúng/Sai (Câu 1... *a) b)...).', 'warning');
                return;
            }
            var oldDlg = $('#mm-tf-extract-modal');
            if (oldDlg && oldDlg.parentNode) oldDlg.parentNode.removeChild(oldDlg);
            var folders = (global.LTDLibBridge && typeof global.LTDLibBridge.getFolders === 'function')
                ? (global.LTDLibBridge.getFolders() || [])
                : [];
            var folderOpts = '<option value="">-- Gốc môn Hóa học --</option>' + folders.map(function (f) {
                if (!f || !f.id || f.parentId === '__subj_meta__') return '';
                return '<option value="' + escapeHtml(f.id) + '" data-subj="' + escapeHtml(f.subject || 'hoa') + '">' + escapeHtml(f.name || 'Thư mục') + '</option>';
            }).join('');
            var defTitle = ((deck && deck.name) ? deck.name : 'Bài giảng MinMap') + ' - Đúng/Sai';
            var dlg = document.createElement('div');
            dlg.id = 'mm-tf-extract-modal';
            dlg.style.cssText = 'position:fixed;inset:0;z-index:10055;background:rgba(2,6,23,.72);display:flex;align-items:center;justify-content:center;padding:16px;';
            dlg.innerHTML = '<div style="width:min(460px,95vw);background:#0f172a;border:1px solid #334155;border-radius:14px;padding:16px;color:#f8fafc;display:flex;flex-direction:column;gap:10px;box-shadow:0 24px 60px rgba(0,0,0,.6);">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;"><strong style="font-size:15px;color:#f472b6;">🎮 Tách câu Đúng/Sai chơi trực tiếp</strong><button type="button" id="mm-tf-close-x" class="vp-btn-sm">✕</button></div>' +
                '<div style="font-size:12.5px;color:#cbd5e1;">Đã trích xuất được <b style="color:#fde047;">' + qs.length + ' câu Đúng/Sai</b> (đã tự động lọc trùng bản Đề/Đáp án).</div>' +
                '<div class="mm-deck-field"><span>Tên đề:</span><input type="text" id="mm-tf-title" class="mm-deck-sel" value="' + escapeHtml(defTitle) + '"></div>' +
                '<div class="mm-deck-field"><span>Lưu vào:</span><select id="mm-tf-folder" class="mm-deck-sel">' + folderOpts + '</select></div>' +
                '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">' +
                '<button type="button" id="mm-tf-cancel" class="vp-btn-sm">Hủy</button>' +
                '<button type="button" id="mm-tf-confirm" class="vp-btn-sm accent" style="background:#db2777;border-color:#f472b6;">🎮 Lưu &amp; Chơi trực tiếp ngay</button>' +
                '</div></div>';
            modalEl.appendChild(dlg);
            function closeTfDlg() { if (dlg && dlg.parentNode) dlg.parentNode.removeChild(dlg); }
            dlg.querySelector('#mm-tf-close-x').addEventListener('click', closeTfDlg);
            dlg.querySelector('#mm-tf-cancel').addEventListener('click', closeTfDlg);
            dlg.querySelector('#mm-tf-confirm').addEventListener('click', function () {
                var titleInp = dlg.querySelector('#mm-tf-title');
                var folderSel = dlg.querySelector('#mm-tf-folder');
                var tName = (titleInp && titleInp.value ? titleInp.value.trim() : '') || defTitle;
                var fId = folderSel ? (folderSel.value || '') : '';
                var subj = 'hoa';
                if (fId && folders.length) {
                    var mf = folders.find(function (x) { return x && x.id === fId; });
                    if (mf && mf.subject) subj = mf.subject;
                }
                var now = Date.now();
                var newTopic = {
                    id: 'mm_tf_' + now,
                    title: tName,
                    subtitle: tName,
                    subject: subj,
                    folderId: fId || null,
                    grade: 'ALL',
                    isPublished: false,
                    questions: qs,
                    createdAt: now,
                    updatedAt: now
                };
                if (global.LTDLibBridge && typeof global.LTDLibBridge.upsertTopic === 'function') {
                    global.LTDLibBridge.upsertTopic(newTopic);
                } else if (Array.isArray(global.savedTopics)) {
                    global.savedTopics.push(newTopic);
                    if (typeof global.saveToStorage === 'function') global.saveToStorage();
                    if (typeof global.renderLibraryList === 'function') global.renderLibraryList();
                }
                closeTfDlg();
                close();
                showToast('Đã tạo đề "' + tName + '" (' + qs.length + ' câu Đúng/Sai)!', 'success');
                if (global.LV && typeof global.LV.open === 'function') {
                    global.LV.open(newTopic.id);
                } else if (typeof global.loadTopic === 'function') {
                    global.loadTopic(newTopic.id);
                }
            });
        }
        if ($('#mm-extract-tf-game')) {
            $('#mm-extract-tf-game').addEventListener('click', openExtractTfGameDialog);
        }
        if (global.LTDMinMap) global.LTDMinMap.extractTfQuestionsFromDeck = extractTfQuestionsFromDeck;
        $('#mm-push-cancel').addEventListener('click', closePushDialog);
        $('#mm-push-cancel-btn').addEventListener('click', closePushDialog);
        $('#mm-push-confirm-btn').addEventListener('click', pushDeckToLibrary);
        renderDeckDrawer();

        function toggleJustifyAtCursor(e) {
            var target = (e && e.target && e.target !== document) ? e.target : document.activeElement;
            var lineEl = target && target.closest ? target.closest('.vp-line[data-row], .vp-box-title[data-row], .mm-tf-txt[data-row]') : null;
            var rowIdx = -1;
            var onTeacherStage = !!(lineEl && lineEl.closest && lineEl.closest('#mm-teacher-stage-inner'));
            if (lineEl) {
                rowIdx = parseInt(lineEl.getAttribute('data-row'), 10);
            } else if (target === ed || document.activeElement === ed) {
                var pos = ed.selectionStart || 0;
                rowIdx = (ed.value || '').slice(0, pos).split('\n').length - 1;
            } else if (state.tab === 'teacher' && state.selectedTeacherRow !== null && !isNaN(state.selectedTeacherRow)) {
                rowIdx = state.selectedTeacherRow;
            }
            if (isNaN(rowIdx) || rowIdx < 0) return;
            var isStuTarget = (lineEl && lineEl.closest && !!lineEl.closest('#mm-student-stage-inner')) || (!lineEl && state.tab === 'student');
            if (isStuTarget) {
                var nextStu = (state.studentLineAligns && state.studentLineAligns[rowIdx] === 'justify') ? '' : 'justify';
                if (!state.studentLineAligns) state.studentLineAligns = {};
                state.studentLineAligns[rowIdx] = nextStu;
                if (lineEl) {
                    var boxRowStu = lineEl.classList.contains('mm-tf-txt') && lineEl.closest ? (lineEl.closest('.mm-tf-row') || lineEl) : lineEl;
                    boxRowStu.classList.toggle('mm-justify', nextStu === 'justify');
                } else {
                    renderStage(true);
                    fitStage();
                }
                return;
            }
            var curAl = state.lineAligns[rowIdx] || 'justify';
            var nextAl = (curAl === 'justify') ? 'left' : 'justify';
            if (modalEl && typeof modalEl._applyTeacherAlignRow === 'function') {
                modalEl._applyTeacherAlignRow(rowIdx, nextAl, onTeacherStage);
            }
        }
        document.addEventListener('keydown', function (e) {
            if (!modalEl || modalEl.classList.contains('hidden')) return;
            if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key && e.key.toLowerCase() === 'j') {
                e.preventDefault();
                e.stopPropagation();
                toggleJustifyAtCursor(e);
            }
        }, true);

        modalEl.addEventListener('paste', function (e) {
            var cb = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
            if (!cb || !cb.items) return;
            for (var i = 0; i < cb.items.length; i++) {
                if (cb.items[i].type && cb.items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    var file = cb.items[i].getAsFile();
                    if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        state.branchImages[state.selectedBranch] = { src: ev.target.result, widthPct: 100 };
                        $('#mm-img-w-input').value = 100;
                        setStatus('✓ Đã dán ảnh khít 100% Khung ' + (state.selectedBranch + 1));
                        renderAll();
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }
        });

        if (typeof global.ResizeObserver === 'function') {
            resizeObs = new global.ResizeObserver(fitStage);
            resizeObs.observe($('.vp-canvas-scroll'));
        }
        return modalEl;
    }

    function open() {
        buildModal();
        modalEl.classList.add('open');
        renderAll();
    }

    function close() {
        if (modalEl) modalEl.classList.remove('open');
    }

    /* [MT-16B-fix] Khoi tao san LTDMinMapObsStore ngay khi nap trang (khong doi mo modal MinMap) */
    (function initStandaloneObsStore() {
        var DB_NAME = 'LTD_MINMAP_OBS_DB';
        var LS_DECKS = 'ltd_minmap_obs_decks_v1';
        var memSlides = {};
        function stripHsSuffix(name) {
            return String(name || '')
                .replace(/\s*[—–-]\s*Phiếu học tập\s*$/i, '')
                .replace(/\s*\(Phiếu học tập\)\s*$/i, '')
                .trim();
        }
        function getLibTopicsList() {
            var list = [];
            if (global.LTDLibBridge && typeof global.LTDLibBridge.getTopics === 'function') list = global.LTDLibBridge.getTopics();
            if ((!list || !list.length) && Array.isArray(global.savedTopics) && global.savedTopics.length) list = global.savedTopics;
            if (!list || !list.length) {
                try {
                    var raw = JSON.parse(localStorage.getItem('matrix_quiz_topics_v2') || '[]');
                    if (Array.isArray(raw)) list = raw;
                } catch (e) {}
            }
            return Array.isArray(list) ? list : [];
        }
        function openDb() {
            return new Promise(function (resolve, reject) {
                if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'));
                var req = indexedDB.open(DB_NAME, 1);
                req.onupgradeneeded = function (ev) {
                    var db = ev.target.result;
                    if (!db.objectStoreNames.contains('slides')) db.createObjectStore('slides', { keyPath: 'id' });
                };
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { reject(req.error || new Error('idb-err')); };
            });
        }
        function getSlideDataUrl(id) {
            if (memSlides[id]) return Promise.resolve(memSlides[id]);
            return openDb().then(function (db) {
                return new Promise(function (resolve) {
                    var tx = db.transaction('slides', 'readonly');
                    var req = tx.objectStore('slides').get(id);
                    req.onsuccess = function () {
                        var val = req.result && req.result.dataUrl ? req.result.dataUrl : '';
                        if (val) memSlides[id] = val;
                        resolve(val);
                    };
                    req.onerror = function () { resolve(''); };
                });
            }).catch(function () { return memSlides[id] || ''; });
        }
        function packSlidesIntoA4Pages(items, opts) {
            opts = opts || {};
            var pageW = opts.pageW || 1654;
            var pageH = opts.pageH || 2339;
            var marginX = opts.marginX || 84;
            var marginTop = opts.marginTop || 88;
            var marginBot = opts.marginBot || 88;
            var usableW = pageW - marginX * 2;
            var maxImgH = opts.maxImgH || 920;
            var labelH = 48;
            var gapY = 44;
            var pages = [];
            var curPage = { hasDocTitle: true, items: [] };
            var curY = marginTop + 96;
            items.forEach(function (it, idx) {
                var iw = it.w || 794;
                var ih = it.h || 500;
                var scale = Math.min(usableW / iw, maxImgH / ih);
                var drawW = Math.round(iw * scale);
                var drawH = Math.round(ih * scale);
                var blockH = labelH + drawH + gapY;
                if (curPage.items.length > 0 && curY + blockH > pageH - marginBot) {
                    pages.push(curPage);
                    curPage = { hasDocTitle: false, items: [] };
                    curY = marginTop;
                }
                curPage.items.push({
                    num: idx + 1,
                    title: it.title || ('Phiếu ' + (idx + 1)),
                    dataUrl: it.dataUrl || '',
                    x: Math.round((pageW - drawW) / 2),
                    y: curY,
                    drawW: drawW,
                    drawH: drawH
                });
                curY += blockH;
            });
            if (curPage.items.length) pages.push(curPage);
            pages.forEach(function (pg) {
                if (pg.items.length < 2) return;
                var topStart = pg.hasDocTitle ? (marginTop + 96) : marginTop;
                var availH = (pageH - marginBot) - topStart;
                var usedH = 0;
                pg.items.forEach(function (it) { usedH += labelH + it.drawH; });
                var extra = Math.max(0, availH - usedH);
                var gap = extra / pg.items.length;
                var cursor = topStart;
                pg.items.forEach(function (it) {
                    it.y = Math.round(cursor);
                    cursor += labelH + it.drawH + gap;
                });
            });
            return pages;
        }
        function buildA4PdfBytesFromJpegs(jpegPages) {
            var objs = [];
            function addObj(bodyBytes) { objs.push(bodyBytes); return objs.length; }
            function strBytes(s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff; return a; }
            function concatBytes(parts) {
                var total = 0; parts.forEach(function (p) { total += p.length; });
                var out = new Uint8Array(total), off = 0;
                parts.forEach(function (p) { out.set(p, off); off += p.length; });
                return out;
            }
            var catalogId = addObj(strBytes(''));
            var pagesId = addObj(strBytes(''));
            var pageIds = [];
            jpegPages.forEach(function (pg, i) {
                var imgId = addObj(concatBytes([
                    strBytes('<< /Type /XObject /Subtype /Image /Width ' + pg.w + ' /Height ' + pg.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pg.bytes.length + ' >>\nstream\n'),
                    pg.bytes,
                    strBytes('\nendstream')
                ]));
                var streamStr = 'q\n595.28 0 0 841.89 0 0 cm\n/Im' + i + ' Do\nQ\n';
                var contentId = addObj(strBytes('<< /Length ' + streamStr.length + ' >>\nstream\n' + streamStr + 'endstream'));
                var pageId = addObj(strBytes('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im' + i + ' ' + imgId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>'));
                pageIds.push(pageId);
            });
            objs[catalogId - 1] = strBytes('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');
            objs[pagesId - 1] = strBytes('<< /Type /Pages /Kids [' + pageIds.map(function (id) { return id + ' 0 R'; }).join(' ') + '] /Count ' + pageIds.length + ' >>');
            var chunks = [strBytes('%PDF-1.4\n')];
            var offsets = [0], pos = chunks[0].length;
            objs.forEach(function (body, idx) {
                offsets.push(pos);
                var head = strBytes((idx + 1) + ' 0 obj\n');
                var tail = strBytes('\nendobj\n');
                chunks.push(head, body, tail);
                pos += head.length + body.length + tail.length;
            });
            var xrefPos = pos;
            var xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
            for (var j = 1; j <= objs.length; j++) xref += String(offsets[j]).padStart(10, '0') + ' 00000 n \n';
            var trailer = 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalogId + ' 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF';
            chunks.push(strBytes(xref + trailer));
            return concatBytes(chunks);
        }
        function exportHsSlidesToPdf(slidesList, deckTitle) {
            if (!slidesList || !slidesList.length) {
                if (global.LTDLibBridge && typeof global.LTDLibBridge.notify === 'function') global.LTDLibBridge.notify('Chưa có phiếu', 'Bài này chưa có Phiếu học tập nào để tải.', 'warning');
                return Promise.resolve(null);
            }
            deckTitle = stripHsSuffix(deckTitle) || 'BÀI GIẢNG';
            return Promise.all(slidesList.map(function (sl) {
                return getSlideDataUrl(sl.id).then(function (url) {
                    return { id: sl.id, title: sl.title, w: sl.w || 794, h: sl.h || 500, dataUrl: url || sl.dataUrl || '' };
                });
            })).then(function (resolved) {
                var pages = packSlidesIntoA4Pages(resolved);
                return Promise.all(pages.map(function (pg) {
                    return new Promise(function (resolve) {
                        var cv = document.createElement('canvas');
                        cv.width = 1654; cv.height = 2339;
                        var ctx = cv.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, 1654, 2339);
                        if (pg.hasDocTitle) {
                            ctx.fillStyle = '#0f172a';
                            ctx.font = 'bold 44px "Times New Roman", Times, serif';
                            ctx.textAlign = 'center';
                            ctx.fillText(String(deckTitle || 'BÀI GIẢNG').toUpperCase(), 827, 132);
                        }
                        Promise.all(pg.items.map(function (it) {
                            return new Promise(function (resItem) {
                                ctx.fillStyle = '#0f172a';
                                ctx.font = 'bold 30px "Times New Roman", Times, serif';
                                ctx.textAlign = 'left';
                                var cleanSub = String(it.title || '').replace(/^[^\p{L}\p{N}]+/gu, '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim();
                                ctx.fillText('Câu ' + it.num + ': ' + cleanSub, 84, it.y + 32);
                                if (!it.dataUrl || typeof Image === 'undefined') { resItem(); return; }
                                var img = new Image();
                                img.onload = function () { ctx.drawImage(img, it.x, it.y + 48, it.drawW, it.drawH); resItem(); };
                                img.onerror = function () { resItem(); };
                                img.src = it.dataUrl;
                            });
                        })).then(function () {
                            var jpgUrl = cv.toDataURL ? cv.toDataURL('image/jpeg', 0.92) : '';
                            var b64 = jpgUrl.split(',')[1] || '';
                            var bin = typeof atob === 'function' ? atob(b64) : '';
                            var bytes = new Uint8Array(bin.length);
                            for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
                            resolve({ w: 1654, h: 2339, bytes: bytes });
                        });
                    });
                }));
            }).then(function (jpegPages) {
                var pdfBytes = buildA4PdfBytesFromJpegs(jpegPages);
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                var cleanName = String(deckTitle || 'Phieu_HS').replace(/[\\/:*?"<>|]/g, '_') + '_HS_A4.pdf';
                if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                    var u = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = u; a.download = cleanName;
                    document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} }, 3000);
                }
                return { fileName: cleanName, pages: jpegPages.length, bytes: pdfBytes.length };
            });
        }
        function exportTopicHsPdf(topicId) {
            var list = getLibTopicsList();
            var t = list.find(function (x) { return x && x.id === topicId; });
            if (!t || !Array.isArray(t.hsSlideKeys) || !t.hsSlideKeys.length) return Promise.resolve(null);
            var cleanTitle = stripHsSuffix(t.title || t.subtitle || '') || 'BÀI GIẢNG HÓA HỌC';
            return exportHsSlidesToPdf(t.hsSlideKeys, cleanTitle);
        }
        if (!global.LTDMinMapObsStore) {
            global.LTDMinMapObsStore = {
                getSlideDataUrl: getSlideDataUrl,
                exportHsSlidesToPdf: exportHsSlidesToPdf,
                exportTopicHsPdf: exportTopicHsPdf,
                stripHsSuffix: stripHsSuffix,
                packSlidesIntoA4Pages: packSlidesIntoA4Pages,
                buildA4PdfBytesFromJpegs: buildA4PdfBytesFromJpegs,
                getDecks: function () {
                    try { return JSON.parse(localStorage.getItem(LS_DECKS) || '[]'); } catch (e) { return []; }
                }
            };
        }
    })();

    global.LTDMinMap = {
        open: open,
        openFromTopic: function (topicId) {
            if (global.LTDMinMapObsStore && typeof global.LTDMinMapObsStore.openFromTopic === 'function') {
                return global.LTDMinMapObsStore.openFromTopic(topicId);
            }
            open();
            return false;
        },
        close: close,
        renderAll: renderAll,
        renderStage: renderStage,
        switchTab: switchTab,
        autoFitTeacher16x9: function () { var b = $('#vp-zoom'); if (b) b.click(); },
        exportPng: exportPng,
        checkTeacherOverflow: checkTeacherOverflow,
        cleanCloneForExport: cleanCloneForExport,
        safeName: safeName,
        parseInput: parseInput,
        ensureTrailingDot: ensureTrailingDot,
        toggleHighlightSelection: toggleHighlightSelection,
        getState: function () { return state; }
    };
})(window);
