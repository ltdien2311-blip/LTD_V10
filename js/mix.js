// === [code94-mathtype] ===
/* ============================================================
   [CODE94] Bộ tạo công thức MathType thật (đối tượng nhúng OLE "Equation.DSMT4")
   Phần A: LaTeX -> MathML (KaTeX) -> cây trung gian IR -> MTEF v5 -> tệp OLE2 (Compound File)
   ============================================================ */
(function (root) {
    'use strict';
    var MT = {};

    /* ---------- 1. MathML (KaTeX) -> IR ---------- */
    var tn = function (el) { return String((el && (el.localName || el.nodeName)) || '').toLowerCase(); };
    var kids = function (el) { return Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 1 && !/^annotation/.test(tn(n)); }); };
    var txt = function (el) { return el ? (el.textContent || '') : ''; };

    var GREEK_LC = /[\u03B1-\u03C9\u03D1\u03D5\u03D6\u03F0\u03F1\u03F5]/;
    var GREEK_UC = /[\u0391-\u03A9]/;
    var BB = { R: '\u211D', Z: '\u2124', N: '\u2115', Q: '\u211A', C: '\u2102', H: '\u210D', P: '\u2119' };
    var REL = '=\u2260<>\u2264\u2265\u2248\u2261\u2208\u2209\u220B\u2282\u2283\u2286\u2287\u2284\u2192\u2190\u2194\u21D2\u21D0\u21D4\u21CC\u2225\u22A5\u223C\u221D\u2243\u2245\u226A\u226B\u27F9\u27FA\u21A6\u2220\u2271\u2270';
    var BIN = '+\u2212\u00B1\u2213\u00D7\u00F7\u222A\u2229\u00B7\u22C5\u2227\u2228\u2216\u2218\u2219\u2295\u2297\u2217*';
    var BIGOP = '\u222B\u222C\u222D\u222E\u2211\u220F\u2210\u22C3\u22C2';
    var LIMFN = /^(lim|max|min|sup|inf|limsup|liminf|det|gcd|Pr)$/;

    function faceOf(c) {
        if (/[0-9]/.test(c)) return 'n';
        if (/[A-Za-z]/.test(c)) return 't';
        if (GREEK_LC.test(c)) return 'lg';
        if (GREEK_UC.test(c)) return 'ug';
        if (c === ' ' || c === '\u00A0' || c === '\u2009' || c === '\u2002' || c === '\u2003') return 't';
        if (/[,.;:!?()\[\]'"%|\/\u00B0\u2032\u2033]/.test(c)) return 'n';
        if (/[\u00C0-\u1EF9]/.test(c) && !/[\u00D7\u00F7\u00B1\u00B7]/.test(c)) return 't';
        return 'sy';
    }
    var CH = function (c, f) { return { k: 'ch', s: c, f: f || faceOf(c) }; };
    var chars = function (s, f) { var o = []; Array.from(String(s)).forEach(function (c) { o.push(CH(c, f)); }); return o; };

    function isFenceMo(n) { return tn(n) === 'mo' && n.getAttribute('fence') === 'true'; }
    function unwrap(o) { while (o && /^(mstyle|mpadded|mrow)$/.test(tn(o)) && kids(o).length === 1) o = kids(o)[0]; return o; }
    function deep(o) { while (o && /^(mstyle|mpadded|mrow|mo|mi)$/.test(tn(o)) && kids(o).length === 1) o = kids(o)[0]; return o; }
    function listOf(nodes) { var out = []; nodes.forEach(function (n) { conv(n).forEach(function (x) { out.push(x); }); }); return out; }
    function seqOf(el) { return { k: 'seq', c: el ? conv(el) : [] }; }
    function seqOfNodes(nodes) { return { k: 'seq', c: listOf(nodes) }; }
    function wrapSeq(a) { return { k: 'seq', c: a }; }

    function tableOf(el, fenceL) {
        var rows = kids(el).filter(function (r) { return tn(r) === 'mtr'; });
        var grid = rows.map(function (r) { return kids(r).map(function (c) { return wrapSeq(listOf(kids(c).length ? [c] : [])); }); });
        var cols = grid.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        var ca = el.getAttribute('columnalign') || '';
        if (cols <= 1) return { k: 'pile', rows: grid.map(function (r) { return r[0] || wrapSeq([]); }), al: 'c' };
        var asCases = fenceL === '{' || /^left/.test(ca) && cols === 2 && !fenceL;
        var aligned = cols === 2 && /^right/.test(ca);
        if (asCases || aligned) {   // gộp các cột thành 1 dòng
            return { k: 'pile', al: 'l', rows: grid.map(function (r) {
                var c = [];
                r.forEach(function (cell, i) { if (i) c.push({ k: 'sp', w: aligned ? 0 : 0.6 }); cell.c.forEach(function (x) { c.push(x); }); });
                return wrapSeq(c);
            }) };
        }
        grid.forEach(function (r) { while (r.length < cols) r.push(wrapSeq([])); });
        return { k: 'mat', rows: grid, cols: cols };
    }

    function accentKind(a) {
        if (/^[\u2192\u20D7\u27F6]$/.test(a)) return 'vec';
        if (/^[\u2190\u20D6]$/.test(a)) return 'lvec';
        if (/^[\u2194\u20E1]$/.test(a)) return 'dvec';
        if (/^[\u005E\u02C6\u0302]$/.test(a)) return 'hat';
        if (/^[~\u02DC\u0303]$/.test(a)) return 'tilde';
        if (/^[\u02D9\u0307\u22C5]$/.test(a)) return 'dot';
        if (/^[\u00A8\u0308]$/.test(a)) return 'ddot';
        if (/^[\u00AF\u203E\u2015\u2212\-_\u2012\u2013\u2014]$/.test(a)) return 'bar';
        if (/^[\u2322\u23DC\u0311]$/.test(a)) return 'arc';
        if (/^[\u02C7\u030C]$/.test(a)) return 'hat';
        return '';
    }
    var ARROWS = /^[\u2192\u2190\u2194\u21CC\u21C4\u21D2\u21D0\u21D4\u27F6\u27F5\u27F9\u21CB]$/;

    function arrowOf(el) {   // mover/munder có gốc là mũi tên và có chữ trên/dưới
        var t = tn(el), k = kids(el), base = deep(k[0]), top = null, bot = null, a = null;
        if (t === 'mover' && base && tn(base) === 'munder') {
            var kb = kids(base); a = deep(kb[0]);
            if (a && tn(a) === 'mo' && ARROWS.test(txt(a).trim())) return { k: 'arr', ch: txt(a).trim(), top: seqOf(k[1]), bot: seqOf(kb[1]) };
        }
        if (base && tn(base) === 'mo' && ARROWS.test(txt(base).trim())) {
            if (t === 'mover') return { k: 'arr', ch: txt(base).trim(), top: seqOf(k[1]), bot: null };
            if (t === 'munder') return { k: 'arr', ch: txt(base).trim(), top: null, bot: seqOf(k[1]) };
            if (t === 'munderover') return { k: 'arr', ch: txt(base).trim(), top: seqOf(k[2]), bot: seqOf(k[1]) };
        }
        return null;
    }

    function conv(el) {
        var t = tn(el), k, s;
        switch (t) {
            case 'math': case 'semantics': case 'mstyle': case 'mpadded': case 'mtd': case 'mtr': case 'merror': case 'menclose':
                return listOf(kids(el));
            case 'mphantom': case 'annotation': case 'annotation-xml': return [];
            case 'mrow': {
                k = kids(el);
                if (k.length >= 2 && isFenceMo(k[0]) && isFenceMo(k[k.length - 1])) return [mkFence(txt(k[0]).trim(), txt(k[k.length - 1]).trim(), k.slice(1, -1))];
                if (k.length >= 2 && isFenceMo(k[0]) && /^[{\[(|\u2016\u27E8]$/.test(txt(k[0]).trim())) return [mkFence(txt(k[0]).trim(), '', k.slice(1))];
                if (k.length >= 2 && isFenceMo(k[k.length - 1]) && /^[}\])|\u2016\u27E9]$/.test(txt(k[k.length - 1]).trim())) return [mkFence('', txt(k[k.length - 1]).trim(), k.slice(0, -1))];
                return listOf(k);
            }
            case 'mi': {
                if (kids(el).length) return listOf(kids(el));
                s = txt(el);
                var mv = el.getAttribute('mathvariant') || '';
                if (mv === 'double-struck' && BB[s]) return [CH(BB[s], 'sy')];
                if (s.length > 1 && !/^[\uD835]/.test(s)) return chars(s, 'fn');
                if (mv === 'normal' && /[A-Za-z]/.test(s)) return [CH(s, 'fn')];
                if (mv === 'bold' && /[A-Za-z]/.test(s)) return [CH(s, 'bv')];
                return chars(s);
            }
            case 'mn': return chars(txt(el).replace(/\s+/g, ''), 'n');
            case 'mo': {
                if (kids(el).length) return listOf(kids(el));
                s = txt(el).replace(/\s+/g, '');
                if (s.length > 1 && /^[A-Za-z]+$/.test(s)) return chars(s, 'fn');
                return chars(s);
            }
            case 'mtext': return chars(txt(el).replace(/\u00A0/g, ' '), 't');
            case 'mspace': return /^-/.test(el.getAttribute('width') || '') ? [] : [{ k: 'sp', w: 0.17 }];
            case 'mfrac': {
                k = kids(el);
                var lt = el.getAttribute('linethickness');
                var nb = lt !== null && /^0(\.0*)?(px|em|ex|pt)?$/.test(lt.trim());
                return [{ k: 'frac', n: seqOf(k[0]), d: seqOf(k[1] || k[0]), bar: !nb }];
            }
            case 'msqrt': return [{ k: 'rad', b: seqOfNodes(kids(el)), i: null }];
            case 'mroot': k = kids(el); return [{ k: 'rad', b: seqOf(k[0]), i: seqOf(k[1]) }];
            case 'msup': k = kids(el); return [mkScr(k[0], null, k[1])];
            case 'msub': k = kids(el); return [mkScr(k[0], k[1], null)];
            case 'msubsup': k = kids(el); return [mkScr(k[0], k[1], k[2])];
            case 'munder': case 'mover': case 'munderover': return mkOver(el);
            case 'mtable': return [tableOf(el, '')];
            default: return listOf(kids(el));
        }
    }

    function mkFence(l, r, nodes) {
        var inner;
        var ks = nodes.filter(function (n) { return true; });
        if (ks.length === 1 && tn(unwrap(ks[0])) === 'mtable') {
            var tb = tableOf(unwrap(ks[0]), l);
            inner = tb;
        } else inner = seqOfNodes(ks);
        return { k: 'fen', l: l, r: r, b: inner };
    }
    function mkScr(b, sub, sup) {
        var baseNodes = conv(b);
        var bs = txt(unwrap(b)).trim();
        // lim, max, min với chỉ số dưới -> template giới hạn
        if (sub && !sup && baseNodes.length && baseNodes.every(function (x) { return x.k === 'ch' && x.f === 'fn'; }) && LIMFN.test(baseNodes.map(function (x) { return x.s; }).join(''))) {
            return { k: 'lim', b: wrapSeq(baseNodes), lo: seqOf(sub) };
        }
        var isBig = tn(unwrap(b)) === 'mo' && bs.length === 1 && BIGOP.indexOf(bs) >= 0;
        if (isBig && baseNodes[0]) baseNodes[0].big = true;
        var base = baseNodes.length === 1 ? baseNodes[0] : wrapSeq(baseNodes);
        var node = { k: 'scr', b: base, sub: sub ? seqOf(sub) : null, sup: sup ? seqOf(sup) : null };
        return node;
    }
    function mkOver(el) {
        var t = tn(el), k = kids(el);
        var ar = arrowOf(el);
        if (ar) return [ar];
        var base = unwrap(k[0]);
        var bs = txt(base).trim();
        if (t === 'munderover' || ((t === 'munder' || t === 'mover') && base && tn(base) === 'mo' && bs.length === 1 && BIGOP.indexOf(bs) >= 0)) {
            var bn = conv(k[0]); if (bn[0]) bn[0].big = true;
            var sub = (t === 'munder' || t === 'munderover') ? seqOf(k[1]) : null;
            var sup = t === 'munderover' ? seqOf(k[2]) : (t === 'mover' ? seqOf(k[1]) : null);
            return [{ k: 'scr', b: bn.length === 1 ? bn[0] : wrapSeq(bn), sub: sub, sup: sup }];
        }
        if (t === 'munder') {
            var bn2 = conv(k[0]);
            if (bn2.length && bn2.every(function (x) { return x.k === 'ch' && x.f === 'fn'; }) && LIMFN.test(bn2.map(function (x) { return x.s; }).join(''))) return [{ k: 'lim', b: wrapSeq(bn2), lo: seqOf(k[1]) }];
            var u = unwrap(k[1]);
            if (u && tn(u) === 'mo' && accentKind(txt(u).trim()) === 'bar') return [{ k: 'und', b: seqOf(k[0]) }];
            return [{ k: 'lim', b: seqOf(k[0]), lo: seqOf(k[1]) }];
        }
        // mover: dấu trên đầu
        var o = unwrap(k[1]);
        var kind = (o && tn(o) === 'mo') ? accentKind(txt(o).trim()) : '';
        if (kind) {
            var inner = conv(k[0]);
            var single = inner.length === 1 && inner[0].k === 'ch';
            return [{ k: 'ovr', kind: kind, b: wrapSeq(inner), single: single }];
        }
        return [{ k: 'lim', b: seqOf(k[0]), up: seqOf(k[1]) }];
    }

    MT.latexToIR = function (latex) {
        var s = String(latex || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
        s = s.replace(/[\u211D\u2124\u2115\u211A\u2102]/g, function (ch) { var m = { '\u211D': 'R', '\u2124': 'Z', '\u2115': 'N', '\u211A': 'Q', '\u2102': 'C' }; return '\\mathbb{' + m[ch] + '}'; });
        s = s.replace(/(\d),(?=\d)/g, '$1{,}');
        var fallback = function () { return wrapSeq(chars(s, 't')); };
        if (!s) return wrapSeq([]);
        if (typeof katex === 'undefined') return fallback();
        try {
            var html = katex.renderToString(s, { throwOnError: false, strict: false, output: 'mathml' });
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var math = doc.querySelector('math');
            if (!math) return fallback();
            var ir = wrapSeq(conv(math));
            return ir.c.length ? ir : fallback();
        } catch (e) { return fallback(); }
    };

    /* ---------- 2. IR -> MTEF v5 ---------- */
    var TF = { TEXT: 1, FUNCTION: 2, VARIABLE: 3, LCGREEK: 4, UCGREEK: 5, SYMBOL: 6, VECTOR: 7, NUMBER: 8, EXPAND: 22 };
    function Enc() { this.b = []; }
    Enc.prototype.w = function () { for (var i = 0; i < arguments.length; i++) this.b.push(arguments[i] & 0xFF); return this; };
    Enc.prototype.u16 = function (v) { this.b.push(v & 0xFF, (v >> 8) & 0xFF); return this; };
    Enc.prototype.str = function (s) { for (var i = 0; i < s.length; i++) this.b.push(s.charCodeAt(i) & 0xFF); this.b.push(0); return this; };

    var FACE_TF = { v: TF.TEXT, n: TF.NUMBER, t: TF.TEXT, fn: TF.FUNCTION, lg: TF.LCGREEK, ug: TF.UCGREEK, sy: TF.SYMBOL, bv: TF.TEXT };
    var FENCE_SEL = { '(': [1, '(', ')'], '[': [3, '[', ']'], '{': [2, '{', '}'], '|': [4, '|', '|'], '\u2016': [5, '\u2016', '\u2016'], '\u2225': [5, '\u2016', '\u2016'],
        '\u27E8': [0, '\u27E8', '\u27E9'], '\u2329': [0, '\u27E8', '\u27E9'], '\u230A': [6, '\u230A', '\u230B'], '\u2308': [7, '\u2308', '\u2309'], '<': [0, '\u27E8', '\u27E9'] };
    var CLOSE_OF = { ')': '(', ']': '[', '}': '{', '\u27E9': '\u27E8', '\u232A': '\u27E8', '\u230B': '\u230A', '\u2309': '\u2308', '>': '<', '\u2016': '\u2016', '|': '|', '\u2225': '\u2016' };
    var FENCE_CODE = { '(': 0x28, ')': 0x29, '[': 0x5B, ']': 0x5D, '{': 0x7B, '}': 0x7D, '|': 0x7C, '\u2016': 0x2016, '\u27E8': 0x2329, '\u27E9': 0x232A, '\u230A': 0x230A, '\u230B': 0x230B, '\u2308': 0x2308, '\u2309': 0x2309 };

    function fenceInfo(n) {   // trả về {sel, var} nếu là cặp ngoặc hợp lệ cho template, ngược lại null
        var l = n.l, r = n.r;
        if (!l && !r) return null;
        var key = l || CLOSE_OF[r];
        var def = FENCE_SEL[key];
        if (!def) return null;
        if (l && r && CLOSE_OF[r] !== key && !(l === r && (l === '|' || l === '\u2016'))) {
            if (!(def[2] === r || CLOSE_OF[r] === key)) return null;
        }
        if (l && r && def[2] !== r && !(CLOSE_OF[r] === key)) return null;
        return { sel: def[0], lc: def[1], rc: def[2], v: (l && r) ? 0 : (l ? 1 : 2), hasL: !!l, hasR: !!r };
    }

    function eChar(e, face, code, embs) {
        var tf = typeof face === 'number' ? face : FACE_TF[face];
        var ascii = !(MT.opts&&MT.opts.no8) && code < 0x80 && (tf === TF.VARIABLE || tf === TF.NUMBER || tf === TF.TEXT || tf === TF.FUNCTION || tf === TF.SYMBOL);
        var o = (ascii ? 0x04 : 0) | (embs && embs.length ? 0x01 : 0);
        e.w(2, o, tf + 128).u16(code);
        if (ascii) e.w(code);
        if (embs && embs.length) { embs.forEach(function (t) { e.w(6, 0, t); }); e.w(0); }
    }
    function eLine(e, fn, sizeTag) { e.w(1, 0); if (sizeTag) e.w(sizeTag); fn(); e.w(0); }
    function eNullLine(e) { e.w(1, 1); }
    function eTmpl(e, sel, vari, fn) { e.w(3, 0, sel, vari, 0); fn(); e.w(0); }

    function codeOf(n) {
        var c = n.s.codePointAt(0);
        return c > 0xFFFF ? 0x3F : c;
    }
    var EMB = { dot: 2, ddot: 3, hat: 9, tilde: 8, vec: 11, lvec: 12, dvec: 13, bar: 17 };

    function eNode(e, n, lvl) {
        var sz = lvl === 1 ? 11 : lvl >= 2 ? 12 : 0;
        switch (n.k) {
            case 'seq': n.c.forEach(function (x) { eNode(e, x, lvl); }); break;
            case 'ch': eChar(e, n.f === 'bv' ? TF.TEXT : n.f, codeOf(n)); break;
            case 'sp': eChar(e, TF.TEXT, 0x20); break;
            case 'frac':
                eTmpl(e, 11, 0, function () { eLine(e, function () { eNode(e, n.n, lvl); }); eLine(e, function () { eNode(e, n.d, lvl); }); });
                break;
            case 'rad':
                eTmpl(e, 10, n.i ? 1 : 0, function () {
                    eLine(e, function () { eNode(e, n.b, lvl); });
                    if (n.i) eLine(e, function () { eNode(e, n.i, lvl + 1); }, lvl + 1 === 1 ? 11 : 12);
                });
                break;
            case 'scr': {
                eNode(e, n.b, lvl);
                var nl = lvl + 1, tag = nl === 1 ? 11 : 12;
                if (n.sub && n.sup) eTmpl(e, 29, 0, function () { eLine(e, function () { eNode(e, n.sub, nl); }, tag); eLine(e, function () { eNode(e, n.sup, nl); }, tag); });
                else if (n.sub) eTmpl(e, 27, 0, function () { eLine(e, function () { eNode(e, n.sub, nl); }, tag); });
                else if (n.sup) eTmpl(e, 28, 0, function () { eLine(e, function () { eNode(e, n.sup, nl); }, tag); });
                break;
            }
            case 'lim':
                eTmpl(e, 23, 0, function () {
                    eLine(e, function () { eNode(e, n.b, lvl); });
                    if (n.lo) eLine(e, function () { eNode(e, n.lo, lvl + 1); }, lvl + 1 === 1 ? 11 : 12); else eNullLine(e);
                    if (n.up) eLine(e, function () { eNode(e, n.up, lvl + 1); }, lvl + 1 === 1 ? 11 : 12); else eNullLine(e);
                });
                break;
            case 'und': eTmpl(e, 12, 0, function () { eLine(e, function () { eNode(e, n.b, lvl); }); }); break;
            case 'ovr':
                if (n.single && n.b.c.length === 1 && EMB[n.kind] && n.b.c[0].k === 'ch') {
                    eChar(e, n.b.c[0].f === 'bv' ? TF.TEXT : n.b.c[0].f, codeOf(n.b.c[0]), [EMB[n.kind]]);
                } else if (n.kind === 'bar') eTmpl(e, 13, 0, function () { eLine(e, function () { eNode(e, n.b, lvl); }); });
                else if (n.kind === 'vec' || n.kind === 'lvec' || n.kind === 'dvec') eTmpl(e, 31, n.kind === 'vec' ? 0x0A : n.kind === 'lvec' ? 0x09 : 0x0B, function () { eLine(e, function () { eNode(e, n.b, lvl); }); });
                else if (n.kind === 'tilde') eTmpl(e, 32, 0, function () { eLine(e, function () { eNode(e, n.b, lvl); }); });
                else if (n.kind === 'hat') eTmpl(e, 33, 0, function () { eLine(e, function () { eNode(e, n.b, lvl); }); });
                else if (n.kind === 'arc') eTmpl(e, 34, 0, function () { eLine(e, function () { eNode(e, n.b, lvl); }); });
                else eNode(e, n.b, lvl);
                break;
            case 'arr': {
                var code = n.ch.codePointAt(0), v = 0x0020, dbl = false;
                if (/[\u21CC\u21CB]/.test(n.ch)) { v = 0x0030 | 0x0002; dbl = true; }
                else if (/[\u2194\u21D4\u27FA]/.test(n.ch)) v = 0x0030;
                else if (/[\u2190\u21D0\u27F5]/.test(n.ch)) v = 0x0010;
                if (n.top) v |= 0x0004; if (n.bot) v |= 0x0008;
                eTmpl(e, 14, v, function () {
                    var sl = lvl + 1, tg = sl === 1 ? 11 : 12;
                    if (n.top) eLine(e, function () { eNode(e, n.top, sl); }, tg);
                    if (n.bot) eLine(e, function () { eNode(e, n.bot, sl); }, tg);
                    if (dbl) { eChar(e, TF.EXPAND, 0x21C0); eChar(e, TF.EXPAND, 0x21BD); }
                    else eChar(e, TF.EXPAND, code === 0x27F6 ? 0x2192 : code);
                });
                break;
            }
            case 'fen': {
                var fi = fenceInfo(n);
                if (!fi) {   // cặp ngoặc lạ -> ký tự rời
                    if (n.l) eChar(e, TF.NUMBER, (FENCE_CODE[n.l] || n.l.codePointAt(0)));
                    eNode(e, n.b, lvl);
                    if (n.r) eChar(e, TF.NUMBER, (FENCE_CODE[n.r] || n.r.codePointAt(0)));
                    break;
                }
                eTmpl(e, fi.sel, fi.v, function () {
                    if (n.b.k === 'pile') ePile(e, n.b, lvl); else eLine(e, function () { eNode(e, n.b, lvl); });
                    if (fi.hasL) eChar(e, TF.EXPAND, FENCE_CODE[fi.lc]);
                    if (fi.hasR) eChar(e, TF.EXPAND, FENCE_CODE[fi.rc]);
                });
                break;
            }
            case 'pile': ePile(e, n, lvl, true); break;
            case 'mat': eMat(e, n, lvl); break;
        }
    }
    function ePile(e, n, lvl, wrapLine) {
        var body = function () {
            e.w(4, 0, n.al === 'l' ? 1 : n.al === 'r' ? 3 : 2, 0);
            n.rows.forEach(function (r) { eLine(e, function () { eNode(e, r, lvl); }); });
            e.w(0);
        };
        if (wrapLine) eLine(e, body); else body();
    }
    function eMat(e, n, lvl) {
        var nr = n.rows.length, nc = n.cols;
        e.w(5, 0, 0, 2, 0, nr, nc);
        var rp = Math.floor(((nr + 1) * 2 + 7) / 8), cp = Math.floor(((nc + 1) * 2 + 7) / 8);
        for (var i = 0; i < rp + cp; i++) e.w(0);
        n.rows.forEach(function (r) { r.forEach(function (c) { eLine(e, function () { eNode(e, c, lvl); }); }); });
        e.w(0);
    }
    function dimNibbles(list) {   // [{u:2,v:'12'}] -> nibble stream
        var nib = [];
        list.forEach(function (d) {
            nib.push(d.u);
            String(d.v).split('').forEach(function (c) { nib.push(c === '.' ? 10 : c === '-' ? 11 : +c); });
            nib.push(15);
        });
        if (nib.length % 2) nib.push(15);
        var out = [];
        for (var i = 0; i < nib.length; i += 2) out.push((nib[i] << 4) | nib[i + 1]);
        return out;
    }

    MT.irToMtef = function (ir) {
        var e = new Enc();
        e.w(5, 1, 0, 6, 9).str('DSMT4').w(MT.opts&&MT.opts.opt!==undefined?MT.opts.opt:1);                 // tiêu đề: MTEF v5, Windows, MathType 6.9, khóa DSMT4, công thức trong dòng
        // EQN_PREFS: cỡ chữ (12, 7, 5, 18, 12 pt), khoảng cách, kiểu chữ
        if (!(MT.opts&&MT.opts.noPrefs)) { e.w(18, 0);
        var sizes = [{ u: 2, v: '12' }, { u: 2, v: '7' }, { u: 2, v: '5' }, { u: 2, v: '18' }, { u: 2, v: '12' }];
        e.w(sizes.length); dimNibbles(sizes).forEach(function (b) { e.w(b); });
        var spaces = [{ u: 4, v: '150' }, { u: 4, v: '150' }, { u: 4, v: '100' }, { u: 4, v: '45' }, { u: 4, v: '25' }, { u: 4, v: '25' }, { u: 4, v: '100' }, { u: 4, v: '100' }];
        e.w(spaces.length); dimNibbles(spaces).forEach(function (b) { e.w(b); });
        e.w(0); }
        eLine(e, function () { eNode(e, ir, 0); });
        e.w(0);                                                // END công thức
        return new Uint8Array(e.b);
    };

    /* ---------- 3. Tệp OLE2 (Compound File) ---------- */
    function u32(a, off, v) { a[off] = v & 255; a[off + 1] = (v >>> 8) & 255; a[off + 2] = (v >>> 16) & 255; a[off + 3] = (v >>> 24) & 255; }
    function u16w(a, off, v) { a[off] = v & 255; a[off + 1] = (v >>> 8) & 255; }
    var ENDC = 0xFFFFFFFE, FREE = 0xFFFFFFFF, FATS = 0xFFFFFFFD, NOSTREAM = 0xFFFFFFFF;
    var CLSID_EQ = [0x02, 0xCE, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46];   // {0002CE02-0000-0000-C000-000000000046}

    MT.buildCFB = function (streams, clsid) {
        var SS = 512, MS = 64, CUT = 4096;
        var small = [], large = [];
        streams.forEach(function (s) { (s.data.length < CUT ? small : large).push(s); });
        // mini stream
        var miniBytes = 0, miniFat = [];
        small.forEach(function (s) {
            var n = Math.max(1, Math.ceil(s.data.length / MS));
            s.miniStart = miniFat.length;
            for (var i = 0; i < n; i++) miniFat.push(i === n - 1 ? ENDC : miniFat.length + 1);
            miniBytes += n * MS;
        });
        var mini = new Uint8Array(miniBytes), mo = 0;
        small.forEach(function (s) { mini.set(s.data, mo); mo += Math.max(1, Math.ceil(s.data.length / MS)) * MS; });
        var nMiniFatSec = miniFat.length ? Math.ceil(miniFat.length * 4 / SS) : 0;
        var nMiniSec = miniBytes ? Math.ceil(miniBytes / SS) : 0;
        var entryCount = streams.length + 1;
        var nDirSec = Math.ceil(entryCount * 128 / SS);
        var largeSec = large.map(function (s) { return Math.ceil(s.data.length / SS); });
        var nLargeSec = largeSec.reduce(function (a, b) { return a + b; }, 0);
        var nFat = 1;
        for (;;) { var tot = nFat + nDirSec + nMiniFatSec + nMiniSec + nLargeSec; if (nFat * 128 >= tot) break; nFat++; }
        var total = nFat + nDirSec + nMiniFatSec + nMiniSec + nLargeSec;
        var fat = new Array(nFat * 128).fill(FREE);
        var sec = 0, i, firstFat = 0;
        for (i = 0; i < nFat; i++) fat[sec++] = FATS;
        var dirStart = sec; for (i = 0; i < nDirSec; i++) { fat[sec] = i === nDirSec - 1 ? ENDC : sec + 1; sec++; }
        var mfStart = nMiniFatSec ? sec : ENDC; for (i = 0; i < nMiniFatSec; i++) { fat[sec] = i === nMiniFatSec - 1 ? ENDC : sec + 1; sec++; }
        var msStart = nMiniSec ? sec : ENDC; for (i = 0; i < nMiniSec; i++) { fat[sec] = i === nMiniSec - 1 ? ENDC : sec + 1; sec++; }
        large.forEach(function (s, li) {
            s.start = sec;
            for (var j = 0; j < largeSec[li]; j++) { fat[sec] = j === largeSec[li] - 1 ? ENDC : sec + 1; sec++; }
        });
        var out = new Uint8Array((total + 1) * SS);
        // header
        var H = out; H.set([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], 0);
        u16w(H, 24, 0x003E); u16w(H, 26, 0x0003); u16w(H, 28, 0xFFFE); u16w(H, 30, 9); u16w(H, 32, 6);
        u32(H, 44, nFat); u32(H, 48, dirStart); u32(H, 56, CUT); u32(H, 60, mfStart); u32(H, 64, nMiniFatSec); u32(H, 68, ENDC); u32(H, 72, 0);
        for (i = 0; i < 109; i++) u32(H, 76 + i * 4, i < nFat ? i : FREE);
        // FAT
        for (i = 0; i < fat.length; i++) u32(out, SS + firstFat * SS + i * 4, fat[i]);
        var secOff = function (n) { return SS + n * SS; };
        // mini FAT
        for (i = 0; i < miniFat.length; i++) u32(out, secOff(mfStart) + i * 4, miniFat[i]);
        for (i = miniFat.length; i < nMiniFatSec * 128; i++) u32(out, secOff(mfStart) + i * 4, FREE);
        // mini stream
        if (nMiniSec) out.set(mini, secOff(msStart));
        large.forEach(function (s) { out.set(s.data, secOff(s.start)); });
        // directory (cây nhị phân theo thứ tự tên: độ dài, rồi chữ hoa)
        var cmp = function (a, b) { if (a.name.length !== b.name.length) return a.name.length - b.name.length; var x = a.name.toUpperCase(), y = b.name.toUpperCase(); return x < y ? -1 : x > y ? 1 : 0; };
        var sorted = streams.slice().sort(cmp);
        var ent = [{ name: 'Root Entry', type: 5, left: NOSTREAM, right: NOSTREAM, child: NOSTREAM, start: msStart, size: miniBytes, clsid: clsid }];
        sorted.forEach(function (s) { ent.push({ name: s.name, type: 2, left: NOSTREAM, right: NOSTREAM, child: NOSTREAM, start: s.data.length < CUT ? s.miniStart : s.start, size: s.data.length, clsid: null }); });
        var build = function (lo, hi) { if (lo > hi) return NOSTREAM; var mid = (lo + hi) >> 1; var me = ent[mid + 1]; me.left = build(lo, mid - 1); me.right = build(mid + 1, hi); return mid + 1; };
        ent[0].child = build(0, sorted.length - 1);
        ent.forEach(function (d, idx) {
            var o = secOff(dirStart) + idx * 128;
            for (var c = 0; c < d.name.length; c++) u16w(out, o + c * 2, d.name.charCodeAt(c));
            u16w(out, o + 64, (d.name.length + 1) * 2);
            out[o + 66] = d.type; out[o + 67] = 1;
            u32(out, o + 68, d.left); u32(out, o + 72, d.right); u32(out, o + 76, d.child);
            if (d.clsid) out.set(d.clsid, o + 80);
            u32(out, o + 116, d.start); u32(out, o + 120, d.size); u32(out, o + 124, 0);
        });
        for (var z = ent.length; z < nDirSec * 4; z++) { var o2 = secOff(dirStart) + z * 128; u32(out, o2 + 68, NOSTREAM); u32(out, o2 + 72, NOSTREAM); u32(out, o2 + 76, NOSTREAM); }
        return out;
    };

    function lenStr(s) { var b = []; var n = s.length + 1; b.push(n & 255, (n >> 8) & 255, 0, 0); for (var i = 0; i < s.length; i++) b.push(s.charCodeAt(i)); b.push(0); return b; }
    MT.buildOle = function (mtef) {
        var comp = [0x01, 0x00, 0xFE, 0xFF, 0x03, 0x0A, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF].concat(CLSID_EQ)
            .concat(lenStr('MathType 6.0 Equation')).concat([0, 0, 0, 0]).concat(lenStr('Equation.DSMT4')).concat([0xF4, 0x39, 0xB2, 0x71, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        var ole = [0x01, 0x00, 0x00, 0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var hdr = new Uint8Array(28);
        u16w(hdr, 0, 28); u32(hdr, 2, 0x00020000); u16w(hdr, 6, 0xC19E); u32(hdr, 8, mtef.length);
        var eq = new Uint8Array(28 + mtef.length); eq.set(hdr, 0); eq.set(mtef, 28);
        return MT.buildCFB([
            { name: '\u0001CompObj', data: new Uint8Array(comp) },
            { name: '\u0001Ole', data: new Uint8Array(ole) },
            { name: 'Equation Native', data: eq }
        ], new Uint8Array(CLSID_EQ));
    };

    MT._tn = tn; MT._kids = kids;
    root.MT93 = MT;
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================
   [CODE94] Phần B: dàn trang công thức (giống kiểu MathType: Times New Roman) và vẽ ảnh xem trước PNG
   ============================================================ */
(function (root) {
    'use strict';
    var MT = root.MT93;
    var FAM = '"Times New Roman","Liberation Serif","Nimbus Roman","Noto Serif","DejaVu Serif",serif';
    var AXIS = 0.25, REL = '=\u2260<>\u2264\u2265\u2248\u2261\u2208\u2209\u220B\u2282\u2283\u2286\u2287\u2284\u2192\u2190\u2194\u21D2\u21D0\u21D4\u21CC\u2225\u22A5\u223C\u221D\u2243\u2245\u226A\u226B\u27F9\u27FA\u2220',
        BIN = '+\u2212\u00B1\u2213\u00D7\u00F7\u222A\u2229\u22C5\u2227\u2228\u2216\u2218\u2295\u2297*\u00B7';
    var cvs = null, mctx = null, cache = {};
    function mc() { if (!cvs) { cvs = document.createElement('canvas'); cvs.width = 10; cvs.height = 10; mctx = cvs.getContext('2d'); } return mctx; }
    function fontOf(face, px) {
        var b = face === 'bv' ? 'bold ' : '';
        return b + px + 'px ' + FAM;
    }
    function glyph(s, face, sc, big) {   // đo ký tự: đơn vị em của cỡ chữ gốc
        var key = s + '|' + face + '|' + (big || 1), m = cache[key];
        if (!m) {
            var c = mc(); c.font = fontOf(face, 100 * (big || 1));
            var r = c.measureText(s);
            m = cache[key] = { w: r.width / 100, a: (r.actualBoundingBoxAscent || 66 * (big || 1)) / 100, d: Math.max(0, (r.actualBoundingBoxDescent || 0) / 100) };
        }
        return { w: m.w * sc, a: m.a * sc, d: m.d * sc };
    }
    function box(w, a, d, draw) { return { w: w, a: a, d: d, draw: draw || function () { } }; }

    function layChar(n, sc) {
        var big = n.big ? (/[\u222B\u222C\u222D\u222E]/.test(n.s) ? 1.9 : 1.5) : 1;
        var g = glyph(n.s, n.f, sc, big), off = 0;
        var a = Math.max(g.a, 0.5 * sc * (big > 1 ? 1 : 1)), d = g.d;
        if (big > 1) { off = AXIS * sc - (g.a - g.d) / 2; a = g.a + off; d = Math.max(0, g.d - off); }
        var isSpace = n.s === ' ' || n.s === '\u00A0';
        return box(isSpace ? 0.25 * sc : g.w, a, d, function (ctx, u, x, y) {
            ctx.font = fontOf(n.f, sc * big * u); ctx.fillText(n.s, x, y - off * u);
        });
    }
    function isRel(n) { return n && n.k === 'ch' && REL.indexOf(n.s) >= 0; }
    function isBin(n) { return n && n.k === 'ch' && BIN.indexOf(n.s) >= 0 && n.f === 'sy'; }
    function laySeq(list, sc) {
        var parts = [], x = 0, a = 0, d = 0, prev = null;
        for (var i = 0; i < list.length; i++) {
            var n = list[i], sp = 0, ba = null;
            var nxt = list[i + 1];
            if (n.k === 'sp') { var b0 = box(n.w * sc, 0, 0); parts.push({ b: b0, x: x }); x += b0.w; prev = n; continue; }
            if (isRel(n) && i > 0 && nxt) sp = 0.28 * sc;
            else if (isBin(n) && i > 0 && nxt && !(isRel(prev) || isBin(prev) || (prev && prev.k === 'ch' && /[(\[{,;]/.test(prev.s)) )) sp = 0.22 * sc;
            // chuỗi hàm (sin, cos...) cách một chút với thành phần sau
            var afterFn = prev && prev.k === 'ch' && prev.f === 'fn' && !(n.k === 'ch' && n.f === 'fn') && n.k !== 'scr';
            if (afterFn && !(n.k === 'ch' && /[,.;:)\]]/.test(n.s))) x += 0.17 * sc;
            if (prev && prev.k === 'ch' && /[,;]/.test(prev.s) && prev.f === 'n' && n.k !== 'sp') x += 0.14 * sc;
            x += sp;
            var b = layNode(n, sc);
            parts.push({ b: b, x: x }); x += b.w + sp;
            a = Math.max(a, b.a); d = Math.max(d, b.d);
            prev = n;
        }
        return box(x, a, d, function (ctx, u, X, Y) { parts.forEach(function (p) { p.b.draw(ctx, u, X + p.x * u, Y); }); });
    }
    function layNode(n, sc) {
        switch (n.k) {
            case 'seq': return laySeq(n.c, sc);
            case 'ch': return layChar(n, sc);
            case 'sp': return box(n.w * sc, 0, 0);
            case 'frac': return layFrac(n, sc);
            case 'rad': return layRad(n, sc);
            case 'scr': return layScr(n, sc);
            case 'lim': return layLim(n, sc);
            case 'und': { var bu = layNode(n.b, sc), gu = 0.1 * sc; return box(bu.w, bu.a, bu.d + gu + 0.04 * sc, function (c, u, x, y) { bu.draw(c, u, x, y); ln(c, u, x, y + (bu.d + gu) * u, x + bu.w * u, y + (bu.d + gu) * u, sc * 0.05); }); }
            case 'ovr': return layOvr(n, sc);
            case 'arr': return layArr(n, sc);
            case 'fen': return layFen(n, sc);
            case 'pile': return layPile(n, sc);
            case 'mat': return layMat(n, sc);
        }
        return box(0, 0, 0);
    }
    function ln(ctx, u, x1, y1, x2, y2, wid) { ctx.lineWidth = Math.max(1, wid * u); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

    function layFrac(n, sc) {
        var nu = layNode(n.n, sc), de = layNode(n.d, sc);
        var w = Math.max(nu.w, de.w) + 0.2 * sc, th = 0.05 * sc, gap = 0.12 * sc, ax = AXIS * sc;
        var yn = ax + th / 2 + gap + nu.d, yd = ax - th / 2 - gap - de.a;
        return box(w, yn + nu.a, de.d - yd, function (ctx, u, x, y) {
            nu.draw(ctx, u, x + (w - nu.w) / 2 * u, y - yn * u);
            de.draw(ctx, u, x + (w - de.w) / 2 * u, y - yd * u);
            if (n.bar) ln(ctx, u, x + 0.04 * sc * u, y - ax * u, x + (w - 0.04 * sc) * u, y - ax * u, th);
        });
    }
    function layRad(n, sc) {
        var b = layNode(n.b, sc), ix = n.i ? layNode(n.i, sc * 0.6) : null;
        var W = 0.75 * sc, top = b.a + 0.14 * sc, bot = b.d + 0.04 * sc, extra = ix ? Math.max(0, ix.w - 0.4 * W) : 0;
        var a = top + 0.03 * sc, d = bot;
        return box(extra + W + b.w + 0.1 * sc, a, d, function (ctx, u, x, y) {
            var x0 = x + extra * u, th = 0.05 * sc;
            ctx.lineWidth = Math.max(1, th * u); ctx.lineJoin = 'miter'; ctx.beginPath();
            var ym = -(bot - 0.45 * (top + bot));
            ctx.moveTo(x0, y - ym * u); ctx.lineTo(x0 + 0.14 * W * u, y - (ym + 0.05 * sc) * u);
            ctx.lineTo(x0 + 0.45 * W * u, y + bot * u); ctx.lineTo(x0 + W * u, y - top * u); ctx.lineTo(x0 + (W + b.w + 0.1 * sc) * u, y - top * u); ctx.stroke();
            b.draw(ctx, u, x0 + W * u, y);
            if (ix) ix.draw(ctx, u, x, y - (top * 0.55) * u);
        });
    }
    function layScr(n, sc) {
        var B = layNode(n.b, sc), s2 = Math.max(0.5, sc * 0.7);
        var S = n.sup ? layNode(n.sup, s2) : null, U = n.sub ? layNode(n.sub, s2) : null;
        var big = n.b.k === 'ch' && n.b.big;
        var supY = 0, subY = 0;
        if (S) supY = big ? B.a - S.a * 0.55 : Math.max(0.4 * sc, B.a * 0.8 - 0.1 * sc) + 0 * S.d;
        if (S && !big) supY = Math.max(supY, S.d + 0.15 * sc);
        if (U) subY = big ? B.d + U.a * 0.5 : Math.max(0.2 * sc, B.d - 0.1 * sc);
        if (S && U && (supY - S.d) - (-subY + U.a) < 0.08 * sc) { subY = U.a + supY - S.d - 0.08 * sc; }
        var w = B.w + Math.max(S ? S.w : 0, U ? U.w : 0) + 0.02 * sc;
        var a = Math.max(B.a, S ? supY + S.a : 0), d = Math.max(B.d, U ? subY + U.d : 0);
        return box(w, a, d, function (ctx, u, x, y) {
            B.draw(ctx, u, x, y);
            var xs = x + (B.w + 0.02 * sc) * u;
            if (S) S.draw(ctx, u, xs, y - supY * u);
            if (U) U.draw(ctx, u, xs, y + subY * u);
        });
    }
    function layLim(n, sc) {
        var B = layNode(n.b, sc), s2 = sc * 0.7;
        var L = n.lo ? layNode(n.lo, s2) : null, T = n.up ? layNode(n.up, s2) : null;
        var w = Math.max(B.w, L ? L.w : 0, T ? T.w : 0), g = 0.08 * sc;
        var a = B.a + (T ? g + T.a + T.d : 0), d = B.d + (L ? g + L.a + L.d : 0);
        return box(w, a, d, function (ctx, u, x, y) {
            B.draw(ctx, u, x + (w - B.w) / 2 * u, y);
            if (L) L.draw(ctx, u, x + (w - L.w) / 2 * u, y + (B.d + g + L.a) * u);
            if (T) T.draw(ctx, u, x + (w - T.w) / 2 * u, y - (B.a + g + T.d) * u);
        });
    }
    function layOvr(n, sc) {
        var B = layNode(n.b, sc), kind = n.kind, h = 0.16 * sc, w = B.w;
        var base = Math.max(B.a, 0.66 * sc) + 0.05 * sc;
        if (kind === 'vec' && n.single) base = Math.max(B.a, 0.66 * sc) + 0.03 * sc;
        return box(w, base + h, B.d, function (ctx, u, x, y) {
            B.draw(ctx, u, x, y);
            var yy = y - (base + h * 0.4) * u, x0 = x + 0.05 * sc * u, x1 = x + (w - 0.02 * sc) * u;
            ctx.lineWidth = Math.max(1, 0.045 * sc * u); ctx.lineJoin = 'miter';
            if (kind === 'bar') { ln(ctx, u, x, y - (base + 0.05 * sc) * u, x + w * u, y - (base + 0.05 * sc) * u, 0.045 * sc); return; }
            if (kind === 'vec' || kind === 'lvec' || kind === 'dvec') {
                ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
                var hs = 0.09 * sc * u;
                if (kind !== 'lvec') { ctx.beginPath(); ctx.moveTo(x1 - hs, yy - hs * 0.75); ctx.lineTo(x1, yy); ctx.lineTo(x1 - hs, yy + hs * 0.75); ctx.stroke(); }
                if (kind !== 'vec') { ctx.beginPath(); ctx.moveTo(x0 + hs, yy - hs * 0.75); ctx.lineTo(x0, yy); ctx.lineTo(x0 + hs, yy + hs * 0.75); ctx.stroke(); }
            } else if (kind === 'hat') {
                var cx = x + w / 2 * u, hh = 0.1 * sc * u; ctx.beginPath(); ctx.moveTo(cx - hh * 1.2, yy + hh * 0.6); ctx.lineTo(cx, yy - hh * 0.6); ctx.lineTo(cx + hh * 1.2, yy + hh * 0.6); ctx.stroke();
            } else if (kind === 'tilde') {
                var cx2 = x + w / 2 * u, tw = Math.min(w * u / 2, 0.25 * sc * u), q = 0.045 * sc * u; ctx.beginPath(); ctx.moveTo(cx2 - tw, yy + q); ctx.bezierCurveTo(cx2 - tw / 2, yy - 2 * q, cx2 - tw / 4, yy - 2 * q, cx2, yy); ctx.bezierCurveTo(cx2 + tw / 4, yy + 2 * q, cx2 + tw / 2, yy + 2 * q, cx2 + tw, yy - q); ctx.stroke();
            } else if (kind === 'dot' || kind === 'ddot') {
                var cx3 = x + w / 2 * u, r = 0.03 * sc * u; var xs = kind === 'dot' ? [cx3] : [cx3 - 0.07 * sc * u, cx3 + 0.07 * sc * u];
                xs.forEach(function (px) { ctx.beginPath(); ctx.arc(px, yy, r * 1.3, 0, 7); ctx.fill(); });
            } else if (kind === 'arc') {
                ctx.beginPath(); ctx.moveTo(x + 0.03 * sc * u, yy + 0.05 * sc * u); ctx.quadraticCurveTo(x + w / 2 * u, yy - 0.12 * sc * u, x + (w - 0.03 * sc) * u, yy + 0.05 * sc * u); ctx.stroke();
            }
        });
    }
    function layArr(n, sc) {
        var T = n.top ? layNode(n.top, sc * 0.7) : null, L = n.bot ? layNode(n.bot, sc * 0.7) : null;
        var len = Math.max(0.9 * sc, (T ? T.w : 0) + 0.3 * sc, (L ? L.w : 0) + 0.3 * sc), g = 0.1 * sc, ax = AXIS * sc;
        var a = ax + 0.1 * sc + (T ? g + T.a + T.d : 0), d = Math.max(0, (L ? L.a + L.d + g - ax + 0.05 * sc : 0));
        var ch = n.ch;
        return box(len + 0.2 * sc, a, d, function (ctx, u, x, y) {
            var x0 = x + 0.1 * sc * u, x1 = x + (len + 0.1 * sc) * u, yy = y - ax * u, hs = 0.09 * sc * u;
            ctx.lineWidth = Math.max(1, 0.05 * sc * u); ctx.lineJoin = 'miter';
            var head = function (xx, y0, dir, half) {
                ctx.beginPath(); ctx.moveTo(xx - dir * hs, y0 + (half === 'u' ? 0 : -hs * 0.75)); ctx.lineTo(xx, y0);
                if (half !== 'd' && half !== 'u') ctx.lineTo(xx - dir * hs, y0 + hs * 0.75); ctx.stroke();
            };
            if (/[\u21CC\u21CB\u21C4]/.test(ch)) {
                var y1 = yy - 0.05 * sc * u, y2 = yy + 0.05 * sc * u;
                ln(ctx, u, x0, y1, x1, y1, 0.05 * sc); ln(ctx, u, x0, y2, x1, y2, 0.05 * sc);
                ctx.beginPath(); ctx.moveTo(x1 - hs, y1 - hs * 0.8); ctx.lineTo(x1, y1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x0 + hs, y2 + hs * 0.8); ctx.lineTo(x0, y2); ctx.stroke();
            } else {
                var dbl = /[\u21D2\u21D0\u21D4\u27F9]/.test(ch);
                var L1 = /[\u2190\u21D0\u2194\u21D4\u27F5]/.test(ch), R1 = !/[\u2190\u21D0\u27F5]/.test(ch);
                if (dbl) { ln(ctx, u, x0, yy - 0.04 * sc * u, x1, yy - 0.04 * sc * u, 0.045 * sc); ln(ctx, u, x0, yy + 0.04 * sc * u, x1, yy + 0.04 * sc * u, 0.045 * sc); }
                else ln(ctx, u, x0, yy, x1, yy, 0.05 * sc);
                if (R1) head(x1, yy, 1); if (L1) head(x0, yy, -1);
            }
            if (T) T.draw(ctx, u, x + (len + 0.2 * sc - T.w) / 2 * u, y - (ax + 0.1 * sc + g + T.d) * u + 0);
            if (L) L.draw(ctx, u, x + (len + 0.2 * sc - L.w) / 2 * u, y + (L.a + g - ax + 0.02 * sc) * u);
        });
    }
    function delimW(c, sc) { return ({ '(': 0.33, ')': 0.33, '[': 0.3, ']': 0.3, '{': 0.42, '}': 0.42, '|': 0.16, '\u2016': 0.26, '\u27E8': 0.3, '\u27E9': 0.3, '\u230A': 0.3, '\u230B': 0.3, '\u2308': 0.3, '\u2309': 0.3, '\u2225': 0.26, '<': 0.3, '>': 0.3 }[c] || 0.3) * sc; }
    function drawDelim(ctx, u, c, x, y, top, bot, sc) {   // top/bot: em, so với đường cơ sở (top > 0)
        var w = delimW(c, sc) * u, yt = y - top * u, yb = y + bot * u, xl = x + 0.06 * u * sc, xr = x + w - 0.06 * u * sc, ym = (yt + yb) / 2, q = Math.min(0.14 * sc * u, (yb - yt) / 6);
        ctx.lineWidth = Math.max(1, 0.05 * sc * u); ctx.lineJoin = 'miter'; ctx.beginPath();
        switch (c) {
            case '(': ctx.moveTo(xr, yt); ctx.quadraticCurveTo(xl - (xr - xl) * 0.3, ym, xr, yb); break;
            case ')': ctx.moveTo(xl, yt); ctx.quadraticCurveTo(xr + (xr - xl) * 0.3, ym, xl, yb); break;
            case '[': ctx.moveTo(xr, yt); ctx.lineTo(xl, yt); ctx.lineTo(xl, yb); ctx.lineTo(xr, yb); break;
            case ']': ctx.moveTo(xl, yt); ctx.lineTo(xr, yt); ctx.lineTo(xr, yb); ctx.lineTo(xl, yb); break;
            case '{': { var xm = (xl + xr) / 2 + 0.03 * sc * u; ctx.moveTo(xr, yt); ctx.quadraticCurveTo(xm, yt, xm, yt + q); ctx.lineTo(xm, ym - q); ctx.quadraticCurveTo(xm, ym, xl, ym); ctx.quadraticCurveTo(xm, ym, xm, ym + q); ctx.lineTo(xm, yb - q); ctx.quadraticCurveTo(xm, yb, xr, yb); break; }
            case '}': { var xm2 = (xl + xr) / 2 - 0.03 * sc * u; ctx.moveTo(xl, yt); ctx.quadraticCurveTo(xm2, yt, xm2, yt + q); ctx.lineTo(xm2, ym - q); ctx.quadraticCurveTo(xm2, ym, xr, ym); ctx.quadraticCurveTo(xm2, ym, xm2, ym + q); ctx.lineTo(xm2, yb - q); ctx.quadraticCurveTo(xm2, yb, xl, yb); break; }
            case '|': ctx.moveTo((xl + xr) / 2, yt); ctx.lineTo((xl + xr) / 2, yb); break;
            case '\u2016': case '\u2225': ctx.moveTo(xl + (xr - xl) * 0.25, yt); ctx.lineTo(xl + (xr - xl) * 0.25, yb); ctx.moveTo(xl + (xr - xl) * 0.75, yt); ctx.lineTo(xl + (xr - xl) * 0.75, yb); break;
            case '\u27E8': case '<': ctx.moveTo(xr, yt); ctx.lineTo(xl, ym); ctx.lineTo(xr, yb); break;
            case '\u27E9': case '>': ctx.moveTo(xl, yt); ctx.lineTo(xr, ym); ctx.lineTo(xl, yb); break;
            case '\u230A': ctx.moveTo(xl, yt); ctx.lineTo(xl, yb); ctx.lineTo(xr, yb); break;
            case '\u230B': ctx.moveTo(xr, yt); ctx.lineTo(xr, yb); ctx.lineTo(xl, yb); break;
            case '\u2308': ctx.moveTo(xr, yt); ctx.lineTo(xl, yt); ctx.lineTo(xl, yb); break;
            case '\u2309': ctx.moveTo(xl, yt); ctx.lineTo(xr, yt); ctx.lineTo(xr, yb); break;
        }
        ctx.stroke();
    }
    function layFen(n, sc) {
        var b = layNode(n.b, sc);
        var ax = AXIS * sc, half = Math.max(b.a - ax, b.d + ax, 0.45 * sc) + 0.06 * sc, top = ax + half, bot = half - ax;
        var wl = n.l ? delimW(n.l, sc) : 0, wr = n.r ? delimW(n.r, sc) : 0;
        return box(wl + b.w + wr, top, bot, function (ctx, u, x, y) {
            if (n.l) drawDelim(ctx, u, n.l, x, y, top, bot, sc);
            b.draw(ctx, u, x + wl * u, y);
            if (n.r) drawDelim(ctx, u, n.r, x + (wl + b.w) * u, y, top, bot, sc);
        });
    }
    function layPile(n, sc) {
        var rows = n.rows.map(function (r) { return layNode(r, sc); });
        var w = rows.reduce(function (m, r) { return Math.max(m, r.w); }, 0), ys = [], y = 0, gap = 0.3 * sc;
        rows.forEach(function (r, i) { if (i === 0) y = 0; else y += rows[i - 1].d + gap + r.a; ys.push(y); });
        var h = ys[ys.length - 1] || 0, shift = h / 2 - AXIS * sc * 0;   // căn giữa quanh trục
        var a = rows[0].a + shift, d = rows[rows.length - 1].d + h - shift;
        return box(w, a, d, function (ctx, u, x, yb) {
            rows.forEach(function (r, i) {
                var dx = n.al === 'l' ? 0 : n.al === 'r' ? (w - r.w) : (w - r.w) / 2;
                r.draw(ctx, u, x + dx * u, yb + (ys[i] - shift) * u);
            });
        });
    }
    function layMat(n, sc) {
        var cells = n.rows.map(function (r) { return r.map(function (c) { return layNode(c, sc); }); });
        var cw = [], i, j;
        for (j = 0; j < n.cols; j++) cw[j] = cells.reduce(function (m, r) { return Math.max(m, r[j].w); }, 0);
        var gapX = 0.8 * sc, gapY = 0.3 * sc, ys = [], y = 0, ra = [], rd = [];
        cells.forEach(function (r, ri) { ra[ri] = Math.max.apply(null, r.map(function (c) { return c.a; })); rd[ri] = Math.max.apply(null, r.map(function (c) { return c.d; })); if (ri === 0) y = 0; else y += rd[ri - 1] + gapY + ra[ri]; ys.push(y); });
        var h = ys[ys.length - 1] || 0, shift = h / 2;
        var w = cw.reduce(function (a, b) { return a + b; }, 0) + gapX * (n.cols - 1);
        return box(w, ra[0] + shift, rd[rd.length - 1] + h - shift, function (ctx, u, x, yb) {
            cells.forEach(function (r, ri) {
                var xx = x;
                r.forEach(function (c, ci) { c.draw(ctx, u, xx + (cw[ci] - c.w) / 2 * u, yb + (ys[ri] - shift) * u); xx += (cw[ci] + gapX) * u; });
            });
        });
    }

    /* ---------- Vẽ ra PNG ---------- */
    var PT = 12, K = 6;   // cỡ chữ 12 pt, mỗi pt = 6 điểm ảnh
    MT.preview = function (ir) {
        var bx = layNode(ir, 1), pad = 0.05;
        var W = bx.w + 2 * pad, H = bx.a + bx.d + 2 * pad;
        var u = PT * K, cw = Math.max(2, Math.ceil(W * u)), ch = Math.max(2, Math.ceil(H * u));
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.textBaseline = 'alphabetic';
        bx.draw(ctx, u, pad * u, (bx.a + pad) * u);
        var url = c.toDataURL('image/png'), b64 = url.split(',')[1], bin = atob(b64), png = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) png[i] = bin.charCodeAt(i);
        return { png: png, wPt: W * PT, hPt: H * PT, dPt: (bx.d + pad) * PT };
    };
    MT.layout = function (ir) { return layNode(ir, 1); };

    var CACHE = {};
    MT.make = function (latex) {
        var r = CACHE[latex];
        if (r) return r;
        var ir = MT.latexToIR(latex), mtef = MT.irToMtef(ir), pv = MT.preview(ir);
        r = CACHE[latex] = { ole: MT.buildOle(mtef), png: pv.png, wPt: pv.wPt, hPt: pv.hPt, dPt: pv.dPt, mtef: mtef };
        return r;
    };
})(typeof window !== 'undefined' ? window : globalThis);

// === [code93-mix] ===
/* ============================================================
   [CODE93] TRỘN ĐỀ THI – nhập đề từ Word, trộn nhiều mã đề, xuất file Word (.docx) đề + đáp án
   Phần 1: tiện ích XML, đổi công thức LaTeX -> công thức Word (OMML), đổi văn bản có định dạng -> run Word
   ============================================================ */
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var LS_KEY = 'code93_mix_cfg_v1';

    /* ---------- 1. Tiện ích XML ---------- */
    var X = function (s) {
        return String(s == null ? '' : s)
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    var decodeEnt = function (s) {
        return String(s).replace(/&nbsp;/g, '\u00A0').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    };
    var TBL_RE_SRC = '@@TBL_([A-Za-z0-9+/=_-]+)@@';
    var IMG_RE = /@@IMG_([A-Za-z0-9+\/=_-]+)(?:~(\d+)x(\d+))?@@/y;
    var TEXT_W = 10037;            // bề ngang vùng chữ A4, lề 1,5 cm (giống file mẫu)
    var MAX_IMG_EMU = 6300000;     // ảnh rộng tối đa ~17,5 cm

    /* ---------- 2. LaTeX -> OMML (qua MathML của KaTeX) ---------- */
    var tn = function (el) { return String((el && (el.localName || el.nodeName)) || '').toLowerCase(); };
    var kids = function (el) {
        return Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 1 && !/^annotation/.test(tn(n)); });
    };
    var txt = function (el) { return el.textContent || ''; };
    var MFONT = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:eastAsia="Cambria Math" w:cs="Cambria Math"/><w:i w:val="0"/><w:iCs w:val="0"/></w:rPr>';
    var MFONT_B = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:eastAsia="Cambria Math" w:cs="Cambria Math"/><w:b/><w:bCs/><w:i w:val="0"/><w:iCs w:val="0"/></w:rPr>';
    var mrun = function (text, o) {
        o = o || {};
        if (text === '' || text == null) return '';
        var isB = (o.sty === 'b');
        var rp = '<m:nor/><m:sty m:val="' + (isB ? 'b' : 'p') + '"/>';
        return '<m:r><m:rPr>' + rp + '</m:rPr>' + (isB ? MFONT_B : MFONT) + '<m:t xml:space="preserve">' + X(text) + '</m:t></m:r>';
    };
    var NARY_RE = /^[\u2211\u220F\u2210\u222B\u222C\u222D\u222E\u22C3\u22C2\u22C1\u22C0]$/;
    var isNary = function (n) { return n && tn(n) === 'mo' && NARY_RE.test(txt(n).trim()); };
    var isFence = function (n) { return tn(n) === 'mo' && n.getAttribute('fence') === 'true'; };
    var BB = { R: '\u211D', Z: '\u2124', N: '\u2115', Q: '\u211A', C: '\u2102' };
    var ACC = { '\u2192': '\u20D7', '\u20D7': '\u20D7', '^': '\u0302', '\u02C6': '\u0302', '~': '\u0303', '\u02DC': '\u0303', '\u02D9': '\u0307', '\u00A8': '\u0308', '\u02C7': '\u030C', '\u2190': '\u20D6', '\u00B4': '\u0301', '`': '\u0300' };
    var BARS = /^[\u00AF\u203E\u2015_\u2212\u2012\u2013\u2014\-]$/;

    function cvList(nodes) { return nodes.map(cv).join(''); }
    function cvKids(el) { return cvList(kids(el)); }
    function E(inner) { return '<m:e>' + inner + '</m:e>'; }
    function dlm(open, close, inner) {
        return '<m:d><m:dPr><m:begChr m:val="' + X(open) + '"/><m:endChr m:val="' + X(close) + '"/><m:grow m:val="1"/></m:dPr>' + E(inner) + '</m:d>';
    }
    function nary(base, sub, sup, under) {
        var ch = txt(base).trim();
        var integral = /^[\u222B\u222C\u222D\u222E]$/.test(ch);
        var pr = '<m:chr m:val="' + X(ch) + '"/><m:limLoc m:val="' + (integral && !under ? 'subSup' : 'undOvr') + '"/>' +
            (sub ? '' : '<m:subHide m:val="1"/>') + (sup ? '' : '<m:supHide m:val="1"/>');
        return '<m:nary><m:naryPr>' + pr + '</m:naryPr><m:sub>' + (sub ? cv(sub) : '') + '</m:sub><m:sup>' + (sup ? cv(sup) : '') + '</m:sup><m:e></m:e></m:nary>';
    }
    function accentOf(over) {   // phần trên là 1 dấu mũi tên / mũ / ngã... ?
        var o = over;
        while (o && /^(mstyle|mpadded|mrow)$/.test(tn(o)) && kids(o).length === 1) o = kids(o)[0];
        if (o && tn(o) === 'mo') return txt(o).trim();
        return null;
    }
    function cvTable(el) {
        var rows = kids(el).filter(function (r) { return tn(r) === 'mtr'; });
        var grid = rows.map(function (r) { return kids(r).map(function (c) { return cvKids(c); }); });
        var cols = grid.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        var aligned = cols === 2 && /^right/.test(el.getAttribute('columnalign') || '');
        if (cols <= 1 || aligned) {
            return '<m:eqArr><m:eqArrPr><m:maxDist m:val="1"/></m:eqArrPr>' + grid.map(function (r) { return E(r.join('')); }).join('') + '</m:eqArr>';
        }
        return '<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="' + cols + '"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>' +
            grid.map(function (r) { var cells = r.slice(); while (cells.length < cols) cells.push(''); return '<m:mr>' + cells.map(E).join('') + '</m:mr>'; }).join('') + '</m:m>';
    }
    function cv(el) {
        var t = tn(el), k;
        switch (t) {
            case 'math': case 'semantics': case 'mstyle': case 'mpadded': case 'mtd': case 'mtr': case 'menclose': case 'merror':
                if (t === 'menclose' && /box|circle|roundedbox/.test(el.getAttribute('notation') || '')) return '<m:borderBox><m:borderBoxPr/>' + E(cvKids(el)) + '</m:borderBox>';
                return cvKids(el);
            case 'mphantom': case 'annotation': case 'annotation-xml': return '';
            case 'mrow': {
                k = kids(el);
                if (k.length >= 2 && isFence(k[0]) && isFence(k[k.length - 1])) {
                    return dlm(txt(k[0]).trim(), txt(k[k.length - 1]).trim(), cvList(k.slice(1, -1)));
                }
                if (k.length >= 2 && isFence(k[0]) && /^[{\[(|]$/.test(txt(k[0]).trim())) return dlm(txt(k[0]).trim(), '', cvList(k.slice(1)));   // \left\{ ... \right.
                if (k.length >= 2 && isFence(k[k.length - 1]) && /^[}\])|]$/.test(txt(k[k.length - 1]).trim())) return dlm('', txt(k[k.length - 1]).trim(), cvList(k.slice(0, -1)));
                return cvList(k);
            }
            case 'mi': {
                var s = txt(el), mv = el.getAttribute('mathvariant') || '';
                if (mv === 'double-struck' && BB[s]) return mrun(BB[s], { sty: 'p' });
                var sty = mv === 'bold' ? 'b' : mv === 'bold-italic' ? 'bi' : (mv === 'normal' || s.length > 1) ? 'p' : '';
                return mrun(s, { sty: sty });
            }
            case 'mn': return mrun(txt(el));
            case 'mo': return el.children && el.children.length ? cvKids(el) : mrun(txt(el));
            case 'mtext': return mrun(txt(el).replace(/\u00A0/g, ' '), { nor: true });
            case 'mspace': return /^-/.test(el.getAttribute('width') || '') ? '' : mrun('\u2009');
            case 'mfrac': {
                k = kids(el);
                var lt = el.getAttribute('linethickness');
                var nb = lt !== null && /^0(\.0*)?(px|em|ex|pt)?$/.test(lt.trim());
                return '<m:f>' + (nb ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : '') + '<m:num>' + cv(k[0]) + '</m:num><m:den>' + cv(k[1] || k[0]) + '</m:den></m:f>';
            }
            case 'msqrt': return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg></m:deg>' + E(cvKids(el)) + '</m:rad>';
            case 'mroot': k = kids(el); return '<m:rad><m:radPr/><m:deg>' + cv(k[1]) + '</m:deg>' + E(cv(k[0])) + '</m:rad>';
            case 'msup': k = kids(el); if (isNary(k[0])) return nary(k[0], null, k[1]); return '<m:sSup><m:sSupPr/>' + E(cv(k[0])) + '<m:sup>' + cv(k[1]) + '</m:sup></m:sSup>';
            case 'msub': k = kids(el); if (isNary(k[0])) return nary(k[0], k[1], null); return '<m:sSub><m:sSubPr/>' + E(cv(k[0])) + '<m:sub>' + cv(k[1]) + '</m:sub></m:sSub>';
            case 'msubsup': k = kids(el); if (isNary(k[0])) return nary(k[0], k[1], k[2]); return '<m:sSubSup><m:sSubSupPr/>' + E(cv(k[0])) + '<m:sub>' + cv(k[1]) + '</m:sub><m:sup>' + cv(k[2]) + '</m:sup></m:sSubSup>';
            case 'munder': {
                k = kids(el);
                if (isNary(k[0])) return nary(k[0], k[1], null, true);
                var u = accentOf(k[1]);
                if (u !== null && BARS.test(u)) return '<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr>' + E(cv(k[0])) + '</m:bar>';
                return '<m:limLow><m:limLowPr/>' + E(cv(k[0])) + '<m:lim>' + cv(k[1]) + '</m:lim></m:limLow>';
            }
            case 'mover': {
                k = kids(el);
                var a = accentOf(k[1]);
                if (a !== null && a !== '') {
                    if (/^[\u00AF\u203E\u2015]$/.test(a) || (a === '-' || a === '_')) return '<m:bar><m:barPr><m:pos m:val="top"/></m:barPr>' + E(cv(k[0])) + '</m:bar>';
                    var baseTxt = txt(k[0]).replace(/\s+/g, '');
                    if (/^[\u2192\u2190\u2194\u20D7]$/.test(a) && baseTxt.length > 1 && !/^[\u2192\u2190\u2194]$/.test(baseTxt)) {
                        return '<m:groupChr><m:groupChrPr><m:chr m:val="' + X(a === '\u20D7' ? '\u2192' : a) + '"/><m:pos m:val="top"/><m:vertJc m:val="bot"/></m:groupChrPr>' + E(cv(k[0])) + '</m:groupChr>';
                    }
                    if (ACC[a] && !/^[\u2192\u2190\u2194]$/.test(baseTxt)) return '<m:acc><m:accPr><m:chr m:val="' + X(ACC[a]) + '"/></m:accPr>' + E(cv(k[0])) + '</m:acc>';
                }
                return '<m:limUpp><m:limUppPr/>' + E(cv(k[0])) + '<m:lim>' + cv(k[1]) + '</m:lim></m:limUpp>';
            }
            case 'munderover': {
                k = kids(el);
                if (isNary(k[0])) return nary(k[0], k[1], k[2], true);
                return '<m:limUpp><m:limUppPr/>' + E('<m:limLow><m:limLowPr/>' + E(cv(k[0])) + '<m:lim>' + cv(k[1]) + '</m:lim></m:limLow>') + '<m:lim>' + cv(k[2]) + '</m:lim></m:limUpp>';
            }
            case 'mtable': return cvTable(el);
            default: return cvKids(el);
        }
    }
    function rawMath(s) { return '<m:oMath>' + mrun(s, { nor: true }) + '</m:oMath>'; }
    function latexToOmml(latex) {
        var s = String(latex || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
        if (!s) return '';
        var bb = { '\u211D': 'R', '\u2124': 'Z', '\u2115': 'N', '\u211A': 'Q', '\u2102': 'C' };
        s = s.replace(/[\u211D\u2124\u2115\u211A\u2102]/g, function (ch) { return '\\mathbb{' + bb[ch] + '}'; });
        s = s.replace(/(\d),(?=\d)/g, '$1{,}');
        if (typeof katex === 'undefined') return rawMath(s);
        try {
            var html = katex.renderToString(s, { throwOnError: false, strict: false, output: 'mathml' });
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var math = doc.querySelector('math');
            if (!math) return rawMath(s);
            var out = cv(math);
            if (!out) return rawMath(s);
            return '<m:oMath>' + out + '</m:oMath>';
        } catch (e) {
            return rawMath(s);
        }
    }

    /* ---------- 3. Văn bản có định dạng -> run Word ---------- */
    function rPr(f) {
        var o = '';
        if (f.b) o += '<w:b/><w:bCs/>'; else if (f.nb) o += '<w:b w:val="0"/><w:bCs w:val="0"/>';
        if (f.i) o += '<w:i/><w:iCs/>';
        if (f.color) o += '<w:color w:val="' + f.color + '"/>';
        if (f.sz) o += '<w:sz w:val="' + f.sz + '"/><w:szCs w:val="' + f.sz + '"/>';
        if (f.u) o += '<w:u w:val="single"/>';
        if (f.vert) o += '<w:vertAlign w:val="' + (f.vert === 'sup' ? 'superscript' : 'subscript') + '"/>';
        return o ? '<w:rPr>' + o + '</w:rPr>' : '';
    }
    function textRun(t, f) {
        if (!t) return '';
        var pr = rPr(f || {});
        return t.split('\t').map(function (part, i) {
            return (i ? '<w:r>' + pr + '<w:tab/></w:r>' : '') + (part ? '<w:r>' + pr + '<w:t xml:space="preserve">' + X(part) + '</w:t></w:r>' : '');
        }).join('');
    }
    // Bản sao các bước định dạng hóa học / chỉ số của màn hình hiển thị (formatMathAndChemHTML) để file Word giống màn hình
    function chemTransform(str) {
        str = str.replace(/\\rightleftharpoons/g, ' \u21CC ').replace(/\\leftrightarrow/g, ' \u2194 ').replace(/\\rightarrow/g, ' \u2192 ')
            .replace(/\\leftarrow/g, ' \u2190 ').replace(/\\Rightarrow/g, ' \u21D2 ').replace(/\\Leftarrow/g, ' \u21D0 ')
            .replace(/\\Leftrightarrow/g, ' \u21D4 ').replace(/\\Delta/g, '\u0394');
        str = str.replace(/\u0394([rfa])\s*H\s*(?:0|\u00B0)\s*298/gi, '\u0394<sub>$1</sub>H<sup>0</sup><sub>298</sub>');
        str = str.replace(/\bK\s*_\s*([A-Za-z0-9]+)\b/g, 'K<sub>$1</sub>');
        str = str.replace(/\bK(C|P|a|b|w|sp)\b/g, 'K<sub>$1</sub>');
        str = str.replace(/([A-Za-z\)\]])(\d+)(?=[A-Za-z\(\[\s\.\,\;\:\+\-\=\u2192\u21CC\)\]]|$)/g, function (m, p1, p2) {
            if (/^[A-DF-Z]$/.test(p1) && p2.length > 2) return m;
            return p1 + '<sub>' + p2 + '</sub>';
        });
        str = str.replace(/10\s*([\-\u2212\u2013]\d+)/g, '10<sup>$1</sup>');
        str = str.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
        str = str.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
        return str;
    }
    function tagRuns(seg, f0) {
        var f = Object.assign({}, f0), out = '';
        var re = /<(\/?)(b|strong|i|em|u|sub|sup)\s*>|<br\s*\/?>|<\/?(?:span|font|p|div|a)\b[^>]*>|\r?\n/gi;
        var last = 0, m;
        var emit = function (t) { if (t) out += textRun(decodeEnt(t), f); };
        while ((m = re.exec(seg))) {
            emit(seg.slice(last, m.index));
            last = re.lastIndex;
            if (m[2]) {
                var on = !m[1], k = m[2].toLowerCase();
                if (k === 'b' || k === 'strong') f.b = on ? true : !!f0.b;
                else if (k === 'i' || k === 'em') f.i = on ? true : !!f0.i;
                else if (k === 'u') f.u = on ? true : !!f0.u;
                else if (k === 'sub') f.vert = on ? 'sub' : f0.vert;
                else if (k === 'sup') f.vert = on ? 'sup' : f0.vert;
            } else if (/^<br/i.test(m[0]) || /^\r?\n$/.test(m[0])) {
                out += '<w:r><w:br/></w:r>';
            }
        }
        emit(seg.slice(last));
        return out;
    }
    function inlineXml(doc, str, f) {
        f = f || {};
        str = String(str == null ? '' : str).replace(new RegExp(TBL_RE_SRC, 'g'), '');
        var toks = [];
        var ph = function (x) { toks.push(x); return '\uE000' + (toks.length - 1) + '\uE001'; };
        var out = '', i = 0, n = str.length;
        while (i < n) {
            var c = str[i];
            if (c === '$') {
                if (str[i + 1] === '$') {
                    var e = str.indexOf('$$', i + 2);
                    if (e > i + 2) { out += ph({ m: str.slice(i + 2, e) }); i = e + 2; continue; }
                }
                var e1 = str.indexOf('$', i + 1);
                if (e1 > i + 1) { out += ph({ m: str.slice(i + 1, e1) }); i = e1 + 1; continue; }
            } else if (c === '\\' && str[i + 1] === '(') {
                var e2 = str.indexOf('\\)', i + 2);
                if (e2 > i + 2) { out += ph({ m: str.slice(i + 2, e2) }); i = e2 + 2; continue; }
            } else if (c === '@' && str.charCodeAt(i + 1) === 64 && str.startsWith('@@IMG_', i)) {
                IMG_RE.lastIndex = i;
                var mm = IMG_RE.exec(str);
                if (mm) { out += ph({ img: mm[0] }); i = IMG_RE.lastIndex; continue; }
            }
            out += c; i++;
        }
        out = chemTransform(out);
        var res = '';
        out.split(/\uE000(\d+)\uE001/).forEach(function (part, idx) {
            if (idx % 2 === 0) { res += tagRuns(part, f); return; }
            var tk = toks[+part];
            if (tk.m !== undefined) { doc.hasMath = true; var mtx = (doc.fmt === 'mathtype' && doc.mathObject) ? doc.mathObject(tk.m) : null; res += (mtx != null ? mtx : latexToOmml(tk.m)); }
            else if (tk.img) res += doc.imageRun(tk.img);
        });
        return res;
    }

    window.__CODE93_CORE = { X: X, esc: esc, LS_KEY: LS_KEY, TEXT_W: TEXT_W, MAX_IMG_EMU: MAX_IMG_EMU, TBL_RE_SRC: TBL_RE_SRC, IMG_RE: IMG_RE,
        latexToOmml: latexToOmml, inlineXml: inlineXml, rPr: rPr, textRun: textRun, decodeEnt: decodeEnt, mrun: mrun, $: $ };
})();

/* ============================================================
   [CODE93] Phần 2: dựng file Word (.docx) – đề thi, đề có đáp án, bảng đáp án tổng hợp
   ============================================================ */
(function () {
    'use strict';
    var C = window.__CODE93_CORE;
    var X = C.X, inlineXml = C.inlineXml, decodeEnt = C.decodeEnt, TEXT_W = C.TEXT_W;
    var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word"';

    /* ---------- Ảnh (token @@IMG_..@@) ---------- */
    var IMGCACHE = new Map();
    function b64ToBytes(b64) {
        var bin = atob(b64), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
    }
    function loadImg(src) {
        return new Promise(function (res) {
            var im = new Image();
            im.onload = function () { res(im); };
            im.onerror = function () { res(null); };
            im.src = src;
        });
    }
    async function prepareOneImage(token) {
        if (IMGCACHE.has(token)) return;
        var m = /^@@IMG_([A-Za-z0-9+\/=_-]+)(?:~(\d+)x(\d+))?@@$/.exec(token);
        if (!m) return;
        var dataUrl;
        try { dataUrl = decodeURIComponent(escape(atob(m[1]))); } catch (e) { return; }
        var alx = ''; dataUrl = dataUrl.replace(/#al=([crjlLR])$/, function (_, a) { alx = a; return ''; });   // [CODE161]
        var mm = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
        if (!mm) return;
        var mime = mm[1].toLowerCase(), bytes = null, ext = '';
        var w = m[2] ? +m[2] : 0, h = m[3] ? +m[3] : 0;
        if (mime === 'image/png') ext = 'png'; else if (mime === 'image/jpeg' || mime === 'image/jpg') ext = 'jpeg'; else if (mime === 'image/gif') ext = 'gif';
        if (ext) {
            try { bytes = b64ToBytes(mm[2]); } catch (e) { return; }
            if (!w || !h) { var im = await loadImg(dataUrl); if (im) { w = im.naturalWidth; h = im.naturalHeight; } }
        } else {   // webp / svg / bmp ... -> PNG bằng canvas
            var im2 = await loadImg(dataUrl);
            if (!im2) return;
            var cw = im2.naturalWidth || w || 300, ch = im2.naturalHeight || h || 200;
            var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
            var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch); cx.drawImage(im2, 0, 0, cw, ch);
            var blob = await new Promise(function (r) { cv.toBlob(r, 'image/png'); });
            if (!blob) return;
            bytes = new Uint8Array(await blob.arrayBuffer()); ext = 'png';
            if (!w || !h) { w = cw; h = ch; }
        }
        if (!w || !h) { w = 300; h = 200; }
        var cxE = Math.round(w * 9525), cyE = Math.round(h * 9525);
        if (cxE > C.MAX_IMG_EMU) { cyE = Math.round(cyE * C.MAX_IMG_EMU / cxE); cxE = C.MAX_IMG_EMU; }
        IMGCACHE.set(token, { bytes: bytes, ext: ext, cx: cxE, cy: cyE, al: alx.toLowerCase(), fl: /^[LR]$/.test(alx) ? alx : '' });   // [CODE169] fl: ảnh nổi có chữ bao quanh
    }
    async function prepareImages(texts) {
        var seen = {}, list = [];
        texts.forEach(function (t) {
            var re = /@@IMG_[A-Za-z0-9+\/=_-]+(?:~\d+x\d+)?@@/g, mm;
            t = String(t || '');
            while ((mm = re.exec(t))) { if (!seen[mm[0]]) { seen[mm[0]] = 1; list.push(mm[0]); } }
            // ảnh nằm trong ô bảng (token bảng là JSON base64)
            var tr = new RegExp(C.TBL_RE_SRC, 'g'), tm;
            while ((tm = tr.exec(t))) {
                var d = decodeTable(tm[1]);
                if (d && d.rows) d.rows.forEach(function (row) { row.forEach(function (c) {
                    var s = String((c && c.t) || ''), r2 = /@@IMG_[A-Za-z0-9+\/=_-]+(?:~\d+x\d+)?@@/g, m2;
                    while ((m2 = r2.exec(s))) { if (!seen[m2[0]]) { seen[m2[0]] = 1; list.push(m2[0]); } }
                }); });
            }
        });
        for (var i = 0; i < list.length; i++) await prepareOneImage(list[i]);
    }
    function decodeTable(b64) {
        try { return JSON.parse(decodeURIComponent(escape(atob(b64)))); } catch (e) { return null; }
    }

    /* ---------- Tài liệu ---------- */
    function Doc() { this.body = []; this.rels = []; this.media = {}; this.embeds = {}; this.relN = 0; this.pid = 0; this.imgs = new Map(); this.hasMath = false; this.fmt = (window.__CODE94_FMT === 'omml') ? 'omml' : 'mathtype'; this.shapeType = false; }
    var SHAPETYPE = '<v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/><v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/><v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/><v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/><v:f eqn="sum @10 21600 0"/></v:formulas><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype>';
    // [CODE94] Công thức = đối tượng MathType thật (OLE Equation.DSMT4) + ảnh xem trước; bấm đúp trong Word để sửa bằng MathType
    Doc.prototype.mathObject = function (latex) {
        if (!String(latex || '').trim()) return '';
        var MTx = window.MT93, m;
        try { m = MTx.make(String(latex).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch (e) { return null; }
        if (!m || !m.ole || !m.png) return null;
        var n = ++this.relN, img = 'mt' + n + '.png', ole = 'oleObject' + n + '.bin', sid = '_x0000_i' + (1024 + n);
        this.media[img] = m.png; this.embeds[ole] = m.ole;
        this.rels.push('<Relationship Id="rIdMi' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + img + '"/>');
        this.rels.push('<Relationship Id="rIdMo' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="embeddings/' + ole + '"/>');
        var st = ''; if (!this.shapeType) { st = SHAPETYPE; this.shapeType = true; }
        var w = m.wPt.toFixed(1), h = m.hPt.toFixed(1), pos = -Math.round(m.dPt * 2);
        return '<w:r><w:rPr><w:position w:val="' + pos + '"/></w:rPr><w:object w:dxaOrig="' + Math.round(m.wPt * 20) + '" w:dyaOrig="' + Math.round(m.hPt * 20) + '">' + st +
            '<v:shape id="' + sid + '" type="#_x0000_t75" style="width:' + w + 'pt;height:' + h + 'pt" o:ole=""><v:imagedata r:id="rIdMi' + n + '" o:title=""/></v:shape>' +
            '<o:OLEObject Type="Embed" ProgID="Equation.DSMT4" ShapeID="' + sid + '" DrawAspect="Content" ObjectID="_' + String(1300000000 + n) + '" r:id="rIdMo' + n + '"/></w:object></w:r>';
    };
    Doc.prototype.imageRun = function (token) {
        var info = IMGCACHE.get(token);
        if (!info) return '';
        var rid = this.imgs.get(token);
        if (!rid) {
            this.relN++; rid = 'rIdImg' + this.relN;
            var name = 'image' + this.relN + '.' + info.ext;
            this.imgs.set(token, rid);
            this.media[name] = info.bytes;
            this.rels.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + name + '"/>');
        }
        var id = ++this.pid;
        if (info.fl) {   // [CODE169] ảnh nổi: neo trong đoạn, chữ bao quanh (wrapSquare) đúng như file nguồn
            var side = info.fl === 'R' ? 'right' : 'left';
            return '<w:r><w:drawing><wp:anchor distT="0" distB="91440" distL="' + (side === 'left' ? '0' : '137160') + '" distR="' + (side === 'left' ? '137160' : '0') + '" simplePos="0" relativeHeight="' + (251658240 + id) + '" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="0">' +
                '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>' + side + '</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>' +
                '<wp:extent cx="' + info.cx + '" cy="' + info.cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="' + id + '" name="Hinh ' + id + '"/><wp:cNvGraphicFramePr/>' +
                '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="Hinh ' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
                '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
                '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + info.cx + '" cy="' + info.cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>';
        }
        return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + info.cx + '" cy="' + info.cy + '"/><wp:docPr id="' + id + '" name="Hinh ' + id + '"/>' +
            '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="Hinh ' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
            '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
            '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + info.cx + '" cy="' + info.cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    };

    /* ---------- Đoạn văn / bảng ---------- */
    function P(inner, o) {
        o = o || {};
        var pp = '';
        if (o.keepNext) pp += '<w:keepNext/>';
        if (o.pageBreakBefore) pp += '<w:pageBreakBefore/>';
        if (o.tabs) pp += '<w:tabs>' + o.tabs.map(function (t) { return '<w:tab w:val="' + (t.v || 'left') + '" w:pos="' + t.pos + '"/>'; }).join('') + '</w:tabs>';
        if (o.before != null || o.after != null || o.line) pp += '<w:spacing' + (o.before != null ? ' w:before="' + o.before + '"' : '') + (o.after != null ? ' w:after="' + o.after + '"' : '') + (o.line ? ' w:line="' + o.line + '" w:lineRule="' + (o.lineRule || 'auto') + '"' : '') + '/>';
        if (o.left != null || o.hanging != null || o.firstLine != null) pp += '<w:ind' + (o.left != null ? ' w:left="' + o.left + '"' : '') + (o.hanging != null ? ' w:hanging="' + o.hanging + '"' : '') + (o.firstLine != null ? ' w:firstLine="' + o.firstLine + '"' : '') + '/>';
        if (o.jc) pp += '<w:jc w:val="' + o.jc + '"/>';
        return '<w:p>' + (pp ? '<w:pPr>' + pp + '</w:pPr>' : '') + (inner || '') + '</w:p>';
    }
    var SPACER = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>';
    function cellXml(doc, c, w, span, vm, o) {
        o = o || {};
        var pr = '<w:tcW w:w="' + w + '" w:type="dxa"/>';
        if (span > 1) pr += '<w:gridSpan w:val="' + span + '"/>';
        if (vm === 'restart') pr += '<w:vMerge w:val="restart"/>'; else if (vm === 'cont') pr += '<w:vMerge/>';
        if (c && c.bg && /^[0-9a-f]{6}$/i.test(c.bg)) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + c.bg + '"/>';
        var va = c && c.va;
        pr += '<w:vAlign w:val="' + (va === 'center' ? 'center' : va === 'bottom' ? 'bottom' : 'top') + '"/>';
        var jc = c && c.al === 'c' ? 'center' : c && c.al === 'r' ? 'right' : 'left';
        var f = o.f || {};
        var lines = String((c && c.t) || '').split(/\r?\n/);
        var ps = lines.map(function (ln) {
            var jcL = jc, mk = /\u2060{2,4}[ \t]*$/.exec(ln);   // [CODE167] căn lề riêng của từng đoạn trong ô
            if (mk) { var nn = mk[0].trim().length; jcL = nn === 3 ? 'center' : nn === 4 ? 'right' : 'left'; ln = ln.slice(0, mk.index); }
            ln = ln.replace(/\u2060{2,4}/g, '');
            return P(inlineXml(doc, ln, f), { jc: jcL, before: 20, after: 20, line: 252 });
        }).join('');
        return '<w:tc><w:tcPr>' + pr + '</w:tcPr>' + (ps || P('')) + '</w:tc>';
    }
    // bảng dữ liệu của câu hỏi (token @@TBL@@)
    function tableXml(doc, data) {
        if (!data || !Array.isArray(data.rows) || !data.rows.length) return '';
        var ncol = 0;
        data.rows.forEach(function (r) { var s = 0; r.forEach(function (c) { s += Math.max(1, parseInt(c.cs, 10) || 1); }); ncol = Math.max(ncol, s); });
        var ws = Array.isArray(data.w) ? data.w.filter(function (n) { return n > 0; }) : [];
        if (ws.length !== ncol) ws = new Array(ncol).fill(Math.floor(Math.min(TEXT_W, 9000) / Math.max(1, ncol)));
        var tot = ws.reduce(function (a, b) { return a + b; }, 0);
        if (tot > TEXT_W) { ws = ws.map(function (x) { return Math.floor(x * TEXT_W / tot); }); tot = ws.reduce(function (a, b) { return a + b; }, 0); }
        var bd = data.bd ? '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="000000"/>'; }).join('') + '</w:tblBorders>' : '';
        var out = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + (data.c ? '<w:jc w:val="center"/>' : '') + bd +
            '<w:tblLayout w:type="autofit"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' +
            ws.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>';
        var pend = [];   // pend[col] = {left, span}
        data.rows.forEach(function (row) {
            var col = 0, cells = '';
            var wAt = function (c0, sp) { var s = 0; for (var q = c0; q < c0 + sp && q < ws.length; q++) s += ws[q]; return s || ws[0]; };
            var fillPend = function () {
                while (pend[col] && pend[col].left > 0) {
                    var p = pend[col];
                    cells += cellXml(doc, null, wAt(col, p.span), p.span, 'cont');
                    p.left--; col += p.span;
                }
            };
            row.forEach(function (c) {
                fillPend();
                var cs = Math.max(1, parseInt(c.cs, 10) || 1), rs = Math.max(1, parseInt(c.rs, 10) || 1);
                cells += cellXml(doc, c, wAt(col, cs), cs, rs > 1 ? 'restart' : null);
                if (rs > 1) pend[col] = { left: rs - 1, span: cs };
                col += cs;
            });
            fillPend();
            out += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cells + '</w:tr>';
        });
        return out + '</w:tbl>';
    }
    // bảng đơn giản (đáp án, thông tin đề)
    function gridTable(doc, rows, widths, o) {
        o = o || {};
        var tot = widths.reduce(function (a, b) { return a + b; }, 0);
        var bd = o.noBorder ? '' : '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="000000"/>'; }).join('') + '</w:tblBorders>';
        var out = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + bd + '<w:tblLayout w:type="autofit"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' +
            widths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>';
        rows.forEach(function (row) {
            out += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + row.map(function (c, i) {
                var cell = typeof c === 'string' ? { t: c } : c;
                var pr = '<w:tcW w:w="' + widths[i] + '" w:type="dxa"/>' + (cell.bg ? '<w:shd w:val="clear" w:color="auto" w:fill="' + cell.bg + '"/>' : '') + '<w:vAlign w:val="center"/>';
                var ps = (cell.paras || [cell.t]).map(function (t, k) {
                    var f = cell.f || {};
                    return cell.raw ? t : P(inlineXml(doc, t, f), { jc: cell.jc || 'center', before: 30, after: 30, line: 252 });
                }).join('');
                return '<w:tc><w:tcPr>' + pr + '</w:tcPr>' + ps + '</w:tc>';
            }).join('') + '</w:tr>';
        });
        return out + '</w:tbl>';
    }
    // [CODE114] nhận diện dòng là 1 "ý" của câu: (a) (b) (c) (d) · a) b) · (1) (2) (3) · 1) 2) · (I) (II)
    var STMT_IND = 284;
    var STMT_RE = /^(?:\((?:[a-hA-H]|\d{1,2}|[ivxIVX]{1,4})\)|[a-hA-H]\)|\d{1,2}\))(?=[\s\u00A0$\\<A-Za-z\u00C0-\u1EF9]|$)/;
    function isStmtLine(ln) {
        var t = String(ln == null ? '' : ln).replace(/<\/?(?:b|strong|i|em|u|span|font)\b[^>]*>/gi, '').replace(/^[\s\u00A0]+/, '');
        return STMT_RE.test(t);
    }
    // văn bản có thể chứa bảng: tách thành đoạn + bảng
    function richBlock(doc, text, labelRuns, po, f) {
        var parts = String(text == null ? '' : text).split(new RegExp(C.TBL_RE_SRC));
        var out = [], first = true, lastP = -1, lastArgs = null;
        var pushP = function (inner, o2) { lastP = out.length; lastArgs = [inner, o2]; out.push(P(inner, o2)); };
        for (var i = 0; i < parts.length; i += 2) {
            var seg = parts[i];
            if (i > 0) seg = seg.replace(/^[ \t]*\r?\n/, '');
            if (i < parts.length - 1) seg = seg.replace(/\r?\n[ \t]*$/, '');
            if (first || seg.trim()) {
                var lines = seg.split(/\r?\n/);
                lines.forEach(function (ln, li) {
                    if (li > 0 && !ln.trim()) return;
                    // [CODE98] chỉ đoạn cuối của câu dẫn mới "dính" với phần dưới; các đoạn trước tự nhiên liền kề, không đẩy cả khối sang trang mới
                    // [CODE114] các ý (a) (b) (c) (d) / (1) (2) (3) ... thụt vào ~0,5 cm so với chữ "Câu n." (đúng mẫu đề của Bộ GD&ĐT); dòng dẫn & dòng kết ("Số phát biểu đúng là") giữ sát lề
                    var stmt = !first && isStmtLine(ln);
                    // [CODE115] dòng chỉ chứa ảnh (không kèm chữ) -> căn giữa trang cho đẹp
                    var imgOnly = /^(?:[ \t\u00A0]*@@IMG_[A-Za-z0-9+\/=_-]+(?:~\d+x\d+)?@@)+[ \t\u00A0]*$/.test(ln) && !(first && labelRuns);
                    var jcImg = 'center';   // [CODE161] ảnh nằm riêng một dòng: xuất Word đúng căn lề của file nguồn (không có thông tin -> căn giữa như trước)
                    if (imgOnly) { var tk0 = /@@IMG_[A-Za-z0-9+\/=_-]+(?:~\d+x\d+)?@@/.exec(ln), inf0 = tk0 && IMGCACHE.get(tk0[0]); if (inf0 && inf0.al) jcImg = inf0.al === 'c' ? 'center' : inf0.al === 'r' ? 'right' : inf0.al === 'j' ? 'both' : 'left'; }
                    var alM = /\u2060{2,4}[ \t]*$/.exec(ln), jcTxt = '';   // [CODE167] căn lề đoạn chữ của file nguồn
                    if (alM) { jcTxt = alM[0].trim().length === 3 ? 'center' : alM[0].trim().length === 4 ? 'right' : 'left'; ln = ln.slice(0, alM.index); }
                    ln = ln.replace(/\u2060{2,4}/g, '');
                    pushP((first ? (labelRuns || '') : '') + inlineXml(doc, ln, f), Object.assign({}, po, { keepNext: false }, li > 0 ? { before: 0 } : {}, stmt ? { left: STMT_IND } : {}, jcTxt ? { jc: jcTxt, left: 0 } : {}, imgOnly ? { jc: jcImg, left: 0 } : {}));
                    first = false;
                });
            }
            if (i + 1 < parts.length) {
                var d = decodeTable(parts[i + 1]);
                if (d) { out.push(tableXml(doc, d)); out.push(SPACER); lastP = -1; }
            }
        }
        if (!out.length) { out.push(P(labelRuns || '', po)); return out; }
        if (po && po.keepNext && lastP >= 0) out[lastP] = P(lastArgs[0], Object.assign({}, lastArgs[1], { keepNext: true }));
        return out;
    }

    /* ---------- Gói .docx ---------- */
    var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>' +
        '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
        '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
    var SETTINGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">' +
        '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
        '<m:mathPr><m:mathFont m:val="Cambria Math"/><m:brkBin m:val="before"/><m:smallFrac m:val="0"/><m:dispDef/><m:lMargin m:val="0"/><m:rMargin m:val="0"/><m:defJc m:val="centerGroup"/><m:wrapIndent m:val="1440"/><m:intLim m:val="subSup"/><m:naryLim m:val="undOvr"/></m:mathPr></w:settings>';
    function fieldRuns(instr, f, cached) {
        var pr = C.rPr(f || {});
        return '<w:r>' + pr + '<w:fldChar w:fldCharType="begin"/></w:r><w:r>' + pr + '<w:instrText xml:space="preserve"> ' + instr + ' </w:instrText></w:r><w:r>' + pr + '<w:fldChar w:fldCharType="separate"/></w:r><w:r>' + pr + '<w:t>' + (cached || '1') + '</w:t></w:r><w:r>' + pr + '<w:fldChar w:fldCharType="end"/></w:r>';
    }
    async function pack(doc, title, footerLeft) {
        var zip = new JSZip();
        var f = { sz: 20 };
        var footer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ' + NS + '>' +
            P(C.textRun(footerLeft + ' \u2013 Trang ', f) + fieldRuns('PAGE', f) + C.textRun('/', f) + fieldRuns('NUMPAGES', f), { jc: 'right' }) + '</w:ftr>';
        var sect = '<w:sectPr><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="11907" w:h="16839" w:code="9"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="1020" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>';
        if (doc.en) {   // [CODE123] trang giấy, lề, chân trang đúng file mẫu "ĐỀ MẪU ANH"
            footer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ' + NS + '>' + P(C.textRun(footerLeft, { sz: 22 }), { jc: 'right' }) + '</w:ftr>';
            sect = '<w:sectPr><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="1020" w:bottom="850" w:left="1020" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>';
        }
        var docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + doc.body.join('') + sect + '</w:body></w:document>';
        var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rIdSty" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
            '<Relationship Id="rIdSet" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
            '<Relationship Id="rIdFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' + doc.rels.join('') + '</Relationships>';
        var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
            '<Default Extension="png" ContentType="image/png"/><Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>' +
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
            '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
            '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
            '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
        var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
        zip.file('[Content_Types].xml', ct);
        zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
        zip.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + X(title) + '</dc:title><dc:creator>Quan ly de thi</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified></cp:coreProperties>');
        zip.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Office Word</Application></Properties>');
        zip.file('word/document.xml', docXml);
        zip.file('word/styles.xml', doc.en ? STYLES_EN : STYLES);
        zip.file('word/settings.xml', SETTINGS);
        zip.file('word/footer1.xml', footer);
        zip.file('word/_rels/document.xml.rels', rels);
        Object.keys(doc.media).forEach(function (name) { zip.file('word/media/' + name, doc.media[name]); });
        Object.keys(doc.embeds || {}).forEach(function (name) { zip.file('word/embeddings/' + name, doc.embeds[name]); });
        return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    }

    /* ---------- Nội dung đề ---------- */
    var B = { b: true };
    var plainLen = function (s) {
        s = String(s || '').replace(/@@IMG_[^@]*@@/g, 'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM').replace(new RegExp(C.TBL_RE_SRC, 'g'), 'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM')
            .replace(/\$([^$]*)\$/g, function (m, a) { return a.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}^_]/g, ''); }).replace(/<[^>]+>/g, '');
        return decodeEnt(s).length;
    };
    /* [CODE114] Ước lượng độ rộng thật (twips) của 1 phương án để tự chia đáp án A. B. C. D. thành 1 dòng (4 cột) / 2 dòng (2 cột) / 4 dòng (1 cột) */
    var CW_NARROW = /[ijl.,;:!'|\u2019]/, CW_MID = /[tfrI()\[\]\-\u2212\u2013\/"]/;
    function charTw(c) {
        var k = c.charCodeAt(0);
        if (k >= 0x300 && k <= 0x36F) return 0;                       // dấu tổ hợp
        if (c === ' ' || c === '\u00A0') return 60;
        if (c === 'm') return 175; if (c === 'w') return 160;
        if (c === 'M' || c === 'W') return 210;
        if (CW_NARROW.test(c)) return 66;
        if (CW_MID.test(c)) return 98;
        if (c >= '0' && c <= '9') return 120;
        if (c.toUpperCase() === c && c.toLowerCase() !== c) return 165;   // chữ hoa (kể cả Ă Â Đ Ê Ô Ơ Ư...)
        if (k > 0x2000) return 140;                                    // ký hiệu → ⇌ ° ...
        if (c === '+' || c === '=' || c === '<' || c === '>') return 135;
        return 112;
    }
    function strTw(str, chem) {
        str = String(str || '').normalize('NFC');
        var w = 0, prev = '';
        for (var i = 0; i < str.length; i++) {
            var c = str[i], t = charTw(c);
            // chỉ số dưới của công thức hóa học (CH3COOH, H2SO4...) nhỏ hơn ~35%
            if (chem && c >= '0' && c <= '9' && /[A-Za-z)\]]/.test(prev)) t = Math.round(t * 0.62);
            w += t; prev = c;
        }
        return w;
    }
    function mathTw(m) {
        var s = String(m || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'), w = 0, ch = true;
        var guard = 0;
        while (guard++ < 8 && /\\[dt]?frac\s*\{[^{}]*\}\s*\{[^{}]*\}/.test(s)) {
            s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, function (x, a, b) { return a.length >= b.length ? a : b; });
        }
        s = s.replace(/[_^]\s*\{([^{}]*)\}|[_^]\s*([A-Za-z0-9+\-])/g, function (x, a, b) { w += Math.round(strTw(a || b, false) * 0.66); return ''; });
        s = s.replace(/\\sqrt\s*(?:\[[^\]]*\])?/g, '\u221A').replace(/\\(?:left|right|mathrm|mathbf|mathit|textbf|text|operatorname|displaystyle|quad|qquad)(?![A-Za-z])\s*/g, '').replace(/\\[,;!]/g, '')
            .replace(/\\(?:rightarrow|to|longrightarrow|rightleftharpoons|leftrightarrow|Delta|circ|degree|cdot|times|pm|approx|geq?|leq?|neq|infty|alpha|beta|gamma|pi|sum|int|lim)\b/g, '\u2248')
            .replace(/\\[A-Za-z]+/g, 'x').replace(/[{}$\\]/g, '');
        return w + Math.round(strTw(s, ch) * 1.06) + 40;
    }
    function optTw(opt) {   // trả về 99999 nếu phương án không thể xếp chung hàng (xuống dòng / có bảng)
        var s = String(opt == null ? '' : opt), w = 0;
        if (/\r?\n/.test(s.replace(/^\s+|\s+$/g, '')) || new RegExp(C.TBL_RE_SRC).test(s)) return 99999;
        s = s.replace(/@@IMG_[A-Za-z0-9+\/=_-]+(?:~\d+x\d+)?@@/g, function (tok) { var inf = IMGCACHE.get(tok); w += inf ? Math.round(inf.cx / 635) + 40 : 2400; return ''; });
        s = s.replace(/\$\$([^$]*)\$\$|\$([^$]*)\$|\\\(([\s\S]*?)\\\)/g, function (x, a, b, c2) { w += mathTw(a || b || c2); return ''; });
        s = s.replace(/<(sub|sup)>([^<]*)<\/\1>/gi, function (x, t, a) { w += Math.round(strTw(decodeEnt(a), false) * 0.62); return ''; });
        s = s.replace(/\\(?:rightleftharpoons|leftrightarrow|rightarrow|leftarrow|Rightarrow|Delta)/g, '\u21CC');
        s = s.replace(/<[^>]+>/g, '');
        return w + strTw(decodeEnt(s), true);
    }
    function pickCols(opts, avail) {
        if (!opts || opts.length !== 4) return 1;
        var LABEL = 330, GAP = 170, SAFE = 1.07;                       // "A. " in đậm + khoảng cách giữa các cột + hệ số an toàn
        var mx = 0;
        for (var i = 0; i < 4; i++) { var tw = optTw(opts[i]); if (tw >= 99999) return 1; mx = Math.max(mx, (tw + LABEL) * SAFE); }
        if (mx + GAP <= avail / 4) return 4;      // vừa 1 dòng
        if (mx + GAP <= avail / 2) return 2;      // 2 dòng, mỗi dòng 2 đáp án
        return 1;                                 // 4 dòng, mỗi dòng 1 đáp án
    }
    function optionsBlock(doc, q, withAns) {
        var out = [], L = 'ABCD', opts = q.opts;
        var cols = pickCols(opts, TEXT_W - 284);
        var one = function (k) {
            var ok = withAns && q.correct === k;
            var f = ok ? { b: true, color: 'FF0000' } : {};
            return C.textRun(L[k] + '. ', Object.assign({ b: true }, ok ? { color: 'FF0000' } : {})) + inlineXml(doc, opts[k], f);
        };
        var IND = 283;   // [CODE98] đáp án A. B. C. D. thụt vào ~0,5 cm so với chữ "Câu n." (đúng mẫu đề của Bộ GD&ĐT)
        var colW = Math.floor((TEXT_W - IND) / cols);
        var tabs = []; for (var t = 1; t < cols; t++) tabs.push({ pos: IND + colW * t });
        for (var i = 0; i < opts.length; i += cols) {
            var row = [];
            for (var j = i; j < Math.min(opts.length, i + cols); j++) row.push(one(j));
            var last = i + cols >= opts.length;
            var nRows = Math.ceil(opts.length / cols), rIdx = i / cols;
            // [CODE115] chỉ giữ "câu dẫn + dòng đáp án đầu" và "2 dòng đáp án cuối" đi cùng nhau; phần còn lại tự trôi liền sang trang sau, không bỏ trống cuối trang
            var kn = !last && (rIdx === 0 || rIdx === nRows - 2);
            out.push(P(row.join('<w:r><w:tab/></w:r>'), { jc: 'left', tabs: tabs, keepNext: kn, before: 40, after: 40, left: IND }));
        }
        return out;
    }
    function questionBlock(doc, q, num, withAns) {
        var out = [];
        if (q.gFirst) {
            var g = q.gFirst;
            var ref = g.to > g.from ? (g.to === g.from + 1 ? 'câu ' + g.from + ' và câu ' + g.to : 'câu ' + g.from + ' đến câu ' + g.to) : 'câu ' + g.from;
            out = out.concat(richBlock(doc, g.info || '', g.gm ? '' : C.textRun('Sử dụng thông tin sau để trả lời ' + ref + (g.info ? ': ' : '.'), { b: true, i: true }), { before: 80, keepNext: true }, {}));   // [CODE121] nhóm English: dòng dẫn đã nằm trong đề dẫn
        }
        var label = C.textRun(((q.en || q.gm) ? 'Question ' + num + '. ' : 'Câu ' + num + ': '), { b: true });
        var stem = richBlock(doc, q.text, label, { jc: 'both', before: 80, after: 0, keepNext: q.type !== 'sa' || (withAns && !!q.sa) });
        out = out.concat(stem);
        if (q.type === 'mc') {
            out = out.concat(optionsBlock(doc, q, withAns));
        } else if (q.type === 'tf') {
            q.opts.forEach(function (o, i) {
                var on = withAns && q.tfKnown && q.tf[i];
                var f = on ? { b: true, color: 'FF0000' } : {};
                out.push(P(C.textRun('abcd'[i] + ') ', Object.assign({}, f, { b: true })) + inlineXml(doc, o, f), { jc: 'both', firstLine: 283, before: 40, after: 40, keepNext: i === 0 || i === 2 || (withAns && !!q.tfSol[i]) }));
                if (withAns && q.tfSol[i] && q.tfSol[i].trim()) out = out.concat(richBlock(doc, q.tfSol[i], C.textRun('Giải thích ý ' + 'abcd'[i] + '): ', { i: true, b: true }), { left: 284, before: 0, after: 0 }, { i: true }));
            });
        } else if (withAns) {
            out.push(P(C.textRun('A. ' + (q.sa != null && String(q.sa).trim() ? String(q.sa).trim() : '?'), { b: true }), { jc: 'left', before: 20, after: 20 }));
        }
        if (withAns) {
            var solTxt = buildVbaSolText(q);
            if (solTxt) {
                out.push(P(C.textRun('Lời giải', { b: true }), { jc: 'both', firstLine: 283, before: 60, after: 0, keepNext: true }));
                out = out.concat(richBlock(doc, solTxt, '', { jc: 'both', firstLine: 283, before: 0, after: 0 }, {}));
            }
            if (q.type === 'sa' && !hasTrailingAnswerLine(solTxt)) {
                out.push(P(C.textRun('Đáp án: ' + (q.sa != null && String(q.sa).trim() ? String(q.sa).trim() : '?'), { b: true }), { jc: 'left', before: 0, after: 40 }));
            }
        }
        return out;
    }
    function infoCfg(cfg) {
        return {
            sgd: String(cfg.sgd || '').trim().toUpperCase(), school: String(cfg.school || '').trim().toUpperCase(), exam: String(cfg.exam || '').trim().toUpperCase(),
            subject: String(cfg.subject || '').trim(), grade: String(cfg.grade || '').trim(), year: String(cfg.year || '').trim(), time: String(cfg.time || '').trim()
        };
    }
    function headerBlock(doc, cfg, ver, total, withAns) {
        var I = infoCfg(cfg);
        var cp = function (txt, f) { return P(C.textRun(txt, f || {}), { jc: 'center', before: 0, after: 0 }); };
        var left = [], right = [];
        if (I.sgd) left.push(cp(I.sgd, B));
        if (I.school) left.push(cp(I.school, B));
        left.push(cp('ĐỀ CHÍNH THỨC'));
        left.push(cp('(Đề thi có ' + total + ' câu)'));
        if (I.exam) right.push(cp(I.exam, B));
        var mon = (I.subject ? 'MÔN: ' + I.subject.toUpperCase() : '') + (I.grade ? (I.subject ? ' – ' : '') + 'LỚP ' + I.grade.toUpperCase() : '');
        if (mon) right.push(cp(mon, B));
        if (I.year) right.push(cp('Năm học ' + I.year, B));
        if (I.time) right.push(cp('Thời gian làm bài: ' + I.time + ' phút, không kể thời gian phát đề'));
        var w1 = 3600, w2 = TEXT_W - 3600;
        var tbl = gridTable(doc, [[{ paras: left, raw: true, jc: 'center' }, { paras: right, raw: true, jc: 'center' }]], [w1, w2]);
        var out = [];
        if (withAns) out.push(P(C.textRun('ĐỀ CÓ ĐÁP ÁN – DÀNH CHO GIÁO VIÊN (KHÔNG PHÁT CHO HỌC SINH)', { b: true, color: 'C00000' }), { jc: 'center', after: 60 }));
        out.push(tbl);
        out.push(P(C.textRun('Họ và tên thí sinh: ', {}) + C.textRun('.'.repeat(52), {}) + (ver.code ? '<w:r><w:tab/></w:r>' + C.textRun('Mã đề thi: ' + ver.code, { b: true }) : ''),
            { jc: 'left', tabs: [{ v: 'right', pos: TEXT_W }], before: 120, after: 0 }));
        out.push(P(C.textRun('Số báo danh: ', {}) + C.textRun('.'.repeat(30), {}), { jc: 'left', before: 0, after: 60 }));
        return out;
    }
    /* [v8-5] Chuẩn hóa Lời giải (gồm tfSol Phần II), chống lặp Đáp án Phần III & giữ nhãn [Cấp độ - YCCĐ] */
    function formatLevelPrefix(q) {
        if (!q || /^\[[^\]]+\]/.test(String(q.text || '').trim())) return '';
        if (q.levelTag && String(q.levelTag).trim()) return '[' + String(q.levelTag).replace(/^\[|\]$/g, '').trim() + '] ';
        var lv = String(q.levelText || q.level || '').trim();
        var lvMap = { NB: 'Biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' };
        if (lvMap[lv]) lv = lvMap[lv];
        var code = String(q.yccd || q.code || '').trim();
        if (lv && code) return '[' + lv + ' - ' + code + '] ';
        if (lv) return '[' + lv + '] ';
        return '';
    }
    function buildVbaSolText(q) {
        var s = (q && q.solution && String(q.solution).trim()) ? String(q.solution).trim() : ((q && q.sol && String(q.sol).trim()) ? String(q.sol).trim() : '');
        if (!s && q && q.type === 'tf' && Array.isArray(q.tfSol)) {
            s = q.tfSol.map(function (it, idx) {
                var st = String(it || '').trim();
                if (!st) return '';
                var tag = (q.tfKnown && q.tf) ? (q.tf[idx] ? 'Đúng, ' : 'Sai, ') : '';
                return 'abcd'[idx] + ') ' + tag + st;
            }).filter(Boolean).join('\n');
        }
        return s;
    }
    function hasTrailingAnswerLine(solTxt) {
        return /(?:^|\n)\s*Đáp\s*án\s*:/i.test(String(solTxt || ''));
    }
    var PART_HEAD = {
        mc: function (n) { return 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời ' + (n > 1 ? 'từ câu 1 đến câu ' + n : 'câu 1') + '. Mỗi câu hỏi thí sinh chỉ chọn một phương án.'; },
        tf: function (n) { return 'PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời ' + (n > 1 ? 'từ câu 1 đến câu ' + n : 'câu 1') + '. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.'; },
        sa: function (n) { return 'PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời ' + (n > 1 ? 'từ câu 1 đến câu ' + n : 'câu 1') + '.'; }
    };
    async function buildExamDocx(ver, cfg, withAns) {
        var texts = [];
        ver.parts.forEach(function (p) { p.list.forEach(function (q) { texts.push(q.text, q.solution, q.sol, q.gFirst && q.gFirst.info); (q.opts || []).forEach(function (o) { texts.push(o); }); (q.tfSol || []).forEach(function (o) { texts.push(o); }); texts.push(q.sa); }); });
        await prepareImages(texts);
        var doc = new Doc();
        var total = ver.parts.reduce(function (s, p) { return s + p.list.length; }, 0);
        if (isEnVer(ver)) {   // [CODE123] đề English: xuất đúng định dạng file mẫu
            doc.en = true;
            enHeader(doc, cfg, ver, withAns, total).forEach(function (x) { doc.body.push(x); });
            var nq = 0;
            ver.parts.forEach(function (p) { p.list.forEach(function (q) { nq++; enQuestionBlock(doc, q, nq, withAns).forEach(function (x) { doc.body.push(x); }); }); });
            doc.body.push(P(C.textRun('-------------------- THE END --------------------', { b: true }), { jc: 'center', before: 160, after: 80 }));
            doc.body.push(P(C.textRun('- Thí sinh không được sử dụng tài liệu;', { i: true, sz: 22 }) + '<w:r><w:br/></w:r>' + C.textRun('- Giám thị không giải thích gì thêm.', { i: true, sz: 22 }), { after: 0 }));
            return pack(doc, (infoCfg(cfg).exam || 'Đề thi') + (ver.code ? ' - Mã đề ' + ver.code : ''), ver.code ? 'Mã đề thi ' + ver.code : (infoCfg(cfg).exam || 'Đề thi'));
        }
        headerBlock(doc, cfg, ver, total, withAns).forEach(function (x) { doc.body.push(x); });
        ver.parts.forEach(function (p) {
            if (!p.list.length) return;
            doc.body.push(P(C.textRun(PART_HEAD[p.type](p.list.length), { b: true }), { jc: 'left', before: 120, after: 40, keepNext: true }));
            p.list.forEach(function (q, i) { questionBlock(doc, q, i + 1, withAns).forEach(function (x) { doc.body.push(x); }); });
        });
        doc.body.push(P(C.textRun('----------- HẾT -----------', { b: true }), { jc: 'center', before: 200, after: 0 }));
        doc.body.push(P(C.textRun('Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.', { i: true }), { jc: 'center', before: 0, after: 0 }));
        var I = infoCfg(cfg);
        return pack(doc, (I.exam || 'Đề thi') + (ver.code ? ' - Mã đề ' + ver.code : ''), ver.code ? 'Mã đề thi ' + ver.code : (I.exam || 'Đề thi'));
    }
    // bảng đáp án tổng hợp cho tất cả mã đề
    /* [v8-2] Mã QR xuất đáp án chuẩn TNMaker (type: 5) */
    function _tnPart(v, type) {
        if (!v || !Array.isArray(v.parts)) return [];
        for (var i = 0; i < v.parts.length; i++) if (v.parts[i].type === type) return v.parts[i].list || [];
        return [];
    }
    function formatTNMakerCodeValue(v) {
        var mc = _tnPart(v, 'mc'), tf = _tnPart(v, 'tf'), sa = _tnPart(v, 'sa');
        var p1 = mc.map(function (q) { return (q && q.correct >= 0) ? 'ABCD'[q.correct] : '?'; }).join('');
        var p2 = tf.map(function (q) {
            return [0, 1, 2, 3].map(function (j) { return (q && q.tfKnown && q.tf) ? (q.tf[j] ? 'Đ' : 'S') : '?'; }).join('');
        }).join('_');
        var p3 = sa.map(function (q) {
            var t = q && q.sa != null ? String(q.sa).replace(/\s+/g, ' ').trim() : '';
            return (!t || t === '?') ? '?' : t;
        }).join('_');
        return p1 + '#' + p2 + '#' + p3;
    }
    function utf8ByteLen(str) {
        try { return new TextEncoder().encode(str).length; } catch (e) { return unescape(encodeURIComponent(str)).length; }
    }
    function buildTNMakerQrPayloads(vers) {
        if (!Array.isArray(vers) || !vers.length) return [];
        var out = [], curObj = { success: true, type: 5 }, curCodes = [], MAX_BYTES = 2000;
        vers.forEach(function (v) {
            var code = String(v.code || '').trim();
            if (!code) return;
            var val = formatTNMakerCodeValue(v);
            var testObj = Object.assign({}, curObj);
            testObj[code] = val;
            if (curCodes.length && utf8ByteLen(JSON.stringify(testObj)) > MAX_BYTES) {
                out.push({ codes: curCodes.slice(), json: JSON.stringify(curObj) });
                curObj = { success: true, type: 5 };
                curCodes = [];
            }
            curObj[code] = val;
            curCodes.push(code);
        });
        if (curCodes.length) out.push({ codes: curCodes.slice(), json: JSON.stringify(curObj) });
        return out;
    }
    function makeQrMatrix(text) {
        if (typeof qrcode !== 'function') return null;
        if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
            qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
        }
        var levels = ['M', 'L'];
        for (var i = 0; i < levels.length; i++) {
            try {
                var qr = qrcode(0, levels[i]);
                qr.addData(text, 'Byte');
                qr.make();
                return qr;
            } catch (e) {}
        }
        return null;
    }
    function crc32Bytes(buf) {
        var c = 0xffffffff;
        for (var i = 0; i < buf.length; i++) {
            c ^= buf[i];
            for (var k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
        }
        return (c ^ 0xffffffff) >>> 0;
    }
    function adler32Bytes(buf) {
        var a = 1, b = 0;
        for (var i = 0; i < buf.length; i++) {
            a = (a + buf[i]) % 65521;
            b = (b + a) % 65521;
        }
        return ((b << 16) | a) >>> 0;
    }
    function pngChunk(type, data) {
        var len = data.length, out = new Uint8Array(len + 12);
        out[0] = (len >>> 24) & 255; out[1] = (len >>> 16) & 255; out[2] = (len >>> 8) & 255; out[3] = len & 255;
        for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
        out.set(data, 8);
        var crc = crc32Bytes(out.subarray(4, 8 + len));
        out[8 + len] = (crc >>> 24) & 255; out[9 + len] = (crc >>> 16) & 255; out[10 + len] = (crc >>> 8) & 255; out[11 + len] = crc & 255;
        return out;
    }
    function encodeGrayPng(size, isDarkFn) {
        var stride = size + 1, raw = new Uint8Array(stride * size);
        for (var y = 0; y < size; y++) {
            raw[y * stride] = 0;
            for (var x = 0; x < size; x++) raw[y * stride + 1 + x] = isDarkFn(x, y) ? 0 : 255;
        }
        var blocks = [], pos = 0;
        while (pos < raw.length) {
            var chunkLen = Math.min(65535, raw.length - pos), last = (pos + chunkLen >= raw.length) ? 1 : 0;
            var hdr = new Uint8Array(5);
            hdr[0] = last; hdr[1] = chunkLen & 255; hdr[2] = (chunkLen >>> 8) & 255;
            var nlen = (~chunkLen) & 0xffff;
            hdr[3] = nlen & 255; hdr[4] = (nlen >>> 8) & 255;
            blocks.push(hdr);
            blocks.push(raw.subarray(pos, pos + chunkLen));
            pos += chunkLen;
        }
        var adl = adler32Bytes(raw), zlen = 2 + 4 + blocks.reduce(function (s, b) { return s + b.length; }, 0);
        var zbuf = new Uint8Array(zlen), zp = 2;
        zbuf[0] = 0x78; zbuf[1] = 0x01;
        blocks.forEach(function (b) { zbuf.set(b, zp); zp += b.length; });
        zbuf[zp++] = (adl >>> 24) & 255; zbuf[zp++] = (adl >>> 16) & 255; zbuf[zp++] = (adl >>> 8) & 255; zbuf[zp++] = adl & 255;
        var ihdr = new Uint8Array(13);
        ihdr[0] = (size >>> 24) & 255; ihdr[1] = (size >>> 16) & 255; ihdr[2] = (size >>> 8) & 255; ihdr[3] = size & 255;
        ihdr[4] = (size >>> 24) & 255; ihdr[5] = (size >>> 16) & 255; ihdr[6] = (size >>> 8) & 255; ihdr[7] = size & 255;
        ihdr[8] = 8; ihdr[9] = 0;
        var sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
        var c1 = pngChunk('IHDR', ihdr), c2 = pngChunk('IDAT', zbuf), c3 = pngChunk('IEND', new Uint8Array(0));
        var png = new Uint8Array(sig.length + c1.length + c2.length + c3.length);
        var o = 0; png.set(sig, o); o += sig.length; png.set(c1, o); o += c1.length; png.set(c2, o); o += c2.length; png.set(c3, o);
        return png;
    }
    function uint8ToBase64(u8) {
        if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
        var bin = '', chunk = 0x8000;
        for (var i = 0; i < u8.length; i += chunk) bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
        return btoa(bin);
    }
    function renderTNMakerQrPng(text) {
        var qr = makeQrMatrix(text);
        if (!qr) return null;
        var mc = qr.getModuleCount(), margin = 3, cell = mc > 90 ? 3 : (mc > 60 ? 4 : 6);
        var size = (mc + margin * 2) * cell;
        var bytes = encodeGrayPng(size, function (x, y) {
            var r = Math.floor(y / cell) - margin, c = Math.floor(x / cell) - margin;
            return r >= 0 && c >= 0 && r < mc && c < mc && qr.isDark(r, c);
        });
        return { bytes: bytes, size: size, dataUrl: 'data:image/png;base64,' + uint8ToBase64(bytes) };
    }
    function docInlinePngRun(doc, bytes, name, emuSize) {
        doc.relN++;
        var rid = 'rIdImg' + doc.relN;
        doc.media[name] = bytes;
        doc.rels.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + name + '"/>');
        var id = ++doc.pid;
        return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + emuSize + '" cy="' + emuSize + '"/><wp:docPr id="' + id + '" name="QR ' + id + '"/>' +
            '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="QR ' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
            '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
            '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + emuSize + '" cy="' + emuSize + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    }

    async function buildKeyDocx(vers, cfg) {
        var en = !!(vers.length && isEnVer(vers[0])), LQ = en ? 'Question' : 'Câu', LA = en ? 'Answer' : 'Đáp án';   // [CODE123]
        var texts = [];
        vers.forEach(function (v) { v.parts.forEach(function (p) { p.list.forEach(function (q) { texts.push(q.sa); }); }); });
        await prepareImages(texts);
        var doc = new Doc();
        var I = infoCfg(cfg);
        var title = ['ĐÁP ÁN – ' + (I.exam || 'ĐỀ THI'), I.subject ? 'MÔN: ' + I.subject.toUpperCase() + (I.grade ? ' – LỚP ' + I.grade.toUpperCase() : '') : ''].filter(Boolean);
        title.forEach(function (t) { doc.body.push(P(C.textRun(t, { b: true }), { jc: 'center', after: 40 })); });
        vers.forEach(function (v, vi) {
            if (v.code) doc.body.push(P(C.textRun('MÃ ĐỀ ' + v.code, { b: true, sz: 28 }), { jc: 'center', before: vi ? 0 : 120, after: 80, pageBreakBefore: vi > 0, keepNext: true }));
            v.parts.forEach(function (p) {
                if (!p.list.length) return;
                if (!en) doc.body.push(P(C.textRun(p.type === 'mc' ? 'Phần I. Trắc nghiệm nhiều lựa chọn' : p.type === 'tf' ? 'Phần II. Trắc nghiệm đúng – sai' : 'Phần III. Trả lời ngắn', { b: true }), { jc: 'left', before: 100, after: 40, keepNext: true }));
                if (p.type === 'mc') {
                    for (var i = 0; i < p.list.length; i += 10) {
                        var ch = p.list.slice(i, i + 10), w0 = 1100, wc = Math.floor((TEXT_W - w0) / 10);
                        var r1 = [{ t: LQ, f: B, bg: 'D9E2F3' }], r2 = [{ t: LA, f: B }];
                        for (var k = 0; k < 10; k++) { r1.push(ch[k] ? { t: String(i + k + 1), f: B, bg: 'D9E2F3' } : { t: '' }); r2.push({ t: ch[k] ? (ch[k].correct >= 0 ? 'ABCD'[ch[k].correct] : '?') : '' }); }
                        doc.body.push(gridTable(doc, [r1, r2], [w0].concat(new Array(10).fill(wc)))); doc.body.push(SPACER);
                    }
                } else if (p.type === 'tf') {
                    var rows = [[{ t: LQ, f: B, bg: 'D9E2F3' }, { t: 'Ý a)', f: B, bg: 'D9E2F3' }, { t: 'Ý b)', f: B, bg: 'D9E2F3' }, { t: 'Ý c)', f: B, bg: 'D9E2F3' }, { t: 'Ý d)', f: B, bg: 'D9E2F3' }]];
                    p.list.forEach(function (q, i) { rows.push([{ t: String(i + 1), f: B }].concat([0, 1, 2, 3].map(function (j) { return { t: q.tfKnown ? (q.tf[j] ? 'Đúng' : 'Sai') : '?' }; }))); });
                    var wq = 1200, wx = Math.floor((TEXT_W - wq) / 4);
                    doc.body.push(gridTable(doc, rows, [wq, wx, wx, wx, wx])); doc.body.push(SPACER);
                } else {
                    for (var s = 0; s < p.list.length; s += 6) {
                        var c6 = p.list.slice(s, s + 6), w1 = 1100, w6 = Math.floor((TEXT_W - w1) / 6);
                        var a1 = [{ t: LQ, f: B, bg: 'D9E2F3' }], a2 = [{ t: LA, f: B }];
                        for (var z = 0; z < 6; z++) { a1.push(c6[z] ? { t: String(s + z + 1), f: B, bg: 'D9E2F3' } : { t: '' }); a2.push({ t: c6[z] ? (c6[z].sa || '?') : '' }); }
                        doc.body.push(gridTable(doc, [a1, a2], [w1].concat(new Array(6).fill(w6)))); doc.body.push(SPACER);
                    }
                }
            });
        });
        /* [v8-2] Nhúng mã QR đáp án chuẩn TNMaker (type: 5) vào cuối file Word bảng đáp án */
        var qrPayloads = buildTNMakerQrPayloads(vers);
        if (qrPayloads.length && typeof qrcode === 'function') {
            doc.body.push(P(C.textRun('MÃ QR NHẬP ĐÁP ÁN NHANH – TNMAKER (TYPE: 5)', { b: true, sz: 26 }), { jc: 'center', before: 160, after: 80, pageBreakBefore: true, keepNext: true }));
            qrPayloads.forEach(function (qp, qi) {
                var qrImg = renderTNMakerQrPng(qp.json);
                if (!qrImg) return;
                doc.body.push(P(C.textRun((qrPayloads.length > 1 ? ('Mã QR ' + (qi + 1) + '/' + qrPayloads.length + ' – ') : '') + 'Mã đề: ' + qp.codes.join(', '), { b: true, sz: 22 }), { jc: 'center', before: 80, after: 60, keepNext: true }));
                doc.body.push(P(docInlinePngRun(doc, qrImg.bytes, 'qr_tnmaker_' + (qi + 1) + '.png', 2340000), { jc: 'center', after: 120 }));
            });
        }
        return pack(doc, 'Bảng đáp án tổng hợp', 'Bảng đáp án');
    }

/* ============================================================
   [CODE123] English – xuất file Word đúng định dạng file mẫu "ĐỀ MẪU ANH"
   - Trang A4, lề trái/phải 1020, trên/dưới 850; Times New Roman 11,5; "Question n." in đậm
   - Đáp án: 4 đáp án / 1 dòng, 2 đáp án / dòng hoặc mỗi đáp án 1 dòng (tự chọn theo độ dài)
   - Câu có đề dài nhiều dòng (sắp xếp câu...): thụt lề 1474 như mẫu; câu có đề 1 dòng: đáp án thụt 283
   - Đáp án đúng (bản có đáp án): gạch chân cả "A." và nội dung; sau câu có dòng "Answer:" (chữ nghiêng)
   ============================================================ */
var STYLES_EN = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="23"/><w:szCs w:val="23"/><w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
var EN_H = 1474, EN_S = 283, EN_TAB = '<w:r><w:tab/></w:r>', EN_BR = '<w:r><w:br/></w:r>';
function isEnVer(ver) { return !!(ver && ver.parts && ver.parts.some(function (p) { return p.list.some(function (q) { return q.en || q.gm; }); })); }
function plainTxt(s) { return decodeEnt(String(s == null ? '' : s).replace(/<[^>]+>/g, '')).replace(/[\s\u00A0]+/g, ' ').trim(); }
function enRuns(doc, str, f) { return inlineXml(doc, String(str == null ? '' : str).replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, ''), f || {}); }
function enLines(str) { return String(str || '').split(/\r?\n/).filter(function (l) { return plainTxt(l) !== '' || /@@IMG_|@@TBL_/.test(l); }); }
function enOpt(doc, q, k, withAns) {
    var ok = withAns && q.correct === k;
    return C.textRun('ABCD'[k] + '. ', ok ? { b: true, u: true } : { b: true }) + enRuns(doc, q.opts[k], ok ? { u: true } : {});
}
function enCols(q, w4, w2) {   // 4 = cả 4 đáp án 1 dòng | 2 = 2 đáp án / dòng | 1 = mỗi đáp án 1 dòng
    if (!q.opts || q.opts.length !== 4) return 1;
    var mx = 0;
    for (var i = 0; i < 4; i++) { var tw = optTw(q.opts[i]); if (tw >= 99999) return 1; mx = Math.max(mx, (tw + 330) * 1.07); }
    return mx <= w4 ? 4 : mx <= w2 ? 2 : 1;
}
// Đề dẫn của nhóm: dòng "Read the following..." (đậm nghiêng), tiêu đề (đậm, giữa), đoạn văn (thụt dòng đầu), "(Adapted from ...)" (nghiêng, phải)
function enInfoBlock(doc, g) {
    var out = [];
    enLines(g.info).forEach(function (ln, i) {
        var pl = plainTxt(ln);
        if (/@@TBL_/.test(ln)) { richBlock(doc, ln, '', { before: 0 }, {}).forEach(function (x) { out.push(x); }); return; }
        if (i === 0) {
            var d = ln.replace(/<\/?(?:b|i|strong|em)\s*>/gi, '');
            if (window.CODE121EN && g.from && g.to) d = CODE121EN.fixRange(d, g.from, g.to);
            out.push(P(enRuns(doc, d, { b: true, i: true }), { jc: 'both', before: 120, after: 60, keepNext: true }));
            return;
        }
        if (/^<b>(?:(?!<\/?b>)[\s\S])*<\/b>$/.test(ln.trim()) && pl.length <= 120 && !/[.!?]$/.test(pl)) {
            out.push(P(enRuns(doc, ln), { jc: 'center', before: 60, after: 60, keepNext: true }));
        } else if (/^\(\s*(?:Adapted|Source|Retrieved)\b[\s\S]*\)\s*$/i.test(pl)) {
            out.push(P(enRuns(doc, ln, { i: true, sz: 21 }), { jc: 'right', after: 60 }));
        } else {
            out.push(P(enRuns(doc, ln), { jc: 'both', firstLine: 454 }));
        }
    });
    return out;
}
function enQuestionBlock(doc, q, num, withAns) {
    var out = q.gFirst ? enInfoBlock(doc, q.gFirst) : [];
    var lines = enLines(q.text), opts = q.opts || [];
    var label = C.textRun('Question ' + num + '.', { b: true });
    var one = function (k) { return enOpt(doc, q, k, withAns); };
    var all = function () { return [0, 1, 2, 3].map(one).join(EN_TAB); };
    var cols, k;
    if (lines.length === 1) {                       // câu có 1 dòng đề: "Question n. đề" rồi đáp án thụt 283
        cols = enCols(q, 2200, 4600);
        out.push(P(label + C.textRun(' ', {}) + enRuns(doc, lines[0]), { jc: 'both', before: 40, after: 20, keepNext: true }));
        if (cols === 4) out.push(P(all(), { tabs: [{ pos: 2551 }, { pos: 5102 }, { pos: 7654 }], left: EN_S, before: 0, after: 20 }));
        else if (cols === 2) {
            out.push(P(one(0) + EN_TAB + one(1), { tabs: [{ pos: 5075 }], left: EN_S, before: 0, after: 20, keepNext: true }));
            out.push(P(one(2) + EN_TAB + one(3), { tabs: [{ pos: 5075 }], left: EN_S, before: 0, after: 20 }));
        } else for (k = 0; k < opts.length; k++) out.push(P(one(k), { jc: 'both', left: EN_S, before: 0, after: 20, keepNext: k < opts.length - 1 }));
    } else if (!lines.length) {                     // câu điền từ (không có đề): "Question n." + tab + đáp án
        cols = enCols(q, 1950, 4000);
        if (cols === 4) out.push(P(label + EN_TAB + all(), { tabs: [{ pos: EN_H }, { pos: 3572 }, { pos: 5670 }, { pos: 7768 }], before: 0, after: 20 }));
        else if (cols === 2) {
            out.push(P(label + EN_TAB + one(0) + EN_TAB + one(1), { tabs: [{ pos: EN_H }, { pos: 5783 }], left: EN_H, hanging: EN_H, before: 0, after: 20, keepNext: true }));
            out.push(P(one(2) + EN_TAB + one(3), { tabs: [{ pos: 5783 }], left: EN_H, before: 0, after: 20 }));
        } else {
            out.push(P(label + EN_TAB + one(0), { tabs: [{ pos: EN_H }], left: EN_H, hanging: EN_H, jc: 'both', before: 0, after: 20, keepNext: true }));
            for (k = 1; k < opts.length; k++) out.push(P(one(k), { jc: 'both', left: EN_H, before: 0, after: 20, keepNext: k < opts.length - 1 }));
        }
    } else {                                        // đề nhiều dòng (sắp xếp câu, hội thoại...): thụt 1474 như mẫu
        lines.forEach(function (ln, i) {
            out.push(i === 0
                ? P(label + EN_TAB + enRuns(doc, ln), { tabs: [{ pos: EN_H }], left: EN_H, hanging: EN_H, jc: 'both', before: 0, after: 20, keepNext: true })
                : P(enRuns(doc, ln), { jc: 'both', left: EN_H, before: 0, after: 20, keepNext: i >= lines.length - 2 }));
        });
        cols = enCols(q, 1950, 4000);
        if (cols === 4) out.push(P(all(), { tabs: [{ pos: 3572 }, { pos: 5669 }, { pos: 7767 }], left: EN_H, before: 0, after: 20 }));
        else if (cols === 2) {
            out.push(P(one(0) + EN_TAB + one(1), { tabs: [{ pos: 5783 }], left: EN_H, before: 0, after: 20, keepNext: true }));
            out.push(P(one(2) + EN_TAB + one(3), { tabs: [{ pos: 5783 }], left: EN_H, before: 0, after: 20 }));
        } else for (k = 0; k < opts.length; k++) out.push(P(one(k), { jc: 'both', left: EN_H, before: 0, after: 20, keepNext: k < opts.length - 1 }));
    }
    if (withAns) {
        var sol = String(q.solution || '').trim();
        out.push(P(C.textRun('Answer: ', { b: true }) + (sol ? enRuns(doc, sol, { i: true }) : C.textRun('Chọn ' + (q.correct >= 0 ? 'ABCD'[q.correct] : '?') + '.', { i: true })), { jc: 'both', before: 20, after: 60 }));
    }
    return out;
}
// Bảng tiêu đề trang đầu: 2 cột không viền, ô "Mã đề" có viền (giống mẫu)
function enHeader(doc, cfg, ver, withAns, total) {
    var I = infoCfg(cfg), s22 = { b: true, sz: 22 }, i22 = { i: true, sz: 22 };
    var pages = Math.max(1, Math.round(total / 10)), pg = (pages < 10 ? '0' : '') + pages;
    var l1 = [];
    if (I.sgd) l1.push(C.textRun(I.sgd, s22));
    if (I.school) l1.push(C.textRun(I.school, s22));
    l1.push(C.textRun('ĐỀ THI CHÍNH THỨC', s22));
    l1.push(C.textRun('(Đề thi có ', i22) + fieldRuns('NUMPAGES \\# "00"', i22, pg) + C.textRun(' trang)', i22));
    var r1 = [];
    if (I.exam) r1.push(C.textRun(I.exam, s22));
    if (I.year) r1.push(C.textRun('Năm học ' + I.year, s22));
    var mon = (I.subject ? 'Môn thi: ' + I.subject.toUpperCase() : '') + (I.grade ? (I.subject ? ' – ' : '') + 'LỚP ' + I.grade.toUpperCase() : '');
    if (mon) r1.push(C.textRun(mon, s22));
    if (I.time) r1.push(C.textRun('Thời gian làm bài: ' + I.time + ' phút, không kể thời gian phát đề', { b: true, i: true, sz: 22 }));
    var tc = function (inner) { return '<w:tc><w:tcPr><w:tcW w:w="4933" w:type="dxa"/></w:tcPr>' + inner + '</w:tc>'; };
    var bd = ['top', 'left', 'bottom', 'right'].map(function (x) { return '<w:' + x + ' w:val="single" w:sz="6" w:space="0" w:color="auto"/>'; }).join('');
    var box = '<w:tbl><w:tblPr><w:tblW w:w="2154" w:type="dxa"/><w:jc w:val="right"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="2154"/></w:tblGrid>' +
        '<w:tr><w:tc><w:tcPr><w:tcW w:w="2154" w:type="dxa"/><w:tcBorders>' + bd + '</w:tcBorders></w:tcPr>' + (ver.code ? P(C.textRun('Mã đề: ' + ver.code, { b: true }), { jc: 'center' }) : P('', { jc: 'center' })) + '</w:tc></w:tr></w:tbl>';
    var tail = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="40" w:lineRule="exact"/></w:pPr></w:p>';
    var tbl = '<w:tbl><w:tblPr><w:tblW w:w="9866" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4933"/><w:gridCol w:w="4933"/></w:tblGrid>' +
        '<w:tr>' + tc(P(l1.join(EN_BR), { jc: 'center' })) + tc(P(r1.join(EN_BR), { jc: 'center' })) + '</w:tr>' +
        '<w:tr>' + tc(P(C.textRun('Họ, tên thí sinh: ' + '.'.repeat(46), s22) + EN_BR + C.textRun('Số báo danh: ' + '.'.repeat(51), s22))) + tc(P('', { jc: 'right' }) + box + tail) + '</w:tr></w:tbl>';
    var out = [];
    if (withAns) out.push(P(C.textRun('ĐỀ CÓ ĐÁP ÁN – DÀNH CHO GIÁO VIÊN (KHÔNG PHÁT CHO HỌC SINH)', { b: true, color: 'C00000' }), { jc: 'center', after: 60 }));
    out.push(tbl);
    return out;
}

    /* [v8-3] Xuất Word ánh xạ 1-1 chuẩn MT-2.2_DeChuan.docx cho VBA */
    function vbaPartHeader(type, count) {
        if (type === 'mc') return 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu ' + count + '. Mỗi câu hỏi thí sinh chỉ chọn một phương án.';
        if (type === 'tf') return 'PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu ' + count + '. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.';
        return 'PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu ' + count + '.';
    }
    async function buildVbaStandardDocx(ver, cfg, withAns) {
        var texts = [];
        ver.parts.forEach(function (p) {
            p.list.forEach(function (q) {
                texts.push(q.text, q.sa, q.sol, q.solution);
                (q.tfSol || []).forEach(function (o) { texts.push(o); });
                if (q.gFirst && q.gFirst.info) texts.push(q.gFirst.info);
                (q.opts || []).forEach(function (o) { texts.push(o); });
            });
        });
        await prepareImages(texts);
        var doc = new Doc();
        var title = (cfg && cfg.exam) ? String(cfg.exam).trim() : 'ĐỀ THI';
        doc.body.push(P(C.textRun(title, { b: true, sz: 26 }), { jc: 'center', after: 0 }));
        ver.parts.forEach(function (p) {
            if (!p.list.length) return;
            doc.body.push(P(C.textRun(vbaPartHeader(p.type, p.list.length), { b: true }), { jc: 'both', before: 240, after: 120, keepNext: true }));
            p.list.forEach(function (q, i) {
                var num = i + 1;
                var label = C.textRun('Câu ' + num + ': ', { b: true });
                var qTextOut = (withAns ? formatLevelPrefix(q) : '') + String(q.text || '');
                richBlock(doc, qTextOut, label, { jc: 'both', before: 80, after: 0, keepNext: q.type !== 'sa' || withAns }, {}).forEach(function (x) { doc.body.push(x); });
                if (q.type === 'mc') {
                    optionsBlock(doc, q, withAns).forEach(function (x) { doc.body.push(x); });
                } else if (q.type === 'tf') {
                    (q.opts || []).forEach(function (o, oi) {
                        var on = withAns && q.tfKnown && q.tf && q.tf[oi];
                        var f = on ? { b: true, u: true } : { b: true };
                        richBlock(doc, o, C.textRun('abcd'[oi] + ') ', f), { jc: 'both', firstLine: 283, before: 40, after: 40 }, on ? { u: true } : {}).forEach(function (x) { doc.body.push(x); });
                    });
                } else if (q.type === 'sa' && withAns) {
                    doc.body.push(P(C.textRun('A. ' + (q.sa != null ? String(q.sa).trim() : '?'), { b: true }), { jc: 'left', before: 20, after: 20 }));
                }
                var vSol = buildVbaSolText(q);
                if (withAns && vSol) {
                    doc.body.push(P(C.textRun('Lời giải', { b: true }), { jc: 'both', firstLine: 283, before: 60, after: 0, keepNext: true }));
                    richBlock(doc, vSol, '', { jc: 'both', firstLine: 283, before: 0, after: 0 }, {}).forEach(function (x) { doc.body.push(x); });
                }
                if (withAns && q.type === 'sa' && !hasTrailingAnswerLine(vSol)) {
                    doc.body.push(P(C.textRun('Đáp án: ' + (q.sa != null ? String(q.sa).trim() : '?'), { b: true }), { jc: 'left', before: 0, after: 40 }));
                }
            });
        });
        return pack(doc, title, title);
    }
    window.__CODE93_DOC = { buildExamDocx: buildExamDocx, buildVbaStandardDocx: buildVbaStandardDocx, vbaPartHeader: vbaPartHeader, buildKeyDocx: buildKeyDocx, prepareImages: prepareImages, Doc: Doc, tableXml: tableXml, decodeTable: decodeTable, buildTNMakerQrPayloads: buildTNMakerQrPayloads, renderTNMakerQrPng: renderTNMakerQrPng };
})();

/* ============================================================
   [CODE93] Phần 3: trang TRỘN ĐỀ THI – dữ liệu, thuật toán trộn, giao diện, xuất file
   ============================================================ */
(function () {
    'use strict';
    var C = window.__CODE93_CORE, D = window.__CODE93_DOC;
    var $ = C.$, esc = C.esc;

    var MIX = { src: [], fileName: '', versions: [], cfg: null, monTouched: false, active: false };
    var DEFAULT_CFG = { fmt: 'mathtype', sgd: '', school: '', exam: '', subject: '', grade: '', year: '', time: '', mon: '', n: 4, mI: true, oI: true, mII: true, oII: true, mIII: true };

    var fold = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim(); };
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    function subjectCode(name) {
        var f = fold(name);
        if (!f) return '';
        if (/tieng\s*anh|english|^anh$/.test(f)) return '11';   // [CODE123] theo file mẫu ĐỀ MẪU ANH (mã đề 1127)
        if (/\btoan\b/.test(f)) return '01';
        if (/vat\s*(li|ly)|^ly$/.test(f)) return '02';
        if (/\bhoa\b/.test(f)) return '03';
        if (/\bsinh\b/.test(f)) return '04';
        if (/tin\s*hoc/.test(f)) return '05';
        if (/cong\s*nghe/.test(f)) return '06';
        if (/lich\s*su|^su$/.test(f)) return '08';
        if (/dia\s*(li|ly)|^dia$/.test(f)) return '09';
        if (/gdkt|gdcd|kinh\s*te|cong\s*dan/.test(f)) return '10';
        return '';
    }

    /* ---------- cấu hình ---------- */
    function loadCfg() {
        var c = {};
        try { c = JSON.parse(localStorage.getItem(C.LS_KEY) || '{}') || {}; } catch (e) { c = {}; }
        return Object.assign({}, DEFAULT_CFG, c);
    }
    function saveCfg() { try { localStorage.setItem(C.LS_KEY, JSON.stringify(MIX.cfg)); } catch (e) {} }
    function readCfg() {
        var g = function (id) { var el = $(id); return el ? el.value : ''; };
        var k = function (id) { var el = $(id); return !!(el && el.checked); };
        var n = parseInt(g('mx-n'), 10);
        MIX.cfg = {
            fmt: (g('mx-fmt') === 'omml' ? 'omml' : 'mathtype'), sgd: g('mx-sgd'), school: g('mx-school'), exam: g('mx-exam'), subject: g('mx-subject'), grade: g('mx-grade'), year: g('mx-year'), time: g('mx-time'),
            mon: String(g('mx-mon')).replace(/\D/g, '').slice(0, 2), n: isFinite(n) ? n : 1, mI: k('mx-mI'), oI: k('mx-oI'), mII: k('mx-mII'), oII: k('mx-oII'), mIII: k('mx-mIII')
        };
        return MIX.cfg;
    }
    function writeCfg() {
        var c = MIX.cfg, set = function (id, v) { var el = $(id); if (el) el.value = v; }, chk = function (id, v) { var el = $(id); if (el) el.checked = !!v; };
        set('mx-fmt', c.fmt === 'omml' ? 'omml' : 'mathtype'); set('mx-sgd', c.sgd); set('mx-school', c.school); set('mx-exam', c.exam); set('mx-subject', c.subject); set('mx-grade', c.grade); set('mx-year', c.year); set('mx-time', c.time);
        set('mx-mon', c.mon); set('mx-n', c.n); chk('mx-mI', c.mI); chk('mx-oI', c.oI); chk('mx-mII', c.mII); chk('mx-oII', c.oII); chk('mx-mIII', c.mIII);
    }
    function effMon(cfg) { return (cfg.mon && cfg.mon.length === 2) ? cfg.mon : (subjectCode(cfg.subject) || '00'); }
    function codesFor(cfg) {
        var n = Math.max(0, Math.min(99, cfg.n | 0)), mon = effMon(cfg), out = [];
        for (var i = 1; i <= n; i++) out.push(mon + pad2(i));
        return out;
    }

    /* ---------- chuẩn hóa câu hỏi nhập từ Word ---------- */
    var REF_RE = /(^|[\s,;(])(c[aả]\s|tất cả|tat ca|cả hai|đều|không có|các (ý|phương án|đáp án)|phương án [A-D]\b|đáp án [A-D]\b|\b[A-D]\s*(,|và|&)\s*[A-D]\b)/i;
    var EN_LOCK1 = /\b(?:all|none|both|neither)\s+of\s+(?:the\s+)?(?:above|these|them|those)\b/i;   // [CODE123]
    var EN_LOCK2 = /\bboth\s+[A-D]\s+and\s+[A-D]\b|\b[A-D]\s*(?:,|&|and)\s*[A-D]\b/;
    function normQ(q) {
        var t = qType(q);
        var o = { type: t, text: String(q.text || q.title || ''), solution: String(q.solution || q.sol || ''), level: String(q.level || ''), levelTag: String(q.levelTag || ''), yccd: String(q.yccd || ''), gid: q.gid ? String(q.gid) : '', ginfo: q.ginfo ? String(q.ginfo) : '', gm: q.gm ? String(q.gm) : '', en: (q.en || q.gm) ? 1 : 0 };   // [CODE121]
        var opts = (q.options || []).map(function (x) { return typeof x === 'string' ? x : String((x && x.text) || ''); });
        if (t === 'mc') {
            o.opts = opts;
            var mcIdx = -1;
            if (typeof q.correct === 'number' && q.correct >= 0) {
                mcIdx = q.correct | 0;
            } else if (typeof q.correct === 'string' && q.correct.trim()) {
                var cUp = q.correct.trim().toUpperCase();
                if (/^[0-9]+$/.test(cUp)) mcIdx = parseInt(cUp, 10);
                else {
                    var byOpt = (q.options || []).findIndex(function (x) { return x && String(x.letter || '').trim().toUpperCase() === cUp; });
                    mcIdx = byOpt >= 0 ? byOpt : 'ABCD'.indexOf(cUp);
                }
            } else if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && (q.detectedByStyle || q.correctIndex > 0 || q.correct == null)) {
                mcIdx = q.correctIndex | 0;
            } else {
                var alt = q.ans != null ? q.ans : q.answer;
                if (typeof alt === 'number' && alt >= 0) mcIdx = alt | 0;
                else if (typeof alt === 'string' && alt.trim()) mcIdx = 'ABCD'.indexOf(alt.trim().toUpperCase());
            }
            o.correct = mcIdx >= 0 ? mcIdx : -1;
            o.lock = o.en ? opts.some(function (s) { var t = String(s).replace(/<[^>]+>/g, ''); return EN_LOCK1.test(t) || EN_LOCK2.test(t); })
                : opts.some(function (s) { return REF_RE.test(String(s).replace(/<[^>]+>/g, '')); });
        } else if (t === 'tf') {
            while (opts.length < 4) opts.push('');
            o.opts = opts.slice(0, 4);
            o.tf = [0, 1, 2, 3].map(function (i) { return !!(q.tfAnswers && q.tfAnswers[i]); });
            o.tfKnown = !!q.detectedByStyle || (Array.isArray(q.tfAnswers) && q.tfAnswers.length > 0) || o.tf.some(Boolean);
            o.tfSol = [0, 1, 2, 3].map(function (i) { return String((q.tfSol && q.tfSol[i]) || ''); });
        } else {
            o.sa = String(q.shortAnswer != null ? q.shortAnswer : (q.saAnswer != null ? q.saAnswer : (q.sa != null ? q.sa : (q.answer || '')))).trim();
        }
        return o;
    }
    function snippet(s, n) {
        s = String(s || '').replace(/@@IMG_[^@]*@@/g, ' [hình] ').replace(/@@TBL_[^@]*@@/g, ' [bảng] ').replace(/\$([^$]*)\$/g, function (m, a) { return ' ' + a.replace(/\\[a-zA-Z]+/g, '').replace(/[{}^_]/g, '') + ' '; })
            .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }
    var unresolved = function (q) { return q.type === 'mc' ? q.correct < 0 : q.type === 'tf' ? !q.tfKnown : !q.sa; };

    /* ---------- thuật toán trộn ---------- */
    function seedRng() {
        var s;
        try { var a = new Uint32Array(1); crypto.getRandomValues(a); s = a[0]; } catch (e) { s = (Date.now() ^ (Math.random() * 4294967296)) >>> 0; }
        return function () {   // mulberry32
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    var shuffle = window.LTDUtils.shuffle;
    // [CODE123] Lời giải English có "Chọn D." / "đáp án B"...: đảo đáp án thì chữ cái phải đổi theo vị trí mới
    var LETTER_REF = /(Chọn|chọn|Đáp\s*án(?:\s*đúng)?(?:\s*là)?|đáp\s*án(?:\s*đúng)?(?:\s*là)?|Phương\s*án|phương\s*án|Option|option)(\s*[:\-]?\s*)([A-D])(?![A-Za-zÀ-ỹ0-9])/g;
    function remapSolution(sol, order) {
        if (!sol) return sol;
        return String(sol).replace(LETTER_REF, function (m, p1, p2, L) {
            var nk = order.indexOf('ABCD'.indexOf(L));
            return nk < 0 ? m : p1 + p2 + 'ABCD'[nk];
        });
    }
    function inst(q, cfg, rnd) {
        var c = { type: q.type, srcIdx: q.idx, text: q.text, solution: q.solution, gid: q.gid, ginfo: q.ginfo, gm: q.gm, en: q.en, perm: '' };
        var n, order, i;
        if (q.type === 'mc') {
            n = q.opts.length; order = []; for (i = 0; i < n; i++) order.push(i);
            if (cfg.oI && !q.lock) shuffle(order, rnd);
            c.opts = order.map(function (k) { return q.opts[k]; });
            c.correct = q.correct >= 0 ? order.indexOf(q.correct) : -1;
            c.perm = order.join('');
            if (q.en) c.solution = remapSolution(q.solution, order);   // [CODE123]
        } else if (q.type === 'tf') {
            order = [0, 1, 2, 3];
            if (cfg.oII) shuffle(order, rnd);
            c.opts = order.map(function (k) { return q.opts[k]; });
            c.tf = order.map(function (k) { return q.tf[k]; });
            c.tfSol = order.map(function (k) { return q.tfSol[k]; });
            c.tfKnown = q.tfKnown;
            c.perm = order.join('');
        } else {
            c.sa = q.sa;
        }
        return c;
    }
    function makeVersion(cfg, rnd, code, srcList) {
        var parts = [], sig = '';
        ['mc', 'tf', 'sa'].forEach(function (t) {
            var blocks = [];
            var srcT = (srcList || MIX.src).filter(function (q) { return q.type === t; });
            var doShuf = (t === 'mc' ? cfg.mI : t === 'tf' ? cfg.mII : cfg.mIII);
            var enT = !!(window.CODE121EN && srcT.some(function (q) { return q.gm; }));   // [CODE121] đề English
            if (enT) {
                var flat = doShuf ? CODE121EN.shuffleList(srcT, function (a) { return shuffle(a.slice(), rnd); }) : srcT;
                blocks = [flat];
            } else {
                srcT.forEach(function (q) {
                    var lb = blocks[blocks.length - 1];
                    if (q.gid && lb && lb[0].gid === q.gid) lb.push(q); else blocks.push([q]);   // câu cùng nhóm (dữ kiện chung) đi liền nhau
                });
                if (doShuf) shuffle(blocks, rnd);
            }
            var list = [].concat.apply([], blocks).map(function (q) { return inst(q, cfg, rnd); });
            for (var i = 0; i < list.length; i++) {   // thông tin nhóm: in trước câu đầu nhóm
                var q = list[i];
                if (q.gid && (i === 0 || list[i - 1].gid !== q.gid)) {
                    var j = i, info = q.ginfo;
                    while (j + 1 < list.length && list[j + 1].gid === q.gid) { j++; if (!info && list[j].ginfo) info = list[j].ginfo; }
                    q.gFirst = { from: i + 1, to: j + 1, info: info || '', gm: q.gm };
                }
            }
            list.forEach(function (q) { sig += q.srcIdx + ':' + q.perm + ','; });
            parts.push({ type: t, list: list });
        });
        return { code: code, parts: parts, sig: sig };
    }
    function keyOf(q) {
        if (q.type === 'mc') return q.correct >= 0 ? 'ABCD'[q.correct] : '?';
        if (q.type === 'tf') return q.tfKnown ? q.tf.map(function (v) { return v ? 'Đ' : 'S'; }).join('') : '????';
        return q.sa || '?';
    }

    /* ---------- giao diện ---------- */
    var CSS = '' +
        '.mx-modal{position:absolute;inset:0;z-index:64;background:rgba(0,0,0,.75);display:flex;justify-content:center;align-items:stretch;transition:opacity .3s}' +
        '.mx-modal.hidden{display:none}.mx-modal.opacity-0{opacity:0}' +
        '.mx-panel{background:#f1f5f9;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;color:#0f172a}' +
        '.mx-head{background:linear-gradient(90deg,#7c3aed,#4f46e5);color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none}' +
        '.mx-head h2{margin:0;font-size:22.5px;font-weight:900;letter-spacing:.03em;text-transform:uppercase}' +
        '.mx-x{background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:999px;padding:7px 16px;font-weight:900;font-size:16px;cursor:pointer;white-space:nowrap}.mx-x:hover{background:rgba(255,255,255,.35)}' +
        '.mx-body{flex:1;min-height:0;overflow-y:auto;padding:14px 20px 28px}' +
        '.mx-wrap{max-width:none;width:100%;margin:0;display:flex;flex-direction:column;gap:12px}' +
        '.mx-card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:14px 16px;box-shadow:0 1px 4px rgba(15,23,42,.06)}' +
        '.mx-card h3{margin:0 0 10px;font-size:17px;font-weight:900;color:#4338ca;text-transform:uppercase;letter-spacing:.02em}' +
        '.mx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}' +
        '.mx-grid.one{grid-template-columns:1.3fr 1.5fr 1.5fr 1fr .55fr .95fr .95fr;gap:8px;align-items:end}' +
        '.mx-grid.one .mx-f{min-width:0}' +
        '.mx-grid.one .mx-f label{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.mx-grid.one .mx-f input[type=text]{font-size:15.5px;padding:8px 9px}' +
        '@media (max-width:1100px){.mx-grid.one{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}}' +
        '.mx-f label{display:block;font-size:14px;font-weight:900;color:#475569;text-transform:uppercase;margin-bottom:3px}' +
        '.mx-f input[type=text],.mx-f input[type=number]{width:100%;box-sizing:border-box;border:2px solid #cbd5e1;border-radius:10px;padding:8px 10px;font-size:17px;font-weight:700;color:#0f172a;background:#f8fafc;outline:none}' +
        '.mx-f input:focus{border-color:#6366f1;background:#fff}' +
        '.mx-f select{width:100%;box-sizing:border-box;border:2px solid #cbd5e1;border-radius:10px;padding:8px 10px;font-size:16px;font-weight:700;color:#0f172a;background:#f8fafc}' +
        '.mx-btn{border:0;border-radius:12px;padding:10px 18px;font-weight:900;font-size:16px;text-transform:uppercase;color:#fff;cursor:pointer;box-shadow:0 2px 6px rgba(15,23,42,.2);transition:transform .12s}.mx-btn:active{transform:scale(.96)}' +
        '.mx-btn.sky{background:linear-gradient(90deg,#0ea5e9,#2563eb)}.mx-btn.vio{background:linear-gradient(90deg,#8b5cf6,#6d28d9)}.mx-btn.grn{background:linear-gradient(90deg,#10b981,#059669)}.mx-btn.gry{background:#94a3b8;box-shadow:none}.mx-btn.red{background:#ef4444}' +
        '.mx-btn[disabled]{opacity:.45;cursor:not-allowed}' +
        '.mx-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}' +
        '.mx-note{font-size:14.5px;font-weight:600;color:#64748b;line-height:1.45;margin:6px 0 0}' +
        '.mx-warn{background:#fffbeb;border:1px solid #fcd34d;color:#92400e;border-radius:12px;padding:8px 12px;font-size:15px;font-weight:700;margin-top:8px}' +
        '.mx-ok{background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;border-radius:12px;padding:8px 12px;font-size:15.5px;font-weight:800;margin-top:8px}' +
        '.mx-chk{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:700;padding:5px 0;cursor:pointer}.mx-chk input{width:19px;height:19px;accent-color:#6366f1}.mx-chk.sub{margin-left:30px;font-weight:600;color:#334155}' +
        '.mx-list{max-height:240px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:12px;margin-top:8px}' +
        '.mx-li{display:flex;gap:8px;align-items:baseline;padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:15px}.mx-li:last-child{border-bottom:0}' +
        '.mx-li b{flex:none;min-width:84px;color:#4338ca}.mx-li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#334155}' +
        '.mx-li em{flex:none;font-style:normal;font-weight:900;color:#047857;background:#d1fae5;border-radius:999px;padding:1px 9px}.mx-li em.q{color:#b45309;background:#fef3c7}' +
        '.mx-ver{border:1px solid #c7d2fe;background:#eef2ff;border-radius:14px;padding:10px 12px}' +
        '.mx-ver-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.mx-ver-h b{font-size:19.5px;color:#3730a3;font-weight:900}' +
        '.mx-key{font-family:ui-monospace,Consolas,monospace;font-size:15px;line-height:1.6;word-break:break-all;color:#1e293b;margin-top:4px}.mx-key u{text-decoration:none;font-weight:900;color:#4338ca;font-family:inherit}' +
        '.mx-pv{background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:10px 14px;margin-top:8px;max-height:420px;overflow-y:auto;font-size:17px;line-height:1.5}' +
        '.mx-pv .pq{margin:0 0 10px}.mx-pv .po{display:inline-block;min-width:48%;vertical-align:top;margin:1px 0}.mx-pv .ok{font-weight:900;text-decoration:underline;color:#047857}.mx-pv h4{margin:10px 0 6px;font-weight:900;color:#4338ca}' +
        '.mx-fs{position:absolute;inset:0;z-index:30;background:#f1f5f9;display:flex;flex-direction:column}.mx-fs.hidden{display:none}' +
        '.mx-fs-h{flex:none;background:linear-gradient(90deg,#7c3aed,#4f46e5);color:#fff;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}' +
        '.mx-fs-h h2{margin:0;font-size:20.5px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;font-family:Roboto,Arial,sans-serif}' +
        '.mx-fs-b{flex:1;min-height:0;overflow-y:auto;padding:16px 18px 40px}' +
        '.mx-fs-w{max-width:none;margin:0;background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:22px 28px;font-family:Roboto,Arial,sans-serif !important}' +
        '.mx-fs-w .mx-pv{max-height:none;overflow:visible;border:0;margin:0;padding:0;font-family:Roboto,Arial,sans-serif !important;font-size:19px;line-height:1.65;color:#0f172a}' +
        '.mx-fs-w .mx-pv *{font-family:inherit}.mx-fs-w .mx-pv .po{min-width:48%}' +
        '.mx-fs-w .mx-key{font-family:Roboto,Arial,sans-serif;font-size:17px;margin-top:18px;padding-top:12px;border-top:2px dashed #c7d2fe}' +
        '.mx-fs-h h2,.mx-fs-w .mx-pv h4,.mx-fs-w .mx-key>b{font-family:\'UTM HelvetIns\',\'Helvetica Neue\',Helvetica,Arial,sans-serif !important}.mx-fs-w .mx-pv h4{font-size:20.5px;letter-spacing:.02em}' +
        '@media (max-width:640px){.mx-fs-w{padding:14px 12px}.mx-fs-w .mx-pv{font-size:17.5px}.mx-fs-w .mx-pv .po{min-width:100%}}' +
        '.mx-prog{position:absolute;inset:0;z-index:5;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center}' +
        '.mx-prog>div{background:#fff;border-radius:18px;padding:22px 30px;font-weight:900;color:#3730a3;text-align:center;max-width:90%}' +
        '.c83-mixbtn{width:100%;max-width:340px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:14px;font-size:15px;font-weight:900;letter-spacing:.03em;color:#fff !important;background:linear-gradient(90deg,#ec4899,#8b5cf6 55%,#4f46e5);border:3px solid #fbbf24;box-shadow:0 0 0 3px rgba(79,70,229,.30),0 6px 16px rgba(124,58,237,.45);text-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .12s,filter .12s}' +
        '.c83-mixbtn:hover{transform:translateY(-1px);filter:brightness(1.08)}.c83-mixbtn:active{transform:scale(.97)}';
    var SUBJECTS = ['Toán', 'Vật lí', 'Hóa học', 'Sinh học', 'Tin học', 'Công nghệ', 'Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tiếng Anh', 'Ngữ văn'];
    var HTML = '' +
        '<div class="mx-panel">' +
        '<div class="mx-head"><h2>🔀 Trộn đề thi</h2><button type="button" class="mx-x" onclick="CODE93Mix.close()">← Về trang chủ</button></div>' +
        '<div class="mx-body"><div class="mx-wrap">' +

        '<div class="mx-card"><h3>1. Nhập đề gốc</h3>' +
        '<div class="mx-row"><button type="button" class="mx-btn sky" onclick="CODE93Mix.importWord()">📄 Nhập đề từ file Word</button>' +
        '<button type="button" class="mx-btn" id="mx-import-en" style="background:linear-gradient(90deg,#f97316,#dc2626)" onclick="CODE93Mix.importWordEN()" title="Đáp án gạch chân • câu hỏi nhóm đặt trong [ ] • lời giải sau Answer:">📘 NHẬP FILE WORD ENGLISH</button>' +
        '<button type="button" class="mx-btn vio" id="mx-view" onclick="CODE93Mix.viewSrc()" disabled>👁 Xem lại đề gốc</button>' +
        '<button type="button" class="mx-btn gry" id="mx-clear" onclick="CODE93Mix.clearSrc()">Xóa đề đã nạp</button></div>' +
        '<p class="mx-note">📘 <b>File English:</b> đáp án đúng <u>gạch chân</u>; câu hỏi nhóm đặt trong <b>[ ]</b>; nhóm có “Read the” giữ nguyên số thứ tự câu, chỉ đảo A, B, C, D; các nhóm còn lại đảo cả thứ tự câu và đáp án; lời giải đặt sau “Answer:”.</p>' +
        '<div id="mx-src-status"></div>' +
        '<div id="mx-src-view" style="display:none"></div>' +
        '</div>' +

        '<div class="mx-card"><h3>2. Thông tin trang đầu của đề thi</h3><div class="mx-grid one">' +
        '<div class="mx-f"><label>Sở giáo dục</label><input type="text" id="mx-sgd" placeholder="VD: SỞ GD – ĐT QUẢNG TRỊ" oninput="CODE93Mix.onCfg()"></div>' +
        '<div class="mx-f"><label>Tên trường</label><input type="text" id="mx-school" placeholder="VD: THPT NGUYỄN CHÍ THANH" oninput="CODE93Mix.onCfg()"></div>' +
        '<div class="mx-f"><label>Tên kì thi</label><input type="text" id="mx-exam" placeholder="VD: KIỂM TRA GIỮA KÌ I" oninput="CODE93Mix.onCfg()"></div>' +
        '<div class="mx-f"><label>Môn thi</label><input type="text" id="mx-subject" list="mx-subj-list" placeholder="VD: Hóa học" oninput="CODE93Mix.onSubject()"><datalist id="mx-subj-list">' +
        SUBJECTS.map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist></div>' +
        '<div class="mx-f"><label>Lớp</label><input type="text" id="mx-grade" placeholder="VD: 12" oninput="CODE93Mix.onCfg()"></div>' +
        '<div class="mx-f"><label>Năm học</label><input type="text" id="mx-year" placeholder="VD: 2026 – 2027" oninput="CODE93Mix.onCfg()"></div>' +
        '<div class="mx-f"><label title="Thời gian làm bài (phút)">Thời gian làm bài (phút)</label><input type="text" id="mx-time" placeholder="VD: 50" oninput="CODE93Mix.onCfg()"></div>' +
        '</div></div>' +

        '<div class="mx-card"><h3>3. Cấu hình trộn</h3>' +
        '<label class="mx-chk"><input type="checkbox" id="mx-mI" onchange="CODE93Mix.onCfg()"> Trộn thứ tự các câu Phần I (nhiều lựa chọn)</label>' +
        '<label class="mx-chk sub"><input type="checkbox" id="mx-oI" onchange="CODE93Mix.onCfg()"> Đảo vị trí các phương án A, B, C, D trong mỗi câu</label>' +
        '<label class="mx-chk"><input type="checkbox" id="mx-mII" onchange="CODE93Mix.onCfg()"> Trộn thứ tự các câu Phần II (đúng – sai)</label>' +
        '<label class="mx-chk sub"><input type="checkbox" id="mx-oII" onchange="CODE93Mix.onCfg()"> Đảo vị trí các ý a), b), c), d) trong mỗi câu</label>' +
        '<label class="mx-chk"><input type="checkbox" id="mx-mIII" onchange="CODE93Mix.onCfg()"> Trộn thứ tự các câu Phần III (trả lời ngắn)</label>' +
        '<div class="mx-f" style="margin-top:10px"><label>Định dạng công thức Toán – Lý – Hóa trong file Word</label><select id="mx-fmt" onchange="CODE93Mix.onCfg()"><option value="mathtype">MathType (đối tượng công thức MathType, bấm đúp để sửa)</option><option value="omml">Equation của Word (OMML – dự phòng)</option></select></div>' +
        '<div id="mx-lock-note"></div></div>' +

        '<div class="mx-card"><h3>4. Số lượng mã đề cần tạo</h3><div class="mx-grid">' +
        '<div class="mx-f"><label>Số lượng mã đề cần tạo (1 – 99)</label><input type="number" id="mx-n" min="1" max="99" oninput="CODE93Mix.onCfg()"></div>' +
        '<div class="mx-f"><label>Mã môn (2 số đầu của mã đề)</label><input type="text" id="mx-mon" maxlength="2" inputmode="numeric" placeholder="tự nhận theo môn" oninput="CODE93Mix.onMon()"></div></div>' +
        '<div id="mx-codes" class="mx-note" style="font-weight:800;color:#3730a3"></div>' +
        '<p class="mx-note">Mã đề gồm 4 số: 2 số đầu là mã môn theo cách đánh mã đề của Bộ GD&ĐT, 2 số sau là số thứ tự. Đã đối chiếu mã đề thi tốt nghiệp THPT 2026: Toán 01 (0101…0124), Vật lí 02, Lịch sử 08, Tiếng Anh 11 (theo file mẫu: 1127). Các môn khác là mã gợi ý, thầy/cô sửa lại ở ô “Mã môn” nếu khác.</p></div>' +

        '<div class="mx-card"><div class="mx-row">' +
        '<button type="button" class="mx-btn vio" id="mx-gen" onclick="CODE93Mix.generate()">🔀 Tạo đề</button>' +
        '<button type="button" class="mx-btn grn" id="mx-exp" onclick="CODE93Mix.exportAll()" disabled>⬇ Xuất file đề</button>' +
        '<button type="button" class="mx-btn" id="mx-exp-qm" style="background:linear-gradient(90deg,#f59e0b,#ea580c)" onclick="CODE93Mix.exportKey(\'qm\')" disabled title="File Excel đáp án nhập vào app chấm thi QM (QM 2025 / Young Mix)">📊 Xuất đáp án QM</button>' +
        '<button type="button" class="mx-btn" id="mx-exp-tn" style="background:linear-gradient(90deg,#14b8a6,#0e7490)" onclick="CODE93Mix.exportKey(\'tn\')" disabled title="File Excel đáp án nhập vào app chấm thi TNMaker">📊 Xuất đáp án TNMaker</button></div>' +
        '<p class="mx-note">“Xuất file đề” tải về 1 gói (.zip) giải nén ra thành 1 thư mục gồm: đề thi từng mã đề (.docx), đề có đáp án từng mã đề (.docx) và bảng đáp án tổng hợp (.docx). Hai nút “Xuất đáp án QM” và “Xuất đáp án TNMaker” tải về file Excel (.xlsx) đáp án của tất cả mã đề đã tạo để nhập thẳng vào phần mềm chấm trắc nghiệm tương ứng.</p>' +
        '<div id="mx-results" style="display:flex;flex-direction:column;gap:10px;margin-top:10px"></div></div>' +

        '</div></div></div>';

    function ensureModal() {
        var m = $('mix-modal');
        if (m) return m;
        if (!$('code93-style')) { var st = document.createElement('style'); st.id = 'code93-style'; st.textContent = CSS; document.head.appendChild(st); }
        m = document.createElement('div');
        m.id = 'mix-modal'; m.className = 'mx-modal hidden opacity-0';
        m.innerHTML = HTML;
        ($('app-wrapper') || document.body).appendChild(m);
        return m;
    }
    function open() {
        var m = ensureModal();
        MIX.cfg = loadCfg();
        if (!MIX.cfg.mon) MIX.monTouched = false;
        writeCfg(); renderAll();
        m.classList.remove('hidden');
        setTimeout(function () { m.classList.remove('opacity-0'); }, 10);
    }
    function close() {
        var m = $('mix-modal'); if (!m) return;
        try { closePreview(); } catch (e) {}
        m.classList.add('opacity-0');
        setTimeout(function () { m.classList.add('hidden'); }, 300);
    }
    function onCfg() { readCfg(); saveCfg(); renderCodes(); }
    function onSubject() {
        var c = readCfg();
        if (!MIX.monTouched) {
            var code = subjectCode(c.subject), el = $('mx-mon');
            if (el) el.value = code;
            c = readCfg();
        }
        saveCfg(); renderCodes();
    }
    function onMon() { MIX.monTouched = true; readCfg(); saveCfg(); renderCodes(); }
    function renderCodes() {
        var el = $('mx-codes'); if (!el) return;
        var c = MIX.cfg || readCfg(), codes = codesFor(c);
        if (!codes.length) { el.textContent = ''; return; }
        el.textContent = 'Mã đề sẽ tạo (' + codes.length + '): ' + (codes.length > 12 ? codes.slice(0, 8).join(', ') + ', …, ' + codes[codes.length - 1] : codes.join(', '));
        if (c.n > 99) el.textContent += ' — tối đa 99 mã đề.';
    }
    function enNote() {   // [CODE123]
        var st = $('mx-src-status'); if (!st || !MIX.src.length) return;
        if (!MIX.src.some(function (q) { return q.gm || q.en; })) return;
        var g = {}, free = 0, k = 0, d2 = 0;
        MIX.src.forEach(function (q) { if (q.gid) g[q.gid] = q.gm; else free++; });
        Object.keys(g).forEach(function (id) { if (g[id] === 'k') k++; else d2++; });
        st.insertAdjacentHTML('beforeend', '<div class="mx-ok" style="background:#eff6ff;border-color:#93c5fd;color:#1e3a8a">📘 Đề English: ' + k + ' nhóm dạng 1 (“Read the” – giữ số câu, chỉ đảo A–D) • ' + d2 + ' nhóm dạng 2 (đảo cả câu và đáp án) • ' + free + ' câu lẻ.</div>');
    }
    function renderSrc() { renderSrc0(); enNote(); }
    function renderSrc0() {
        var st = $('mx-src-status'), box = $('mx-lock-note');
        if (!st) return;
        if (!MIX.src.length) { st.innerHTML = '<div class="mx-warn">Chưa có đề gốc. Bấm “Nhập đề từ file Word” để nạp đề.</div>'; if (box) box.innerHTML = ''; return; }
        var cnt = { mc: 0, tf: 0, sa: 0 }, un = 0, rows = '';
        var seq = { mc: 0, tf: 0, sa: 0 }, locked = [];
        MIX.src.forEach(function (q) {
            cnt[q.type]++; seq[q.type]++;
            var bad = unresolved(q); if (bad) un++;
            if (q.type === 'mc' && q.lock) locked.push(seq.mc);
            var ans = q.type === 'mc' ? (q.correct >= 0 ? 'ABCD'[q.correct] : '?') : q.type === 'tf' ? (q.tfKnown ? q.tf.map(function (v) { return v ? 'Đ' : 'S'; }).join('') : '????') : (q.sa || '?');
            rows += '<div class="mx-li"><b>' + (q.type === 'mc' ? 'Phần I' : q.type === 'tf' ? 'Phần II' : 'Phần III') + ' – Câu ' + seq[q.type] + '</b><span>' + esc(snippet(q.text, 110)) + '</span><em class="' + (bad ? 'q' : '') + '">' + esc(ans) + '</em></div>';
        });
        st.innerHTML = '<div class="mx-ok">✓ Đã nạp ' + MIX.src.length + ' câu' + (MIX.fileName ? ' từ “' + esc(MIX.fileName) + '”' : '') + ': Phần I = ' + cnt.mc + ', Phần II = ' + cnt.tf + ', Phần III = ' + cnt.sa + '.</div>' +
            (un ? '<div class="mx-warn">⚠ Có ' + un + ' câu chưa có đáp án đúng (hiện dấu “?”). Đề vẫn trộn được nhưng bảng đáp án sẽ để “?” ở các câu này. Bấm “Nhập đề từ file Word” lần nữa để chọn đáp án ở màn hình kiểm tra, hoặc dùng ô “Nhập nhanh đáp án”.</div>' : '');   /* [CODE104] bỏ danh sách câu để tiết kiệm chỗ (xem bằng nút “Xem lại đề gốc”) */
        if (box) box.innerHTML = '';   /* [CODE108] không hiện cảnh báo “câu giữ nguyên thứ tự phương án” */
    }
    function keyHtml(ver) {
        var h = '';
        ver.parts.forEach(function (p) {
            if (!p.list.length) return;
            var label = p.type === 'mc' ? 'Phần I' : p.type === 'tf' ? 'Phần II' : 'Phần III';
            var sep = p.type === 'sa' ? ' | ' : ' ';
            var s = p.list.map(function (q, i) { return (p.type === 'mc' ? (i + 1) + '.' : p.type === 'sa' ? (i + 1) + ': ' : (i + 1) + ':') + esc(keyOf(q)); }).join(sep);
            h += '<div class="mx-key"><u>' + label + ':</u> ' + s + '</div>';
        });
        return h;
    }
    function previewHtml(ver) {
        var h = '';
        ver.parts.forEach(function (p) {
            if (!p.list.length) return;
            h += '<h4>' + (p.type === 'mc' ? 'PHẦN I' : p.type === 'tf' ? 'PHẦN II' : 'PHẦN III') + '</h4>';
            p.list.forEach(function (q, i) {
                h += '<div class="pq">';
                if (q.gFirst && q.gFirst.info) h += '<div><i>Thông tin chung (câu ' + q.gFirst.from + '–' + q.gFirst.to + '):</i> ' + formatMathAndChemHTML(q.gFirst.info, { center: true }) + '</div>';
                h += '<b>' + ((q.en || q.gm) ? 'Question' : 'Câu') + ' ' + (i + 1) + '.</b> ' + formatMathAndChemHTML(q.text, { center: true });
                if (q.type === 'mc') {
                    h += '<div>' + q.opts.map(function (o, k) { return '<span class="po' + (q.correct === k ? ' ok' : '') + '"><b>' + 'ABCD'[k] + '.</b> ' + formatMathAndChemHTML(o) + '</span>'; }).join('') + '</div>';
                } else if (q.type === 'tf') {
                    h += q.opts.map(function (o, k) { return '<div class="' + (q.tfKnown && q.tf[k] ? 'ok' : '') + '" style="margin-left:14px">' + '<b>' + 'abcd'[k] + ')</b> ' + formatMathAndChemHTML(o) + '</div>'; }).join('');
                } else {
                    h += '<div class="ok">Trả lời: ' + formatMathAndChemHTML(q.sa || '?') + '</div>';
                }
                h += '</div>';
            });
        });
        return h;
    }
    function renderResults() {
        var box = $('mx-results'), exp = $('mx-exp');
        if (!box) return;
        if (exp) exp.disabled = !MIX.versions.length;
        ['mx-exp-qm', 'mx-exp-tn'].forEach(function (id) { var b = $(id); if (b) b.disabled = !MIX.versions.length; });   /* [CODE125] */
        if (!MIX.versions.length) { box.innerHTML = ''; return; }
        var Dqr = window.__CODE93_DOC || {}, qrList = Dqr.buildTNMakerQrPayloads ? Dqr.buildTNMakerQrPayloads(MIX.versions) : [], qrHtml = '';
        if (qrList.length) {
            qrHtml = '<div class="mx-ver" style="background:#f0fdfa;border:1.5px solid #14b8a6;padding:12px">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
                '<b style="color:#0f766e">📱 Mã QR đáp án chuẩn TNMaker (type: 5)</b>' +
                '<span style="font-size:12px;color:#0f766e">Mở app TNMaker → Quét QR để nạp toàn bộ ' + MIX.versions.length + ' mã đề</span></div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start">' +
                qrList.map(function (qp, qi) {
                    var img = Dqr.renderTNMakerQrPng ? Dqr.renderTNMakerQrPng(qp.json) : null;
                    var imgTag = img ? '<img src="' + img.dataUrl + '" alt="QR TNMaker" style="width:180px;height:180px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:6px;display:block;margin:0 auto">' : '<div style="color:#dc2626;font-size:12px">Chưa tải thư viện QR</div>';
                    return '<div style="background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:10px;text-align:center;min-width:210px;flex:0 1 auto">' +
                        imgTag +
                        '<div style="font-size:12px;font-weight:700;color:#334155;margin:6px 0">Mã đề: ' + esc(qp.codes.join(', ')) + '</div>' +
                        '<div style="display:flex;gap:6px;justify-content:center">' +
                        (img ? '<button type="button" class="mx-btn" style="padding:4px 10px;font-size:11.5px;background:#0d9488" onclick="CODE93Mix.downloadQr(' + qi + ')">⬇ Tải QR</button>' : '') +
                        '<button type="button" class="mx-btn sky" style="padding:4px 10px;font-size:11.5px" onclick="CODE93Mix.copyQrJson(' + qi + ')">📋 Chép JSON</button>' +
                        '</div></div>';
                }).join('') + '</div></div>';
        }
        box.innerHTML = '<div class="mx-ok">✓ Đã tạo ' + MIX.versions.length + ' mã đề. Bấm “Xem đề” để kiểm tra, rồi bấm “Xuất file đề” hoặc quét mã QR TNMaker bên dưới.</div>' + qrHtml + MIX.versions.map(function (v, i) {
            return '<div class="mx-ver"><div class="mx-ver-h"><b>Mã đề ' + v.code + '</b><button type="button" class="mx-btn sky" style="padding:5px 12px;font-size:12px" onclick="CODE93Mix.togglePreview(' + i + ')">Xem đề</button></div><div id="mx-pv-' + i + '" style="display:none"></div></div>';
        }).join('');
    }
    /* [CODE104] Xem trước (đề gốc / mã đề đã trộn): mở TOÀN MÀN HÌNH, font Roboto */
    var fsKind = '', fsIdx = -1;
    function fsEl() {
        var m = ensureModal(), f = $('mx-fs');
        if (f) return f;
        f = document.createElement('div'); f.id = 'mx-fs'; f.className = 'mx-fs hidden';
        f.innerHTML = '<div class="mx-fs-h"><h2 id="mx-fs-t"></h2><button type="button" class="mx-x" onclick="CODE93Mix.closePreview()">✕ Đóng xem trước</button></div>' +
            '<div class="mx-fs-b" id="mx-fs-b"><div class="mx-fs-w" id="mx-fs-w"></div></div>';
        m.appendChild(f);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var x = $('mx-fs'); if (x && !x.classList.contains('hidden')) { closePreview(); e.stopPropagation(); } } }, true);
        return f;
    }
    function openPreview(kind, idx) {
        var v = kind === 'src' ? srcVersion() : MIX.versions[idx]; if (!v) return;
        var f = fsEl(); fsKind = kind; fsIdx = idx;
        $('mx-fs-t').textContent = kind === 'src' ? '👁 Đề gốc (chưa trộn)' : '👁 Xem đề – Mã đề ' + v.code;
        $('mx-fs-w').innerHTML = '<div class="mx-pv">' + previewHtml(v) + '</div><div class="mx-key"><b>Đáp án:</b>' + keyHtml(v) + '</div>';
        f.classList.remove('hidden'); $('mx-fs-b').scrollTop = 0;
    }
    function closePreview() { var f = $('mx-fs'); if (f) f.classList.add('hidden'); fsKind = ''; fsIdx = -1; }
    function togglePreview(i) { openPreview('ver', i); }
    /* [CODE97] Xem lại đề gốc: hiển thị toàn bộ đề đã nạp theo đúng thứ tự gốc (chưa trộn), có đánh dấu đáp án đúng */
    var srcViewOpen = false;
    function srcVersion() {
        var parts = [];
        ['mc', 'tf', 'sa'].forEach(function (t) {
            var list = MIX.src.filter(function (q) { return q.type === t; }).map(function (q) {
                var c = {}; for (var k in q) c[k] = q[k]; return c;
            });
            for (var i = 0; i < list.length; i++) {
                var q = list[i];
                if (q.gid && (i === 0 || list[i - 1].gid !== q.gid)) {
                    var j = i, info = q.ginfo;
                    while (j + 1 < list.length && list[j + 1].gid === q.gid) { j++; if (!info && list[j].ginfo) info = list[j].ginfo; }
                    q.gFirst = { from: i + 1, to: j + 1, info: info || '', gm: q.gm };
                }
            }
            parts.push({ type: t, list: list });
        });
        return { code: 'GOC', parts: parts, sig: '' };
    }
    function renderSrcView() {
        var btn = $('mx-view');
        if (btn) { btn.disabled = !MIX.src.length; btn.textContent = '👁 Xem lại đề gốc'; }
        if (!MIX.src.length && fsKind === 'src') closePreview();
        else if (fsKind === 'src') openPreview('src', -1);
        else if (fsKind === 'ver' && !MIX.versions[fsIdx]) closePreview();
    }
    function viewSrc() {
        if (!MIX.src.length) { toast('Chưa có đề gốc', 'Hãy bấm “Nhập đề từ file Word” để nạp đề trước khi xem lại.'); return; }
        openPreview('src', -1);
    }
    function renderAll() { renderSrc(); renderSrcView(); renderCodes(); renderResults(); }
    function toast(title, msg, type) { try { showModal(title, msg, type || 'info'); } catch (e) { alert(title + '\n' + msg); } }

    /* ---------- nhập đề ---------- */
    var BTN_SEL = '#word-import-modal button[onclick="applyWordImportToEditor()"]';
    function importWord() {
        MIX.active = true;
        openWordImportModal();
        var b = document.querySelector(BTN_SEL);
        if (b) { if (!b.dataset.old) b.dataset.old = b.textContent.trim(); b.textContent = 'Đưa vào TRỘN ĐỀ'; }
    }
    function importWordEN() {   // [CODE123] nút "NHẬP FILE WORD ENGLISH"
        MIX.active = true;
        var ok = false;
        try { ok = !!(window.CODE121EN && CODE121EN.openForMix && CODE121EN.openForMix()); } catch (e) { ok = false; }
        if (!ok) { MIX.active = false; toast('Chưa nhập được', 'Không mở được khung nhập file Word English. Hãy tải lại trang rồi thử lại.'); return; }
        var b = document.querySelector(BTN_SEL);
        if (b) { if (!b.dataset.old) b.dataset.old = b.textContent.trim(); b.textContent = 'Đưa vào TRỘN ĐỀ'; }
    }
    function leaveImport() {
        MIX.active = false;
        var b = document.querySelector(BTN_SEL);
        if (b && b.dataset.old) b.textContent = ' ' + b.dataset.old + ' ';
    }
    // gọi từ applyImportDraft khi đang ở chế độ trộn đề
    function receive(draft) {
        if (!draft || !draft.length) { toast('Thông báo', 'Chưa có câu hỏi nào từ file Word! Vui lòng chọn file Word (.docx) trước.'); return; }
        var radio = document.querySelector('input[name="word-import-mode"]:checked');
        var mode = radio ? radio.value : 'replace';
        var list = draft.map(normQ);
        MIX.src = mode === 'append' ? MIX.src.concat(list) : list;
        MIX.src.forEach(function (q, i) { q.idx = i; });
        try { if (typeof wordTempMemoryBuffer !== 'undefined' && wordTempMemoryBuffer && wordTempMemoryBuffer.fileName) MIX.fileName = wordTempMemoryBuffer.fileName; } catch (e) {}
        MIX.versions = [];
        closeWordImportModal();
        leaveImport();
        try { if (MIX.src.some(function (q) { return q.gm || q.en; })) { var sj = $('mx-subject'); if (sj && !String(sj.value).trim()) { sj.value = 'Tiếng Anh'; onSubject(); } } } catch (e) {}   // [CODE123]
        renderAll();
        var un = MIX.src.filter(unresolved).length;
        toast(un ? 'Đã nạp – cần kiểm tra' : 'Thành công!', 'Đã nạp ' + MIX.src.length + ' câu hỏi vào TRỘN ĐỀ THI.' + (un ? ' ⚠ ' + un + ' câu chưa có đáp án đúng.' : ''), un ? 'info' : 'success');
    }
    function clearSrc() { MIX.src = []; MIX.versions = []; MIX.fileName = ''; srcViewOpen = false; renderAll(); }

    /* ---------- tạo đề ---------- */
    function generate() {
        var cfg = readCfg(); saveCfg();
        if (!MIX.src.length) { toast('Chưa có đề gốc', 'Hãy bấm “Nhập đề từ file Word” để nạp đề trước khi tạo mã đề.'); return; }
        if (!cfg.n || cfg.n < 1) { toast('Số lượng mã đề', 'Hãy nhập số lượng mã đề cần tạo (từ 1 đến 99).'); return; }
        if (cfg.n > 99) { cfg.n = 99; var el = $('mx-n'); if (el) el.value = 99; }
        var codes = codesFor(cfg), rnd = seedRng(), seen = {}, vers = [];
        codes.forEach(function (code) {
            var v = null;
            for (var t = 0; t < 30; t++) { v = makeVersion(cfg, rnd, code); if (!seen[v.sig]) break; }
            seen[v.sig] = 1; vers.push(v);
        });
        MIX.versions = vers;
        var anyShuffle = cfg.mI || cfg.oI || cfg.mII || cfg.oII || cfg.mIII;
        renderResults();
        if (!anyShuffle) toast('Lưu ý', 'Chưa chọn kiểu trộn nào nên các mã đề giống đề gốc. Hãy tích chọn ở mục “Cấu hình trộn”.');
        else if (vers.length > 1 && new Set(vers.map(function (v) { return v.sig; })).size < vers.length) toast('Lưu ý', 'Đề gốc có ít câu nên một số mã đề trùng thứ tự nhau. Hãy bật thêm các lựa chọn trộn.');
    }

    /* ---------- xuất file ---------- */
    function safe(s, def) {
        var r = fold(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
        return r || def;
    }
    var tick = function () { return new Promise(function (r) { setTimeout(r, 20); }); };
    function progress(msg) {
        var m = $('mix-modal'); if (!m) return;
        var p = $('mx-prog');
        if (!msg) { if (p) p.remove(); return; }
        if (!p) { p = document.createElement('div'); p.id = 'mx-prog'; p.className = 'mx-prog'; p.innerHTML = '<div id="mx-prog-t"></div>'; m.appendChild(p); }
        $('mx-prog-t').textContent = msg;
    }
    function download(blob, name) {
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2500);
    }
    async function exportAll() {
        var cfg = readCfg(); saveCfg(); window.__CODE94_FMT = cfg.fmt;
        if (!MIX.versions.length) { toast('Chưa tạo đề', 'Hãy bấm “Tạo đề” trước khi xuất file.'); return; }
        if (typeof JSZip === 'undefined' && window.__code98LoadLib) { progress('Đang tải thư viện nén…'); try { await window.__code98LoadLib('JSZip', ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js']); } catch (e) {} progress(''); }
        if (typeof JSZip === 'undefined') { toast('Chưa tải được thư viện', 'Không tìm thấy thư viện nén JSZip. Hãy kiểm tra kết nối Internet rồi tải lại trang.'); return; }
        var root = 'Tron_de_' + safe(cfg.subject, 'de_thi') + (cfg.grade ? '_lop_' + safe(cfg.grade, '') : '') + '_' + MIX.versions.length + '_ma_de';
        try {
            var zip = new JSZip(), n = MIX.versions.length;
            for (var i = 0; i < n; i++) {
                var v = MIX.versions[i];
                progress('Đang tạo file Word mã đề ' + v.code + ' (' + (i + 1) + '/' + n + ')…'); await tick();
                zip.file(root + '/1_DE_THI/De_' + v.code + '.docx', await D.buildExamDocx(v, cfg, false));
                zip.file(root + '/2_DE_CO_DAP_AN/De_' + v.code + '_co_dap_an.docx', await D.buildExamDocx(v, cfg, true));
            }
            progress('Đang tạo bảng đáp án tổng hợp…'); await tick();
            zip.file(root + '/3_BANG_DAP_AN/Bang_dap_an_tong_hop.docx', await D.buildKeyDocx(MIX.versions, cfg));
            var qrBatches = D.buildTNMakerQrPayloads ? D.buildTNMakerQrPayloads(MIX.versions) : [];
            qrBatches.forEach(function (qp) {
                var img = D.renderTNMakerQrPng ? D.renderTNMakerQrPng(qp.json) : null;
                if (img && img.bytes) zip.file(root + '/4_MA_QR_TNMAKER/QR_TNMaker_' + qp.codes.join('_') + '.png', img.bytes);
            });
            progress('Đang nén thành 1 thư mục…'); await tick();
            var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            progress('');
            download(blob, root + '.zip');
            toast('Đã xuất file đề', 'Đã tải về “' + root + '.zip”. Giải nén sẽ được thư mục “' + root + '” gồm ' + n + ' đề thi, ' + n + ' đề có đáp án và 1 bảng đáp án tổng hợp.', 'success');
        } catch (err) {
            progress('');
            console.error('[CODE93] export', err);
            toast('Lỗi xuất file', String(err && err.message ? err.message : err));
        }
    }

    /* ============================================================
       [CODE125] XUẤT FILE ĐÁP ÁN EXCEL cho phần mềm chấm trắc nghiệm QM (QM 2025 / Young Mix) và TNMaker
       - Cấu trúc theo phiếu TLTN 2025: Phần I tối đa 40 câu (A-D), Phần II tối đa 8 câu (4 ý Đ/S), Phần III tối đa 6 câu (đáp án số).
       - Câu không dùng đến để TRỐNG; mã đề lưu dạng chữ để không mất số 0 đầu (VD 0101).
       - QM: mỗi mã đề 1 dòng; cột A = mã đề, tiếp theo Phần I 1…40, Phần II 1a…8d, Phần III 1…6.
       - TNMaker: mỗi mã đề 1 cột (các mã đề nối tiếp theo chiều ngang), các hàng là câu 1…54; Phần II viết liền 4 ký tự Đ/S.
         Đáp án nằm ở cả sheet 1 và sheet 2 (TNMaker đọc file Excel đáp án ở sheet 2, QR đọc ở sheet 1).
       ============================================================ */
    var KLIM = { mc: 40, tf: 8, sa: 6 };
    function partList(ver, type) {
        for (var i = 0; i < ver.parts.length; i++) if (ver.parts[i].type === type) return ver.parts[i].list || [];
        return [];
    }
    function aMc(q) { return q && q.correct >= 0 ? 'ABCD'[q.correct] : null; }
    function aTf(q, j) { return q && q.tfKnown && q.tf ? (q.tf[j] ? 'Đ' : 'S') : null; }
    function aSa(q) { var t = q && q.sa != null ? String(q.sa).replace(/\s+/g, ' ').trim() : ''; return (!t || t === '?') ? null : t; }
    function keyOverflow(vers) {
        var o = [];
        vers.forEach(function (v) {
            if (partList(v, 'mc').length > KLIM.mc) o.push('Phần I (' + partList(v, 'mc').length + ' câu, tối đa ' + KLIM.mc + ')');
            if (partList(v, 'tf').length > KLIM.tf) o.push('Phần II (' + partList(v, 'tf').length + ' câu, tối đa ' + KLIM.tf + ')');
            if (partList(v, 'sa').length > KLIM.sa) o.push('Phần III (' + partList(v, 'sa').length + ' câu, tối đa ' + KLIM.sa + ')');
        });
        return o.filter(function (x, i) { return o.indexOf(x) === i; });
    }
    function keyAoaQM(vers) {
        var head = ['Mã đề'], i, j;
        for (i = 1; i <= KLIM.mc; i++) head.push(String(i));
        for (i = 1; i <= KLIM.tf; i++) for (j = 0; j < 4; j++) head.push(i + 'abcd'[j]);
        for (i = 1; i <= KLIM.sa; i++) head.push(String(i));
        var rows = [head];
        vers.forEach(function (v) {
            var mc = partList(v, 'mc'), tf = partList(v, 'tf'), sa = partList(v, 'sa'), r = [String(v.code)];
            for (i = 0; i < KLIM.mc; i++) r.push(aMc(mc[i]));
            for (i = 0; i < KLIM.tf; i++) for (j = 0; j < 4; j++) r.push(aTf(tf[i], j));
            for (i = 0; i < KLIM.sa; i++) r.push(aSa(sa[i]));
            rows.push(r);
        });
        return rows;
    }
    function keyAoaTN(vers) {
        var head = ['Câu'].concat(vers.map(function (v) { return String(v.code); })), rows = [head], i, n = 0;
        function line(fn) { n++; var r = [String(n)]; vers.forEach(function (v) { r.push(fn(v)); }); rows.push(r); }
        for (i = 0; i < KLIM.mc; i++) (function (k) { line(function (v) { return aMc(partList(v, 'mc')[k]); }); })(i);
        for (i = 0; i < KLIM.tf; i++) (function (k) {
            line(function (v) {
                var q = partList(v, 'tf')[k]; if (!q || !q.tfKnown) return null;
                return [0, 1, 2, 3].map(function (j) { return aTf(q, j) || ''; }).join('');
            });
        })(i);
        for (i = 0; i < KLIM.sa; i++) (function (k) { line(function (v) { return aSa(partList(v, 'sa')[k]); }); })(i);
        return rows;
    }
    function makeSheet(aoa, cols) {
        var ws = XLSX.utils.aoa_to_sheet(aoa);
        Object.keys(ws).forEach(function (a) { if (a[0] !== '!' && ws[a] && ws[a].t !== 's') { ws[a].t = 's'; ws[a].v = String(ws[a].v); } });   /* mọi ô là chữ: giữ số 0 đầu, dấu phẩy thập phân */
        ws['!cols'] = cols;
        return ws;
    }
    async function exportKey(kind) {
        var cfg = readCfg(); saveCfg();
        if (!MIX.versions.length) { toast('Chưa tạo đề', 'Hãy bấm “Tạo đề” trước khi xuất file đáp án.'); return; }
        if (typeof XLSX === 'undefined' && window.__code98LoadLib) {
            progress('Đang tải thư viện Excel…');
            try { await window.__code98LoadLib('XLSX', ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js']); } catch (e) {}
            progress('');
        }
        if (typeof XLSX === 'undefined') { toast('Chưa tải được thư viện Excel', 'Hãy kiểm tra kết nối Internet rồi tải lại trang.'); return; }
        try {
            var vers = MIX.versions, wb = XLSX.utils.book_new(), name, label;
            var base = safe(cfg.subject, 'de_thi') + (cfg.grade ? '_lop_' + safe(cfg.grade, '') : '') + '_' + vers.length + '_ma_de';
            if (kind === 'qm') {
                var aq = keyAoaQM(vers), cq = [{ wch: 9 }]; for (var c = 1; c < aq[0].length; c++) cq.push({ wch: 4.5 });
                XLSX.utils.book_append_sheet(wb, makeSheet(aq, cq), 'DapAn');
                name = 'DapAn_QM_' + base + '.xlsx'; label = 'QM';
            } else {
                var at = keyAoaTN(vers), ct = [{ wch: 7 }]; vers.forEach(function () { ct.push({ wch: 9 }); });
                XLSX.utils.book_append_sheet(wb, makeSheet(at, ct), 'DapAn');
                XLSX.utils.book_append_sheet(wb, makeSheet(at, ct), 'DapAn_2');
                name = 'DapAn_TNMaker_' + base + '.xlsx'; label = 'TNMaker';
            }
            var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
            download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name);
            var ov = keyOverflow(vers), un = 0;
            vers.forEach(function (v) { v.parts.forEach(function (p) { p.list.forEach(function (q) { if (unresolved(q)) un++; }); }); });
            var msg = 'Đã tải về “' + name + '” (' + vers.length + ' mã đề). Mở app ' + label + ' → Đáp án → nhập từ file Excel.';
            if (ov.length) msg += ' ⚠ Đề có ' + ov.join(', ') + ' nên các câu vượt giới hạn của phiếu 2025 không được ghi vào file.';
            if (un) msg += ' ⚠ Có câu chưa có đáp án đúng nên ô đáp án để trống.';
            toast('Đã xuất đáp án ' + label, msg, (ov.length || un) ? undefined : 'success');
        } catch (err) {
            progress('');
            console.error('[CODE125] export key', err);
            toast('Lỗi xuất đáp án', String(err && err.message ? err.message : err));
        }
    }


    /* [CODE162] XUẤT FILE WORD TỪ NGÂN HÀNG ĐỀ: dùng đúng bộ dựng Word của TRỘN ĐỀ (giữ thứ tự ngân hàng, không trộn, không có mã đề trừ khi nhập) */
    function bankToDraft(q) {
        var t = (q && (q.type === 'tf' || q.type === 'sa')) ? q.type : 'mc';
        var d = { type: t, text: String((q && q.text) || ''), solution: String((q && (q.solution || q.sol)) || ''), level: String((q && q.level) || ''), levelTag: String((q && q.levelTag) || ''), yccd: String((q && q.yccd) || ''), gid: q && q.gid ? String(q.gid) : '', ginfo: q && q.ginfo ? String(q.ginfo) : '' };
        if (q && q.gm) d.gm = String(q.gm);
        d.options = ((q && q.options) || []).map(function (o) { return { text: String((o && o.text) || '') }; });
        if (t === 'mc') {
            var ci = -1; ((q && q.options) || []).forEach(function (o, i) { if (ci < 0 && o && o.letter === q.correct) ci = i; });
            d.detectedByStyle = ci >= 0; d.correctIndex = Math.max(0, ci);
        } else if (t === 'tf') {
            d.tfAnswers = [0, 1, 2, 3].map(function (i) { return !!(q.tfAnswers && q.tfAnswers[i]); });
            d.tfSol = [0, 1, 2, 3].map(function (i) { return String((q.tfSol && q.tfSol[i]) || ''); });
            d.detectedByStyle = Array.isArray(q.tfAnswers);
        } else {
            d.shortAnswer = String(q.shortAnswer == null ? '' : q.shortAnswer);
        }
        return d;
    }
    function bankVersion(list, code) {
        var src = list.map(bankToDraft).map(normQ);
        src.forEach(function (q, i) { q.idx = i; });
        return makeVersion({ mI: false, mII: false, mIII: false, oI: false, oII: false }, seedRng(), code || '', src);
    }
    async function bankVbaWord(list, info, opt) {
        opt = opt || {};
        var cfg = Object.assign({}, loadCfg(), info || {});
        cfg.fmt = cfg.fmt === 'omml' ? 'omml' : 'mathtype';
        window.__CODE94_FMT = cfg.fmt;
        var ver = bankVersion(list, ''), base = opt.base || 'De_thi', out = [];
        out.push({ role: 'hs', name: base + '_HS.docx', data: await D.buildVbaStandardDocx(ver, cfg, false) });
        out.push({ role: 'gv', name: base + '_GV.docx', data: await D.buildVbaStandardDocx(ver, cfg, true) });
        return out;
    }
    async function bankWord(list, info, opt, prog) {
        opt = opt || {};
        var cfg = Object.assign({}, loadCfg(), info || {});
        cfg.fmt = cfg.fmt === 'omml' ? 'omml' : 'mathtype';
        window.__CODE94_FMT = cfg.fmt;
        var ver = bankVersion(list, opt.code || ''), base = opt.base || 'De_thi', out = [];
        var say = function (m) { try { if (prog) prog(m); } catch (e) {} };
        if (opt.exam) { say('Đang tạo file đề thi…'); await tick(); out.push({ dir: '1_DE_THI', name: base + '.docx', data: await D.buildExamDocx(ver, cfg, false) }); }
        if (opt.ans) { say('Đang tạo file đề có đáp án…'); await tick(); out.push({ dir: '2_DE_CO_DAP_AN', name: base + '_co_dap_an.docx', data: await D.buildExamDocx(ver, cfg, true) }); }
        if (opt.key) { say('Đang tạo bảng đáp án…'); await tick(); out.push({ dir: '3_BANG_DAP_AN', name: 'Bang_dap_an_' + base + '.docx', data: await D.buildKeyDocx([ver], cfg) }); }
        return out;
    }

    function loadFromLibrary(topic) {
        if (!topic || !Array.isArray(topic.questions) || !topic.questions.length) return false;
        open();
        MIX.src = topic.questions.map(normQ);
        MIX.src.forEach(function (q, i) { q.idx = i; });
        MIX.fileName = (topic.subtitle || 'De_thi') + '.docx';
        MIX.versions = [];
        var ex = $('mx-exam'), sj = $('mx-subject'), gr = $('mx-grade'), tm = $('mx-time');
        if (ex && topic.subtitle) ex.value = String(topic.subtitle);
        if (sj && topic.subject) { sj.value = String(topic.subject); onSubject(); }
        if (gr && topic.grade) gr.value = String(topic.grade).replace(/^Lớp\s*/i, '');
        if (tm && topic.timeLimit) tm.value = String(topic.timeLimit);
        saveCfg();
        renderAll();
        var un = MIX.src.filter(unresolved).length;
        toast(un ? 'Đã nạp – cần kiểm tra' : 'Thành công!', 'Đã nạp ' + MIX.src.length + ' câu từ Thư viện vào TRỘN ĐỀ THI.' + (un ? ' ⚠ ' + un + ' câu chưa có đáp án đúng.' : ''), un ? 'info' : 'success');
        return true;
    }

    window.CODE93Mix = {
        loadFromLibrary: loadFromLibrary,
        bankWord: bankWord, bankVbaWord: bankVbaWord,
        open: open, close: close, onCfg: onCfg, onSubject: onSubject, onMon: onMon, importWord: importWord, importWordEN: importWordEN, receive: receive, leaveImport: leaveImport,
        clearSrc: clearSrc, viewSrc: viewSrc, closePreview: closePreview, generate: generate, exportAll: exportAll, exportKey: exportKey,
        buildTNMakerQrPayloads: function (v) { return window.__CODE93_DOC.buildTNMakerQrPayloads(v); },
        renderTNMakerQrPng: function (t) { return window.__CODE93_DOC.renderTNMakerQrPng(t); },
        downloadQr: function (qi) {
            var Dqr = window.__CODE93_DOC || {}, list = Dqr.buildTNMakerQrPayloads ? Dqr.buildTNMakerQrPayloads(MIX.versions) : [], qp = list[qi || 0];
            if (!qp) return;
            var img = Dqr.renderTNMakerQrPng ? Dqr.renderTNMakerQrPng(qp.json) : null;
            if (!img) return;
            download(new Blob([img.bytes], { type: 'image/png' }), 'QR_TNMaker_' + qp.codes.join('_') + '.png');
        },
        copyQrJson: function (qi) {
            var Dqr = window.__CODE93_DOC || {}, list = Dqr.buildTNMakerQrPayloads ? Dqr.buildTNMakerQrPayloads(MIX.versions) : [], qp = list[qi || 0];
            if (!qp) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(qp.json).then(function () { toast('Đã chép JSON', 'Đã sao chép chuỗi JSON QR TNMaker (type: 5).', 'ok'); }).catch(function () {});
            }
        }, togglePreview: togglePreview,
        get active() { return MIX.active; }, set active(v) { MIX.active = !!v; }, _state: MIX
    };
})();

// === [code121-english] ===
/* ============================================================
   [CODE121] NHẬP FILE WORD ENGLISH
   Quy ước file Word (xem file mẫu "ĐỀ MẪU ANH"):
     - Đáp án đúng: GẠCH CHÂN (cả chữ A./B./C./D. hoặc nội dung đáp án).
     - Câu hỏi nhóm: toàn bộ nhóm (đề dẫn + đoạn văn + các câu + lời giải) nằm trong cặp dấu [ ... ].
         · Dạng 1 – dòng dẫn có cụm "Read the" : GIỮ NGUYÊN số thứ tự câu, chỉ đảo vị trí đáp án A, B, C, D.
         · Dạng 2 – các nhóm còn lại           : đảo cả thứ tự câu (trong nhóm) lẫn thứ tự đáp án.
     - Câu hỏi: "Question n." + (đề) + A. B. C. D. ; hướng dẫn nằm sau từ "Answer:".
   Các câu lưu: q.gid (mã nhóm), q.ginfo (đề dẫn + đoạn văn, ở câu đầu nhóm), q.gm = 'k' (giữ số câu) | 's' (đảo câu).
   ============================================================ */
(function () {
    'use strict';
    var EN = window.CODE121EN = { active: false };

    var Q_START = /^\s*(?:Question|Câu)\s*(\d+)\s*[\.\:\)\-]?\s*/i;
    var ANS_RE = /^\s*Answer\s*[:：]\s*/i;
    var END_RE = /^[\s\-–—=_*]*THE\s+END\b|^\s*[-–]\s*Thí\s+sinh|^\s*[-–]\s*Giám\s+thị|^\s*Mã\s+đề\s+thi/i;
    var ROMAN_RE = /^\[(?:I{1,3}|IV|V)\]/;      // [I] [II] [III] [IV] : ô chèn câu, KHÔNG phải dấu nhóm
    var READ_RE = /\bread\s+the\b/i;
    var WS_RE = /^[\s\u00A0\u200B\uFEFF]*$/;

    function plain(p) { var s = ''; for (var i = 0; i < p.length; i++) s += p[i].ch; return s; }
    function isWs(c) { return WS_RE.test(c.ch); }
    function trimChars(a) {
        var i = 0, j = a.length;
        while (i < j && isWs(a[i])) i++;
        while (j > i && isWs(a[j - 1])) j--;
        return a.slice(i, j);
    }
    function nl() { return { ch: '\n', b: false, u: false, vert: null }; }
    // đảm bảo mỗi phần tử = đúng 1 ký tự UTF-16 để chỉ số chuỗi = chỉ số mảng
    function normalizeLine(line) {
        var out = [];
        for (var i = 0; i < line.length; i++) {
            var c = line[i];
            if (!c || c.ch == null) continue;
            if (c.ch.length === 1) { out.push(c); continue; }
            for (var k = 0; k < c.ch.length; k++) { var d = {}; for (var key in c) d[key] = c[key]; d.ch = c.ch.charAt(k); out.push(d); }
        }
        return out;
    }

    /* ---- chuỗi định dạng: giữ in đậm / gạch chân / chỉ số trên-dưới (tùy chọn) ---- */
    function fmt(chars, o) {
        o = o || {};
        var out = '', cb = false, cu = false, ci = false, cv = null;
        function closeAll() {
            if (ci) out += '</i>';
            if (cu) out += '</u>';
            if (cb) out += '</b>';
            if (cv === 'sub') out += '</sub>'; else if (cv === 'sup') out += '</sup>';
            cb = cu = ci = false; cv = null;
        }
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i], ch = c.ch;
            if (ch === '\t') ch = ' ';
            if (!isWs(c) || ch === '\n') {
                if (ch === '\n' || c.inMath) {
                    if (cb || cu || ci || cv) closeAll();
                } else {
                    var b = !!(o.keepB && c.b), u = !!(o.keepU && c.u), it = !!(o.keepI && c.i), v = c.vert || null;
                    if (b !== cb || u !== cu || it !== ci || v !== cv) {
                        closeAll();
                        if (v === 'sub') out += '<sub>'; else if (v === 'sup') out += '<sup>';
                        if (b) out += '<b>';
                        if (u) out += '<u>';
                        if (it) out += '<i>';
                        cb = b; cu = u; ci = it; cv = v;
                    }
                }
            }
            out += ch;
        }
        closeAll();
        return out.replace(/<(b|u|i|sub|sup)>(\s*)<\/\1>/g, '$2').replace(/[ ]{2,}/g, ' ');
    }
    function fmtParas(paras, o) {
        return paras.map(function (p) { return fmt(trimChars(p), o); }).filter(function (s) { return s.trim(); }).join('\n').trim();
    }

    /* ---- dấu [ ] (bỏ qua [I] [II] [III] [IV]) ---- */
    function scanBrackets(s) {
        var ev = [];
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i);
            if (c === '[') {
                var m = ROMAN_RE.exec(s.substr(i, 6));
                if (m) { i += m[0].length - 1; continue; }
                ev.push({ i: i, t: '[' });
            } else if (c === ']') ev.push({ i: i, t: ']' });
        }
        return ev;
    }
    function segmentByBrackets(paras, report) {
        var depth = 0, segs = [], cur = null;
        paras.forEach(function (p) {
            var s = plain(p), ev = scanBrackets(s), rm = {}, d0 = depth, opened = false;
            ev.forEach(function (e) {
                if (e.t === '[') { if (depth === 0) { rm[e.i] = 1; opened = true; } depth++; }
                else if (depth > 0) { depth--; if (depth === 0) rm[e.i] = 1; }
            });
            var q = p;
            if (Object.keys(rm).length) q = p.filter(function (c, i) { return !rm[i]; });
            var belongs = d0 > 0 || opened;
            if (belongs) {
                if (!cur || !cur.group || (opened && d0 === 0)) { cur = { group: true, paras: [] }; segs.push(cur); }
            } else if (!cur || cur.group) { cur = { group: false, paras: [] }; segs.push(cur); }
            if (!WS_RE.test(plain(q))) cur.paras.push(q);
            if (belongs && depth === 0) cur = null;
        });
        if (depth > 0) report.warnings.push('⚠ Có dấu "[" mở nhóm nhưng chưa có dấu "]" đóng nhóm — hãy kiểm tra cuối nhóm trong file Word.');
        return segs;
    }

    /* ---- tìm A. B. C. D. ---- */
    function findOptionChain(s) {
        var re = /(^|[\s\u00A0])([A-D])\s*[\.\)]\s*/g, m, cand = [];
        while ((m = re.exec(s))) {
            cand.push({ L: m[2], start: m.index + m[1].length, end: m.index + m[0].length });
            if (m[0].length === 0) re.lastIndex++;
        }
        for (var a = cand.length - 1; a >= 0; a--) {
            if (cand[a].L !== 'A') continue;
            var chain = [cand[a]], need = ['B', 'C', 'D'], pos = a, ok = true;
            for (var n = 0; n < 3 && ok; n++) {
                var f = -1;
                for (var k = pos + 1; k < cand.length; k++) if (cand[k].L === need[n] && cand[k].start >= chain[chain.length - 1].end) { f = k; break; }
                if (f < 0) ok = false; else { chain.push(cand[f]); pos = f; }
            }
            if (ok) return chain;
        }
        return null;
    }
    function underRatio(chars) {
        var n = 0, u = 0;
        for (var i = 0; i < chars.length; i++) { if (isWs(chars[i])) continue; n++; if (chars[i].u) u++; }
        return n ? u / n : 0;
    }

    function snip(s, n) { s = String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

    function parseQuestion(block, g, report, out) {
        var m0 = Q_START.exec(plain(block[0])), num = m0 ? parseInt(m0[1], 10) : 0;
        var endIdx = block.findIndex(function (p, i) { return i > 0 && END_RE.test(plain(p)); });
        if (endIdx > 0) block = block.slice(0, endIdx);
        var ansIdx = -1;
        for (var i = 0; i < block.length; i++) if (ANS_RE.test(plain(block[i]))) { ansIdx = i; break; }
        var bodyParas = ansIdx < 0 ? block.slice() : block.slice(0, ansIdx);
        var solParas = ansIdx < 0 ? [] : block.slice(ansIdx);

        // bỏ nhãn "Question n."
        bodyParas[0] = bodyParas[0].slice(m0 ? m0[0].length : 0);
        var body = [];
        bodyParas.forEach(function (p, idx) {
            if (WS_RE.test(plain(p))) return;
            if (body.length) body.push(nl());
            for (var k = 0; k < p.length; k++) body.push(p[k]);
        });
        var s = plain(body);
        var chain = findOptionChain(s);
        if (!chain) { report.skipped.push('Question ' + num + ': không tìm thấy đủ 4 đáp án A. B. C. D. — đã bỏ qua.'); return; }

        var stem = trimChars(body.slice(0, chain[0].start));
        var opts = [], ratios = [];
        for (var k = 0; k < 4; k++) {
            var to = k < 3 ? chain[k + 1].start : body.length;
            var txt = trimChars(body.slice(chain[k].end, to));
            opts.push({ text: fmt(txt, { keepB: false, keepU: false }) });
            ratios.push(underRatio(body.slice(chain[k].start, to)));
        }

        // lời giải = nội dung sau "Answer:"
        var solChars = [];
        if (solParas.length) {
            solParas[0] = solParas[0].slice(ANS_RE.exec(plain(solParas[0]))[0].length);
            solParas.forEach(function (p) { if (!WS_RE.test(plain(p))) { if (solChars.length) solChars.push(nl()); for (var k = 0; k < p.length; k++) solChars.push(p[k]); } });
        }
        var solution = fmtParas(solParas, { keepB: false, keepU: false });

        // đáp án đúng: gạch chân; dự phòng "Chọn X" trong phần Answer
        var best = -1, bestR = 0, cntU = 0;
        ratios.forEach(function (r, k) { if (r > 0) cntU++; if (r > bestR) { bestR = r; best = k; } });
        var fromAns = -1, am = /(?:chọn|đáp\s*án(?:\s*đúng)?(?:\s*là)?)\s*[:\-]?\s*([A-D])(?![A-Za-zÀ-ỹ0-9])/i.exec(plain(solChars));
        if (am) fromAns = 'ABCD'.indexOf(am[1].toUpperCase());
        var ci = best;
        if (best < 0 && fromAns >= 0) { ci = fromAns; report.warnings.push('Question ' + num + ': không thấy đáp án gạch chân — lấy theo "Answer: Chọn ' + 'ABCD'[fromAns] + '".'); }
        else if (best >= 0 && fromAns >= 0 && best !== fromAns) report.warnings.push('Question ' + num + ': đáp án gạch chân (' + 'ABCD'[best] + ') khác "Chọn ' + 'ABCD'[fromAns] + '" ở phần Answer — app lấy theo GẠCH CHÂN, hãy kiểm tra lại.');
        if (cntU > 1) report.warnings.push('Question ' + num + ': có ' + cntU + ' đáp án bị gạch chân — app lấy đáp án gạch chân nhiều nhất (' + 'ABCD'[best] + ').');
        if (ci < 0) report.warnings.push('Question ' + num + ': chưa xác định được đáp án đúng (không có gạch chân) — hãy bấm chọn A/B/C/D.');
        if (!solution) report.warnings.push('Question ' + num + ': không có phần "Answer:" nên không có nút Instructions.');

        var q = {
            type: 'mc', text: fmt(stem, { keepB: true, keepU: true, keepI: true }), options: opts,
            correctIndex: ci >= 0 ? ci : 0, detectedByStyle: ci >= 0, solution: solution, enNum: num, en: true
        };
        if (g) { q.gid = g.gid; q.gm = g.gm; if (g.first) { q.ginfo = g.ginfo; g.first = false; } }
        out.push(q);
    }

    function parseSegment(seg, report, out, info) {
        var paras = seg.paras, qi = [];
        paras.forEach(function (p, i) { if (Q_START.test(plain(p))) qi.push(i); });
        if (!qi.length) {
            if (seg.group && paras.length) report.warnings.push('⚠ Nhóm "' + snip(plain(paras[0]), 60) + '" không có câu "Question n." nào — đã bỏ qua.');
            return;
        }
        var g = null;
        if (seg.group) {
            var pre = paras.slice(0, qi[0]);
            var directive = pre.length ? plain(pre[0]) : '';
            var keep = READ_RE.test(directive);
            g = { gid: 'g_' + Math.random().toString(36).slice(2, 8), gm: keep ? 'k' : 's', first: true, ginfo: fmtParas(pre, { keepB: true, keepU: true, keepI: true }) };
            if (!pre.length) report.warnings.push('⚠ Nhóm bắt đầu từ Question ' + (Q_START.exec(plain(paras[qi[0]]))[1]) + ' không có dòng dẫn/đoạn văn.');
            var before = out.length;
            for (var k = 0; k < qi.length; k++) parseQuestion(paras.slice(qi[k], k + 1 < qi.length ? qi[k + 1] : paras.length), g, report, out);
            var n = out.length - before;
            // nếu câu đầu nhóm bị bỏ qua, chuyển đề dẫn sang câu còn lại đầu tiên
            if (n > 0 && g.first) out[before].ginfo = g.ginfo;
            info.groups.push({ from: before + 1, to: out.length, keep: keep, n: n, head: snip(directive, 70) });
        } else {
            for (var k2 = 0; k2 < qi.length; k2++) parseQuestion(paras.slice(qi[k2], k2 + 1 < qi.length ? qi[k2 + 1] : paras.length), null, report, out);
        }
    }

    EN.parse = function (richLines) {
        var report = { skipped: [], warnings: [] };
        var src = (typeof resolveTableLines === 'function') ? resolveTableLines(richLines) : richLines;
        var paras = [];
        (src || []).forEach(function (line) {
            if (!line || line.isTable) return;
            var sub = [];
            for (var i = 0; i < line.length; i++) {
                var c = line[i];
                if (c && c.ch === '\n') { if (sub.length) paras.push(normalizeLine(sub)); sub = []; } else sub.push(c);
            }
            if (sub.length) paras.push(normalizeLine(sub));
        });
        paras = paras.filter(function (p) { return !WS_RE.test(plain(p)); });

        var segs = segmentByBrackets(paras, report), out = [], info = { groups: [] };
        segs.forEach(function (seg) { parseSegment(seg, report, out, info); });

        // kiểm tra số thứ tự câu trong file
        var prev = 0, gaps = [];
        out.forEach(function (q) { if (q.enNum && prev && q.enNum !== prev + 1) gaps.push(prev + '→' + q.enNum); if (q.enNum) prev = q.enNum; });
        if (gaps.length) report.warnings.push('Số thứ tự câu trong file không liên tục: ' + gaps.slice(0, 8).join(', ') + ' — kiểm tra xem có câu bị thiếu không.');

        if (out.length) {
            var withSol = out.filter(function (q) { return q.solution; }).length;
            var ok = out.filter(function (q) { return q.detectedByStyle; }).length;
            report.warnings.unshift('📘 English: nhận diện ' + out.length + ' câu • ' + ok + ' câu đã có đáp án đúng (gạch chân) • ' + withSol + ' câu có Instructions • ' + info.groups.length + ' nhóm [ ].');
            info.groups.forEach(function (g, i) {
                report.warnings.push('Nhóm ' + (i + 1) + ' (Question ' + g.from + (g.to > g.from ? '–' + g.to : '') + '): ' + (g.keep ? 'DẠNG 1 "Read the" → GIỮ số thứ tự câu, chỉ đảo A-B-C-D' : 'DẠNG 2 → đảo cả thứ tự câu và đáp án') + ' — ' + g.head);
            });
        }
        out.report = report;
        return out;
    };

    /* ---- mở khung nhập (dùng lại khung "Nhập từ File Word") ---- */
    var TXT = {
        title: 'Nhập Câu Hỏi Từ File Word ENGLISH',
        badge: 'Đáp án gạch chân • Nhóm [ ] • Answer: → Instructions',
        hint: 'Đáp án đúng GẠCH CHÂN • câu hỏi nhóm đặt trong [ ] (có "Read the" = giữ số câu) • hướng dẫn sau "Answer:"'
    };
    function setTexts(on) {
        var m = document.getElementById('word-import-modal'); if (!m) return;
        var h2 = m.querySelector('h2'), bd = h2 && h2.nextElementSibling;
        if (h2) { if (!h2.dataset.vi) h2.dataset.vi = h2.textContent; h2.textContent = on ? TXT.title : h2.dataset.vi; }
        if (bd) { if (!bd.dataset.vi) bd.dataset.vi = bd.textContent; bd.textContent = on ? TXT.badge : bd.dataset.vi; }
        var st = document.getElementById('word-buffer-status');
        if (st && on) st.textContent = TXT.hint;
    }
    EN.open = function () {
        if (typeof openWordImportModal !== 'function') return;
        openWordImportModal();
        EN.active = true;
        setTexts(true);
        var sel = document.getElementById('edit-subject');
        if (sel && sel.value !== 'Tiếng Anh') { try { sel.value = 'Tiếng Anh'; sel.dispatchEvent(new Event('change')); } catch (e) { } }
        var qa = document.getElementById('word-quick-answer-input'); if (qa) qa.value = '';
    };
    EN.off = function () { EN.active = false; setTexts(false); };
    // [CODE123] Mở khung nhập English từ mục TRỘN ĐỀ THI (không đụng tới bộ đề đang soạn)
    EN.openForMix = function () {
        if (typeof openWordImportModal !== 'function') return false;
        openWordImportModal();      // hàm này tự tắt chế độ English, nên bật lại ngay bên dưới
        EN.active = true;
        setTexts(true);
        var qa = document.getElementById('word-quick-answer-input'); if (qa) qa.value = '';
        return true;
    };
    // Sau khi bấm "Đưa vào bộ câu hỏi" ở chế độ English: bật sẵn xáo câu + xáo đáp án Phần I (giáo viên vẫn có thể bỏ chọn)
    function hookApply() {
        var orig = window.applyWordImportToEditor;
        if (typeof orig !== 'function' || orig.__en121) return;
        var wrapped = function () {
            var wasEn = EN.active, hadDraft = false;
            try { hadDraft = typeof wordImportDraft !== 'undefined' && wordImportDraft.length > 0; } catch (e) { }
            var r = orig.apply(this, arguments);
            if (wasEn && hadDraft) {
                ['edit-shq-mc', 'edit-sho-mc'].forEach(function (id) { var el = document.getElementById(id); if (el) el.checked = true; });
            }
            return r;
        };
        wrapped.__en121 = true;
        window.applyWordImportToEditor = wrapped;
    }
    hookApply();

    /* ---- chế độ hiển thị English ---- */
    EN.isQ = function (q) {
        if (q && q.gm) return true;
        try { return typeof currentSubject !== 'undefined' && currentSubject === 'Tiếng Anh'; } catch (e) { return false; }
    };
    EN.noPartHeader = function () {
        try {
            if (typeof currentSubject !== 'undefined' && currentSubject === 'Tiếng Anh') return true;
            if (typeof questionsData !== 'undefined' && questionsData.some(function (q) { return q.gm; })) return true;
            if (window.LV && Array.isArray(window.LV.qs) && window.LV.qs.some(function (q) { return q.gm; })) return true;
        } catch (e) { }
        return false;
    };
    EN.label = function (q) { return EN.isQ(q) ? 'Question' : 'Câu'; };
    // "from 1 to 6" trong dòng dẫn tự khớp số câu thực tế
    EN.fixRange = function (info, from, to) {
        return String(info || '').replace(/(\bfrom\s+(?:<[^>]+>)*)\d+((?:<[^>]+>)*\s+to\s+(?:<[^>]+>)*)\d+/i, '$1' + from + '$2' + to);
    };
    // Xáo câu: nhóm 'k' (Read the) cố định vị trí & thứ tự câu; nhóm 's' đảo câu trong chính các vị trí của nhóm; câu lẻ đảo tự do
    EN.shuffleList = function (arr, shuf) {
        var free = arr.filter(function (q) { return !q.gid; });
        var res = arr.slice();
        var fs = shuf(free), k = 0;
        for (var i = 0; i < res.length; i++) if (!res[i].gid) res[i] = fs[k++];
        var byG = {};
        arr.forEach(function (q, i) { if (q.gid && q.gm === 's') (byG[q.gid] = byG[q.gid] || []).push(i); });
        Object.keys(byG).forEach(function (gid) {
            var pos = byG[gid], mem = pos.map(function (i) { return arr[i]; });
            var info = ''; mem.forEach(function (q) { if (!info && q.ginfo) info = q.ginfo; });
            var sm = shuf(mem).map(function (q) { var c = {}; for (var key in q) c[key] = q[key]; delete c.ginfo; return c; });   // sao chép để không sửa dữ liệu gốc
            if (info) sm[0].ginfo = info;
            pos.forEach(function (p, j) { res[p] = sm[j]; });
        });
        return res;
    };
})();
