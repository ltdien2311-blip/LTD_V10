// === [anon_16] ===
/* [CODE37] CHƠI TRỰC TIẾP: kết nối giáo viên - học sinh qua PeerJS (WebRTC), không cần tài khoản cho học sinh */
(function () {
    const VER = 'b54';
    const $ = id => document.getElementById(id);
    const E = s => _escHtml(String(s == null ? '' : s));
    const F = t => formatMathAndChemHTML(t || '');
    const rid = n => Array.from({ length: n }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.random() * 32 | 0]).join('');
    const PEER_OPTS = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turns:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }] } };   // [CODE170] dự phòng WebRTC: thêm STUN/TURN
    /* [CODE170] KÊNH FIREBASE cho CHƠI TRỰC TIẾP: đi qua HTTPS tới máy chủ Firebase của giáo viên (đã ĐỒNG BỘ) thay cho WebRTC/PeerJS
       -> vào được cả mạng 4G / mạng trường / mạng chặn WebRTC. API giống PeerJS (on open/connection/data/close/error, send, destroy). */
    function Em() { const h = {}; this.on = (e, f) => { (h[e] = h[e] || []).push(f); return this; }; this.emit = (e, ...a) => { (h[e] || []).slice().forEach(f => { try { f(...a); } catch (x) { console.warn(x); } }); }; }
    const fbReq = (m, url, body, keep) => fetch(url, { method: m, cache: 'no-store', keepalive: !!keep, headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.status === 204 ? null : r.json(); });
    const fbRetry = async (fn, n) => { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i >= (n == null ? 4 : n)) throw e; await new Promise(r => setTimeout(r, 400 * (i + 1) * (i + 1))); } } };
    const fbSender = url => { let q = Promise.resolve(); return m => { const body = { d: JSON.stringify(m), ts: Date.now() }; q = q.then(() => fbRetry(() => fbReq('POST', url, body))).catch(() => { }); return q; }; };
    const fbSse = (url, cb) => { let es; try { es = new EventSource(url); } catch (e) { return { close() { } }; } const h = ev => { try { const j = JSON.parse(ev.data); if (j) cb(j.path || '/', j.data); } catch (e) { } }; es.addEventListener('put', h); es.addEventListener('patch', h); return es; };
    const fbEach = (path, data, fn) => { if (data == null) return; const sg = String(path).split('/').filter(Boolean); if (sg.length === 0) { for (const a in data) { const o = data[a]; if (o && typeof o === 'object') for (const k in o) fn(a, k, o[k]); } } else if (sg.length === 1) { for (const k in data) fn(sg[0], k, data[k]); } else fn(sg[0], sg[1], data); };
    const fbSort = a => a.sort((x, y) => x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0);
    function FbConn(peer, cid) { Em.call(this); this.peer = cid; this.open = true; this.reliable = true; this._s = fbSender(peer._B + '/down/' + cid + '.json'); }
    FbConn.prototype.send = function (m) { if (this.open) this._s(m); };
    FbConn.prototype.close = function () { this.open = false; };
    function FbPeer(id, cfg) {   /* phía giáo viên (chủ phòng) */
        Em.call(this); const me = this; me.id = id; me.destroyed = false; me.conns = {}; me._B = cfg.u + '/s/' + cfg.p + '/live/' + id; const seen = new Set();
        setTimeout(() => {
            fbRetry(() => fbReq('PUT', me._B + '/host.json', { t: Date.now() }), 1).then(() => {
                if (me.destroyed) return;
                me.emit('open', id);
                me._es = fbSse(me._B + '/up.json', (path, data) => {
                    const items = [];
                    fbEach(path, data, (cid, key, it) => { const k = cid + '/' + key; if (it && typeof it.d === 'string' && !seen.has(k)) { seen.add(k); items.push([key, cid, it]); } });
                    fbSort(items).forEach(([k, cid, it]) => {
                        let m; try { m = JSON.parse(it.d); } catch (e) { return; }
                        let c = me.conns[cid];
                        if (m && m.__bye) { if (c) { c.open = false; c.emit('close'); delete me.conns[cid]; } return; }
                        if (!c) { c = me.conns[cid] = new FbConn(me, cid); me.emit('connection', c); }
                        c.emit('data', m);
                    });
                });
            }).catch(() => { if (!me.destroyed) me.emit('error', { type: 'network' }); });
        }, 0);
    }
    FbPeer.prototype = Object.create(Em.prototype);
    FbPeer.prototype.reconnect = function () { };
    FbPeer.prototype.destroy = function () { this.destroyed = true; try { this._es && this._es.close(); } catch (e) { } try { fbReq('DELETE', this._B + '.json', undefined, true).catch(() => { }); } catch (e) { } };
    function FbStudent(cfg) {   /* phía học sinh */
        Em.call(this); this.cfg = cfg; this.id = 'st' + rid(10); this.destroyed = false; setTimeout(() => this.emit('open', this.id), 0);
    }
    FbStudent.prototype = Object.create(Em.prototype);
    FbStudent.prototype.connect = function (hostId) {
        const me = this, c = new Em(), cid = me.id, B = me.cfg.u + '/s/' + me.cfg.p + '/live/' + hostId, seen = new Set(), snd = fbSender(B + '/up/' + cid + '.json');
        c.open = false; c.peer = hostId; c.send = m => { if (c.open) snd(m); }; c.close = () => { c.open = false; try { c._es && c._es.close(); } catch (e) { } };
        fbRetry(() => fbReq('GET', B + '/host.json'), 2).then(h => {
            if (me.destroyed) return;
            if (!h) { me.emit('error', { type: 'peer-unavailable' }); return; }
            c._es = fbSse(B + '/down/' + cid + '.json', (path, data) => {
                const items = [], sg = String(path).split('/').filter(Boolean);
                if (data == null) return;
                if (sg.length === 0) { for (const k in data) items.push([k, data[k]]); } else items.push([sg[0], data]);
                fbSort(items.filter(([k, it]) => it && typeof it.d === 'string' && !seen.has(k) && seen.add(k))).forEach(([k, it]) => { try { c.emit('data', JSON.parse(it.d)); } catch (e) { } });
            });
            c.open = true; c.emit('open');
        }).catch(() => me.emit('error', { type: 'network' }));
        window.addEventListener('pagehide', () => { try { fbReq('POST', B + '/up/' + cid + '.json', { d: JSON.stringify({ __bye: 1 }), ts: Date.now() }, true).catch(() => { }); } catch (e) { } });
        me._c = c; return c;
    };
    FbStudent.prototype.destroy = function () { this.destroyed = true; try { this._c && this._c.close(); } catch (e) { } };

    /* [HƯỚNG A - MICRO-TASK 5] KÊNH GOOGLE APPS SCRIPT CHO PHÒNG THI LIVE (LV / LS) */
    function gasPick(cfg) {
        var urls = (cfg && Array.isArray(cfg.urls) && cfg.urls.length) ? cfg.urls : (window.GasBridge ? GasBridge.getConfig().urls : []);
        if (!urls.length) return '';
        return urls[Math.floor(Math.random() * urls.length)];
    }
    function gasLivePost(cfg, bodyObj) {
        var u = gasPick(cfg);
        if (!u) return Promise.reject(new Error('NO_GAS_URL'));
        var payload = Object.assign({}, bodyObj, (cfg && cfg.key) ? { key: cfg.key } : {});
        return fetch(u, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        }).then(function (r) { return r.text(); }).then(function (t) {
            var d = JSON.parse(t);
            if (!d || !d.ok) throw new Error((d && d.error) || 'GAS_ERR');
            return d;
        });
    }
    function gasLiveGet(cfg, room) {
        var u = gasPick(cfg);
        if (!u) return Promise.reject(new Error('NO_GAS_URL'));
        var sep = u.indexOf('?') >= 0 ? '&' : '?';
        var qs = 'action=liveGet&room=' + encodeURIComponent(room) + ((cfg && cfg.key) ? '&key=' + encodeURIComponent(cfg.key) : '') + '&_t=' + Date.now();
        return fetch(u + sep + qs, { method: 'GET', redirect: 'follow' })
            .then(function (r) { return r.text(); })
            .then(function (t) { return JSON.parse(t); });
    }
    function GasConn(peer, cid) {
        Em.call(this);
        this.peer = cid;
        this.open = true;
        this.reliable = true;
        this._p = peer;
    }
    GasConn.prototype.send = function (m) {
        if (this.open && this._p) this._p._enqueue(this.peer, m);
    };
    GasConn.prototype.close = function () { this.open = false; };

    function GasPeer(id, cfg) {
        Em.call(this);
        const me = this;
        me.id = id;
        me.cfg = cfg || {};
        me.destroyed = false;
        me.conns = {};
        me._seq = 0;
        me._outbox = [];
        me._seen = {};
        me._flushTimer = null;
        me._flushing = false;
        me._dirtyFlush = false;
        me._enqueue = function (to, m) {
            if (me.destroyed) return;
            me._outbox.push({ seq: ++me._seq, to: to, m: m });
            if (me._outbox.length > 120) me._outbox = me._outbox.slice(-120);
            if (!me._flushTimer) {
                me._flushTimer = setTimeout(function () {
                    me._flushTimer = null;
                    me._flush();
                }, 150);
            }
        };
        me._flush = function () {
            if (me.destroyed) return Promise.resolve();
            if (me._flushing) { me._dirtyFlush = true; return Promise.resolve(); }
            me._flushing = true;
            me._dirtyFlush = false;
            return gasLivePost(me.cfg, {
                action: 'liveUpdate',
                room: me.id,
                state: { hostTs: Date.now(), seq: me._seq, msgs: me._outbox }
            }).catch(function () { }).finally(function () {
                me._flushing = false;
                if (me._dirtyFlush && !me.destroyed) {
                    me._dirtyFlush = false;
                    me._flush();
                }
            });
        };
        me._poll = function () {
            if (me.destroyed) return Promise.resolve();
            return gasLiveGet(me.cfg, me.id).then(function (res) {
                if (me.destroyed || !res || !res.ok || !res.answers) return;
                var entries = Array.isArray(res.answers)
                    ? res.answers.map(function (it) { return [it && it.studentId, it && it.answer]; })
                    : Object.keys(res.answers).map(function (k) { return [k, res.answers[k]]; });
                entries.forEach(function (pair) {
                    var sid = String(pair[0] || '');
                    var ans = pair[1];
                    if (!sid || !ans) return;
                    var msgs = Array.isArray(ans.msgs) ? ans.msgs : [];
                    var lastSeq = me._seen[sid] || 0;
                    msgs.forEach(function (pkt) {
                        if (!pkt || typeof pkt.seq !== 'number' || pkt.seq <= lastSeq) return;
                        lastSeq = pkt.seq;
                        var m = pkt.m;
                        var c = me.conns[sid];
                        if (m && m.__bye) {
                            if (c) { c.open = false; c.emit('close'); delete me.conns[sid]; }
                            return;
                        }
                        if (!c) { c = me.conns[sid] = new GasConn(me, sid); me.emit('connection', c); }
                        c.emit('data', m);
                    });
                    me._seen[sid] = lastSeq;
                });
            }).catch(function () { });
        };
        setTimeout(function () {
            gasLivePost(me.cfg, {
                action: 'liveUpdate',
                room: me.id,
                state: { hostTs: Date.now(), seq: 0, msgs: [] }
            }).then(function () {
                if (me.destroyed) return;
                me.emit('open', id);
                me._timer = setInterval(me._poll, 2500);
            }).catch(function () {
                if (!me.destroyed) me.emit('error', { type: 'network' });
            });
        }, 0);
    }
    GasPeer.prototype = Object.create(Em.prototype);
    GasPeer.prototype.reconnect = function () { };
    GasPeer.prototype.destroy = function () {
        this.destroyed = true;
        try { clearInterval(this._timer); clearTimeout(this._flushTimer); } catch (e) { }
    };

    function GasStudent(cfg) {
        Em.call(this);
        this.cfg = cfg || {};
        this.id = 'st' + rid(10);
        this.destroyed = false;
        setTimeout(() => this.emit('open', this.id), 0);
    }
    GasStudent.prototype = Object.create(Em.prototype);
    GasStudent.prototype.connect = function (hostId) {
        const me = this, c = new Em(), cid = me.id;
        let outSeq = 0, outbox = [], lastHostSeq = 0, sendTimer = null, sending = false, dirtySend = false;
        function flushOut() {
            if (me.destroyed) return;
            if (sending) { dirtySend = true; return; }
            sending = true;
            dirtySend = false;
            gasLivePost(me.cfg, { action: 'liveAnswer', room: hostId, studentId: cid, answer: { msgs: outbox } })
                .catch(function () { })
                .finally(function () {
                    sending = false;
                    if (dirtySend && !me.destroyed) { dirtySend = false; flushOut(); }
                });
        }
        c.open = false; c.peer = hostId;
        c.send = function (m) {
            if (!c.open) return;
            outbox.push({ seq: ++outSeq, m: m });
            if (outbox.length > 60) outbox = outbox.slice(-60);
            if (!sendTimer) {
                sendTimer = setTimeout(function () {
                    sendTimer = null;
                    flushOut();
                }, 100);
            }
        };
        c.close = function () {
            c.open = false;
            try { clearInterval(me._timer); clearTimeout(sendTimer); } catch (e) { }
        };
        function processState(st) {
            if (!st || !Array.isArray(st.msgs)) return;
            st.msgs.forEach(function (pkt) {
                if (!pkt || typeof pkt.seq !== 'number' || pkt.seq <= lastHostSeq) return;
                if (pkt.to && pkt.to !== cid && pkt.to !== '*') return;
                lastHostSeq = pkt.seq;
                try { c.emit('data', pkt.m); } catch (e) { }
            });
        }
        gasLiveGet(me.cfg, hostId).then(function (res) {
            if (me.destroyed) return;
            if (!res || !res.ok || !res.state) {
                me.emit('error', { type: 'peer-unavailable' });
                return;
            }
            c.open = true;
            c.emit('open');
            processState(res.state);
            me._timer = setInterval(function () {
                if (me.destroyed || !c.open) return;
                gasLiveGet(me.cfg, hostId).then(function (r2) {
                    if (r2 && r2.ok && r2.state) processState(r2.state);
                }).catch(function () { });
            }, 2500);
        }).catch(function () {
            if (!me.destroyed) me.emit('error', { type: 'network' });
        });
        me._c = c;
        return c;
    };
    GasStudent.prototype.destroy = function () {
        this.destroyed = true;
        try { clearInterval(this._timer); } catch (e) { }
        try { this._c && this._c.close(); } catch (e) { }
    };

    const fm = x => String(x).replace('.', ',');
    const GS = '.qc-live .q-options-one-row, .qc-live .q-options-two-rows, .qc-live .q-options-four-rows';
    const PL = { mc: 'PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN', tf: 'PHẦN II. ĐÚNG – SAI', sa: 'PHẦN III. TRẢ LỜI NGẮN' };
    const TC = ['#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#ea580c', '#475569', '#0d9488', '#b91c1c'];
    const st = document.createElement('style');
    st.textContent = `.lv-w{max-width:900px;margin:0 auto;padding:16px}.lv-hd{background:linear-gradient(90deg,#db2777,#7c3aed);color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:8px;position:sticky;top:0;z-index:5}
.lv-b{padding:10px 20px;border-radius:12px;font-weight:900;color:#fff;background:#7c3aed;cursor:pointer;border:0}.lv-b.g{background:#059669}.lv-b.r{background:#dc2626}.lv-b.s{background:#e2e8f0;color:#334155}
.lv-c{background:#fff;border-radius:16px;border:2px solid #e2e8f0;padding:14px;margin:10px 0}.lv-o{display:flex;gap:8px;width:100%;text-align:left;padding:10px 12px;margin:6px 0;border:2px solid #cbd5e1;border-radius:12px;background:#fff;font-weight:400;font-family:Roboto,Arial,sans-serif;cursor:pointer;font-size:17px}
.lv-o.sel{border-color:#7c3aed;background:#ede9fe}.lv-o.ok{border-color:#059669;background:#d1fae5}.lv-o.bad{border-color:#dc2626;background:#fee2e2}
.lv-t{display:inline-block;padding:3px 12px;border-radius:99px;font-weight:900;font-size:14px}.lv-tab{padding:12px 20px;margin-bottom:8px;border-radius:16px;font-weight:900;font-size:16px;cursor:pointer;border:0;color:#475569;background:linear-gradient(180deg,#fff 0%,#e2e8f0 100%);box-shadow:0 5px 0 #94a3b8,0 9px 14px rgba(15,23,42,.18),inset 0 2px 0 rgba(255,255,255,.95);transition:transform .08s,box-shadow .08s,filter .15s}.lv-tab:hover{filter:brightness(1.04)}.lv-tab:active{transform:translateY(4px);box-shadow:0 1px 0 #94a3b8,0 3px 6px rgba(15,23,42,.18),inset 0 2px 0 rgba(255,255,255,.95)}.lv-tab.on{color:#fff;background:linear-gradient(180deg,#c4b5fd 0%,#8b5cf6 45%,#6d28d9 100%);box-shadow:0 5px 0 #4c1d95,0 9px 18px rgba(124,58,237,.5),inset 0 2px 0 rgba(255,255,255,.5);text-shadow:0 1px 2px rgba(0,0,0,.4)}
.lv-tb{width:100%;border-collapse:collapse;background:#fff}.lv-tb th,.lv-tb td{border:1px solid #e2e8f0;padding:7px 10px;text-align:center}.lv-tb td:nth-child(2){text-align:left}.lv-tb th{background:#ede9fe}
.lv-qt,.lv-qt *:not(.katex):not(.katex *),.lv-ot,.lv-ot *:not(.katex):not(.katex *),.lv-o,.lv-o *:not(.katex):not(.katex *),.lv-sol,.lv-sol *:not(.katex):not(.katex *),.lv-i{}.lv-qt,.lv-qt .math-content,.lv-ot,.lv-ot .math-content{font-weight:400!important;text-align:justify!important;text-justify:inter-word}.lv-qt b,.lv-ot b,.lv-o>span:first-child{font-weight:700!important}.lv-o.lk{opacity:.55;cursor:not-allowed}.lv-tag{display:inline-block;margin-left:8px;font-size:13px;font-weight:700;padding:1px 10px;border-radius:99px;background:#1e293b;color:#fff}.lv-g{display:grid;gap:8px}.lv-g.c4{grid-template-columns:repeat(4,minmax(0,1fr))}.lv-g.c2{grid-template-columns:repeat(2,minmax(0,1fr))}.lv-g.c1{grid-template-columns:minmax(0,1fr)}.lv-g .lv-o{margin:0;min-width:0}.lv-tb th,.lv-tb td{white-space:nowrap}.lv-tb td:nth-child(2){width:100%}.lv-b{white-space:nowrap}#lv-s,#lv-t,#lv-d{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.lv-o,.lv-b,.lv-i{touch-action:manipulation;-webkit-tap-highlight-color:transparent}#lv-s.guard{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}#lv-s.guard input{-webkit-user-select:text;user-select:text}.lv-tag.r{background:#dc2626}.lv-i{border:2px solid #cbd5e1;border-radius:12px;padding:8px 12px;font-size:17px;font-weight:700;width:100%}.lv-tq{border-radius:18px;border:4px solid;background:#fff;overflow:hidden;text-align:center}.lv-tq h4{color:#fff;font-weight:900;font-size:20px;padding:8px 10px;word-break:break-word}.lv-qb{padding:10px;cursor:zoom-in}.lv-mem{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:4px}.lv-mem span{font-size:13px;font-weight:700;padding:1px 8px;border-radius:99px}.lv-sh-t .lv-tag{font-size:12px;vertical-align:middle}`;
    document.head.appendChild(st);
    const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap&subset=vietnamese'; document.head.appendChild(fl);
    function layer(id, html) {
        let d = $(id);
        if (!d) { d = document.createElement('div'); d.id = id; d.style.cssText = 'position:fixed;inset:0;z-index:9000;overflow:auto;background:#f1f5f9'; document.body.appendChild(d); }
        d.innerHTML = html; d.classList.toggle('guard', id === 'lv-s' && !!(window.LS && window.LS.guard && window.LS.guard.on)); d.querySelectorAll(GS).forEach(fit); return d;
    }
    /* [CODE49] Tự chọn bố cục đáp án 1 hàng / 2x2 / 4 hàng theo độ rộng thực tế (giống màn hình làm bài về nhà) */
    function fit(g) {
        const btns = [...g.querySelectorAll('.q-option-btn')]; if (!btns.length) return;
        const gw = g.clientWidth; if (!gw) return;
        g.removeAttribute('data-fit');
        const order = ['q-options-one-row', 'q-options-two-rows', 'q-options-four-rows'];
        const fits = () => btns.every(btn => {   /* [CODE64] thử thật: nội dung đáp án (không xuống dòng) phải nhỏ hơn chỗ trống trong ô */
            const txt = btn.querySelector('.q-option-text'); if (!txt) return true;
            const avail = txt.clientWidth, keep = txt.style.cssText;
            ['flex:0 0 auto', 'width:max-content', 'max-width:none', 'min-width:0', 'white-space:nowrap', 'overflow:visible'].forEach(d => { const k = d.split(':'); txt.style.setProperty(k[0], k[1], 'important'); });
            const nat = txt.getBoundingClientRect().width;
            txt.style.cssText = keep;   // [CODE65] đo đúng bề rộng khi nằm 1 dòng (trước đây bị max-width:100% làm đo sai)
            return nat * 1.04 + 8 <= avail;
        });
        g.removeAttribute('data-f');
        let chosen = order[2];
        for (const cls of order.slice(0, 2)) {
            g.classList.remove.apply(g.classList, order); g.classList.add(cls);
            if (fits()) { chosen = cls; break; }
        }
        g.classList.remove.apply(g.classList, order); g.classList.add(chosen); g.setAttribute('data-f', '1'); g.removeAttribute('data-fit');
        /* [CODE124] kiểm tra tràn thật: còn tràn thì nâng dần 1 dòng -> 2 dòng -> 4 dòng */
        let ix = order.indexOf(chosen);
        const over = () => btns.some(b => { const t = b.querySelector('.q-option-text'); return b.scrollWidth > b.clientWidth + 1 || (t && t.scrollWidth > t.clientWidth + 1); });
        while (ix < 2 && over()) { ix++; g.classList.remove.apply(g.classList, order); g.classList.add(order[ix]); }
    }
    let fq = 0, fw = window.innerWidth;
    const fitAll = () => { cancelAnimationFrame(fq); fq = requestAnimationFrame(() => document.querySelectorAll(GS.split(',').map(x => x.trim() + ':not([data-f])').join(',')).forEach(fit)); };
    const refit = () => { document.querySelectorAll(GS).forEach(g => g.removeAttribute('data-f')); fitAll(); };
    new MutationObserver(fitAll).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', () => { if (window.innerWidth !== fw) { fw = window.innerWidth; refit(); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    /* [CODE124] đo lại khi font Roboto / ảnh trong đáp án / trang tải xong (khung Thư viện, Chơi trực tiếp) */
    try {
        if (document.fonts) { if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit); if (document.fonts.load) document.fonts.load('400 20px Roboto').then(refit).catch(() => { }); }
        window.addEventListener('load', () => { refit(); setTimeout(refit, 700); });
        document.addEventListener('load', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest && t.closest('.q-option-text')) refit(); }, true);
    } catch (e) { }
    /* QR co giãn theo khung (dùng cho 4 mã QR của đội + khi phóng to) */
    const qrScal = url => {
        try {
            const q = qrcode(0, 'M'); q.addData(url); q.make(); const n = q.getModuleCount(), m = 2; let p = '';
            for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c + m},${r + m}h1v1h-1z`;
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" style="width:100%;height:auto;display:block;background:#fff"><path d="${p}" fill="#000"/></svg>`;
        } catch (e) { return ''; }
    };
    const qrSvg = url => { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag(6, 2); } catch (e) { return ''; } };
    const pub = q => { const m = (window.LV && window.LV.nm || {})[q.id] || {}, g = m.g; return { id: q.id, type: qType(q), text: q.text, options: (q.options || []).map(o => ({ letter: o.letter, text: o.text })), gid: q.gid, gm: q.gm, ginfo: g ? g.info : q.ginfo, num: m.num, gf: g ? g.from : undefined, gt: g ? g.to : undefined }; };
    const keyOf = q => ({ correct: q.correct, tf: q.tfAnswers, sa: q.shortAnswer, sol: q.solution || '', tfSol: q.tfSol || [] });

    /* ---------- [CODE49] Thẻ câu hỏi dùng chung (GV + HS): DÙNG ĐÚNG lớp giao diện của màn hình làm bài về nhà ----------
       h = tên đối tượng nhận sự kiện (null = chỉ xem); ctx = { nm: bảng số thứ tự, single: hiện 1 câu }; opt = { noSol, teacher } */
    const numMap = qs => {
        const c = { mc: 0, tf: 0, sa: 0 }, m = {}, gm = {};
        qs.forEach(q => { const t = q.type || qType(q); c[t]++; m[q.id] = { t, num: c[t] }; if (q.gid) (gm[q.gid] = gm[q.gid] || []).push(q); });
        Object.keys(gm).forEach(g => {
            const mem = gm[g], nums = mem.map(x => m[x.id].num), wi = mem.find(x => x.ginfo && String(x.ginfo).trim());
            mem.forEach((x, i) => { m[x.id].g = { first: i === 0, from: nums[0], to: nums[nums.length - 1], info: wi ? String(wi.ginfo) : '', gm: x.gm }; });
        });
        return m;
    };
    const partHd = t => {
        if (window.CODE121EN && CODE121EN.noPartHeader()) return '';   // [CODE121]
        const m = PART_META[t] || PART_META.mc;
        return `<div class="q-part-header bg-gradient-to-r ${m.soft} border-2 rounded-xl px-4 py-2 shadow-sm"><p class="q-part-line"><span class="q-part-badge ${m.badge} text-white font-black rounded-full px-3.5 py-0.5 text-[17px] tracking-wide">PHẦN ${m.roman}</span> <span class="q-part-title font-black text-[19px]">${E(m.title)}</span> <span class="q-part-desc text-[17px] font-bold italic opacity-90">${E(m.desc(0))}</span></p></div>`;
    };
    const grpBox = g => {
        if (!g) return '';
        const head = typeof GROUP_HEAD_TEXT !== 'undefined' ? GROUP_HEAD_TEXT : 'Sử dụng thông tin cho dưới đây để trả lời các câu số';
        const enG = Boolean(g.gm && window.CODE121EN);   // [CODE121]
        return `<div class="q-group-box q-title-text math-content mb-2 p-2.5 rounded-lg border-l-4 border-rose-500 bg-rose-50/70">${enG ? '' : `<div class="q-label-bold">${E(head)} ${g.from === g.to ? g.from : g.from + ' – ' + g.to}:</div>`}${g.info ? `<div class="q-stem-normal">${F(enG ? CODE121EN.fixRange(g.info, g.from, g.to) : g.info)}</div>` : ''}</div>`;
    };
    const estLen = x => { const r = String(x || ''); return /<img/i.test(r) ? 30 : (typeof estimateOptionTextLength === 'function' ? estimateOptionTextLength(r) : r.replace(/<[^>]*>/g, '').replace(/\\[a-zA-Z]+/g, 'x').replace(/[$\{\}\^_]/g, '').length); };
    const hasAns = a => !!(a && (a.sel || String(a.value || '').trim() || (a.values || []).some(v => v === true || v === false)));
    const solHtml = id => {
        const q = (window.LVSQ || {})[id]; if (!q) return '';
        let h = ''; try { h = buildSolutionInnerHtml(q); } catch (e) { }
        return h + `<button type="button" class="sol-toggle-btn open no-print" style="margin-top:10px" onclick="LVsol('${id}',false)">✖ ẨN HƯỚNG DẪN</button>`;
    };
    function card(q, a, k, h, once, ctx, opt) {
        opt = opt || {}; ctx = ctx || {};
        const t = q.type || qType(q), has = !!k && k.ok !== undefined, nmq = (ctx.nm || {})[q.id] || {}, num = nmq.num || '';
        const who = opt.teacher ? 'Học sinh' : 'Em';
        let frame = 'bg-slate-50/80 rounded-xl p-2.5 border border-slate-200 shadow-sm transition-all', stt = '', tfc = 0;
        if (has) {
            let st = k.ok ? 'ok' : 'bad';
            if (t === 'tf') { const key = k.tf || [], v = (a && a.values) || []; for (let j = 0; j < 4; j++) if ((v[j] === true || v[j] === false) && v[j] === !!key[j]) tfc++; st = tfc === 4 ? 'ok' : tfc === 0 ? 'bad' : 'part'; }
            frame = 'rounded-xl p-2.5 border-2 shadow-sm transition-all ' + ({ ok: 'bg-green-50/60 border-green-400', part: 'bg-amber-50/70 border-amber-400', bad: 'bg-red-50/60 border-red-400' })[st];
            const col = { ok: '#15803d', part: '#b45309', bad: '#dc2626' }[st];
            const tx = t === 'tf' ? (k.ok ? '✔ Đúng cả 4 ý' : (k.a ? '✘ Đúng ' + tfc + '/4 ý' : '✘ Chưa chọn')) : (k.ok ? '✔ Đúng' : (k.a ? '✘ Sai' : (t === 'sa' ? '✘ Chưa trả lời' : '✘ Chưa chọn')));
            stt = `<span class="q-label-bold lv-st" style="color:${col}">${tx} </span>`;
        }
        const grp = nmq.g && (nmq.g.first || ctx.single) ? grpBox(nmq.g) : '';
        let s = `<div class="${frame}" id="c_${q.id}" data-qid="${q.id}">${grp}<div class="q-title-text math-content text-[20px] font-normal text-slate-900 leading-snug mb-2"><strong class="q-label-bold font-bold">${q.gm ? 'Question' : 'Câu'} ${num}. </strong>${stt}<span class="q-stem-normal font-normal">${F(q.text)}</span></div>`;
        if (t === 'mc') {
            const opts = q.options || [], mxl = Math.max(0, ...opts.map(o => estLen(o.text)));
            const lay = mxl <= 14 ? 'q-options-one-row' : mxl <= 38 ? 'q-options-two-rows' : 'q-options-four-rows';
            const done = once && !k && a && a.sel;
            s += `<div class="${lay} grid gap-2">`;
            opts.forEach(o => {
                const me = a && a.sel === o.letter;
                let b = 'bg-white hover:bg-blue-50/60 text-slate-800 border-slate-300', g = 'q-opt-badge--def', lk = '';
                if (k) {
                    if (me) { if (o.letter === k.correct) { b = 'bg-green-600 text-yellow-300 border-green-700 shadow-md'; g = 'q-opt-badge--ok'; } else { b = 'bg-red-600 text-white border-red-700 shadow-md'; g = 'q-opt-badge--bad'; } }
                    else if (o.letter === k.correct) { b = 'bg-green-500 text-white border-green-700 shadow-md ring-2 ring-green-300'; g = 'q-opt-badge--key'; }
                } else if (me) { b = 'bg-blue-600 text-white border-blue-700 shadow-md'; g = 'q-opt-badge--sel'; }
                else if (done) lk = ' lv-lk';
                const can = h && !k && !done;
                s += `<button type="button" class="q-option-btn flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[20px] font-normal transition-all ${b} ${can ? 'active:scale-95 cursor-pointer' : 'cursor-default'}${lk}" ${can ? `onclick="${h}.pick('${q.id}','${o.letter}')"` : ''}><span class="q-opt-badge flex items-center justify-center shrink-0 ${g}">${E(o.letter)}</span><span class="q-option-text math-content font-normal break-words leading-snug text-left flex-1">${F(o.text)}</span></button>`;
            });
            s += '</div>';
            if (has && !k.a) s += `<div class="lv-note">${who} chưa chọn đáp án câu này</div>`;
        } else if (t === 'tf') {
            const key = (k && k.tf) || [];
            s += '<div class="q-tf-list">';
            (q.options || []).slice(0, 4).forEach((o, j) => {
                const v = a && a.values ? a.values[j] : null, set = v === true || v === false;
                s += `<div class="q-tf-row"><div class="q-tf-text math-content"><span class="q-tf-label">${'abcd'[j]})</span> <span>${F(o.text)}</span></div><div class="q-tf-ctrl">`;
                [true, false].forEach(bv => {
                    let c = 'q-tf-btn';
                    if (k) { if (v === bv) c += bv === !!key[j] ? ' ok' : ' bad'; else if (bv === !!key[j]) c += ' key'; }
                    else if (v === bv) c += ' sel';
                    const can = h && !k && !(once && set);
                    if (!can) c += ' locked';
                    if (!k && once && set && v !== bv) c += ' lv-lk';
                    s += `<button type="button" class="${c}" ${can ? `onclick="${h}.tf('${q.id}',${j},${bv})"` : ''}>${bv ? 'Đúng' : 'Sai'}</button>`;
                });
                s += '</div></div>';
            });
            s += '</div>';
        } else {
            const val = String((a && a.value) || ''), N = Math.max(4, String((k && k.sa) || '').trim().length), lk = !!(a && a.locked);
            const ro = !!k || !h || (once && lk), cls = has ? (k.ok ? ' ok' : ' bad') : '';
            s += `<div class="q-sa-row"><span class="q-sa-label">Trả lời:</span><div class="q-sa-boxes" data-len="${val.length}">`;
            for (let i = 0; i < N; i++) s += `<input type="text" class="q-sa-box${cls}" inputmode="${window.SAKB ? SAKB.mode() : 'decimal'}" enterkeyhint="done" maxlength="1" autocomplete="off" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Ô ${i + 1}" value="${E(val[i] || '')}" ${ro ? 'readonly' : `oninput="LVB.inp(this,'${h}','${q.id}')" onkeydown="LVB.key(event,this,'${h}','${q.id}')" onfocus="LVB.foc1(this)" onpaste="LVB.paste(event,this,'${h}','${q.id}')"`}>`;
            s += '</div>';
            if (!ro && window.SAKB) s += SAKB.btnHtml();   // [CODE77]
            if (once && !k && h && !lk) s += `<button type="button" class="lv-ok-btn" onclick="${h}.saOk('${q.id}')">CHỐT</button>`;
            if (k && k.sa !== undefined && !(has && k.ok)) s += `<span class="q-sa-key">Đáp án đúng: ${E(k.sa)}</span>`;
            s += '</div>';
            if (has && !k.ok) s += `<div class="lv-note">${k.a ? who + ' trả lời sai' : who + ' chưa trả lời câu này'}</div>`;
        }
        /* Hướng dẫn giải: học sinh có nút XEM HƯỚNG DẪN / ẨN HƯỚNG DẪN; giáo viên xem bài làm (noSol) thì không hiện */
        if (k && !opt.noSol && (k.sol || (k.tfSol || []).some(Boolean))) {
            (window.LVSQ = window.LVSQ || {})[q.id] = Object.assign({}, q, { type: t, solution: k.sol, tfSol: k.tfSol, tfAnswers: k.tf, correct: k.correct, shortAnswer: k.sa });
            const op = !!(window.LVSO || {})[q.id];
            s += `<button type="button" class="sol-toggle-btn no-print${op ? ' open' : ''}" id="lvsb_${q.id}" onclick="LVsol('${q.id}')">${op ? '✖ ẨN HƯỚNG DẪN' : '💡 XEM HƯỚNG DẪN'}</button><div class="sol-panel no-print" id="lvs_${q.id}" style="display:${op ? 'block' : 'none'}">${op ? solHtml(q.id) : ''}</div>`;
        }
        return s + '</div>';
    }
    window.LVsol = function (id, force) {
        const d = document.getElementById('lvs_' + id), b = document.getElementById('lvsb_' + id); if (!d) return;
        const open = force !== undefined ? !!force : d.style.display === 'none';
        if (open) d.innerHTML = solHtml(id);
        d.style.display = open ? 'block' : 'none';
        if (b) { b.classList.toggle('open', open); b.textContent = open ? '✖ ẨN HƯỚNG DẪN' : '💡 XEM HƯỚNG DẪN'; }
        (window.LVSO = window.LVSO || {})[id] = open;
    };
    /* Ô trả lời ngắn 4 ô (giống làm bài về nhà): nhập từ trái sang phải, Backspace lùi ô, dán nhiều ký tự */
    window.LVB = {
        bx: w => [...w.querySelectorAll('.q-sa-box')],
        val: w => { const bs = window.LVB.bx(w); return bs.map(b => b.value).join('').replace(/\s+/g, '').slice(0, bs.length); },
        put: (w, v) => window.LVB.bx(w).forEach((b, k) => { b.value = v[k] || ''; }),
        idx: el => window.LVB.bx(el.parentNode).indexOf(el),
        foc: (w, k) => { const bs = window.LVB.bx(w), b = bs[Math.max(0, Math.min(bs.length - 1, k))]; if (!b) return; try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } try { b.select(); } catch (e) { } },
        foc1: el => { const w = el.parentNode, len = window.LVB.val(w).length, i = window.LVB.idx(el); if (i > len) window.LVB.foc(w, len); else { try { el.select(); } catch (e) { } } },
        set: (w, v, h, id) => { window.LVB.put(w, v); w.setAttribute('data-len', v.length); try { window[h].sa(id, v); } catch (e) { } },
        inp: (el, h, id) => { const L = window.LVB, w = el.parentNode, prev = Number(w.getAttribute('data-len') || 0), v = L.val(w); L.set(w, v, h, id); L.foc(w, v.length < prev ? Math.min(L.idx(el), v.length) : v.length); },
        key: (e, el, h, id) => {
            const L = window.LVB, w = el.parentNode, i = L.idx(el);
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); return; }
            if (e.key === 'Backspace' && !el.value && i > 0) { e.preventDefault(); const v = L.val(w); L.set(w, v.slice(0, i - 1) + v.slice(i), h, id); L.foc(w, i - 1); }
        },
        paste: (e, el, h, id) => {
            e.preventDefault(); const L = window.LVB, w = el.parentNode, i = L.idx(el), N = L.bx(w).length;
            const txt = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\s+/g, ''), v = L.val(w), nv = (v.slice(0, Math.min(i, v.length)) + txt).slice(0, N);
            L.set(w, nv, h, id); L.foc(w, nv.length);
        }
    };
    function listHtml(qs, ans, keys, h, once, opt) {
        const ctx = { nm: numMap(qs) }; let last = '', s = '';
        qs.forEach(q => {
            const t = q.type || qType(q);
            if (t !== last) { s += partHd(t); last = t; }
            s += card(q, ans && ans[q.id], keys && keys[q.id], h, once, ctx, opt);
        });
        return `<div class="qc-live">${s}</div>`;
    }
    /* [CODE141] Dùng chung giao diện làm bài cho NGÂN HÀNG ĐỀ > Xem câu hỏi */
    window.BKView = { card: card, partHd: partHd, numMap: numMap };

    /* ======================= GIÁO VIÊN ======================= */
    const LV = window.LV = { st: {} };
    function prep(topic) {
        const qs = normalizeQuestionLetters(JSON.parse(JSON.stringify(topic.questions)));
        let per; try { per = computePartPer(qs, topic.scoring || null, topic.subject); } catch (e) { per = { mc: .25, tf: 1, sa: .5 }; }
        return { qs, per, sc: topic.scoring || null, nm: numMap(qs) };
    }
    const mx = q => { try { return maxPointsFor(q, LV.per, LV.sc) || 0; } catch (e) { return 1; } };
    function grade(q, ua) {
        const t = qType(q); if (!ua) return { e: 0, ok: false, a: false };
        if (t === 'tf') {
            const v = ua.values || [], key = q.tfAnswers || []; let k = 0, a = false, e = 0;
            const y = tfYPointsOf(q, LV.sc);
            for (let j = 0; j < 4; j++) if (v[j] === true || v[j] === false) { a = true; if (v[j] === !!key[j]) { k++; if (y) e += y[j]; } }
            if (!y) { const tr = tfTiersOf(LV.sc); e = tr ? (k ? tr[k - 1] : 0) : mx(q) * TF_LADDER[k]; }
            return { e, ok: k === 4, a };
        }
        if (t === 'sa') { const a = String(ua.value || '').trim() !== ''; const ok = a && shortAnswerMatches(ua.value, q.shortAnswer); return { e: ok ? mx(q) : 0, ok, a }; }
        const a = !!ua.sel, ok = a && ua.sel === q.correct; return { e: ok ? mx(q) : 0, ok, a };
    }
    function calc(s) {
        let e = 0, m = 0, ok = 0, wr = 0, bl = 0;
        LV.qs.forEach(q => { const g = grade(q, s.answers[q.id]); m += mx(q); e += g.e; if (g.ok) ok++; else if (g.a) wr++; else bl++; });
        s.sc = m ? Math.round(e / m * 1000) / 100 : 0; s.ok = ok; s.wr = wr; s.bl = bl;
    }
    const all = () => Object.values(LV.st);
    const tkey = s => LV.mode === 'sync' ? (s.tc || 0) : (s.at || 0);
    const better = (x, s) => x.sc > s.sc || (x.sc === s.sc && tkey(x) < tkey(s));
    const rankOf = s => 1 + all().filter(x => better(x, s)).length;
    LV.upTc = function (s) { const q = LV.qs[LV.qi]; (s.okq = s.okq || {})[q.id] = grade(q, s.answers[q.id]).ok; s.tc = LV.qs.reduce((a, x) => a + (s.okq[x.id] ? ((s.qrt || {})[x.id] || 0) : 0), 0); };
    const send = (s, m) => { try { if (s.conn && s.conn.open) s.conn.send(m); } catch (e) { } };
    const bcast = m => all().forEach(s => send(s, m));

    LV.open = function (tid) {
        const topic = savedTopics.find(t => t.id === tid); if (!topic) return;
        if (typeof Peer === 'undefined' && !(window.CloudSync && CloudSync.liveCfg && CloudSync.liveCfg())) { showModal('Chưa tải được thư viện', 'Cần có Internet để dùng Chơi trực tiếp (thư viện PeerJS chưa tải được). Bấm ĐỒNG BỘ (Firebase) để dùng kênh không cần PeerJS.', 'info'); return; }
        let sv = {}; try { sv = JSON.parse(localStorage.getItem('lvTeamCfg') || '{}') || {}; } catch (e) { }
        Object.assign(LV, prep(topic), { topic, mode: 'pace', tabSel: 'pace', team: false, teams: [], nT: Math.max(2, Math.min(12, Number(sv.nT) || 4)), tn: Array.isArray(sv.tn) ? sv.tn.slice(0, 12) : [], phase: 'setup', st: {}, qi: 0, rev: false, desc: true, view: 'podium', _useGas: false, _fbFailed: false, _fbTried: 0, _fbIdx: undefined, _fallbackReason: '' });
        LV.draw();
    };
    LV.toggleFocusQ = function () { LV.focusQ = !LV.focusQ; const g = document.querySelector('#lv-run .lv-3col'); if (g) g.classList.toggle('focus-question', LV.focusQ); const b = $('lv-focus-btn'); if (b) b.textContent = LV.focusQ ? '↩ Hiện cột phải' : '🔍 Mở rộng câu hỏi'; };
    LV.tab = m => { if (LV.phase === 'setup') { LV.tabSel = m; LV.mode = m === 'pace' ? 'pace' : 'sync'; LV.team = m === 'team'; LV.draw(); } };
    LV.close = function () {
        if (LV.phase !== 'setup' && LV.phase !== 'done' && !confirm('Đóng sẽ ngắt buổi chơi đang diễn ra. Đóng?')) return;
        clearInterval(LV.tm); (LV.pt || []).forEach(clearTimeout); try { LV.peer && LV.peer.destroy(); } catch (e) { } LV.peer = null; LV.phase = 'setup';
        ['lv-t', 'lv-d', 'lv-qb'].forEach(i => { const d = $(i); if (d) d.remove(); });
    };
    LV.draw = function () {
        const focusBtn = LV.phase === 'run' ? `<button class="lv-b" id="lv-focus-btn" style="background:#ffffff26;font-size:13px;padding:6px 12px" onclick="LV.toggleFocusQ()">${LV.focusQ ? '↩ Hiện cột phải' : '🔍 Mở rộng câu hỏi'}</button>` : '';
        const head = `<div class="lv-hd"><div style="font-size:22px;font-weight:900">🎮 CHƠI TRỰC TIẾP — ${E(LV.topic.subtitle)}</div><div style="display:flex;align-items:center;gap:8px">${focusBtn}<button class="lv-b" style="background:#ffffff33" onclick="LV.close()">✕</button></div></div>`;
        let body = '';
        if (LV.phase === 'setup') {
            const p = LV.mode === 'pace';
            const sel = LV.tabSel;
            body = `<div style="display:flex;gap:10px;flex-wrap:wrap;padding:4px 2px 0"><button class="lv-tab ${sel === 'pace' ? 'on' : ''}" onclick="LV.tab('pace')">Học sinh chủ động</button><button class="lv-tab ${sel === 'sync' ? 'on' : ''}" onclick="LV.tab('sync')">Giáo viên điều khiển</button><button class="lv-tab ${sel === 'team' ? 'on' : ''}" onclick="LV.tab('team')">👥 Chơi theo đội/nhóm</button></div>
            <div class="lv-c"><p style="margin-bottom:10px;font-weight:600;color:#475569;text-align:justify;text-justify:inter-word">${p ? 'Mỗi học sinh làm bài theo tốc độ riêng, nộp bài khi xong hoặc hết giờ. ⚠ Mỗi câu học sinh chỉ được chọn đáp án 1 lần, không được chọn lại.' : (LV.team ? 'Chia lớp thành các đội/nhóm. Giáo viên điều khiển: cả lớp cùng làm từng câu, giáo viên hiện đáp án sau mỗi câu. Mỗi đội có một mã QR riêng, học sinh quét mã QR của đội mình để vào chơi. Đội xếp hạng theo ĐIỂM TRUNG BÌNH của các thành viên. ⚠ Mỗi câu học sinh chỉ được chọn đáp án 1 lần duy nhất, không được đổi.' : 'Cả lớp cùng làm từng câu theo thứ tự; giáo viên hiện đáp án và thống kê sau mỗi câu. ⚠ Mỗi câu học sinh chỉ được chọn đáp án 1 lần duy nhất, không được đổi.')}</p>
            ${p ? `<label style="font-weight:900">⏱ Giới hạn thời gian làm bài (phút):</label><input id="lv-min" type="number" min="1" value="${Number(LV.topic.timeLimit) || 10}" class="lv-i" style="width:120px;margin:6px 0 12px;display:block">
            <label style="font-weight:900;display:block;margin-bottom:12px"><input id="lv-shuf" type="checkbox" checked> 🔀 Đảo thứ tự câu hỏi (mỗi học sinh một thứ tự khác nhau)</label>`
                    : `<label style="font-weight:900">⏱ Thời gian mỗi câu (giây, 0 = không giới hạn):</label><input id="lv-sec" type="number" min="0" value="60" class="lv-i" style="width:120px;margin:6px 0 12px;display:block">`}
            ${LV.team ? LV.teamCfgHtml() : ''}
            <label style="font-weight:900;display:block;margin:6px 0"><input id="lv-g" type="checkbox" checked> 🛡 Bật chế độ giám sát màn hình (chống gian lận)</label>
            ${(window.GasBridge && GasBridge.isGasEnabled && GasBridge.isGasEnabled()) ? `<label style="font-weight:900;display:block;margin:6px 0;color:#0369a1"><input id="lv-use-gas" type="checkbox"${(GasBridge.getConfig().mode === 'gas' || LV._useGas) ? ' checked' : ''}> 📊 Dùng kênh Google Sheets (Apps Script) — chống rớt phòng khi lớp đông</label>` : ''}
            <div style="margin:0 0 14px 24px;font-weight:600;color:#475569;text-align:justify">${p ? 'Tự động nộp bài sau <input id="lv-gm" type="number" min="0" value="3" class="lv-i" style="width:70px;display:inline-block;padding:4px 8px"> lần rời khỏi màn hình (0 = chỉ cảnh báo).' : 'Ghi nhận và cảnh báo học sinh rời khỏi màn hình.'} Giám sát: chuyển tab/thu nhỏ trình duyệt, sao chép - dán, chuột phải, phím tắt, in/chụp màn hình, thoát toàn màn hình.</div>
            <button class="lv-b g" style="font-size:18px" onclick="LV.go()">▶ VÀO CHƠI</button></div>`;
        } else if (LV.phase === 'lobby' && LV.team) {
            body = LV.lobbyTeamHtml();
        } else if (LV.phase === 'lobby') {
            const url = LV.link();
            body = `<div class="lv-c" style="text-align:center">${LV.chanBadgeHtml()}<div style="font-weight:900;font-size:20px">Học sinh quét mã QR hoặc mở liên kết để vào chơi</div><div style="width:260px;margin:10px auto">${qrSvg(url)}</div>
            <input class="lv-i" readonly value="${E(url)}" onclick="this.select()"><div style="margin-top:6px"><button class="lv-b s" onclick="navigator.clipboard&&navigator.clipboard.writeText('${E(url)}')">📋 Sao chép liên kết</button></div>
            ${location.protocol === 'file:' ? '<p style="color:#dc2626;font-weight:900">⚠ Cần mở app từ địa chỉ web (GitHub Pages) thì học sinh mới vào được.</p>' : ''}</div>
            <div class="lv-c"><div style="font-weight:900;font-size:18px">👥 Học sinh đã vào: <span id="lv-n">0</span></div><div id="lv-ls" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"></div><button class="lv-b g" style="font-size:18px" onclick="LV.start()">▶ BẮT ĐẦU</button></div>`;
        } else if (LV.phase === 'run') {
            body = '<div id="lv-run"></div>';
        } else body = '<div id="lv-res"></div>';
        layer('lv-t', head + `<div class="lv-w" ${(LV.phase === 'done' || LV.phase === 'run') ? 'style="max-width:none;width:100%"' : (LV.phase === 'lobby' && LV.team ? 'style="max-width:1300px"' : '')}>${body}</div>`);
        if (LV.phase === 'lobby') LV.upd();
        if (LV.phase === 'run') LV.upd();
        if (LV.phase === 'done') { if (LV.view === 'table') LV.result(); else LV.podium(); }
    };
    LV.go = function () {
        LV.min = Math.max(1, Number(($('lv-min') || {}).value) || 10);
        LV.shuf = $('lv-shuf') ? $('lv-shuf').checked : false;
        LV.sec = Math.max(0, Number(($('lv-sec') || {}).value) || 0);
        LV.guard = { on: !!($('lv-g') && $('lv-g').checked), max: Math.max(0, Number(($('lv-gm') || {}).value) || 0) };
        if (LV.peer) return;
        if (LV.team) {
            const seen = {};
            LV.teams = Array.from({ length: LV.nT }, (_, i) => { let nm = (String(LV.tn[i] || '').trim() || ('Đội ' + (i + 1))).slice(0, 30); if (seen[nm.toLowerCase()]) nm += ' (' + (i + 1) + ')'; seen[nm.toLowerCase()] = 1; return { name: nm }; });
            try { localStorage.setItem('lvTeamCfg', JSON.stringify({ nT: LV.nT, tn: LV.tn })); } catch (e) { }
        }
        LV.audio(); /* mở khóa âm thanh bằng thao tác bấm của giáo viên để chuông kêu được */
        LV.pid = 'hs' + rid(8);
        let gCfg = null; try { gCfg = (window.GasBridge && GasBridge.isGasEnabled && GasBridge.isGasEnabled()) ? GasBridge.getConfig() : null; } catch (e) { }
        const fbPool = (!LV._fbFailed && !(gCfg && gCfg.mode === 'gas') && window.CloudSync && CloudSync.getFbPool) ? CloudSync.getFbPool() : (window.CloudSync && CloudSync.liveCfg && !LV._fbFailed && !(gCfg && gCfg.mode === 'gas') && CloudSync.liveCfg() ? [CloudSync.liveCfg()] : []);
        if (fbPool.length && typeof LV._fbIdx !== 'number') { LV._fbIdx = (window.CloudSync && CloudSync.nextFbIdx) ? CloudSync.nextFbIdx() : 0; LV._fbTried = 0; }
        let fbc = fbPool.length ? fbPool[LV._fbIdx % fbPool.length] : null;
        const forceGas = !!($('lv-use-gas') && $('lv-use-gas').checked);
        const useGas = !!(gCfg && (forceGas || gCfg.mode === 'gas' || LV._useGas || (!fbc && typeof Peer === 'undefined')));
        if (useGas && !LV._fallbackReason) {
            if (forceGas) LV._fallbackReason = 'Theo tùy chọn dùng Google Sheets đã tích';
            else if (gCfg && gCfg.mode === 'gas') LV._fallbackReason = 'Chế độ cấu hình đang đặt Chỉ Apps Script';
            else if (!fbc) LV._fallbackReason = 'Chưa có kho Firebase khả dụng';
        }
        LV.fb = useGas ? null : fbc;
        LV.gas = useGas ? gCfg : null;
        if (!LV.fb && !LV.gas && typeof Peer === 'undefined') { showModal('Chưa tải được thư viện', 'Cần có Internet để dùng Chơi trực tiếp (thư viện PeerJS chưa tải được). Bấm ĐỒNG BỘ (Firebase hoặc Apps Script) để dùng kênh không cần PeerJS.', 'info'); return; }
        const pr = LV.peer = LV.gas ? new GasPeer(LV.pid, LV.gas) : (LV.fb ? new FbPeer(LV.pid, LV.fb) : new Peer(LV.pid, PEER_OPTS));
        const openTo = setTimeout(() => { if (LV.peer === pr && LV.phase === 'setup') try { pr.emit('error', { type: 'timeout' }); } catch (e) { } }, 12000);
        pr.on('open', () => { clearTimeout(openTo); LV.phase = 'lobby'; LV.draw(); });
        pr.on('connection', c => { c.on('data', m => LV.msg(c, m)); c.on('close', () => { all().forEach(s => { if (s.conn === c) { s.on = false; LV.upd(); } }); }); });
        pr.on('disconnected', () => { try { if (!pr.destroyed) pr.reconnect(); } catch (e) { } });
        pr.on('error', e => {
            if (LV.phase === 'setup') {
                try { pr.destroy(); } catch (x) { }
                if (LV.peer === pr) LV.peer = null;
                const _pool = (window.CloudSync && CloudSync.getFbPool) ? CloudSync.getFbPool() : [];
                if (LV.fb && _pool.length > 1 && (LV._fbTried || 0) + 1 < _pool.length) { LV._fbTried = (LV._fbTried || 0) + 1; LV._fbIdx = ((LV._fbIdx || 0) + 1) % _pool.length; LV.go(); return; }
                if (LV.fb && !LV._fbFailed && typeof Peer !== 'undefined') { LV._fbFailed = true; LV.go(); return; }
                if (!LV.gas && gCfg && gCfg.mode !== 'firebase' && gCfg.urls.length > 0 && !LV._useGas) { LV._useGas = true; LV._fallbackReason = 'Firebase lỗi (' + (e && (e.type || e.message) || e) + '), tự chuyển dự phòng sang Google Sheets'; LV.go(); return; }
                showModal('Lỗi kết nối', 'Không tạo được phòng chơi: ' + (e.type || e) + '. Hãy bấm VÀO CHƠI lần nữa.', 'info');
            }
        });
    };
    LV.audio = function () {
        try {
            const ac = LV.ac || (LV.ac = new (window.AudioContext || window.webkitAudioContext)());
            if (ac.state === 'suspended' && ac.resume) ac.resume();
            return ac;
        } catch (e) { return null; }
    };
    LV.bell = function (name) {
        try {
            const ac = LV.audio();
            if (ac) {
                [0, 0.5].forEach(off => {
                    [880, 1760, 2640].forEach((f, i) => {
                        const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + off;
                        o.type = 'sine'; o.frequency.value = f;
                        g.gain.setValueAtTime(.0001, t0);
                        g.gain.exponentialRampToValueAtTime(.35 / (i + 1), t0 + .01);
                        g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.3);
                        o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 1.4);
                    });
                });
            }
        } catch (e) { }
        try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) { }
        try {
            const d = document.createElement('div');
            d.style.cssText = 'position:fixed;top:78px;right:16px;z-index:9600;background:#059669;color:#fff;padding:10px 18px;border-radius:14px;font-weight:900;box-shadow:0 8px 24px #0004;max-width:80%;word-break:break-word';
            d.textContent = '🔔 ' + name + ' vừa vào phòng';
            document.body.appendChild(d);
            setTimeout(() => d.remove(), 3500);
        } catch (e) { }
    };
    LV.msg = function (c, m) {
        if (!m) return;
        if (m.t === 'join') {
            let s = LV.st[m.cid];
            const tv = LV.team && Number.isInteger(m.team) && m.team >= 0 && m.team < LV.teams.length ? m.team : -1;
            if (!s) {
                if (LV.phase !== 'lobby') { try { c.send({ t: 'late' }); } catch (e) { } return; }
                if (LV.team && tv < 0) { try { c.send({ t: 'pick', teams: LV.teams.map(t => t.name), title: LV.topic.subtitle }); } catch (e) { } return; }
                s = LV.st[m.cid] = { cid: m.cid, name: String(m.name || 'Học sinh').slice(0, 40), team: tv, answers: {}, done: false, sc: 0, ok: 0, wr: 0, bl: LV.qs.length, qrt: {}, okq: {}, tc: 0 }; LV.bell(s.name + (LV.team ? ' (' + LV.teams[tv].name + ')' : ''));
            } else if (LV.team && tv >= 0 && LV.phase === 'lobby') s.team = tv;
            s.conn = c; s.on = true; send(s, { t: 'hi', mode: LV.mode, title: LV.topic.subtitle, guard: LV.guard, ver: VER, team: LV.team ? s.team : undefined, tname: LV.team ? LV.teams[s.team].name : '' });
            if (LV.phase === 'run') LV.resend(s); else if (LV.phase === 'done') LV.sendRes(s, true);
            LV.upd(); return;
        }
        const s = Object.values(LV.st).find(x => x.conn === c); if (!s || LV.phase !== 'run') return;
        if (m.t === 'ans' && LV.mode === 'pace' && !s.done) { s.answers = m.answers || {}; calc(s); LV.upd(); }
        if (m.t === 'ans1' && LV.mode === 'sync' && !LV.rev && String(m.qid) === String(LV.qs[LV.qi].id)) {
            const q = LV.qs[LV.qi], t = qType(q), old = s.answers[q.id], ua = m.ua || {}; let nu = ua;
            if (t === 'mc') { if (old && old.sel) return; }
            else if (t === 'tf') { const ov = (old && old.values) || [], nv = (ua.values || []).slice(); for (let j = 0; j < 4; j++) if (ov[j] === true || ov[j] === false) nv[j] = ov[j]; nu = { values: nv }; }
            else if (old && old.locked) return;
            s.answers[q.id] = nu; (s.qrt = s.qrt || {})[q.id] = Date.now() - LV.qStart; LV.upd();
        }
        if (m.t === 'vio') { s.vio = (s.vio || 0) + 1; (s.vlog = s.vlog || []).push({ k: String(m.k).slice(0, 60), at: Date.now() - LV.t0 }); LV.upd(); }
        if (m.t === 'vback') { const l = (s.vlog || []).slice(-1)[0]; if (l) l.sec = Number(m.sec) || 0; LV.upd(); }
        if (m.t === 'submit' && LV.mode === 'pace' && !s.done) { s.answers = m.answers || {}; s.done = true; s.at = Date.now() - LV.t0; calc(s); LV.sendRes(s); LV.upd(); if (all().every(x => x.done)) LV.finish(); }
    };
    LV.resend = function (s) {
        if (LV.mode === 'pace') { if (s.done) LV.sendRes(s); else send(s, { t: 'start', mode: 'pace', qs: LV.qs.map(pub), shuf: LV.shuf, remain: LV.endAt - Date.now(), answers: s.answers, guard: LV.guard, vio: s.vio || 0 }); }
        else { const q = LV.qs[LV.qi]; send(s, { t: 'q', q: pub(q), i: LV.qi, n: LV.qs.length, remain: LV.qEnd ? LV.qEnd - Date.now() : 0, guard: LV.guard, vio: s.vio || 0, a: s.answers[q.id] || null }); if (LV.rev) LV.sendRev(s); }
    };
    LV.keysFor = function (s) {
        const keys = {}; LV.qs.forEach(q => { const g = grade(q, s.answers[q.id]); keys[q.id] = Object.assign(keyOf(q), { ok: g.ok, a: g.a }); });
        return keys;
    };
    LV.sendRes = function (s, fin) {
        const m = { t: 'end', sc: s.sc, ok: s.ok, wr: s.wr, bl: s.bl, keys: LV.keysFor(s), answers: s.answers };
        if (LV.mode === 'sync') m.qs = LV.qs.map(pub);
        if (fin) { if (LV.team) Object.assign(m, LV.tinfo(s)); else { m.rk = rankOf(s); m.nn = all().length; } }
        send(s, m);
    };
    /* [CODE54] ĐẾM NGƯỢC 3-2-1 KÈM ÂM THANH (dùng chung cho màn hình giáo viên & học sinh) */
    window.lvCountdown = function (n, done) {
        const old = document.getElementById('lv-cd'); if (old) { try { old._stop(); } catch (e) { } }
        const ov = document.createElement('div'); ov.id = 'lv-cd';
        ov.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,#7c3aed 0%,#4c1d95 60%,#1e1b4b 100%);color:#fff;font-family:Roboto,Arial,sans-serif;text-align:center;user-select:none';
        ov.innerHTML = '<div style="font-size:clamp(18px,3.2vw,30px);font-weight:900;letter-spacing:2px;opacity:.9;margin-bottom:10px">CHUẨN BỊ — BÀI LÀM BẮT ĐẦU SAU</div><div id="lv-cd-n" style="font-size:clamp(150px,34vw,360px);font-weight:900;line-height:1;text-shadow:0 10px 40px #0008"></div><div id="lv-cd-bar" style="width:min(70vw,520px);height:12px;border-radius:99px;background:#ffffff33;margin-top:26px;overflow:hidden"><i style="display:block;height:100%;width:100%;background:#fde047;border-radius:99px;transition:width 1s linear"></i></div>';
        document.body.appendChild(ov);
        const tone = (f, d, v, type) => {
            try {
                const ac = LV.audio(); if (!ac) return;
                const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime;
                o.type = type || 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v || .4, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
                o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + d + .05);
            } catch (e) { }
        };
        let k = n, fin = false, tm = null;
        const num = ov.querySelector('#lv-cd-n'), bar = ov.querySelector('#lv-cd-bar i');
        const stop = () => { fin = true; clearTimeout(tm); ov.remove(); };
        ov._stop = stop;
        const tick = () => {
            if (fin) return;
            if (k <= 0) {
                tone(1318, .5, .5, 'triangle'); tone(1760, .6, .35, 'sine');
                num.textContent = 'BẮT ĐẦU!'; num.style.fontSize = 'clamp(60px,14vw,150px)';
                tm = setTimeout(() => { stop(); try { done && done(); } catch (e) { console.error(e); } }, 450);
                return;
            }
            num.textContent = k; num.style.transform = 'scale(1.18)'; num.style.transition = 'none';
            requestAnimationFrame(() => requestAnimationFrame(() => { num.style.transition = 'transform .6s ease-out'; num.style.transform = 'scale(1)'; }));
            bar.style.transition = 'none'; bar.style.width = (k / n * 100) + '%';
            requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = 'width 1s linear'; bar.style.width = ((k - 1) / n * 100) + '%'; }));
            tone(880, .22, .45, 'square');
            k--; tm = setTimeout(tick, 1000);
        };
        tick();
    };
    LV.start = function () {
        if (LV.cding) return;
        if (!all().length) { showModal('Chưa có học sinh', 'Hãy đợi ít nhất một học sinh vào phòng.', 'info'); return; }
        if (LV.team) { const em = LV.teams.filter((t, i) => !all().some(x => x.team === i)); if (em.length && !confirm('Chưa có học sinh ở: ' + em.map(t => t.name).join(', ') + '.\nVẫn bắt đầu?')) return; }
        LV.cding = true; LV.audio();
        bcast({ t: 'cd', n: 3 });
        window.lvCountdown(3, () => { LV.cding = false; LV.begin(); });
    };
    LV.begin = function () {
        LV.phase = 'run'; LV.t0 = Date.now(); LV.qi = 0;
        if (LV.mode === 'pace') {
            LV.endAt = LV.t0 + LV.min * 60000;
            bcast({ t: 'start', mode: 'pace', qs: LV.qs.map(pub), shuf: LV.shuf, remain: LV.min * 60000, answers: {}, guard: LV.guard });
            LV.tm = setInterval(() => { if (Date.now() >= LV.endAt) LV.finish(); else LV.upd(); }, 1000);
        } else LV.showQ();
        LV.draw();
    };
    LV.showQ = function () {
        LV.rev = false; LV.qStart = Date.now(); LV.qEnd = LV.sec ? Date.now() + LV.sec * 1000 : 0; clearInterval(LV.tm);
        bcast({ t: 'q', q: pub(LV.qs[LV.qi]), i: LV.qi, n: LV.qs.length, remain: LV.sec * 1000, guard: LV.guard });
        LV.tm = setInterval(() => { if (LV.qEnd && Date.now() >= LV.qEnd + 1200 && !LV.rev) LV.reveal(); else LV.upd(); }, 1000);
        if (LV.phase === 'run') LV.upd();
    };
    LV.sendRev = function (s) {
        const q = LV.qs[LV.qi], g = grade(q, s.answers[q.id]); LV.upTc(s); calc(s);
        send(s, Object.assign(LV.team ? LV.tinfo(s) : {}, { t: 'rev', qid: q.id, key: Object.assign(keyOf(q), { sol: '', tfSol: [] }), ok: g.ok, e: Math.round(g.e * 1000) / 1000, sc: s.sc, rk: LV.team ? 0 : rankOf(s), nn: all().length }));
    };
    LV.reveal = function () { if (LV.rev) return; LV.rev = true; clearInterval(LV.tm); all().forEach(s => { LV.upTc(s); calc(s); }); all().forEach(s => LV.sendRev(s)); LV.upd(); };
    LV.next = function () { if (LV.qi < LV.qs.length - 1) { LV.qi++; LV.showQ(); } else LV.finish(); };
    LV.finish = function () {
        if (LV.phase === 'done') return; clearInterval(LV.tm);
        all().forEach(s => { if (!s.done) { s.done = true; s.at = Date.now() - LV.t0; } calc(s); });
        all().forEach(s => LV.sendRes(s, true));
        LV.phase = 'done'; LV.view = 'podium'; LV.desc = true; LV.draw();
    };

    /* ======================= [CODE51] CHƠI THEO ĐỘI/NHÓM ======================= */
    LV.tstat = () => LV.teams.map((t, i) => {
        const m = all().filter(x => x.team === i), n = m.length;
        const avg = n ? Math.round(m.reduce((a, x) => a + x.sc, 0) / n * 100) / 100 : 0;
        return { i, name: t.name, n, avg, m, tm: n ? m.reduce((a, x) => a + tkey(x), 0) / n : Infinity };
    });
    /* Điểm trung bình thành viên: cao → thấp; bằng điểm: thời gian trả lời đúng trung bình ngắn hơn xếp trước; đội chưa có thành viên xếp cuối */
    LV.tcmp = (a, b) => ((b.n > 0) - (a.n > 0)) || (b.avg - a.avg) || (a.tm === b.tm ? 0 : a.tm < b.tm ? -1 : 1);
    LV.trank = () => LV.tstat().sort((a, b) => LV.tcmp(a, b) || a.i - b.i);
    LV.trkOf = i => { const st = LV.tstat(), me = st.find(x => x.i === i); return me ? 1 + st.filter(x => LV.tcmp(x, me) < 0).length : 0; };
    LV.tinfo = s => { const me = LV.tstat().find(x => x.i === s.team) || { name: '', avg: 0 }; return { tn: me.name, tavg: me.avg, trk: LV.trkOf(s.team), tnn: LV.teams.length }; };
    LV.namesHtml = () => Array.from({ length: LV.nT }, (_, i) => `<div style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:34px;border-radius:6px;flex-shrink:0;background:${TC[i % TC.length]}"></span><input class="lv-i" maxlength="30" value="${E(LV.tn[i] || '')}" placeholder="Đội ${i + 1}" oninput="LV.tn[${i}]=this.value"></div>`).join('');
    LV.teamCfgHtml = () => `<div style="margin:6px 0 14px;padding:12px;border-radius:14px;background:#faf5ff;border:2px solid #e9d5ff"><label style="font-weight:900">👥 Số đội/nhóm (2 – 12):</label><div style="display:flex;align-items:center;gap:8px;margin:6px 0 10px"><button type="button" class="lv-b s" onclick="LV.setNT(LV.nT-1)">−</button><input id="lv-nt" type="number" min="2" max="12" value="${LV.nT}" class="lv-i" style="width:90px;text-align:center" onchange="LV.setNT(this.value)"><button type="button" class="lv-b s" onclick="LV.setNT(LV.nT+1)">+</button></div><div style="font-weight:900;margin-bottom:6px">✏ Đặt tên đội/nhóm <span style="font-weight:600;color:#64748b">(để trống = “Đội 1”, “Đội 2”…)</span>:</div><div id="lv-tnames" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px">${LV.namesHtml()}</div></div>`;
    LV.setNT = v => { LV.nT = Math.max(2, Math.min(12, parseInt(v) || 4)); const i = $('lv-nt'); if (i) i.value = LV.nT; const d = $('lv-tnames'); if (d) d.innerHTML = LV.namesHtml(); };
    LV.chanBadgeHtml = () => {
        const lbl = LV.gas ? '📊 Kênh Live: Google Sheets (Dự phòng)' : (LV.fb ? '⚡ Kênh Live: Firebase (Tức thì)' : '⚡ Kênh Live: PeerJS (Tức thì)');
        const bg = LV.gas ? '#e0f2fe;color:#0369a1;border:1.5px solid #7dd3fc' : '#ecfdf5;color:#047857;border:1.5px solid #6ee7b7';
        const note = (LV.gas && LV._fallbackReason) ? `<div style="font-size:12px;font-weight:700;color:#0369a1;margin:-4px 0 8px">(${E(LV._fallbackReason)})</div>` : '';
        return `<div style="display:inline-block;margin-bottom:8px;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:900;background:${bg}">${lbl}</div>${note}`;
    };
    const gasLiveParam = () => {
        if (!LV.gas) return '';
        try { return '&tr=gas&gu=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ urls: LV.gas.urls || [], key: LV.gas.key || '' }))))); } catch (e) { return '&tr=gas'; }
    };
    const fbLiveParam = () => '&tr=fb&cl=' + encodeURIComponent(CloudSync.tokenFor ? CloudSync.tokenFor(LV.fb) : CloudSync.liveToken());
    LV.link = () => location.origin + location.pathname + '?live=' + LV.pid + (LV.fb ? fbLiveParam() : gasLiveParam()) + '&v=' + VER;
    LV.url = i => location.origin + location.pathname + '?live=' + LV.pid + (LV.fb ? fbLiveParam() : gasLiveParam()) + '&team=' + i + '&tn=' + encodeURIComponent(LV.teams[i].name) + '&v=' + VER;
    LV.lobbyTeamHtml = () => {
        const cards = LV.teams.map((t, i) => { const c = TC[i % TC.length]; return `<div class="lv-tq" style="border-color:${c}"><h4 style="background:${c}">👥 ${E(t.name)}</h4><div class="lv-qb" onclick="LV.qrBig(${i})" title="Bấm để phóng to">${qrScal(LV.url(i))}</div><div style="padding:0 8px 10px"><button class="lv-b" style="background:${c};width:100%;margin-bottom:6px" onclick="LV.qrBig(${i})">🔍 PHÓNG TO MÃ QR</button><div style="font-weight:900">Đã vào: <span id="lv-tn${i}">0</span> học sinh</div><div id="lv-tl${i}" class="lv-mem"></div><button class="lv-b s" style="padding:4px 10px;margin-top:6px;font-size:13px" onclick="LV.cp(${i})">📋 Sao chép liên kết</button></div></div>`; }).join('');
        return `<div class="lv-c" style="text-align:center">${LV.chanBadgeHtml()}<div style="font-weight:900;font-size:22px">Học sinh quét mã QR của ĐỘI MÌNH để vào chơi</div><div style="font-weight:600;color:#475569;margin-top:2px">Bấm vào mã QR (hoặc nút “Phóng to”) để chiếu lên màn hình lớn cho cả lớp quét.</div>${location.protocol === 'file:' ? '<p style="color:#dc2626;font-weight:900">⚠ Cần mở app từ địa chỉ web (GitHub Pages) thì học sinh mới vào được.</p>' : ''}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:12px;align-items:start">${cards}</div></div>
        <div class="lv-c" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div style="font-weight:900;font-size:18px">👥 Tổng số học sinh đã vào: <span id="lv-n">0</span></div><button class="lv-b g" style="font-size:18px" onclick="LV.start()">▶ BẮT ĐẦU</button></div>`;
    };
    LV.flash = t => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9700;background:#059669;color:#fff;padding:10px 18px;border-radius:14px;font-weight:900;box-shadow:0 8px 24px #0004'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); };
    LV.cp = i => { const u = LV.url(i); try { navigator.clipboard.writeText(u).then(() => LV.flash('✅ Đã sao chép liên kết ' + LV.teams[i].name)); } catch (e) { prompt('Sao chép liên kết:', u); } };
    /* Phóng to mã QR của một đội (chiếu lên màn hình lớn); ◀ ▶ chuyển đội, Esc / bấm nền để đóng */
    LV.qrBig = function (i) {
        const n = LV.teams.length; i = (i + n) % n; const c = TC[i % TC.length], old = $('lv-qb'); if (old) old.remove();
        const d = document.createElement('div'); d.id = 'lv-qb'; d.setAttribute('data-i', i);
        d.style.cssText = 'position:fixed;inset:0;z-index:9400;background:rgba(15,23,42,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;gap:12px;cursor:zoom-out';
        d.onclick = () => d.remove();
        d.innerHTML = `<div style="color:#fff;font-weight:900;font-size:clamp(24px,4.5vw,48px);text-align:center;word-break:break-word"><span style="display:inline-block;width:.6em;height:.6em;border-radius:50%;background:${c};margin-right:.3em"></span>${E(LV.teams[i].name)}</div><div style="background:#fff;padding:14px;border-radius:22px;border:10px solid ${c};width:min(92vw,calc(100vh - 230px),820px);cursor:default" onclick="event.stopPropagation()">${qrScal(LV.url(i))}</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center" onclick="event.stopPropagation()"><button class="lv-b s" onclick="LV.qrBig(${i - 1})">◀ Đội trước</button><button class="lv-b r" onclick="document.getElementById('lv-qb').remove()">✕ ĐÓNG</button><button class="lv-b s" onclick="LV.qrBig(${i + 1})">Đội sau ▶</button></div>`;
        document.body.appendChild(d);
    };
    document.addEventListener('keydown', e => {
        const d = $('lv-qb'); if (!d) return; const i = Number(d.getAttribute('data-i')) || 0;
        if (e.key === 'Escape') d.remove(); else if (e.key === 'ArrowRight') LV.qrBig(i + 1); else if (e.key === 'ArrowLeft') LV.qrBig(i - 1);
    });
    const teamRankHtml = () => {
        const r = LV.trank(), q = LV.qs[LV.qi], med = ['🥇', '🥈', '🥉'];
        const rows = r.map(t => {
            const rk = t.n ? LV.trkOf(t.i) : '—', c = TC[t.i % TC.length];
            const ansd = !LV.rev && q ? t.m.filter(x => hasAns(x.answers[q.id])).length : null;
            const mem = t.m.slice().sort((a, b) => b.sc - a.sc).map(x => `${E(x.name)} <b>${fm(x.sc)}</b>`).join(' • ');
            return `<div style="padding:8px 12px;border-radius:12px;background:${c}1f;border-left:8px solid ${c};margin:6px 0"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:900;font-size:18px"><span>${t.n && rk <= 3 ? med[rk - 1] : ''} Hạng ${rk} — ${E(t.name)} <small style="font-weight:700;color:#475569">(${t.n} học sinh${ansd !== null ? ' • ✍ ' + ansd + '/' + t.n : ''})</small></span><span style="font-size:24px">${t.n ? fm(t.avg) : '—'}</span></div><div style="height:8px;border-radius:6px;background:#e2e8f0;margin:6px 0"><div style="height:8px;border-radius:6px;background:${c};width:${Math.min(100, t.avg * 10)}%"></div></div><div style="font-size:13px;color:#475569">${mem || '<i>Chưa có thành viên</i>'}</div></div>`;
        }).join('');
        return `<div class="lv-c"><b style="color:#7c3aed;font-size:19px">🏆 Thứ tự các đội/nhóm</b> <small style="color:#475569">(điểm trung bình của các thành viên, cao → thấp; bằng điểm: trả lời đúng nhanh hơn xếp trước)</small>${rows}</div>`;
    };
    const teamTable = () => `<div style="margin-bottom:12px"><b style="font-size:20px;color:#7c3aed">👥 XẾP HẠNG ĐỘI/NHÓM <small style="font-weight:600;color:#475569">(điểm trung bình các thành viên, cao → thấp)</small></b><div style="overflow-x:auto;margin-top:6px"><table class="lv-tb"><tr><th>Hạng</th><th>Đội/nhóm</th><th>Số học sinh</th><th>Điểm TB</th><th>Thành viên (điểm)</th></tr>${LV.trank().map(t => `<tr><td><b>${t.n ? LV.trkOf(t.i) : '—'}</b></td><td><b style="color:${TC[t.i % TC.length]}">${E(t.name)}</b></td><td>${t.n}</td><td><b>${t.n ? fm(t.avg) : '—'}</b></td><td style="text-align:left;white-space:normal">${t.m.slice().sort((a, b) => b.sc - a.sc).map(x => E(x.name) + ' (' + fm(x.sc) + ')').join(', ') || '—'}</td></tr>`).join('')}</table></div></div>`;
    const rank = () => all().sort((a, b) => b.sc - a.sc || (a.at || 0) - (b.at || 0));
    const rankHtml = () => {
        const r = all().slice().sort((a, b) => b.sc - a.sc || tkey(a) - tkey(b)), n = r.length, rk = rankOf;
        const top = r.slice(0, 3), bot = r.slice(3).slice(-3).reverse(), med = ['🥇', '🥈', '🥉'];
        const li = (arr, c, m) => arr.map(s => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 10px;border-radius:10px;background:${c};margin:4px 0;font-weight:800"><span>${m ? med[rk(s) - 1] || '' : ''} Hạng ${rk(s)} — ${E(s.name)}</span><span>${fm(s.sc)} <small style="font-weight:600;color:#475569">⏱ ${(tkey(s) / 1000).toFixed(1)}s</small></span></div>`).join('') || '<i>—</i>';
        return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px"><div class="lv-c"><b style="color:#059669">🏆 3 học sinh cao nhất (${n} học sinh)</b> <small style="color:#475569">(bằng điểm: chọn đúng nhanh hơn xếp trước)</small>${li(top, '#d1fae5', true)}</div><div class="lv-c"><b style="color:#dc2626">⚠ 3 học sinh thấp nhất</b>${li(bot, '#fee2e2', false)}</div></div>`;
    };
    const vioHtml = () => {
        if (!LV.guard || !LV.guard.on) return '';
        const v = all().filter(s => s.vio).sort((a, b) => b.vio - a.vio);
        return `<div class="lv-c"><b style="color:#b45309">🛡 Giám sát màn hình: ${v.length} học sinh vi phạm</b>${v.map(s => `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 10px;margin:4px 0;border-radius:10px;background:#fef3c7;font-weight:700"><span>${E(s.name)}</span><span>⚠ ${s.vio} lần — ${E((s.vlog.slice(-1)[0] || {}).k || '')}</span></div>`).join('') || '<div style="color:#64748b;margin-top:4px">Chưa phát hiện vi phạm.</div>'}</div>`;
    };
    LV.upd = function () {
        const n = all().length;
        if (LV.phase === 'lobby') {
            if ($('lv-n')) $('lv-n').textContent = n;
            if (LV.team) LV.teams.forEach((t, i) => {
                const m = all().filter(x => x.team === i), c = TC[i % TC.length];
                if ($('lv-tn' + i)) $('lv-tn' + i).textContent = m.length;
                if ($('lv-tl' + i)) $('lv-tl' + i).innerHTML = m.map(x => `<span style="background:${x.on ? c + '26' : '#fee2e2'};color:#0f172a">${E(x.name)}</span>`).join('');
            });
            if ($('lv-ls')) $('lv-ls').innerHTML = all().map(s => `<span class="lv-t" style="background:${s.on ? '#d1fae5' : '#fee2e2'}">${E(s.name)}</span>`).join('');
            return;
        }
        const d = $('lv-run'); if (!d || LV.phase !== 'run') return;
        const focusCls = LV.focusQ ? ' focus-question' : '';
        if (LV.mode === 'pace') {
            const rem = Math.max(0, LV.endAt - Date.now()), r = rank(), top = r.slice(0, 5), bot = r.slice(5).slice(-5).reverse();
            const li = (arr, c) => arr.map((s, i) => `<div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:10px;background:${c};margin:4px 0;font-weight:800"><span>${E(s.name)}</span><span>${fm(s.sc)}</span></div>`).join('') || '<i>—</i>';
            d.innerHTML = `<div class="lv-3col${focusCls}">
                <aside class="lv-col-ctrl">
                    <div class="lv-c">
                        <div class="lv-stat-mini"><span class="lbl">⏳ Còn lại</span><span class="val">${Math.floor(rem / 60000)}:${String(Math.floor(rem / 1000) % 60).padStart(2, '0')}</span></div>
                        <div class="lv-stat-mini"><span class="lbl">📨 Đã nộp</span><span class="val">${all().filter(s => s.done).length}/${n}</span></div>
                        <button class="lv-b r" style="width:100%;margin-top:6px" onclick="LV.finish()">KẾT THÚC SỚM</button>
                    </div>
                    ${vioHtml()}
                </aside>
                <main class="lv-col-stage"><div class="lv-c"><b style="color:#059669;font-size:18px">🏆 5 học sinh điểm cao nhất</b>${li(top, '#d1fae5')}</div></main>
                <aside class="lv-col-stat"><div class="lv-c"><b style="color:#dc2626;font-size:16px">⚠ 5 học sinh cần chú ý</b>${li(bot, '#fee2e2')}</div></aside>
            </div>`;
        } else {
            const q = LV.qs[LV.qi], g = all().map(s => grade(q, s.answers[q.id])), ans = g.filter(x => x.a).length, okc = g.filter(x => x.ok).length;
            const rem = LV.qEnd ? Math.max(0, Math.ceil((LV.qEnd - Date.now()) / 1000)) : '∞';
            const pct = n ? Math.round(ans / n * 100) : 0;
            let stat = `<div class="lv-c"><div style="font-weight:900;font-size:14px;color:#1e3a8a;margin-bottom:6px">📊 Tiến độ trả lời</div><div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:4px"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#2563eb,#059669)"></div></div><div style="font-size:12px;font-weight:700;color:#475569">${ans}/${n} học sinh (${pct}%)</div>`;
            if (LV.rev) {
                stat += `<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1"><b style="font-size:14px;color:#059669">✅ Đúng: ${okc}/${n} (${n ? Math.round(okc / n * 100) : 0}%)</b>`;
                if (qType(q) === 'mc') stat += (q.options || []).map(o => { const c = all().filter(s => (s.answers[q.id] || {}).sel === o.letter).length; return `<div style="display:flex;align-items:center;gap:6px;margin:4px 0"><b style="width:18px">${o.letter}</b><div style="flex:1;background:#e2e8f0;border-radius:6px"><div style="width:${n ? c / n * 100 : 0}%;background:${o.letter === q.correct ? '#059669' : '#dc2626'};border-radius:6px;color:#fff;padding:1px 6px;min-width:20px;font-size:12px">${c}</div></div></div>`; }).join('');
                stat += '</div>';
            }
            stat += '</div>';
            d.innerHTML = `<div class="lv-3col${focusCls}">
                <aside class="lv-col-ctrl">
                    <div class="lv-c">
                        <div class="lv-stat-mini"><span class="lbl">⏱ Còn lại</span><span class="val">${rem}</span></div>
                        <div class="lv-stat-mini"><span class="lbl">📌 Câu</span><span class="val">${LV.qi + 1}/${LV.qs.length}</span></div>
                        <div class="lv-stat-mini"><span class="lbl">✍ Trả lời</span><span class="val">${ans}/${n}</span></div>
                        <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
                            ${LV.rev ? `<button class="lv-b g" style="width:100%" onclick="LV.next()">${LV.qi < LV.qs.length - 1 ? 'CÂU TIẾP ▶' : '🏁 KẾT QUẢ'}</button>` : '<button class="lv-b" style="width:100%" onclick="LV.reveal()">👁 HIỆN ĐÁP ÁN</button>'}
                            <button class="lv-b s" style="width:100%" onclick="LV.finish()">🏁 Kết thúc</button>
                        </div>
                    </div>
                    ${vioHtml()}
                </aside>
                <main class="lv-col-stage"><div class="lv-pane" style="margin-top:0"><div class="qc-live">${partHd(qType(q))}${card(q, null, LV.rev ? keyOf(q) : null, null, false, { nm: LV.nm, single: true }, { noSol: true, teacher: true })}</div></div></main>
                <aside class="lv-col-stat">${stat}${LV.team ? teamRankHtml() : (LV.rev ? rankHtml() : '')}</aside>
            </div>`;
        }
    };
    const tm = ms => { const t = Math.round((ms || 0) / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
    const sorted = () => { const r = all().sort((x, y) => (x.sc - y.sc) || (tkey(y) - tkey(x))); return LV.desc ? r.reverse() : r; };
    LV.fx = function (i) {
        try {
            const ac = LV.ac || (LV.ac = new (window.AudioContext || window.webkitAudioContext)()); ac.resume && ac.resume();
            const notes = i === 0 ? [523, 659, 784, 1047, 1319] : i === 1 ? [523, 659, 784, 1047] : [523, 659, 784];
            notes.forEach((f, k) => { const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + k * .15; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.25, t0 + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + .5); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + .55); });
        } catch (e) { }
        try {
            const end = Date.now() + (i === 0 ? 3500 : 1500), n = i === 0 ? 40 : 20;
            confetti({ particleCount: i === 0 ? 220 : 110, spread: 100, origin: { x: .5, y: .5 }, zIndex: 9500 });
            (function f() { confetti({ particleCount: n, angle: 60, spread: 70, origin: { x: 0, y: .7 }, zIndex: 9500 }); confetti({ particleCount: n, angle: 120, spread: 70, origin: { x: 1, y: .7 }, zIndex: 9500 }); if (Date.now() < end) setTimeout(f, 250); })();
        } catch (e) { }
    };
    LV.podium = function () {
        (LV.pt || []).forEach(clearTimeout); LV.pt = []; LV.view = 'podium';
        const d = $('lv-res'); if (!d) return;
        const top = LV.team ? LV.trank().filter(t => t.n > 0).slice(0, 3).map(t => ({ name: t.name, sc: t.avg, note: '👥 ' + t.n + ' học sinh • điểm trung bình' })) : all().sort((x, y) => (y.sc - x.sc) || ((x.at || 0) - (y.at || 0))).slice(0, 3).map(x => ({ name: x.name, sc: x.sc, note: '⏱ ' + tm(x.at) }));
        const cfg = [{ i: 1, h: 150, c: '#94a3b8', m: '🥈' }, { i: 0, h: 210, c: '#f59e0b', m: '🥇' }, { i: 2, h: 110, c: '#c2763d', m: '🥉' }];
        d.innerHTML = `<div class="lv-c" style="text-align:center;background:linear-gradient(#1e1b4b,#4c1d95);color:#fff;border:0"><div style="font-size:30px;font-weight:900">🏆 BỤC VINH DANH ${LV.team ? 'ĐỘI/NHÓM ' : ''}🏆</div>
        <div style="display:flex;justify-content:center;align-items:flex-end;gap:10px;margin:20px 0;min-height:340px">${cfg.map(c => { const s = top[c.i]; if (!s) return '<div style="flex:1;max-width:220px"></div>'; return `<div id="pd${c.i}" style="flex:1;max-width:220px;opacity:0;transform:translateY(40px);transition:all .8s"><div style="font-size:44px">${c.m}</div><div style="font-weight:900;font-size:20px;word-break:break-word">${E(s.name)}</div><div style="font-weight:900;font-size:24px;color:#fde68a">${fm(s.sc)} điểm</div><div style="font-size:14px;opacity:.8">${s.note}</div><div style="height:${c.h}px;background:${c.c};border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:900;margin-top:6px">${c.i + 1}</div></div>`; }).join('')}</div>
        <button class="lv-b g" style="font-size:18px" onclick="LV.result()">📊 XEM BẢNG KẾT QUẢ ▶</button></div>`;
        [[2, 400], [1, 3000], [0, 5600]].forEach(([i, t]) => LV.pt.push(setTimeout(() => { const e = $('pd' + i); if (!e) return; e.style.opacity = 1; e.style.transform = 'none'; LV.fx(i); }, t)));
    };
    LV.flip = () => { LV.desc = !LV.desc; LV.result(); };
    LV.result = function () {
        (LV.pt || []).forEach(clearTimeout); LV.view = 'table';
        const r = sorted(), d = $('lv-res'); if (!d) return;
        const avg = r.length ? Math.round(r.reduce((a, s) => a + s.sc, 0) / r.length * 100) / 100 : 0;
        d.innerHTML = `<div class="lv-c"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px"><b style="font-size:22px">📊 BẢNG KẾT QUẢ (${r.length} học sinh)</b><div style="display:flex;gap:6px"><button class="lv-b" style="background:#f59e0b" onclick="LV.podium()">🏆 Bục vinh danh</button><button class="lv-b s" onclick="LV.flip()">⇅ Đang xếp: ${LV.desc ? 'điểm cao → thấp' : 'điểm thấp → cao'}</button><button class="lv-b g" onclick="LV.xl()">⬇ Xuất Excel</button></div></div>
        <div style="padding:10px 14px;border-radius:12px;background:#ede9fe;font-weight:900;font-size:19px;margin-bottom:8px">⭐ Điểm trung bình cả lớp: ${fm(avg)}</div>${LV.team ? teamTable() : ''}
        <div style="overflow-x:auto"><table class="lv-tb"><tr><th>Hạng</th><th>Họ và tên</th>${LV.team ? '<th>Đội</th>' : ''}<th>Điểm</th><th>Câu đúng</th><th>Câu sai</th><th>Bỏ trống</th><th>Thời gian nộp</th>${LV.guard && LV.guard.on ? '<th>Vi phạm</th>' : ''}<th>Chi tiết</th></tr>${r.map((s, i) => `<tr><td>${rankOf(s)}</td><td><b>${E(s.name)}</b></td>${LV.team ? `<td style="font-weight:700;color:${TC[s.team % TC.length]}">${E((LV.teams[s.team] || {}).name || '')}</td>` : ''}<td><b>${fm(s.sc)}</b></td><td style="color:#059669">${s.ok}</td><td style="color:#dc2626">${s.wr}</td><td>${s.bl}</td><td>${tm(s.at)}</td>${LV.guard && LV.guard.on ? `<td style="font-weight:900;color:${s.vio ? '#dc2626' : '#64748b'}" title="${E((s.vlog || []).map(x => tm(x.at) + ' ' + x.k + (x.sec ? ' (' + x.sec + 's)' : '')).join('; '))}">${s.vio ? '⚠ ' + s.vio : '—'}</td>` : ''}<td><button class="lv-b" style="padding:4px 10px" onclick="LV.detail('${s.cid}')">🔍 Xem bài làm</button></td></tr>`).join('')}</table></div></div>`;
    };
    LV.detail = function (cid) {
        const s = LV.st[cid]; if (!s) return;
        const d = layer('lv-d', `<div class="lv-hd"><div style="font-size:20px;font-weight:900">👤 ${E(s.name)}${LV.team && LV.teams[s.team] ? ' (' + E(LV.teams[s.team].name) + ')' : ''} — ${fm(s.sc)} điểm</div><button class="lv-b" style="background:#ffffff33" onclick="document.getElementById('lv-d').remove()">✕</button></div><div class="lv-w"><div class="lv-c" style="font-weight:900;font-size:18px"><span style="color:#059669">✔ Đúng: ${s.ok}</span> &nbsp; <span style="color:#dc2626">✘ Sai: ${s.wr}</span> &nbsp; <span style="color:#64748b">○ Bỏ trống: ${s.bl}</span> &nbsp; ⏱ ${tm(s.at)}</div>${(s.vlog || []).length ? `<div class="lv-c" style="background:#fef3c7"><b style="color:#b45309">🛡 Vi phạm giám sát (${s.vio}):</b>${s.vlog.map(x => `<div>• ${tm(x.at)} — ${E(x.k)}${x.sec ? ' (' + x.sec + ' giây)' : ''}</div>`).join('')}</div>` : ''}<div class="lv-pane" style="margin-top:0">${listHtml(LV.qs, s.answers, LV.keysFor(s), null, false, { noSol: true, teacher: true })}</div></div>`);
        d.style.zIndex = 9100;
    };
    LV.xl = function () {
        const T = !!LV.team;
        const rows = [['STT', 'Họ và tên'].concat(T ? ['Đội'] : [], ['Điểm', 'Câu đúng', 'Câu sai', 'Bỏ trống', 'Thời gian nộp', 'Vi phạm'])].concat(sorted().map(s => [rankOf(s), s.name].concat(T ? [(LV.teams[s.team] || {}).name || ''] : [], [s.sc, s.ok, s.wr, s.bl, tm(s.at), s.vio || 0])));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'KetQua');
        if (T) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Hạng', 'Đội/nhóm', 'Số học sinh', 'Điểm trung bình']].concat(LV.trank().map(t => [t.n ? LV.trkOf(t.i) : '', t.name, t.n, t.n ? t.avg : '']))), 'XepHangDoi');
        XLSX.writeFile(wb, 'KetQua_ChoiTrucTiep.xlsx');
    };
    window.addEventListener('beforeunload', e => { if (LV.phase === 'lobby' || LV.phase === 'run') { e.preventDefault(); e.returnValue = ''; } });

    /* ======================= HỌC SINH ======================= */
    const LS = window.LS = { a: {} };
    window.liveBootIfNeeded = function () {
        const p = new URLSearchParams(location.search).get('live'); if (!p) return false;
        const l = $('login-modal'); if (l) l.classList.add('hidden');
        document.body.classList.add('live-student'); LS.host = p; {
        const _tr = new URLSearchParams(location.search);
        const _trMode = _tr.get('tr');
        LS.tr = _trMode === 'fb';
        LS.trGas = _trMode === 'gas';
        try { LS.cfg = LS.tr && window.CloudSync && CloudSync.parseToken ? CloudSync.parseToken(_tr.get('cl')) : null; } catch (e) { LS.cfg = null; }
        try {
            const gu = _tr.get('gu');
            if (LS.trGas && gu) LS.gasCfg = JSON.parse(decodeURIComponent(escape(atob(gu))));
            else if (LS.trGas && window.GasBridge) LS.gasCfg = GasBridge.getConfig();
            else LS.gasCfg = null;
        } catch (e) { LS.gasCfg = (window.GasBridge ? GasBridge.getConfig() : null); }
    } { const tp = new URLSearchParams(location.search).get('team'); LS.team = tp !== null && /^\d{1,2}$/.test(tp) ? parseInt(tp, 10) : null; LS.tname = LS.team !== null ? String(new URLSearchParams(location.search).get('tn') || '').slice(0, 30) : ''; LS.tidx = LS.team || 0; } LS.cid = sessionStorage.lscid || (sessionStorage.lscid = rid(10)); LS.joinUI(sessionStorage.lsname || ''); return true;
    };
    const hdrF = () => '<div class="lv-sh"><div class="lv-sh-in"><div class="lv-sh-t">🎮 ' + E(LS.title || 'CHƠI TRỰC TIẾP') + (LS.tname ? ' <span class="lv-tag" style="background:' + TC[(LS.tidx || 0) % TC.length] + '">👥 ' + E(LS.tname) + '</span>' : '') + '</div><div id="ls-tm"></div></div></div>';
    const msg = (t, sub) => layer('lv-s', hdrF() + `<div class="lv-w" style="text-align:center;padding-top:60px"><div style="font-size:26px;font-weight:900">${t}</div><div style="margin-top:8px;font-weight:600;color:#475569">${sub || ''}</div></div>`);
    LS.joinUI = function (nm) {
        layer('lv-s', hdrF() + `<div class="lv-w"><div class="lv-c" style="margin-top:40px"><div style="font-size:22px;font-weight:900;margin-bottom:10px">Nhập họ và tên để vào chơi</div>${LS.team != null ? '<div style="margin:-2px 0 10px;font-weight:900;font-size:20px;color:' + TC[LS.team % TC.length] + '">👥 Em vào đội: ' + E(LS.tname || ('ĐỘI SỐ ' + (LS.team + 1))) + '</div>' : ''}<input id="ls-name" class="lv-i" maxlength="40" value="${E(nm)}" placeholder="Họ và tên..." onkeydown="if(event.key==='Enter')LS.join()"><button class="lv-b g" style="margin-top:12px;font-size:18px" onclick="LS.join()">VÀO CHƠI</button></div></div>`);
    };
    LS.join = function () {
        const n = ($('ls-name').value || '').trim(); if (!n) { $('ls-name').focus(); return; }
        LS.name = n; sessionStorage.lsname = n; LS.connect();
    };
    LS.connect = function () {
        msg('Đang kết nối...', 'Vui lòng đợi trong giây lát');
        try { LS.peer && LS.peer.destroy(); } catch (e) { }
        clearTimeout(LS.to); LS.to = setTimeout(() => { if (!LS.ok) { msg('Không kết nối được', 'Kiểm tra mạng hoặc nhờ giáo viên kiểm tra phòng còn mở không.<br><br><button class="lv-b" onclick="LS.connect()">Thử lại</button>'); } }, 15000);
        LS.ok = false; LS.peer = (LS.trGas && LS.gasCfg) ? new GasStudent(LS.gasCfg) : ((LS.tr && LS.cfg) ? new FbStudent(LS.cfg) : new Peer(undefined, PEER_OPTS));
        LS.peer.on('open', () => {
            const c = LS.conn = LS.peer.connect(LS.host, { reliable: true });
            c.on('open', () => { LS.ok = true; LS.retry = 0; clearTimeout(LS.to); c.send({ t: 'join', cid: LS.cid, name: LS.name, team: LS.team }); });
            c.on('data', LS.msg);
            c.on('close', () => { if (!LS.fin) { LS.ok = false; msg('Mất kết nối', 'Đang kết nối lại...'); setTimeout(() => { if (!LS.fin) LS.connect(); }, 2000); } });
        });
        LS.peer.on('error', e => {   // [CODE170] báo đúng nguyên nhân + tự thử lại thay vì im lặng
            const t = e && e.type;
            if (t === 'peer-unavailable') { clearTimeout(LS.to); msg('Phòng chơi không còn mở', 'Em nhờ giáo viên kiểm tra lại phòng, rồi bấm Thử lại.<br><br><button class="lv-b" onclick="LS.connect()">Thử lại</button>'); return; }
            if (!LS.ok && !LS.fin) { LS.retry = (LS.retry || 0) + 1; if (LS.retry <= 4) setTimeout(() => { if (!LS.ok && !LS.fin) LS.connect(); }, 1500 * LS.retry); else { clearTimeout(LS.to); msg('Không kết nối được', 'Lỗi: ' + E(t || 'mạng') + '. Em kiểm tra Wi-Fi/4G rồi bấm Thử lại.<br><br><button class="lv-b" onclick="LS.retry=0;LS.connect()">Thử lại</button>'); } }
        });
    };
    const tick = () => { const e = $('ls-tm'); if (!e || !LS.endAt) { if (e) e.textContent = ''; return; } const r = Math.max(0, LS.endAt - Date.now()); const tt = '⏳ ' + Math.floor(r / 60000) + ':' + String(Math.floor(r / 1000) % 60).padStart(2, '0'); if (e.textContent !== tt) e.textContent = tt; if (r <= 0 && LS.mode === 'pace' && !LS.sub) LS.submit(true); };
    setInterval(tick, 500);
    function shufQ(qs) {
        if (window.CODE121EN && qs.some(q => q.gm)) {   // [CODE121] đề English
            const sh = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
            return [].concat(...['mc', 'tf', 'sa'].map(t => CODE121EN.shuffleList(qs.filter(q => q.type === t), sh)));
        }
        const by = { mc: [], tf: [], sa: [] }, g = {};
        qs.forEach(q => { if (q.gid) { if (!g[q.gid]) { g[q.gid] = []; by[q.type].push(g[q.gid]); } g[q.gid].push(q); } else by[q.type].push([q]); });
        return [].concat(...['mc', 'tf', 'sa'].map(t => { const a = by[t]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return [].concat(...a); }));
    }
    LS.msg = function (m) {
        if (m.t === 'hi' && m.ver && m.ver !== VER) {
            if (sessionStorage.lsrel !== m.ver) { sessionStorage.lsrel = m.ver; LS.fin = true; { const q = new URLSearchParams(location.search); q.set('v', m.ver); q.set('r', Date.now()); location.replace(location.pathname + '?' + q.toString()); } return; }
            LS.toast('⚠ Phiên bản app của em khác với giáo viên. Hãy tải lại trang hoặc xóa bộ nhớ đệm trình duyệt.');
        }
        if (m.t === 'hi') { if (m.title) LS.title = m.title; LS.mode = m.mode; LS.guard = m.guard; LS.tname = m.tname || ''; LS.tidx = m.team || 0; if (!LS.started) msg('✅ Đã vào phòng: ' + E(LS.name) + (LS.tname ? ' — 👥 ' + E(LS.tname) : ''), 'Đang chờ giáo viên bấm BẮT ĐẦU...' + (true ? '<div style="margin:16px auto;max-width:520px;padding:12px;border-radius:12px;background:#fef3c7;color:#92400e;font-weight:900;text-align:justify;text-justify:inter-word">⚠ LƯU Ý: Mỗi câu hỏi em chỉ được chọn đáp án 1 LẦN, không được chọn lại lần 2. Hãy suy nghĩ kĩ trước khi chọn!</div>' : '') + (m.guard && m.guard.on ? '<div style="margin:10px auto;max-width:520px;padding:12px;border-radius:12px;background:#fee2e2;color:#991b1b;font-weight:900;text-align:justify;text-justify:inter-word">🛡 Bài thi có giám sát màn hình: chuyển tab, thu nhỏ trình duyệt, sao chép - dán, chuột phải, in/chụp màn hình sẽ bị ghi nhận và báo cho giáo viên' + (m.guard.max && m.mode === 'pace' ? '. Vi phạm ' + m.guard.max + ' lần sẽ bị tự động nộp bài' : '') + '.' + (document.documentElement.requestFullscreen ? '<br><br><button class="lv-b" onclick="LS.fs()">⛶ Bật toàn màn hình</button>' : '') + '</div>' : '')); }
        else if (m.t === 'pick') { if (m.title) LS.title = m.title; LS.pickUI(m.teams || []); }
        else if (m.t === 'cd') { try { LV.audio(); } catch (e) { } window.lvCountdown(m.n || 3, null); }
        else if (m.t === 'late') { LS.fin = true; msg('Buổi chơi đã bắt đầu', 'Em không thể vào thêm lúc này.'); }
        else if (m.t === 'start') {
            { const c = document.getElementById('lv-cd'); if (c && c._stop) c._stop(); }
            LS.started = true; LS.sub = false; LS.mode = 'pace'; LS.guard = m.guard; if (m.vio != null) LS.vio = Math.max(LS.vio, m.vio); LS.a = m.answers || {}; LS.endAt = Date.now() + m.remain;
            if (!LS.qs) LS.qs = m.shuf ? shufQ(m.qs) : m.qs;
            LS.nm = numMap(LS.qs);
            LS.paceUI();
        }
        else if (m.t === 'q') { { const c = document.getElementById('lv-cd'); if (c && c._stop) c._stop(); } LS.started = true; LS.mode = 'sync'; LS.guard = m.guard; if (m.vio != null) LS.vio = Math.max(LS.vio, m.vio); LS.q = m.q; LS.i = m.i; LS.n = m.n; LS.rv = null; LS.a1 = m.a || null; LS.tmp = {}; LS.autoSa = false; LS.endAt = m.remain ? Date.now() + m.remain : 0; LS.syncUI(); }
        else if (m.t === 'rev') { LS.rv = m; LS.endAt = 0; LS.syncUI(); }
        else if (m.t === 'end') { LS.fin = true; LS.endAt = 0; LS.endUI(m); }
    };
    LS.pickUI = function (teams) {
        layer('lv-s', hdrF() + `<div class="lv-w"><div class="lv-c" style="margin-top:30px"><div style="font-size:22px;font-weight:900;margin-bottom:10px">Em thuộc đội nào? Hãy chọn đội của mình:</div>${teams.map((n, i) => `<button class="lv-b" style="display:block;width:100%;margin:8px 0;font-size:18px;background:${TC[i % TC.length]}" onclick="LS.chooseTeam(${i})">👥 ${E(n)}</button>`).join('')}</div></div>`);
    };
    LS.chooseTeam = i => { LS.team = i; LS.send({ t: 'join', cid: LS.cid, name: LS.name, team: i }); };
    LS.act = () => !!(LS.guard && LS.guard.on && LS.started && !LS.fin && !LS.sub);
    LS.toast = function (t) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9800;background:#dc2626;color:#fff;padding:12px 18px;border-radius:14px;font-weight:900;max-width:92%;text-align:center;box-shadow:0 8px 24px #0005'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 4500); };
    LS.viol = function (k) {
        if (!LS.act()) return; const now = Date.now(); if (now - (LS.vt || 0) < 1500) return; LS.vt = now;
        LS.vio++; LS.send({ t: 'vio', k }); const e = $('ls-vio'); if (e) e.textContent = LS.vio;
        const g = LS.guard; LS.toast(`⚠ Cảnh báo ${LS.vio}${g.max && LS.mode === 'pace' ? '/' + g.max : ''}: ${k}. Giáo viên đã được thông báo!`);
        if (g.max && LS.vio >= g.max && LS.mode === 'pace') LS.submit(true, 'vio');
    };
    LS.back = function () { if (LS.away) { const sec = Math.round((Date.now() - LS.away) / 1000); LS.away = 0; if (sec >= 1) LS.send({ t: 'vback', sec }); } };
    LS.fs = function () { const e = document.documentElement; try { (e.requestFullscreen || e.webkitRequestFullscreen).call(e); LS.wasFs = true; } catch (x) { } };
    LS.guardBar = function () {
        const g = LS.guard; if (!g || !g.on) return '';
        return `<div style="padding:8px 14px;border-radius:12px;background:#fee2e2;color:#991b1b;font-weight:800;margin-bottom:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:space-between"><span style="flex:1;min-width:200px;text-align:justify;text-justify:inter-word">🛡 Bài thi đang được giám sát: rời khỏi màn hình sẽ bị ghi nhận và báo giáo viên${g.max && LS.mode === 'pace' ? ` (tự nộp bài sau ${g.max} lần)` : ''}. Đã vi phạm: <span id="ls-vio">${LS.vio}</span></span>${document.documentElement.requestFullscreen && !document.fullscreenElement ? '<button class="lv-b s" style="padding:4px 10px" onclick="LS.fs()">⛶ Toàn màn hình</button>' : ''}</div>`;
    };
    const away = () => { if (LS.act()) LS.away = LS.away || Date.now(); LS.viol('Rời khỏi màn hình bài thi'); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) away(); else LS.back(); });
    window.addEventListener('blur', () => {   /* [CODE77] điện thoại: blur do bàn phím -> bỏ qua, đã có visibilitychange */
        if (LS.mute) return;
        let touch = false; try { touch = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ''); } catch (x) { }
        if (touch) return;
        setTimeout(() => { if (!document.hasFocus() && !LS.mute) away(); }, 700);
    });
    window.addEventListener('focus', () => LS.back());
    ['copy', 'cut', 'paste'].forEach(ev => document.addEventListener(ev, e => { if (LS.act()) { e.preventDefault(); LS.viol('Thao tác ' + ({ copy: 'sao chép', cut: 'cắt', paste: 'dán' })[ev]); } }, true));
    document.addEventListener('contextmenu', e => { if (LS.act()) { e.preventDefault(); LS.viol('Mở menu chuột phải'); } }, true);
    document.addEventListener('keydown', e => {
        if (!LS.act()) return; const k = String(e.key).toLowerCase(), c = e.ctrlKey || e.metaKey;
        if (e.key === 'F12' || (c && ['c', 'v', 'x', 'u', 's', 'p'].includes(k)) || (c && e.shiftKey && ['i', 'j', 'c'].includes(k))) { e.preventDefault(); LS.viol('Dùng phím tắt bị cấm'); }
        if (e.key === 'PrintScreen') { LS.viol('Chụp màn hình (PrintScreen)'); try { navigator.clipboard.writeText(''); } catch (x) { } }
    }, true);
    window.addEventListener('beforeprint', () => LS.viol('In trang'));
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && LS.wasFs) { LS.wasFs = false; LS.viol('Thoát chế độ toàn màn hình'); } });
    LS.vio = 0;
    LS.send = m => { try { LS.conn.send(m); } catch (e) { } };
    LS.tmp = {};
    LS.set = function (qid, ua) {
        if (LS.mode === 'sync') { if (LS.rv || (LS.endAt && Date.now() > LS.endAt + 1000)) return; LS.a1 = ua; LS.send({ t: 'ans1', qid, ua }); LS.syncUI(); }
        else { if (LS.sub) return; LS.a[qid] = ua; LS.send({ t: 'ans', answers: LS.a }); LS.refresh(qid); }
    };
    const find = id => (LS.mode === 'sync' ? LS.q : (LS.qs || []).find(q => String(q.id) === String(id)));
    const cur = id => LS.mode === 'sync' ? LS.a1 : LS.a[id];
    LS.pick = (id, L) => { const c = cur(id); if (c && c.sel) return; LS.set(id, { sel: L }); };
    LS.tf = (id, j, v) => {
        const c = cur(id), vals = c && c.values ? c.values.slice() : [null, null, null, null];
        if (vals[j] === true || vals[j] === false) return; vals[j] = v;
        LS.set(id, { values: vals });
    };
    LS.sa = (id, v) => { LS.tmp[id] = v; };
    LS.saOk = id => { const v = String(LS.tmp[id] || '').trim(); const c = cur(id); if (!v || LS.sub || (c && c.locked)) return; LS.set(id, { value: v, locked: true }); };
    LS.refresh = function (id) {
        const q = find(id), el = $('c_' + id); if (!q || !el) return;
        const t = document.createElement('div'); t.innerHTML = card(q, LS.a[id], null, 'LS', true, { nm: LS.nm });
        const nc = t.firstChild, og = el.querySelector('[class*="q-options-"]'), ng = nc.querySelector('[class*="q-options-"]');
        if (og && ng) { ng.className = og.className; ng.setAttribute('data-f', '1'); }
        el.replaceWith(nc); LS.nav();
    };
    LS.nav = function () { const e = $('ls-prog'); if (e) e.textContent = `Đã trả lời ${LS.qs.filter(q => { const g = LS.a[q.id]; return g && (g.sel || (g.values && g.values.some(v => v === true || v === false)) || String(g.value || '').trim()); }).length}/${LS.qs.length} câu`; };
    LS.paceUI = function () {
        layer('lv-s', hdrF() + `<div class="lv-w"><div class="lv-pane" style="margin-bottom:40px"><div style="font-weight:900;font-size:17px;color:#334155;margin-bottom:10px">👤 ${E(LS.name)}</div>${listHtml(LS.qs, LS.a, null, 'LS', true)}<div class="lv-bar"><span id="ls-prog" style="font-size:14px;font-weight:900;color:#475569"></span><button type="button" class="lv-submit" onclick="LS.submit(false)">NỘP BÀI</button></div></div></div>`);
        LS.nav(); tick();
    };
    LS.submit = function (auto, why) {
        if (LS.sub) return;
        if (!auto) { LS.mute = true; const okc = confirm('Em chắc chắn muốn nộp bài?'); setTimeout(() => { LS.mute = false; }, 600); if (!okc) return; }
        Object.keys(LS.tmp).forEach(id => { const v = String(LS.tmp[id] || '').trim(); if (v && !LS.a[id]) LS.a[id] = { value: v, locked: true }; });
        LS.sub = true; LS.send({ t: 'submit', answers: LS.a }); msg(why === 'vio' ? '🚫 Đã tự động nộp bài do rời khỏi màn hình quá số lần cho phép' : auto ? '⏰ Hết giờ — đã tự nộp bài' : '✅ Đã nộp bài', 'Đang chờ kết quả...');
    };
    const WARN1 = '<div style="padding:10px 14px;border-radius:12px;background:#fef3c7;color:#92400e;font-weight:900;margin-bottom:8px;text-align:justify;text-justify:inter-word">⚠ Mỗi câu chỉ được chọn đáp án 1 LẦN duy nhất, không được đổi! Xếp hạng dựa vào điểm và tốc độ chọn đúng.</div>';
    setInterval(() => { if (LS.mode === 'sync' && LS.q && LS.endAt && !LS.rv && !LS.autoSa && Date.now() >= LS.endAt - 200) { LS.autoSa = true; if (LS.q.type === 'sa') LS.saOk(LS.q.id); } }, 300);
    LS.syncUI = function () {
        const old = $('lv-s'), y = old ? old.scrollTop : 0, q = LS.q;
        const k = LS.rv ? Object.assign({}, LS.rv.key, { ok: LS.rv.ok, a: hasAns(LS.a1) }) : null;
        const ctx = { nm: { [q.id]: { t: q.type, num: q.num || (LS.i + 1), g: q.gid ? { first: true, from: q.gf, to: q.gt, info: q.ginfo } : null } }, single: true };
        layer('lv-s', hdrF() + `<div class="lv-w"><div class="lv-pane"><div class="qc-live">${partHd(q.type)}${card(q, LS.a1, k, 'LS', true, ctx, { noSol: true })}</div>
        ${LS.rv ? `<div style="margin-top:12px;padding:12px;border-radius:12px;text-align:center;font-weight:900;font-size:20px;background:${LS.rv.ok ? '#d1fae5' : '#fee2e2'}">${LS.rv.ok ? '🎉 Chính xác!' : '❌ Chưa chính xác'} &nbsp; +${fm(LS.rv.e)} điểm &nbsp;•&nbsp; Tổng: ${fm(LS.rv.sc)}${LS.rv.rk ? ` &nbsp;•&nbsp; 🏅 Hạng ${LS.rv.rk}/${LS.rv.nn}` : ''}${LS.rv.trk ? `<div style="font-size:17px;margin-top:4px;color:#5b21b6">👥 ${E(LS.rv.tn)}: hạng ${LS.rv.trk}/${LS.rv.tnn} • điểm trung bình đội ${fm(LS.rv.tavg)}</div>` : ''}</div><div style="text-align:center;font-weight:600;color:#475569;margin-top:8px">Chờ giáo viên chuyển sang câu tiếp theo...</div>` : ''}</div></div>`);
        $('lv-s').scrollTop = y; tick();
    };
    LS.endUI = function (m) {
        const qs = LS.qs || m.qs || (LS.q ? [LS.q] : []);
        layer('lv-s', hdrF() + `<div class="lv-w"><div class="lv-pane" style="text-align:center"><div style="font-weight:900;font-size:19px;color:#334155">👤 ${E(LS.name)}</div><div style="font-size:84px;font-weight:900;color:#2563eb;line-height:1.1">${fm(m.sc)}<span style="font-size:30px;color:#64748b">/10</span></div><div style="font-weight:900;font-size:18px"><span style="color:#059669">✔ Đúng: ${m.ok}</span> &nbsp; <span style="color:#dc2626">✘ Sai: ${m.wr}</span> &nbsp; <span style="color:#64748b">○ Bỏ trống: ${m.bl}</span></div>${m.rk ? `<div style="font-weight:900;font-size:20px;margin-top:6px;color:#7c3aed">🏅 Xếp hạng: ${m.rk}/${m.nn}</div>` : ''}${m.trk ? `<div style="font-weight:900;font-size:20px;margin-top:6px;color:#7c3aed">👥 ${E(m.tn)}: hạng ${m.trk}/${m.tnn} • điểm trung bình đội ${fm(m.tavg)}</div>` : ''}</div>
        ${qs.length ? `<div class="lv-pane" style="margin-bottom:40px">${listHtml(qs, m.answers || LS.a, m.keys, 'LS')}</div>` : ''}</div>`);
    };
})();

// === [cloudsync-module] ===
/* ======================================================================
   [CODE60] ĐỒNG BỘ ĐÁM MÂY & HỢP NHẤT KẾT QUẢ ĐA THIẾT BỊ TRIỆT ĐỂ
   - Sửa triệt để lỗi: Máy tính báo kết quả tức thì nhưng GitHub báo 0 lượt nộp / "(đề không có trong Thư viện này)".
   - Tự động đối chiếu & gộp kết quả theo Tên chủ đề chuẩn hóa (subtitle + subject + grade) khi mã đề (topic.id) bị lệch giữa Máy tính và GitHub.
   - Tự động đồng bộ đề thi từ cả nhánh s/pub (đề đã giao) về Thư viện Giáo viên trên GitHub.
   - Cho phép trang GitHub đọc ngay đề & kết quả thông qua cấu hình nhúng sẵn (__CLOUD_CONFIG__) ngay cả trước khi nhập mã MQT1.
   - Hiển thị rõ Họ tên học sinh + Lớp + Giờ nộp của các nhánh kết quả khác mã trên máy chủ kèm nút [📥 Gộp vào đề này] chỉ 1 cú nhấp chuột.
   ====================================================================== */
(function () {
    'use strict';
    var LS_CFG = 'matrix_cloud_cfg_v1';
    var LS_STU = 'matrix_cloud_student_cfg_v1';
    var LS_META = 'matrix_cloud_meta_v1';
    var SV = { '.sv': 'timestamp' };
    var DEFAULT_TOPIC = 'topic_default_kim_loai';

    var S = {
        cfg: null,        // { u, t, p }  (giáo viên đầy đủ)
        stu: null,        // { u, p }     (học sinh / cấu hình nhúng trên GitHub)
        meta: null,
        pubTopics: {},    // bộ nhớ đệm đề thi trên s/pub (theo enc(id))
        tTopics: {},      // bộ nhớ đệm đề thi trên t/topics (theo enc(id))
        orphanCache: {},  // bộ nhớ đệm các kết quả khác mã trên máy chủ
        busy: false, again: false, timer: null, poll: null,
        lastOk: 0, lastErr: '', lastInfo: '',
        forcePub: new Set(), installed: false, applying: false, lastPullTs: 0
    };

    /* ---------------- tiện ích ---------------- */
    function $(id) { return document.getElementById(id); }
    var esc = window.LTDUtils.esc;
    function normStr(s) { return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }
    function topicTitleKey(t) { return t ? normStr(t.subtitle || t.topicTitle || t.title || '') : ''; }
    function topicFullKey(t) {
        if (!t) return '';
        var sub = topicTitleKey(t);
        if (!sub) return '';
        return sub + '||' + normStr(t.subject || t.topicSubject || '') + '||' + normStr(t.grade || t.topicGrade || '');
    }
    function hash(str) {
        var h = 0x811c9dc5;
        for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        return (h >>> 0).toString(36) + '.' + str.length.toString(36);
    }
    function enc(k) { return String(k).replace(/[.$#\[\]\/\u0000-\u001f\u007f]/g, '_'); }
    function rnd(n) {
        var a = 'abcdefghijkmnpqrstuvwxyz23456789', out = '';
        try { var b = new Uint8Array(n); crypto.getRandomValues(b); for (var i = 0; i < n; i++) out += a[b[i] % a.length]; }
        catch (e) { for (var j = 0; j < n; j++) out += a[Math.floor(Math.random() * a.length)]; }
        return out;
    }
    function normUrl(u) {
        u = String(u || '').trim().replace(/\.json.*$/i, '').replace(/\/+$/, '');
        if (!u) return '';
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        try { var p = new URL(u); if (p.protocol !== 'https:' && p.protocol !== 'http:') return ''; return p.origin; } catch (e) { return ''; }
    }
    function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
    function b64e(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function b64d(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
    function g(name) {
        try {
            if (typeof window !== 'undefined' && window.LTDLibBridge && typeof window.LTDLibBridge.getVar === 'function') {
                var bv = window.LTDLibBridge.getVar(name);
                if (bv !== undefined) return bv;
            }
        } catch (e0) {}
        try { return (0, eval)(name); } catch (e) { return undefined; }
    }
    function isStu() { return g('isStudentMode') === true; }

    /* ---------------- cấu hình ---------------- */
    function loadCfg() {
        var c = lsGet(LS_CFG);
        S.cfg = (c && c.u && c.t && c.p) ? c : null;
        if (!S.cfg && window.__CLOUD_TEACHER_CONFIG__ && window.__CLOUD_TEACHER_CONFIG__.u && window.__CLOUD_TEACHER_CONFIG__.t && window.__CLOUD_TEACHER_CONFIG__.p) {
            S.cfg = { u: normUrl(window.__CLOUD_TEACHER_CONFIG__.u), t: String(window.__CLOUD_TEACHER_CONFIG__.t), p: String(window.__CLOUD_TEACHER_CONFIG__.p) };
            lsSet(LS_CFG, S.cfg);
        }
        var s = lsGet(LS_STU);
        S.stu = (s && s.u && s.p) ? s : null;
        /* [CODE75] Cấu hình nhúng trong index.html (mới hơn) phải thay được cấu hình CŨ còn lưu trong bộ nhớ trình duyệt,
           nếu không máy học sinh bị kẹt ở kho cũ và không thấy đề/lớp mới. Cấu hình có dấu thời gian (do mở link/QR mới hơn bản build) vẫn được ưu tiên. */
        var ec = window.__CLOUD_CONFIG__;
        if (ec && ec.u && ec.p) {
            var bts = Number(String(window.__PRELOADED_BUILD_ID__ || '').replace(/\D/g, '')) || 0;
            var ecu = normUrl(ec.u), ecp = String(ec.p);
            var same = !!S.stu && ecu === S.stu.u && ecp === S.stu.p;
            if (!S.stu || (!same && (Number(S.stu.ts) || 0) < bts)) {
                S.stu = { u: ecu, p: ecp, ts: bts || Date.now(), src: 'embed' };
                lsSet(LS_STU, S.stu);
            }
        }
        var m = lsGet(LS_META);
        S.meta = (m && typeof m === 'object') ? m : {};
        var id = S.cfg ? hash(S.cfg.u + '|' + S.cfg.t + '|' + S.cfg.p) : (S.stu ? hash(S.stu.u + '|' + S.stu.p) : '');
        var bid = String(window.__PRELOADED_BUILD_ID__ || '');
        if (S.meta.cfgId !== id || S.meta.buildId !== bid) { S.meta = { cfgId: id, buildId: bid }; }
        if (!S.meta.rev) S.meta.rev = {};
    }
    function saveMeta() { lsSet(LS_META, S.meta); }
    function effStu() {
        if (S.cfg) return { u: S.cfg.u, p: S.cfg.p };
        if (S.stu) return S.stu;
        return null;
    }
    function teacherFullReady() { return !!S.cfg && !isStu(); }
    function teacherReady() { return !isStu() && !!(S.cfg || effStu()); }
    function studentReady() { return isStu() && !!effStu(); }
    var LS_FB_POOL = 'matrix_fb_pool_v1';
    var fbPoolCursor = 0;
    function tokenFor(c) {
        if (!c || !c.u || !c.p) return '';
        return 'MQC1.' + b64e(String(c.u).replace(/^https:\/\//, '') + '|' + c.p);
    }
    function token() { return tokenFor(effStu()); }
    function loadFbPoolRaw() {
        var arr = lsGet(LS_FB_POOL, null);
        if (!Array.isArray(arr) && typeof window !== 'undefined' && Array.isArray(window.__FB_POOL__)) arr = window.__FB_POOL__;
        return Array.isArray(arr) ? arr : [];
    }
    function parseFbPoolText(raw) {
        var lines = String(raw || '').split(/[\r\n,;]+/);
        var valid = [], invalid = [], seen = {};
        var pri = effStu();
        if (pri && pri.u && pri.p) seen[pri.u + '|' + pri.p] = true;
        var fallbackP = (pri && pri.p) || '';
        if (!fallbackP) {
            for (var i = 0; i < lines.length; i++) {
                var probe = String(lines[i] || '').trim();
                var po = probe.indexOf('MQT1.') === 0 ? parseFullCode(probe) : (probe.indexOf('MQC1.') === 0 ? parseStuToken(probe) : null);
                if (po && po.p) { fallbackP = po.p; break; }
            }
        }
        if (!fallbackP) fallbackP = 'matrixquiz_pool_shared';
        lines.forEach(function (ln) {
            var s = String(ln || '').trim();
            if (!s) return;
            var obj = null;
            if (s.indexOf('MQT1.') === 0) obj = parseFullCode(s);
            else if (s.indexOf('MQC1.') === 0) obj = parseStuToken(s);
            else if (/^https?:\/\/[a-z0-9.-]+\.(?:firebasedatabase\.app|firebaseio\.com)/i.test(s)) {
                var nu = normUrl(s);
                if (nu) obj = { u: nu, p: fallbackP };
            }
            if (!obj || !obj.u || !obj.p) { invalid.push(s); return; }
            var k = obj.u + '|' + obj.p;
            if (!seen[k]) {
                seen[k] = true;
                valid.push({ u: obj.u, p: obj.p, raw: s });
            }
        });
        return { valid: valid, invalid: invalid };
    }
    function testFbPool() {
        var pool = getFbPool();
        if (!pool.length) return Promise.resolve({ allOk: false, results: [] });
        return Promise.all(pool.map(function (c, idx) {
            var started = Date.now();
            var tok = 'ok_' + started + '_' + idx;
            var pingUrl = c.u + '/s/' + encodeURIComponent(c.p) + '/_ping_' + idx + '.json';
            return fetch(pingUrl, {
                method: 'PUT',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ t: tok })
            }).then(function (rPut) {
                if (!rPut.ok) throw new Error('Ghi thất bại HTTP ' + rPut.status + ' (kiểm tra Rules .write)');
                return fetch(pingUrl + '?_t=' + Date.now(), { method: 'GET', cache: 'no-store' });
            }).then(function (rGet) {
                if (!rGet.ok) throw new Error('Đọc thất bại HTTP ' + rGet.status);
                return rGet.json();
            }).then(function (val) {
                if (!val || val.t !== tok) throw new Error('Dữ liệu đọc lại không khớp');
                fetch(pingUrl, { method: 'DELETE', cache: 'no-store' }).catch(function () { });
                return { idx: idx + 1, u: c.u, ok: true, ms: Date.now() - started };
            }).catch(function (e) {
                return { idx: idx + 1, u: c.u, ok: false, ms: Date.now() - started, error: (e && e.message) || 'Lỗi mạng' };
            });
        })).then(function (results) {
            return { allOk: results.every(function (x) { return x.ok; }), results: results };
        });
    }
    function saveFbPool(rawText) {
        var parsed = parseFbPoolText(rawText);
        var clean = parsed.valid.map(function (x) { return { u: x.u, p: x.p, raw: x.raw }; });
        lsSet(LS_FB_POOL, clean);
        return { ok: parsed.invalid.length === 0, saved: clean, invalid: parsed.invalid };
    }
    function getFbPool() {
        var out = [], seen = {};
        var pri = effStu();
        if (pri && pri.u && pri.p) {
            seen[pri.u + '|' + pri.p] = true;
            out.push({ u: pri.u, p: pri.p });
        }
        loadFbPoolRaw().forEach(function (x) {
            if (!x || !x.u || !x.p) return;
            var k = x.u + '|' + x.p;
            if (!seen[k]) { seen[k] = true; out.push({ u: x.u, p: x.p }); }
        });
        return out;
    }
    function nextFbIdx() {
        var pool = getFbPool();
        if (!pool.length) return 0;
        var idx = fbPoolCursor % pool.length;
        fbPoolCursor = (fbPoolCursor + 1) % pool.length;
        return idx;
    }
    function pickLiveCfg(idxOverride) {
        var pool = getFbPool();
        if (!pool.length) return null;
        var idx = (typeof idxOverride === 'number' && isFinite(idxOverride)) ? (Math.abs(Math.floor(idxOverride)) % pool.length) : nextFbIdx();
        return pool[idx];
    }
    function parseStuToken(tok) {
        try {
            var raw = b64d(String(tok).replace(/^MQC1\./, '')); var i = raw.lastIndexOf('|');
            if (i < 1) return null;
            var u = normUrl(raw.slice(0, i)), p = raw.slice(i + 1);
            return (u && p.length >= 12) ? { u: u, p: p } : null;
        } catch (e) { return null; }
    }
    function fullCode() {
        if (!S.cfg) return '';
        return 'MQT1.' + b64e(JSON.stringify({ u: S.cfg.u, t: S.cfg.t, p: S.cfg.p }));
    }
    function parseFullCode(code) {
        try {
            var o = JSON.parse(b64d(String(code).trim().replace(/^MQT1\./, '')));
            var u = normUrl(o.u);
            if (u && o.t && String(o.t).length >= 16 && o.p && String(o.p).length >= 12) return { u: u, t: String(o.t), p: String(o.p) };
        } catch (e) { }
        return null;
    }

    (function captureLink() {
        try {
            var p = new URLSearchParams(location.search);
            var cl = p.get('cl');
            if (cl) { var c = parseStuToken(cl); if (c) { c.ts = Date.now(); c.src = 'link'; lsSet(LS_STU, c); } }
            var ct = p.get('ct');
            if (ct) { var tc = parseFullCode(ct); if (tc) lsSet(LS_CFG, tc); }
        } catch (e) { }
    })();

    /* ---------------- mạng ---------------- */
    function base(b) {
        if (b === 't') {
            if (!S.cfg) throw new Error('Chưa có Mã giáo viên (MQT1) trên trình duyệt này.');
            return S.cfg.u + '/t/' + S.cfg.t;
        }
        var c = effStu();
        if (!c) throw new Error('Chưa có kết nối máy chủ.');
        return c.u + '/s/' + c.p;
    }
    function req(method, b, path, body) {
        var q = ''; if (path && path.indexOf('?') >= 0) { q = path.slice(path.indexOf('?')); path = path.slice(0, path.indexOf('?')); }
        var url;
        try { url = base(b) + (path ? '/' + path : '') + '.json' + q; }
        catch (err) { return Promise.reject(err); }
        var opt = { method: method, cache: 'no-store' };
        if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers = { 'Content-Type': 'application/json' }; }
        return fetch(url, opt).then(function (r) {
            if (r.ok) return r.status === 204 ? null : r.json();   /* [CODE157] print=silent -> 204 không có nội dung */
            return r.text().then(function (t) {
                var msg = 'Lỗi máy chủ ' + r.status;
                if (r.status === 401 || r.status === 403) msg = 'Máy chủ từ chối truy cập (kiểm tra lại Rules của Firebase).';
                else if (r.status === 404) msg = 'Không tìm thấy Database (kiểm tra lại URL).';
                throw new Error(msg + (t ? ' ' + t.slice(0, 80) : ''));
            });
        }, function () { throw new Error('Không kết nối được mạng/máy chủ.'); });
    }

    /* ---------------- dữ liệu cục bộ & gắn nhãn tên đề vào kết quả ---------------- */
    function arr(name) { var v = g(name); return Array.isArray(v) ? v : []; }
    function enrichLocalResults() {
        try {
            var R = g('studentResultsByTopic') || {}, T = arr('savedTopics'), byId = {};
            T.forEach(function (t) { if (t && t.id) byId[t.id] = t; });
            var curId = g('currentTopicId'), curSub = ($('quiz-subtitle') && $('quiz-subtitle').textContent || '').trim();
            Object.keys(R).forEach(function (tid) {
                var list = Array.isArray(R[tid]) ? R[tid] : [];
                var tp = byId[tid] || S.pubTopics[enc(tid)] || S.tTopics[enc(tid)];
                list.forEach(function (r) {
                    if (!r) return;
                    if (!r.topicId) r.topicId = tid;
                    if (tp) {
                        if (!r.topicTitle && tp.subtitle) r.topicTitle = tp.subtitle;
                        if (!r.topicSubject && tp.subject) r.topicSubject = tp.subject;
                        if (!r.topicGrade && tp.grade) r.topicGrade = tp.grade;
                    } else if (tid === curId && curSub && curSub !== 'CHƯA CHỌN ĐỀ THI') {
                        if (!r.topicTitle) r.topicTitle = curSub;
                        if (!r.topicSubject) r.topicSubject = g('currentSubject') || '';
                        if (!r.topicGrade) r.topicGrade = g('currentGrade') || '';
                    }
                });
            });
        } catch (e) { }
    }
    function localMap(kind) {
        var m = new Map();
        if (kind === 'topics') arr('savedTopics').forEach(function (t) { if (t && t.id && t.id !== DEFAULT_TOPIC) m.set(t.id, t); });
        else if (kind === 'folders') arr('libraryFolders').forEach(function (f) { if (f && f.id) m.set(f.id, f); });
        else if (kind === 'classes') arr('classesData').forEach(function (c) { if (c && c.id) m.set(c.id, c); });
        else if (kind === 'results') {
            enrichLocalResults();
            var R = g('studentResultsByTopic') || {};
            Object.keys(R).forEach(function (tid) { (Array.isArray(R[tid]) ? R[tid] : []).forEach(function (r) { if (r && r.id) m.set(tid + '|' + r.id, r); }); });
        }
        return m;
    }
    function pubDesired() {
        var m = new Map(), pm = (S.meta.pub || {}), asg = {};
        /* [CODE67] Đề đã giao cho lớp học luôn được đưa lên máy chủ để học sinh mở được */
        arr('classesData').forEach(function (c) { ((c && c.assignments) || []).forEach(function (x) { if (x && x.topicId) asg[x.topicId] = 1; }); });
        arr('savedTopics').forEach(function (t) {
            if (!t || !t.id || t.id === DEFAULT_TOPIC) return;
            if (t.isPublished || pm[t.id] || S.forcePub.has(t.id) || asg[t.id]) m.set(t.id, t);
        });
        return m;
    }
    /* [CODE75] Thư mục chứa đề đã xuất bản/đã giao (kể cả thư mục cha) -> đưa lên s/pubfolders để học sinh thấy đề đúng thư mục */
    function pubFoldersDesired() {
        var m = new Map(), F = arr('libraryFolders'), T = arr('savedTopics'), byId = {}, need = {};
        F.forEach(function (f) { if (f && f.id) byId[f.id] = f; });
        var pd = pubDesired();
        T.forEach(function (t) {
            if (!t || !t.id || !pd.has(t.id)) return;
            var fid = t.folderId, guard = 0;
            while (fid && byId[fid] && !need[fid] && guard++ < 30) { need[fid] = 1; fid = byId[fid].parentId; }
        });
        Object.keys(need).forEach(function (id) { m.set(id, byId[id]); });
        F.forEach(function (f) { if (f && f.id && f.parentId === '__subjmeta') m.set(f.id, f); });   /* [CODE76] thứ tự các môn học */
        return m;
    }
    function deletedHas(kind, key) {
        if (kind === 'topics') return arr('deletedTopicIds').indexOf(key) >= 0;
        if (kind === 'folders') return arr('deletedFolderIds').indexOf(key) >= 0;
        return false;
    }

    /* ---------------- HỢP NHẤT KẾT QUẢ CỦA CÁC ĐỀ CÙNG TÊN ---------------- */
    function resultSig(r) {
        if (!r) return '';
        return normStr(r.studentName || r.name || '') + '|' + normStr(r.studentClass || r.className || '') + '|' + String(r.submittedTs || r.submittedAt || r.score || '');
    }
    function mergeResultRecordIntoTopic(tid, rec, topicObj) {
        if (!tid || !rec || !rec.id) return false;
        var R = g('studentResultsByTopic');
        if (!R) return false;
        if (!Array.isArray(R[tid])) R[tid] = [];
        var list = R[tid];
        var sig = resultSig(rec);
        var exists = list.some(function (x) {
            if (!x) return false;
            if (x.id === rec.id) return true;
            if (sig && resultSig(x) === sig && Math.abs((x.submittedTs || 0) - (rec.submittedTs || 0)) < 2000) return true;
            return false;
        });
        if (exists) {
            var idx = list.findIndex(function (x) { return x && x.id === rec.id; });
            if (idx >= 0 && !list[idx].detail && rec.detail) { list[idx] = Object.assign({}, rec, { topicId: tid }); return true; }
            return false;
        }
        var copy = Object.assign({}, rec, { topicId: tid });
        if (topicObj) {
            copy.topicTitle = copy.topicTitle || topicObj.subtitle || '';
            copy.topicSubject = copy.topicSubject || topicObj.subject || '';
            copy.topicGrade = copy.topicGrade || topicObj.grade || '';
        }
        list.push(copy);
        list.sort(function (a, b) { return (b.submittedTs || 0) - (a.submittedTs || 0); });
        return true;
    }

    /* Tự động ánh xạ các kết quả bị lệch mã đề (nhưng cùng tên chủ đề) về đúng đề trong Thư viện hiện tại */
    function unifySameTitleResults(ch) {
        var R = g('studentResultsByTopic') || {}, T = arr('savedTopics');
        if (!T.length) return 0;
        var byId = {}, byFull = {}, byTitle = {};
        T.forEach(function (t) {
            if (!t || !t.id) return;
            byId[t.id] = t;
            var fk = topicFullKey(t), tk = topicTitleKey(t);
            if (fk) (byFull[fk] = byFull[fk] || []).push(t);
            if (tk) (byTitle[tk] = byTitle[tk] || []).push(t);
        });
        var moved = 0;
        Object.keys(R).forEach(function (srcTid) {
            var list = Array.isArray(R[srcTid]) ? R[srcTid] : [];
            if (!list.length) return;
            var srcTopic = byId[srcTid] || S.pubTopics[enc(srcTid)] || S.tTopics[enc(srcTid)];
            var sample = list.find(function (r) { return r && r.topicTitle; });
            var fakeTopic = srcTopic || (sample ? { subtitle: sample.topicTitle, subject: sample.topicSubject, grade: sample.topicGrade } : null);
            if (!fakeTopic) return;
            var fk = topicFullKey(fakeTopic), tk = topicTitleKey(fakeTopic);
            var targets = (fk && byFull[fk] && byFull[fk].length) ? byFull[fk] : ((tk && byTitle[tk]) ? byTitle[tk] : []);
            targets.forEach(function (targetTopic) {
                if (!targetTopic || targetTopic.id === srcTid) return;
                list.forEach(function (rec) {
                    if (mergeResultRecordIntoTopic(targetTopic.id, rec, targetTopic)) {
                        moved++;
                        if (ch) { ch.results = true; ch.newRes = (ch.newRes || 0) + 1; }
                    }
                });
            });
        });
        if (moved > 0) S.dirty = true;
        return moved;
    }

    /* ---------------- ĐẨY LÊN ---------------- */
    var BASEOF = { topics: 't', folders: 't', classes: 't', results: 's', pub: 's', pubfolders: 's' };
    function resPath(key) { var i = key.indexOf('|'); return enc(key.slice(0, i)) + '/' + enc(key.slice(i + 1)); }
    function dataPath(kind, key) { return (kind === 'results') ? 'results/' + resPath(key) : kind + '/' + enc(key); }
    function tombPath(kind, key) { return 'del/' + kind + '/' + enc(key); }

    function collect(kind, desired, entries, allowDelete) {
        if (BASEOF[kind] === 't' && !S.cfg) return;
        var meta = S.meta[kind] || (S.meta[kind] = {});
        desired.forEach(function (obj, key) {
            var d = JSON.stringify(obj), h = hash(d), m = meta[key];
            if (m && m.h === h) return;
            if (kind === 'results' && m && m.h) return;
            var up = {}, size = d.length;
            up[dataPath(kind, key)] = { k: key, h: h, ts: SV, d: d };
            if (kind !== 'pub' && kind !== 'pubfolders') up[tombPath(kind, key)] = null;
            entries.push({ b: BASEOF[kind], up: up, size: size, kind: kind, key: key, rev: kind, tid: kind === 'results' ? key.slice(0, key.indexOf('|')) : null, tomb: false, commit: function () { meta[key] = { h: h, rh: h }; } });
        });
        if (!allowDelete) return;
        var keys = Object.keys(meta);
        if (kind === 'classes' && desired.size === 0 && keys.length >= 3) { S.meta[kind] = {}; delete S.meta.rev['t:classes']; S.again = true; return; }
        keys.forEach(function (key) {
            if (desired.has(key)) return;
            if (kind === 'classes' && meta[key] && meta[key].alias) return;   /* [CODE72] bản đã gộp: không xóa lớp của máy khác trên máy chủ */
            if ((kind === 'topics' || kind === 'folders') && !deletedHas(kind, key)) return;
            if (kind === 'results' && !resDeleted(key)) return;
            var up = {};
            up[dataPath(kind, key)] = null;
            if (kind !== 'pub' && kind !== 'pubfolders') up[tombPath(kind, key)] = { k: key, ts: SV };
            entries.push({ b: BASEOF[kind], up: up, size: 100, kind: kind, key: key, rev: kind, tid: kind === 'results' ? key.slice(0, key.indexOf('|')) : null, tomb: (kind !== 'pub' && kind !== 'pubfolders'), commit: function () { delete meta[key]; unmarkResDeleted(key); } });
        });
    }

    function sendEntries(entries) {
        if (!entries.length) return Promise.resolve(0);
        var byBase = { s: [], t: [] };
        entries.forEach(function (e) { if (byBase[e.b]) byBase[e.b].push(e); });
        var chain = Promise.resolve(), n = 0;
        /* [CODE60] Ưu tiên đẩy nhánh 's' (kết quả & đề giao học sinh) trước, và giảm kích thước mỗi gói xuống 800KB để không bị nghẽn */
        ['s', 't'].forEach(function (b) {
            var list = byBase[b]; if (!list.length) return;
            if (b === 't' && !S.cfg) return;
            var batches = [], cur = [], sz = 0;
            list.forEach(function (e) { if (cur.length && sz + e.size > 800000) { batches.push(cur); cur = []; sz = 0; } cur.push(e); sz += e.size; });
            if (cur.length) batches.push(cur);
            batches.forEach(function (batch, bi) {
                chain = chain.then(function () {
                    var body = {};
                    batch.forEach(function (e) { Object.keys(e.up).forEach(function (p) { body[p] = e.up[p]; }); });
                    if (bi === batches.length - 1) {
                        batch.forEach(function (e) {
                            if (e.rev === 'results') body['rev/results/' + enc(e.tid)] = SV; else body['rev/' + e.rev] = SV;
                            if (e.tomb) body['rev/del'] = SV;
                        });
                    }
                    return req('PATCH', b, '', body).then(function () { batch.forEach(function (e) { e.commit(); n++; }); });
                });
            });
        });
        return chain.then(function () { saveMeta(); return n; });
    }

    // [MT-19A-fix] Khi da gan link GAS #1 (khong phai che do 'firebase' thuan), ngung day/keo t/topics & t/folders len Firebase de tiet kiem & chong trung
    function isDriveLibManaged() {
        try {
            if (!window.GasBridge || typeof window.GasBridge.getConfig !== 'function') return false;
            var gCfg = window.GasBridge.getConfig();
            return !!(gCfg && gCfg.mode !== 'firebase' && Array.isArray(gCfg.urls) && gCfg.urls.length > 0);
        } catch (e) { return false; }
    }

    function pushTeacher() {
        var entries = [];
        collect('results', localMap('results'), entries, true);
        collect('pub', pubDesired(), entries, true);
        collect('pubfolders', pubFoldersDesired(), entries, true);
        if (S.cfg) {
            if (!isDriveLibManaged()) {
                collect('topics', localMap('topics'), entries, true);
                collect('folders', localMap('folders'), entries, true);
            }
            collect('classes', localMap('classes'), entries, true);
        }
        return sendEntries(entries);
    }
    function pushStudent() {
        var entries = [];
        collect('results', localMap('results'), entries, false);
        return sendEntries(entries);
    }

    /* ---------------- KÉO VỀ ---------------- */
    function parseEnv(env) { try { return JSON.parse(env.d); } catch (e) { return null; } }
    function revChanged(name, val) { return val !== undefined && val !== null && S.meta.rev[name] !== val; }

    function mergeClass(a, b) {
        var out = Object.assign({}, b);
        if (!out.subject && a && a.subject) out.subject = a.subject;   /* [CODE82] giữ môn học của lớp khi gộp */
        function nm(s) { return String(s && s.name || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }
        /* [CODE79] Học sinh đã bị xóa / đã rời lớp (dấu vết "removed") không được gộp ngược lại từ máy khác.
           Lọc TRƯỚC khi gộp để học sinh được thêm lại sau đó (id mới, addedAt mới hơn) vẫn được giữ. */
        var rmAll = [], rmSeen = {};
        (b.removed || []).concat(a.removed || []).forEach(function (t) {
            if (!t) return; var kk = (t.id || '') + '|' + (t.nm || '');
            if (rmSeen[kk] === undefined) { rmSeen[kk] = rmAll.length; rmAll.push(t); }
            else if ((t.ts || 0) > (rmAll[rmSeen[kk]].ts || 0)) rmAll[rmSeen[kk]] = t;
        });
        function stTs(s) { if (s && s.addedAt) return s.addedAt; var mm = /^st_([0-9a-z]{8})/.exec(String(s && s.id || '')); return mm ? (parseInt(mm[1], 36) || 0) : 0; }
        function alive(s) { var n0 = nm(s), t0 = stTs(s); return !rmAll.some(function (t) { return (t.id === s.id || (t.nm && t.nm === n0)) && (t.ts || 0) >= t0; }); }
        var st = (b.students || []).filter(alive), seenId = new Set(st.map(function (s) { return s.id; })), seenNm = new Set(st.map(nm));
        (a.students || []).filter(alive).forEach(function (s) { if (!seenId.has(s.id) && !seenNm.has(nm(s))) st.push(s); });
        if (rmAll.length) out.removed = rmAll.slice(-200);
        var as = (b.assignments || []).slice(), seenA = new Set(as.map(function (x) { return x.id; }));
        (a.assignments || []).forEach(function (x) { if (!seenA.has(x.id)) as.push(x); });
        /* [CODE72] Cùng một đề giao ở hai máy (khác mã) -> chỉ giữ bản giao mới nhất */
        var byT = {}, as2 = [];
        as.forEach(function (x) {
            var t = x && x.topicId; if (!t) { as2.push(x); return; }
            var p = byT[t];
            if (!p) { byT[t] = x; as2.push(x); }
            else if ((x.assignedAt || 0) > (p.assignedAt || 0)) { as2[as2.indexOf(p)] = x; byT[t] = x; }
        });
        out.students = st; out.assignments = as2;
        return out;
    }
    function resolve(kind, local, remote) {
        if (kind === 'classes') return mergeClass(local, remote);
        if ((local.updatedAt || 0) > (remote.updatedAt || 0)) return local;
        return remote;
    }

    function applyItem(kind, key, obj, ch) {
        if (kind === 'topics') {
            S.tTopics[enc(key)] = obj;
            var T = g('savedTopics'), i = T.findIndex(function (t) { return t && t.id === key; });
            if (i >= 0) T[i] = obj;
            else {
                var fk = topicFullKey(obj);
                var sameIdx = fk ? T.findIndex(function (t) { return t && topicFullKey(t) === fk; }) : -1;
                if (sameIdx < 0) T.push(obj);
                else if ((obj.updatedAt || 0) > (T[sameIdx].updatedAt || 0)) {
                    /* Giữ đề hiện tại nhưng nhớ đề cùng tên để gộp kết quả */
                    T[sameIdx].questions = obj.questions || T[sameIdx].questions;
                }
            }
            try { markTopicLocallyModified(key); } catch (e) { }
            var D = g('deletedTopicIds'); if (Array.isArray(D) && D.indexOf(key) >= 0) { (0, eval)('deletedTopicIds = deletedTopicIds.filter(function(x){return x!==' + JSON.stringify(key) + '})'); }
        } else if (kind === 'folders') {
            var F = g('libraryFolders'), j = F.findIndex(function (f) { return f && f.id === key; });
            if (j >= 0) {
                F[j] = obj;
            } else {
                var normF2 = function (s) { return String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); };
                var dupF = F.find(function (f) {
                    if (!f || !f.id) return false;
                    return normF2(f.subject || '') === normF2(obj.subject || '') &&
                        String(f.parentId || '') === String(obj.parentId || '') &&
                        normF2(f.name || '') === normF2(obj.name || '');
                });
                if (!dupF) F.push(obj);
            }
            var DF = g('deletedFolderIds'); if (Array.isArray(DF) && DF.indexOf(key) >= 0) { (0, eval)('deletedFolderIds = deletedFolderIds.filter(function(x){return x!==' + JSON.stringify(key) + '})'); }
        } else if (kind === 'classes') {
            var C = g('classesData'), k = C.findIndex(function (c) { return c && c.id === key; });
            if (!Array.isArray(obj.students)) obj.students = []; if (!Array.isArray(obj.assignments)) obj.assignments = [];
            if (k >= 0) C[k] = obj;
            else {
                /* [CODE72] Lớp cùng tên (tạo riêng ở máy khác / trang GitHub) -> gộp vào lớp hiện có thay vì tạo lớp trùng */
                var kk = C.findIndex(function (c) {
                    if (!c || c.id === key || normStr(c.name) !== normStr(obj.name)) return false;
                    var g1 = normStr(c.grade), g2 = normStr(obj.grade);
                    return !g1 || !g2 || g1 === g2;
                });
                if (kk >= 0) {
                    var mg = mergeClass(C[kk], obj); mg.id = C[kk].id; C[kk] = mg;
                    S.lastAlias = mg.id; S.dirty = true; ch[kind] = true; return;
                }
                C.push(obj);
            }
        } else if (kind === 'results') {
            var tid = key.slice(0, key.indexOf('|')), R = g('studentResultsByTopic');
            if (!Array.isArray(R[tid])) R[tid] = [];
            var x = R[tid].findIndex(function (r) { return r && r.id === obj.id; });
            if (x >= 0) R[tid][x] = obj; else { R[tid].push(obj); ch.newRes = (ch.newRes || 0) + 1; }
            R[tid].sort(function (a, b) { return (b.submittedTs || 0) - (a.submittedTs || 0); });
        }
        ch[kind] = true;
    }
    function removeItem(kind, key, ch) {
        if (kind === 'topics') {
            var T = g('savedTopics'); var i = T.findIndex(function (t) { return t && t.id === key; }); if (i >= 0) T.splice(i, 1);
            (0, eval)('deletedTopicIds = Array.from(new Set(deletedTopicIds.concat([' + JSON.stringify(key) + '])))');
        } else if (kind === 'folders') {
            var F = g('libraryFolders'); var j = F.findIndex(function (f) { return f && f.id === key; }); if (j >= 0) F.splice(j, 1);
            (0, eval)('deletedFolderIds = Array.from(new Set(deletedFolderIds.concat([' + JSON.stringify(key) + '])))');
        } else if (kind === 'classes') {
            var C = g('classesData'); var k = C.findIndex(function (c) { return c && c.id === key; }); if (k >= 0) C.splice(k, 1);
        } else if (kind === 'results') {
            var tid = key.slice(0, key.indexOf('|')), rid = key.slice(key.indexOf('|') + 1), R = g('studentResultsByTopic');
            if (Array.isArray(R[tid])) R[tid] = R[tid].filter(function (r) { return !(r && r.id === rid); });
        }
        ch[kind] = true;
    }

    function processKind(kind, remote, tomb, ch) {
        var meta = S.meta[kind] || (S.meta[kind] = {});
        var local = localMap(kind);
        Object.keys(remote || {}).forEach(function (ek) {
            var env = remote[ek]; if (!env || !env.k || typeof env.d !== 'string') return;
            var key = env.k, lo = local.get(key), m = meta[key];
            if (!lo) {
                if (deletedHas(kind, key)) return;
                if (kind === 'classes' && m && m.alias) {
                    /* [CODE72] Lớp này đã được gộp vào lớp cùng tên ở máy này: mỗi lần bản kia thay đổi thì gộp lại */
                    if (m.rh === env.h) return;
                    var oa = parseEnv(env); if (!oa) return;
                    if (!local.get(m.alias)) { delete meta[key]; return; }
                    S.lastAlias = null; applyItem(kind, key, oa, ch);
                    meta[key] = { h: m.h, rh: env.h, alias: m.alias }; return;
                }
                if (m && kind !== 'topics' && kind !== 'folders' && !(kind === 'results' && !resDeleted(key))) return;
                var o = parseEnv(env); if (!o) return;
                S.lastAlias = null;
                applyItem(kind, key, o, ch);
                meta[key] = { h: hash(JSON.stringify(o)), rh: env.h };
                if (kind === 'classes' && S.lastAlias) meta[key].alias = S.lastAlias;
                return;
            }
            if (kind === 'results' && lo && !lo.detail) {
                S.detailTried = S.detailTried || {};
                if (!S.detailTried[key]) { S.detailTried[key] = 1; var ro0 = parseEnv(env); if (ro0 && ro0.detail) { applyItem(kind, key, ro0, ch); meta[key] = { h: hash(JSON.stringify(ro0)), rh: env.h }; return; } }
            }
            if (m && m.rh === env.h) return;
            var lh = hash(JSON.stringify(lo));
            if (lh === env.h) { meta[key] = { h: lh, rh: env.h }; return; }
            var ro = parseEnv(env); if (!ro) return;
            var localChanged = !m || lh !== m.h;
            if (!localChanged) { applyItem(kind, key, ro, ch); meta[key] = { h: hash(JSON.stringify(ro)), rh: env.h }; return; }
            var win = resolve(kind, lo, ro);
            S.dirty = true;
            if (win === ro) { applyItem(kind, key, ro, ch); meta[key] = { h: hash(JSON.stringify(ro)), rh: env.h }; }
            else {
                if (win !== lo) applyItem(kind, key, win, ch);
                meta[key] = { h: '', rh: env.h };
            }
        });
        Object.keys(tomb || {}).forEach(function (ek) {
            var tb = tomb[ek]; if (!tb || !tb.k) return;
            var key = tb.k, lo = local.get(key), m = meta[key];
            if (!lo) { delete meta[key]; return; }
            if (!m) {
                if ((kind === 'topics' || kind === 'folders') && (lo.updatedAt || 0) <= (tb.ts || 0)) { removeItem(kind, key, ch); }
                return;
            }
            if (hash(JSON.stringify(lo)) === m.h) { removeItem(kind, key, ch); delete meta[key]; }
        });
    }

    function pullTeacher() {
        var ch = {};
        S.pullErr = null;
        var pT = S.cfg ? req('GET', 't', 'rev').catch(function () { return {}; }) : Promise.resolve({});
        var pS = req('GET', 's', 'rev').catch(function () { return {}; });
        return Promise.all([pT, pS]).then(function (revs) {
            var rt = revs[0] || {}, rs = revs[1] || {};
            var needDelT = S.cfg && revChanged('t:del', rt.del), needDelS = revChanged('s:del', rs.del);
            var delT = null, delS = null;
            var p0 = needDelT ? req('GET', 't', 'del').then(function (d) { delT = d || {}; }, function () { }) : Promise.resolve();
            var p1 = needDelS ? req('GET', 's', 'del').then(function (d) { delS = d || {}; }, function () { }) : Promise.resolve();
            return Promise.all([p0, p1]).then(function () {
                var jobs = [];
                if (S.cfg) {
                    (isDriveLibManaged() ? ['classes'] : ['topics', 'folders', 'classes']).forEach(function (kind) {
                        /* [CODE74] Phục hồi khi localStorage bị xóa/không đầy đủ nhưng metadata đồng bộ cũ vẫn còn.
                           Trước đây chỉ nhìn revision Firebase; nếu revision không đổi, máy mới hoặc máy bị mất
                           dữ liệu sẽ bỏ qua GET và tiếp tục hiển thị danh sách rỗng. */
                        var localCount = localMap(kind).size;
                        var expectedCount = Number((S.meta.localCount || {})[kind] || 0);
                        var recoveryRev = (S.meta.recoveryRev || {})[kind];
                        var needsRecovery = localCount < expectedCount ||
                            (localCount === 0 && rt[kind] !== undefined && recoveryRev !== rt[kind]);
                        if (revChanged('t:' + kind, rt[kind]) || needDelT || needsRecovery) {
                            jobs.push(function () {
                                return req('GET', 't', kind).then(function (remote) {
                                    var tomb = delT ? (delT[kind] || {}) : {};
                                    processKind(kind, remote || {}, tomb, ch);
                                    if (rt[kind] !== undefined) S.meta.rev['t:' + kind] = rt[kind];
                                    S.meta.localCount = S.meta.localCount || {};
                                    S.meta.recoveryRev = S.meta.recoveryRev || {};
                                    S.meta.localCount[kind] = localMap(kind).size;
                                    if (rt[kind] !== undefined) S.meta.recoveryRev[kind] = rt[kind];
                                }, function (e) {
                                    /* [CODE75] Không cập nhật revision khi GET thất bại, nhưng KHÔNG chặn các nhánh khác và việc đẩy đề/kết quả lên máy chủ */
                                    S.pullErr = S.pullErr || e;
                                });
                            });
                        }
                    });
                }
                /* [CODE60] Luôn đọc s/pub để vừa nạp đề đã giao về máy GitHub, vừa biết tên các đề tương ứng với kết quả */
                if (revChanged('s:pub', rs.pub) || S.meta.pub === undefined || !Object.keys(S.pubTopics).length) {
                    jobs.push(function () {
                        return req('GET', 's', 'pub').then(function (pub) {
                            var old = S.meta.pub || {}, pm = {}, T = g('savedTopics');
                            Object.keys(pub || {}).forEach(function (e) {
                                var env = pub[e]; if (!env || !env.k) return;
                                pm[env.k] = old[env.k] || { h: env.h, rh: env.h };
                                var o = parseEnv(env);
                                if (o && o.id) {
                                    S.pubTopics[enc(o.id)] = o;
                                    if (!deletedHas('topics', o.id) && Array.isArray(T)) {
                                        var idx = T.findIndex(function (t) { return t && t.id === o.id; });
                                        var fk = topicFullKey(o);
                                        var sameIdx = fk ? T.findIndex(function (t) { return t && topicFullKey(t) === fk; }) : -1;
                                        if (idx < 0 && sameIdx < 0) { T.push(o); ch.topics = true; }
                                    }
                                }
                            });
                            S.meta.pub = pm;
                            if (rs.pub !== undefined) S.meta.rev['s:pub'] = rs.pub;
                        }, function () { });
                    });
                }
                var resRev = rs.results || {};
                Object.keys(resRev).forEach(function (etid) {
                    if (revChanged('s:results:' + etid, resRev[etid]) || needDelS) {
                        jobs.push(function () {
                            return req('GET', 's', 'results/' + etid).then(function (remote) {
                                var flat = {};
                                Object.keys(remote || {}).forEach(function (er) { var env = remote[er]; if (env && env.k) flat[er] = env; });
                                var tomb = {};
                                if (delS && delS.results) Object.keys(delS.results).forEach(function (ek) { var tb = delS.results[ek]; if (tb && tb.k && tb.k.slice(0, tb.k.indexOf('|')) && enc(tb.k.slice(0, tb.k.indexOf('|'))) === etid) tomb[ek] = tb; });
                                processKind('results', flat, tomb, ch);
                                S.meta.rev['s:results:' + etid] = resRev[etid];
                            }, function () { });
                        });
                    }
                });
                if (delS && delS.results) {
                    jobs.push(function () { processKind('results', {}, delS.results, ch); return Promise.resolve(); });
                }
                var chain = Promise.resolve();
                jobs.forEach(function (j) { chain = chain.then(j); });
                return chain;
            }).then(function () {
                if (needDelT && rt.del !== undefined) S.meta.rev['t:del'] = rt.del;
                if (needDelS && rs.del !== undefined) S.meta.rev['s:del'] = rs.del;
                unifySameTitleResults(ch);
            });
        }).then(function () { return ch; });
    }

    function pullStudent() {
        var ch = {};
        return req('GET', 's', 'rev').then(function (rs) {
            rs = rs || {};
            var T0 = g('savedTopics') || [], seen0 = S.meta.stuPubSeen || {};
            /* [CODE75] Nếu bộ nhớ máy bị thiếu đề đã tải trước đó thì tải lại, không chỉ nhìn số hiệu phiên bản */
            var missing = Object.keys(seen0).some(function (id) { return !T0.some(function (t) { return t && t.id === id; }); });
            var F0 = g('libraryFolders') || [], fseen0 = S.meta.stuFolSeen || {};
            var fmissing = Object.keys(fseen0).some(function (id) { return !F0.some(function (f) { return f && f.id === id; }); });
            var chain = Promise.resolve();
            if (revChanged('s:pub', rs.pub) || !S.meta.stuPubSeen || missing) {
                chain = chain.then(function () {
                    return req('GET', 's', 'pub?cb=' + Date.now()).then(function (pub) {
                        pub = pub || {};
                        var T = g('savedTopics'), seen = {};
                        Object.keys(pub).forEach(function (e) {
                            var env = pub[e]; if (!env || !env.k) return;
                            var o = parseEnv(env); if (!o || !o.id) return;
                            seen[o.id] = true;
                            S.pubTopics[enc(o.id)] = o;
                            var i = T.findIndex(function (t) { return t && t.id === o.id; });
                            if (i < 0) { T.push(o); ch.topics = true; }
                            else if ((o.updatedAt || 0) >= (T[i].updatedAt || 0) && JSON.stringify(T[i]) !== env.d) { T[i] = o; ch.topics = true; }
                        });
                        var prev = S.meta.stuPubSeen || {};
                        Object.keys(prev).forEach(function (id) {
                            if (!seen[id]) {
                                var i = T.findIndex(function (t) { return t && t.id === id; });
                                if (i >= 0 && !(S.meta.topics && S.meta.topics[id])) { T.splice(i, 1); ch.topics = true; }
                            }
                        });
                        S.meta.stuPubSeen = seen;
                        if (rs.pub !== undefined) S.meta.rev['s:pub'] = rs.pub;
                    });
                });
            }
            if (revChanged('s:pubfolders', rs.pubfolders) || !S.meta.stuFolSeen || fmissing) {
                chain = chain.then(function () {
                    return req('GET', 's', 'pubfolders?cb=' + Date.now()).then(function (data) {
                        data = data || {};
                        var F = g('libraryFolders'), seen = {};
                        Object.keys(data).forEach(function (e) {
                            var env = data[e]; if (!env || !env.k) return;
                            var o = parseEnv(env); if (!o || !o.id) return;
                            seen[o.id] = true;
                            var i = F.findIndex(function (f) { return f && f.id === o.id; });
                            if (i < 0) { F.push(o); ch.folders = true; }
                            else if (JSON.stringify(F[i]) !== JSON.stringify(o)) { F[i] = o; ch.folders = true; }
                        });
                        var prev = S.meta.stuFolSeen || {};
                        Object.keys(prev).forEach(function (id) {
                            if (!seen[id]) { var i = F.findIndex(function (f) { return f && f.id === id; }); if (i >= 0) { F.splice(i, 1); ch.folders = true; } }
                        });
                        S.meta.stuFolSeen = seen;
                        if (rs.pubfolders !== undefined) S.meta.rev['s:pubfolders'] = rs.pubfolders;
                    });
                });
            }
            return chain;
        }).then(function () { return ch; });
    }

    /* [CODE75] Thanh trạng thái của học sinh trong Thư viện: số đề, giờ cập nhật, mã kho; nút cập nhật; ô dán mã khi chưa kết nối */
    function storeId() { var c = effStu(); return c ? hash(c.u + '|' + c.p).slice(0, 6) : ''; }
    function stuLine() {
        var i = S.stuInfo || {};
        if (i.err) return '⚠️ Chưa cập nhật được (' + esc(i.err) + '). Bấm “Cập nhật đề” để thử lại. • kho ' + storeId();
        if (!i.ts) return '⏳ Đang tải đề từ máy chủ... • kho ' + storeId();
        return '☁️ Đã cập nhật lúc ' + fmtTime(i.ts) + ' • ' + (i.topics || 0) + ' đề đã xuất bản • kho ' + storeId();
    }
    function updateStuLine() { var el = $('stu-sync-line'); if (el) el.innerHTML = stuLine(); }
    function studentBannerHtml() {
        if (!isStu()) return '';
        var box = 'margin:0 0 12px 0;padding:10px 14px;border-radius:14px;font-weight:800;font-size:14px;line-height:1.5;';
        if (!effStu()) {
            if (window.GasBridge && window.GasBridge.isGasEnabled && window.GasBridge.isGasEnabled()) {
                return '<div style="' + box + 'background:#ecfdf5;border:2px solid #6ee7b7;color:#047857">✅ Đã kết nối máy chủ Google Sheets (Hướng A).</div>';
            }
            return '<div style="' + box + 'background:#fffbeb;border:2px solid #f59e0b;color:#92400e">⚠️ Máy này chưa kết nối với giáo viên nên có thể <u>không thấy đề mới</u>. Hãy mở link/QR giáo viên gửi, hoặc dán link/mã (bắt đầu bằng <b>MQC1.</b>) vào ô dưới:' +
                '<textarea id="stu-code" rows="2" style="width:100%;margin-top:6px;border:2px solid #fbbf24;border-radius:10px;padding:6px 10px;font-weight:700;font-size:13px" placeholder="Dán link hoặc mã MQC1..."></textarea>' +
                '<button type="button" onclick="CloudSync.studentConnect()" style="margin-top:6px;padding:8px 20px;border-radius:10px;font-weight:900;color:#fff;background:#059669">Kết nối</button><span id="stu-conn-msg" style="margin-left:10px;color:#b91c1c"></span></div>';
        }
        /* [CODE77] Đã kết nối: không hiện thanh trạng thái nữa (máy tự đồng bộ nền). Chỉ cảnh báo khi chưa kết nối. */
        return '';
    }
    function studentRefresh() {
        S.meta.rev = {}; delete S.meta.stuPubSeen; delete S.meta.stuFolSeen;
        S.stuInfo = {}; updateStuLine();
        S.remoteCfgBusy = false; fetchRemoteConfig();
        clearTimeout(S.timer); S.dirty = true; sync();
    }
    function studentConnect() {
        var el = $('stu-code'), v = el ? el.value : '';
        if (setStudentToken(v)) { try { if (typeof window.renderLibraryList === 'function') window.renderLibraryList(); } catch (e) { } }
        else { var m = $('stu-conn-msg'); if (m) m.textContent = 'Mã/link không hợp lệ.'; }
    }

    /* ---------------- áp dụng & vẽ lại giao diện ---------------- */
    var orig = {};
    function persist(ch) {
        S.applying = true;
        try {
            if (ch.topics && orig.saveToStorage) orig.saveToStorage();
            if (ch.folders && orig.saveFolders) orig.saveFolders();
            if (ch.classes && orig.cmSave) orig.cmSave();
            if (ch.results && orig.saveStudentResultsToStorage) orig.saveStudentResultsToStorage();
        } catch (e) { }
        S.applying = false;
    }
    function refreshUI(ch) {
        try {
            if (typeof window.renderLibraryList === 'function' && (ch.topics || ch.folders || ch.results)) window.renderLibraryList();
            var cm = $('class-modal');
            if ((ch.classes || ch.results) && typeof window.cmRender === 'function' && cm && !cm.classList.contains('hidden')) window.cmRender();
            var rm = $('results-modal');
            if (ch.results && typeof window.renderResultsModalContent === 'function' && rm && !rm.classList.contains('hidden')) repaintResults();
            if (typeof window.updateLibraryCountersUI === 'function') window.updateLibraryCountersUI();
        } catch (e) { }
    }

    /* ---------------- vòng đồng bộ ---------------- */
    function schedule(fast, noDirty) {
        if (!noDirty) S.dirty = true;
        if (!(teacherReady() || studentReady())) return;
        if (S.applying) return;
        clearTimeout(S.timer);
        S.timer = setTimeout(function () { sync(); }, fast ? 400 : 1500);
        updateBtn();
    }
    function resDeleted(key) { return ((S.meta && S.meta.delRes) || []).indexOf(key) >= 0; }
    function unmarkResDeleted(key) { var a = (S.meta && S.meta.delRes) || [], i = a.indexOf(key); if (i >= 0) a.splice(i, 1); }
    function noteResultDeleted(tid, rid) {
        if (!S.meta) return;
        if (!S.meta.delRes) S.meta.delRes = [];
        var k = tid + '|' + rid; if (S.meta.delRes.indexOf(k) < 0) S.meta.delRes.push(k);
        saveMeta(); S.dirty = true; schedule(true);
    }

    function repaintResults() {
        try {
            var rm = $('results-modal');
            if (rm && !rm.classList.contains('hidden') && typeof window.renderResultsModalContent === 'function') {
                window.renderResultsModalContent();
                var container = $('results-list-container');
                if (container && S.hint && S.hint.showBanner && !$('cloud-results-banner')) {
                    var div = document.createElement('div');
                    div.id = 'cloud-results-banner';
                    div.innerHTML = hintHtml();
                    container.insertBefore(div, container.firstChild);
                }
            }
        } catch (e) { }
    }

    function hintHtml() {
        if (isStu()) return '';
        var box = function (c, inner, isRaw) {
            return '<div id="cloud-results-banner" style="margin:12px auto;max-width:780px;padding:12px 16px;border-radius:14px;text-align:left;font-weight:700;font-size:14px;line-height:1.55;white-space:pre-wrap;' + c + '">' + (isRaw ? inner : esc(inner)) + '</div>';
        };
        var where = (location.protocol === 'file:') ? 'file trên máy tính' : location.host;
        if (!teacherReady()) return box('background:#fef2f2;color:#b91c1c;border:2px solid #fca5a5', '⚠️ Nơi này (' + where + ') CHƯA bật ĐỒNG BỘ nên không nhận được kết quả của học sinh.\nHãy vào: Thư viện → ☁️ ĐỒNG BỘ → dán "Mã kết nối" lấy từ máy đã bật đồng bộ.');
        if (S.hintBusy) return box('background:#eff6ff;color:#1d4ed8;border:2px solid #93c5fd', '⏳ Đang hỏi máy chủ & đối chiếu kết quả...');
        if (S.hint) {
            var st = S.hint.ok ? 'background:#ecfdf5;color:#047857;border:2px solid #6ee7b7' : 'background:#fffbeb;color:#92400e;border:2px solid #fcd34d';
            if (S.hint.rawHtml) return box(st, S.hint.rawHtml, true);
            return box(st, S.hint.text, false);
        }
        return '';
    }

    /* [CODE60] Gộp kết quả từ 1 nhánh khác mã (etid) trên máy chủ vào đề hiện tại (targetTid) chỉ với 1 cú bấm */
    function adoptOrphanResults(etid, targetTid) {
        if (!etid || !targetTid) return;
        var T = arr('savedTopics'), curTopic = T.find(function (t) { return t && t.id === targetTid; });
        var cached = S.orphanCache[etid];
        var p = cached ? Promise.resolve(cached) : req('GET', 's', 'results/' + etid).then(function (remote) {
            var recs = [];
            Object.keys(remote || {}).forEach(function (er) { var env = remote[er]; if (env && env.d) { var o = parseEnv(env); if (o) recs.push(o); } });
            return recs;
        });
        p.then(function (recs) {
            var added = 0;
            (recs || []).forEach(function (r) {
                if (mergeResultRecordIntoTopic(targetTid, r, curTopic)) added++;
            });
            var ch = { results: true, newRes: added };
            persist(ch); saveMeta(); S.dirty = true;
            S.hint = { ok: true, text: '✅ Đã gộp thành công ' + recs.length + ' kết quả vào đề "' + (curTopic ? curTopic.subtitle : targetTid) + '"!' };
            repaintResults(); refreshUI(ch);
            schedule(true);
            toast('✅ Đã gộp ' + recs.length + ' kết quả học sinh vào đề này!');
        }).catch(function (e) {
            toast('⚠️ Lỗi khi gộp kết quả: ' + msgOf(e));
        });
    }

    /* [CODE60] Hỏi máy chủ NGAY về kết quả của đề đang mở + Tự động tìm & gộp kết quả từ các bản sao cùng tên của đề */
    function refreshResultsNow(tid) {
        if (!tid || isStu()) return Promise.resolve();
        if (!teacherReady()) { S.hint = null; repaintResults(); return Promise.resolve(); }
        S.hintBusy = true; S.hint = null; repaintResults();
        var etid = enc(tid), T = arr('savedTopics');
        var curTopic = T.find(function (x) { return x && x.id === tid; });
        var curTitleKey = topicTitleKey(curTopic);

        /* Đảm bảo đã có danh sách đề trên s/pub và t/topics để đối chiếu tên đề chính xác */
        var prepPub = Object.keys(S.pubTopics).length ? Promise.resolve() : req('GET', 's', 'pub').then(function (pub) {
            Object.keys(pub || {}).forEach(function (k) { var o = pub[k] && parseEnv(pub[k]); if (o && o.id) S.pubTopics[enc(o.id)] = o; });
        }, function () { });
        var prepT = (S.cfg && !Object.keys(S.tTopics).length) ? req('GET', 't', 'topics').then(function (tp) {
            Object.keys(tp || {}).forEach(function (k) { var o = tp[k] && parseEnv(tp[k]); if (o && o.id) S.tTopics[enc(o.id)] = o; });
        }, function () { }) : Promise.resolve();

        return Promise.all([prepPub, prepT]).then(function () {
            return req('GET', 's', 'results?shallow=true');
        }).then(function (tops) {
            var allEtids = Object.keys(tops || {});
            if (allEtids.indexOf(etid) < 0) allEtids.unshift(etid);
            var autoMerged = 0, directCount = 0, otherBranches = [];

            return allEtids.reduce(function (chain, e) {
                return chain.then(function () {
                    return req('GET', 's', 'results/' + e).then(function (remote) {
                        var flat = {}, recs = [];
                        Object.keys(remote || {}).forEach(function (er) {
                            var env = remote[er];
                            if (env && env.k) {
                                flat[er] = env;
                                var o = parseEnv(env);
                                if (o) recs.push(o);
                            }
                        });
                        if (!recs.length) return;
                        var ch = {};
                        processKind('results', flat, {}, ch);

                        if (e === etid) {
                            directCount += recs.length;
                            return;
                        }

                        /* Kiểm tra xem nhánh e có cùng tên chủ đề với đề đang mở (curTopic) không */
                        var knownTopic = T.find(function (x) { return x && enc(x.id) === e; }) || S.pubTopics[e] || S.tTopics[e];
                        var sampleWithTitle = recs.find(function (r) { return r && r.topicTitle; });
                        var branchTitle = knownTopic ? knownTopic.subtitle : (sampleWithTitle ? sampleWithTitle.topicTitle : '');
                        var branchTitleKey = normStr(branchTitle);

                        if (curTitleKey && branchTitleKey && curTitleKey === branchTitleKey) {
                            /* TRÙNG TÊN ĐỀ -> Tự động gộp ngay vào đề đang mở! */
                            recs.forEach(function (r) {
                                if (mergeResultRecordIntoTopic(tid, r, curTopic)) autoMerged++;
                            });
                            directCount += recs.length;
                            return;
                        }

                        S.orphanCache[e] = recs;
                        otherBranches.push({
                            etid: e,
                            title: branchTitle,
                            inLib: !!T.find(function (x) { return x && enc(x.id) === e; }),
                            count: recs.length,
                            recs: recs
                        });
                    }, function () { });
                });
            }, Promise.resolve()).then(function () {
                var chAll = { results: true };
                unifySameTitleResults(chAll);
                persist(chAll); saveMeta(); refreshUI(chAll);
                if (autoMerged > 0) S.dirty = true;

                var localList = (g('studentResultsByTopic') || {})[tid] || [];
                if (localList.length > 0 && autoMerged > 0) {
                    S.hint = { ok: true, showBanner: true, text: '☁️ Đã tự động đồng bộ & hợp nhất ' + localList.length + ' kết quả của đề "' + (curTopic ? curTopic.subtitle : tid) + '" từ máy chủ!' };
                    schedule(true);
                    return;
                }
                if (localList.length > 0 && !otherBranches.length) {
                    S.hint = { ok: true, text: '☁️ Máy chủ có ' + localList.length + ' kết quả của đề này.' };
                    return;
                }
                if (!otherBranches.length && localList.length === 0) {
                    S.hint = { ok: false, text: 'Máy chủ CHƯA nhận được kết quả nào của học sinh.\nKiểm tra: học sinh phải mở đề bằng link/QR do giáo viên tạo SAU KHI bật ĐỒNG BỘ; nộp bài xong màn hình điểm báo "Đã gửi kết quả cho giáo viên".' };
                    return;
                }

                /* Xây dựng giao diện cho phép gộp 1 chạm đối với các nhánh khác mã đề */
                var orphanFirst = otherBranches.filter(function (b) { return !b.inLib; });
                var inLibBranches = otherBranches.filter(function (b) { return b.inLib; });
                var html = '<div style="font-weight:900;font-size:15px;margin-bottom:6px;color:#92400e">🔍 Phát hiện kết quả học sinh trên máy chủ (nếu có bài của đề này bị lệch mã đề, bấm "📥 Gộp vào đề này" để đưa vào bảng):</div>';
                var renderRow = function (b) {
                    var names = b.recs.slice(0, 3).map(function (r) {
                        return esc((r.studentName || 'HS') + (r.studentClass ? ' (' + r.studentClass + ')' : ''));
                    }).join(', ');
                    if (b.recs.length > 3) names += ' (+' + (b.recs.length - 3) + ' HS)';
                    var latest = b.recs[0] && b.recs[0].submittedAt ? ' • ' + esc(b.recs[0].submittedAt) : '';
                    var label = b.title ? ('<b>' + esc(b.title) + '</b>') : '<b style="color:#dc2626">(Đề khác mã trên máy chủ)</b>';
                    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:7px 10px;margin:5px 0;background:#fff;border:1.5px solid #fde68a;border-radius:10px">' +
                        '<div style="flex:1;min-width:220px;font-size:13.5px;line-height:1.4">• ' + label + ': <b>' + b.count + ' kết quả</b><br><span style="color:#475569;font-weight:600">👤 ' + names + latest + '</span></div>' +
                        '<button type="button" onclick="CloudSync.adoptOrphanResults(\'' + esc(b.etid) + '\',\'' + esc(tid) + '\')" style="padding:6px 12px;border-radius:9px;background:linear-gradient(90deg,#059669,#0d9488);color:#fff;font-weight:900;font-size:12.5px;border:0;cursor:pointer;white-space:nowrap">📥 Gộp ' + b.count + ' kết quả vào đề này</button>' +
                        '</div>';
                };
                orphanFirst.forEach(function (b) { html += renderRow(b); });
                if (inLibBranches.length) {
                    html += '<details style="margin-top:6px"><summary style="cursor:pointer;font-weight:800;font-size:13px;color:#b45309">📂 Xem thêm ' + inLibBranches.length + ' đề khác đã có trong Thư viện</summary>';
                    inLibBranches.forEach(function (b) { html += renderRow(b); });
                    html += '</details>';
                }
                S.hint = { ok: false, showBanner: localList.length === 0, rawHtml: html };
            });
        }).catch(function (e) { S.hint = { ok: false, text: '⚠️ ' + msgOf(e) }; }).then(function () { S.hintBusy = false; repaintResults(); });
    }

    function checkServer() {
        if (!teacherReady()) return Promise.resolve();
        S.diag = 'Đang kiểm tra máy chủ...'; renderModal();
        return req('GET', 's', 'results?shallow=true').then(function (tops) {
            tops = tops || {};
            var ids = Object.keys(tops), local = localMap('results'), lc = {}, lines = [], total = 0, miss = 0;
            local.forEach(function (v, k) { var e = enc(k.slice(0, k.indexOf('|'))); lc[e] = (lc[e] || 0) + 1; });
            var T = arr('savedTopics'), title = function (e) {
                var f = T.filter(function (x) { return x && enc(x.id) === e; })[0] || S.pubTopics[e] || S.tTopics[e];
                return f ? f.subtitle : ('Mã đề: ' + e);
            };
            return ids.reduce(function (p, e) {
                return p.then(function () {
                    return req('GET', 's', 'results/' + e + '?shallow=true').then(function (r) {
                        var n = Object.keys(r || {}).length, l = lc[e] || 0; total += n; if (n > l) miss += n - l;
                        lines.push('• ' + title(e) + ': máy chủ ' + n + ' | máy này ' + l);
                    });
                });
            }, Promise.resolve()).then(function () {
                var head = total === 0
                    ? 'Máy chủ CHƯA nhận được kết quả nào của học sinh.'
                    : (miss > 0 ? 'Máy chủ có ' + total + ' kết quả, còn ' + miss + ' kết quả CHƯA gộp về máy này → bấm "Tải & Gộp tất cả kết quả về máy".' : 'Máy chủ có ' + total + ' kết quả, máy này đã đồng bộ đủ.');
                S.diag = head + (lines.length ? '\n' + lines.join('\n') : '');
                renderModal();
            });
        }).catch(function (e) { S.diag = '⚠️ ' + msgOf(e); renderModal(); });
    }
    function pullAllResults() {
        var gCfg = window.GasBridge ? window.GasBridge.getConfig() : { mode: 'hybrid', urls: [] };
        var canGas = !!(window.GasBridge && gCfg.mode !== 'firebase' && gCfg.urls.length > 0);
        var canFb = teacherReady() && gCfg.mode !== 'gas';
        if (!canFb && !canGas) {
            setMsg('⚠️ Chưa bật Firebase hoặc chưa gắn link Apps Script.', false);
            return Promise.resolve();
        }
        S.diag = 'Đang tải & hợp nhất toàn bộ kết quả về máy...'; renderModal();
        var fbPromise = Promise.resolve();
        if (canFb) {
            S.meta.rev = {}; S.meta.results = {}; S.detailTried = {}; saveMeta();
            fbPromise = req('GET', 's', 'results?shallow=true').then(function (tops) {
                var ids = Object.keys(tops || {}), ch = {};
                return ids.reduce(function (p, e) {
                    return p.then(function () {
                        return req('GET', 's', 'results/' + e).then(function (remote) {
                            var flat = {};
                            Object.keys(remote || {}).forEach(function (er) { var env = remote[er]; if (env && env.k) flat[er] = env; });
                            processKind('results', flat, {}, ch);
                        }, function () { });
                    });
                }, Promise.resolve()).then(function () {
                    unifySameTitleResults(ch);
                    persist(ch); saveMeta(); refreshUI(ch);
                });
            }).catch(function () { });
        }
        return fbPromise.then(function () {
            if (!canGas) return canFb ? checkServer() : null;
            return window.GasBridge.flushQueue().catch(function () { }).then(function () {
                return window.GasBridge.mergeGasResultsToLocal();
            }).then(function (gRes) {
                try { if (typeof window.loadStudentResultsFromStorage === 'function') window.loadStudentResultsFromStorage(); } catch (e) { }
                try { if (typeof window.renderLibraryList === 'function') window.renderLibraryList(); } catch (e) { }
                var gasNote = gRes && gRes.ok
                    ? ('✅ Google Sheets: Đã tải ' + gRes.total + ' bài (gộp mới +' + gRes.added + ' bài).')
                    : ('⚠️ Google Sheets: ' + ((gRes && gRes.error) || 'Không tải được dữ liệu.'));
                if (canFb) {
                    return checkServer().then(function () {
                        S.diag = gasNote + (S.diag ? '\n' + S.diag : '');
                        renderModal();
                    });
                }
                S.diag = gasNote;
                renderModal();
            });
        });
    }

    function msgOf(e) { return (e && e.message) || String(e || 'Lỗi không xác định'); }
    function sync() {
        if (!(teacherReady() || studentReady())) { updateBtn(); return Promise.resolve(); }
        if (S.busy) { S.again = true; return Promise.resolve(); }
        S.busy = true; updateBtn();
        var p = isStu() ? syncStudent() : syncTeacher();
        return p.then(function () {
            S.busy = false; updateBtn(); refreshModal();
            try { if (!isStu() && window.ClassNet && ClassNet.onSyncDone) ClassNet.onSyncDone(); } catch (e) { }
            if (S.again) { S.again = false; schedule(true, true); }
        });
    }
    function syncStudent() {
        var doPush = S.dirty; S.dirty = false;
        var step1 = Promise.resolve();
        if (doPush) {
            step1 = pushStudent().then(function (n) {
                S.lastOk = Date.now(); S.lastErr = '';
                if (S.res.state === 'sending' || S.res.state === 'error') resultState('sent');
                if (n > 0) toast('☁️ Đã gửi kết quả bài làm cho giáo viên');
            }, function (e) {
                S.dirty = true; S.lastErr = msgOf(e);
                resultState('error', (navigator.onLine === false) ? 'Máy đang không có mạng.' : msgOf(e));
            });
        }
        return step1.then(function () {
            return pullStudent().then(function (ch) {
                persist(ch); refreshUI(ch); saveMeta();
                var T = g('savedTopics') || [];
                S.stuInfo = { ts: Date.now(), topics: T.filter(function (t) { return t && t.isPublished; }).length, err: '' };
                S.lastPullTs = Date.now();
                updateStuLine();
            }, function (e) { S.stuInfo = Object.assign({}, S.stuInfo || {}, { err: msgOf(e) }); updateStuLine(); });
        }).then(function () { saveMeta(); });
    }
    function syncTeacher() {
        var doPush = false;
        return waitLocal()
            .then(function () { return pullTeacher(); })
            .then(function (ch) {
                persist(ch); refreshUI(ch); saveMeta();
                if (ch.newRes && S.lastOk) toast('📥 Có ' + ch.newRes + ' kết quả mới từ học sinh');
                doPush = S.dirty; S.dirty = false;
                if (!doPush) return 0;
                return pushTeacher();
            })
            .then(function () {
                if (S.pullErr) { var pe = S.pullErr; S.pullErr = null; throw pe; }
                S.lastOk = Date.now(); S.lastErr = '';
            })
            .catch(function (e) {
                S.lastErr = msgOf(e);
                if (doPush || S.dirty === false) S.dirty = true;
            });
    }

    S.res = { state: 'idle', msg: '', ts: 0 };
    function resInner() {
        var st = S.res.state, b = function (t) { return '<div style="font-weight:800;font-size:14px;line-height:1.45">' + t + '</div>'; };
        if (st === 'sending') return b('⏳ Đang gửi kết quả cho giáo viên...');
        if (st === 'sent') return b('✅ Đã gửi kết quả cho giáo viên (' + fmtTime(S.res.ts) + ')');
        if (st === 'nolink') {
            if (window.GasBridge && window.GasBridge.getConfig().mode !== 'firebase' && window.GasBridge.getConfig().urls.length > 0) {
                return b('✅ Đã gửi kết quả về Google Sheets (Hướng A).');
            }
            return b('⚠️ Thiết bị này chưa có liên kết gửi kết quả (hãy mở đề bằng link / QR do giáo viên gửi). Em hãy gửi <u>Mã nộp bài</u> bên dưới cho giáo viên.');
        }
        if (st === 'error') return b('⚠️ Chưa gửi được: ' + esc(S.res.msg) + ' Máy sẽ tự gửi lại. ') +
            '<button type="button" onclick="CloudSync.retry()" style="margin-top:6px;padding:7px 16px;border-radius:12px;font-weight:900;font-size:13px;color:#fff;background:#dc2626;text-transform:uppercase">Gửi lại ngay</button>' +
            b('<span style="font-weight:700">Nếu vẫn lỗi, em gửi <u>Mã nộp bài</u> bên dưới cho giáo viên.</span>');
        return '';
    }
    function resColor() { var s = S.res.state; var gasOk = (s === 'nolink' && window.GasBridge && window.GasBridge.getConfig().mode !== 'firebase' && window.GasBridge.getConfig().urls.length > 0); return (s === 'sent' || gasOk) ? 'background:#ecfdf5;color:#047857;border:2px solid #6ee7b7' : (s === 'sending' ? 'background:#eff6ff;color:#1d4ed8;border:2px solid #93c5fd' : 'background:#fef2f2;color:#b91c1c;border:2px solid #fca5a5'); }
    function paintStatus() { var el = $('cloud-send-status'); if (!el) return; el.innerHTML = resInner(); el.style.cssText = S.res.state === 'idle' ? 'display:none' : 'margin-top:12px;max-width:560px;width:100%;padding:10px 14px;border-radius:14px;text-align:center;' + resColor(); }
    function resultState(st, msg) { S.res.state = st; S.res.msg = msg || ''; if (st === 'sent') S.res.ts = Date.now(); paintStatus(); }
    function statusHtml() {
        if (!isStu()) return '';
        return '<div id="cloud-send-status" style="' + (S.res.state === 'idle' ? 'display:none' : 'margin-top:12px;max-width:560px;width:100%;padding:10px 14px;border-radius:14px;text-align:center;' + resColor()) + '">' + resInner() + '</div>';
    }
    function retry() { resultState('sending'); S.dirty = true; clearTimeout(S.timer); sync(); }

    function flushBeacon() {
        try {
            if (!studentReady()) return;
            var mp = localMap('results'), meta = S.meta.results || {}, body = {}, any = false;
            mp.forEach(function (obj, key) {
                var d = JSON.stringify(obj), h = hash(d);
                if (meta[key] && meta[key].h === h) return;
                if (d.length > 30000) { d = JSON.stringify(Object.assign({}, obj, { detail: null })); h = hash(d); }
                body[dataPath('results', key)] = { k: key, h: h, ts: SV, d: d };
                body['rev/results/' + enc(key.slice(0, key.indexOf('|')))] = SV;
                any = true;
            });
            if (!any) return;
            fetch(base('s') + '.json', { method: 'PATCH', keepalive: true, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(function () { });
        } catch (e) { }
    }

    var localWaited = false;
    function waitLocal() {
        if (localWaited) return Promise.resolve();
        localWaited = true;
        if (typeof window.loadFromIndexedDB !== 'function') return Promise.resolve();
        return window.loadFromIndexedDB().then(function (r) {
            if (!r) return;
            try {
                if (Array.isArray(r.deletedIds)) (0, eval)('deletedTopicIds = mergeDeletedIds(deletedTopicIds, ' + JSON.stringify(r.deletedIds) + ')');
                if (Array.isArray(r.topics)) {
                    window.__cloudIdbTopics = r.topics;
                    (0, eval)('savedTopics = mergeTopicLists(savedTopics, window.__cloudIdbTopics, deletedTopicIds)');
                    window.__cloudIdbTopics = null;
                }
            } catch (e) { }
        }, function () { });
    }
    function startPolling() {
        clearInterval(S.poll);
        S.poll = setInterval(function () {
            if (document.hidden || !teacherReady()) return;
            sync();
        }, 12000);   /* [CODE158] giáo viên: 12 giây/lần */
    }

    function toast(msg) {
        try {
            var el = $('cloud-toast');
            if (!el) {
                el = document.createElement('div'); el.id = 'cloud-toast';
                el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 18px;border-radius:14px;font:800 15px/1.3 Roboto,Arial,sans-serif;z-index:100000;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:90vw;text-align:center;opacity:0;transition:opacity .25s;pointer-events:none';
                document.body.appendChild(el);
            }
            el.textContent = msg; el.style.opacity = '1';
            clearTimeout(el._t); el._t = setTimeout(function () { el.style.opacity = '0'; }, 4200);
        } catch (e) { }
    }

    /* ---------------- giao diện cấu hình ---------------- */
    var RULES = '{\n  "rules": {\n    ".read": false,\n    ".write": false,\n    "t": { "$code": { ".read": "$code.length >= 16", ".write": "$code.length >= 16" } },\n    "s": { "$code": { ".read": "$code.length >= 12", ".write": "$code.length >= 12" } }\n  }\n}';
    function fmtTime(ts) { if (!ts) return '—'; var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); }; return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); }
    function updateBtn() {
        var t;
        if (!teacherReady()) t = '☁️ ĐỒNG BỘ (chưa bật)';
        else if (S.busy) t = '☁️ Đang đồng bộ...';
        else if (S.lastErr) t = '⚠️ Lỗi đồng bộ';
        else if (S.lastOk) t = '☁️ Đã đồng bộ ' + fmtTime(S.lastOk);
        else t = '☁️ ĐỒNG BỘ';
        var bg = S.lastErr ? 'linear-gradient(90deg,#dc2626,#ea580c)' : (teacherReady() ? 'linear-gradient(90deg,#059669,#0d9488)' : 'linear-gradient(90deg,#64748b,#475569)');
        ['btn-cloud-sync', 'btn-class-cloud'].forEach(function (id) {
            var b = $(id); if (!b) return;
            b.textContent = t; b.style.background = bg;
        });
        /* [CODE72] Quản lí lớp học cần Mã giáo viên MQT1 mới đồng bộ được danh sách học sinh/đề giao giữa các máy */
        var cb = $('btn-class-cloud');
        if (cb && teacherReady() && !S.cfg && !S.lastErr) { cb.textContent = '⚠️ LỚP CHƯA ĐỒNG BỘ • NHẬP MÃ GV'; cb.style.background = 'linear-gradient(90deg,#d97706,#ea580c)'; }
        var lb = $('btn-cloud-sync');
        if (lb && teacherReady() && !S.cfg && !S.lastErr) { lb.textContent = '⚠️ THIẾU MÃ GV (MQT1) • đề/thư mục/lớp chưa đồng bộ'; lb.style.background = 'linear-gradient(90deg,#d97706,#ea580c)'; }
    }
    function copyText(t) {
        try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t); return; } } catch (e) { }
        var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) { } document.body.removeChild(a);
    }
    var modalMsg = { text: '', ok: true };
    function setMsg(text, ok) { modalMsg = { text: text, ok: ok !== false }; var m = $('cloud-msg'); if (m) { m.textContent = text; m.style.color = ok === false ? '#dc2626' : '#047857'; } }
    function openUI() {
        var el = $('cloud-modal'); if (el) el.remove();
        el = document.createElement('div'); el.id = 'cloud-modal';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;font-family:Roboto,Arial,sans-serif';
        el.innerHTML = '<div style="background:#fff;border-radius:20px;max-width:720px;width:100%;max-height:94vh;overflow:auto;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div style="font-size:21px;font-weight:900;color:#0f172a">☁️ ĐỒNG BỘ NHIỀU THIẾT BỊ <span style="font-size:12px;font-weight:800;color:#059669">(CODE67 - có cả Lớp học)</span></div><button type="button" onclick="CloudSync.closeUI()" style="font-size:22px;font-weight:900;color:#475569;padding:2px 12px;border-radius:10px;background:#e2e8f0">✕</button></div>' +
            '<div id="cloud-body"></div></div>';
        document.body.appendChild(el);
        renderModal();
    }
    function closeUI() { var el = $('cloud-modal'); if (el) el.remove(); }
    function refreshModal() { if ($('cloud-modal')) renderModal(); }
    function renderModal() {
        var body = $('cloud-body'); if (!body) return;
        var c = S.cfg, hasStuOnly = !c && !!effStu(), h = '';
        var keep = { u: ($('cloud-url') || {}).value, t: ($('cloud-t') || {}).value, p: ($('cloud-p') || {}).value };
        var keepGas = { mode: ($('gas-mode') || {}).value, urls: ($('gas-urls') || {}).value, key: ($('gas-key') || {}).value };
        if (!S.defT) { S.defT = rnd(24); S.defP = rnd(16); }
        var inp = 'width:100%;border:2px solid #cbd5e1;border-radius:12px;padding:9px 12px;font-weight:700;font-size:15px;margin-top:4px';
        var btn = function (bg) { return 'padding:9px 16px;border-radius:12px;font-weight:900;color:#fff;background:' + bg + ';font-size:14px;text-transform:uppercase'; };
        h += '<div style="margin-top:12px;padding:12px 14px;border-radius:14px;font-weight:800;font-size:15px;background:' + (teacherReady() ? (S.lastErr ? '#fef2f2;color:#b91c1c' : '#ecfdf5;color:#047857') : '#f1f5f9;color:#475569') + '">';
        if (!teacherReady()) h += 'Chưa bật đồng bộ. Dữ liệu hiện chỉ lưu trên thiết bị này.';
        else if (S.lastErr) h += '⚠️ ' + esc(S.lastErr);
        else if (S.busy) h += '⏳ Đang đồng bộ...';
        else if (hasStuOnly) h += '✅ Đang nhận kết quả học sinh & đề giao qua cấu hình nhúng sẵn (' + (S.lastOk ? 'lần cuối ' + fmtTime(S.lastOk) : 'sẵn sàng') + '). Dán thêm Mã kết nối MQT1 bên dưới nếu muốn đồng bộ toàn bộ thư mục riêng của Giáo viên.';
        else h += '✅ Đã bật đồng bộ đầy đủ' + (S.lastOk ? ' • lần cuối ' + fmtTime(S.lastOk) : '') + '. Tự động gộp kết quả học sinh theo cả Mã đề lẫn Tên đề.';
        h += '</div>';
        h += '<div id="cloud-msg" style="margin-top:8px;font-weight:800;font-size:14px;min-height:18px;color:' + (modalMsg.ok ? '#047857' : '#dc2626') + '">' + esc(modalMsg.text) + '</div>';
        var _pubCnt = 0; try { var _ts = g('savedTopics'); if (Array.isArray(_ts)) _pubCnt = _ts.filter(function (x) { return x && x.isPublished; }).length; } catch (e) { }
        var _fbArr = getFbPool();
        var _gCfg0 = window.GasBridge ? window.GasBridge.getConfig() : { urls: [] };
        var _gQ0 = (window.GasBridge && window.GasBridge.getQueueCount) ? window.GasBridge.getQueueCount() : 0;
        var _cardCss = 'padding:10px 12px;border-radius:12px;border:1.5px solid ';
        h += '<div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">' +
            '<div style="' + _cardCss + '#93c5fd;background:#eff6ff"><div style="font-size:11px;font-weight:900;color:#1d4ed8;text-transform:uppercase">Tầng 0 • GitHub Tĩnh</div><div style="font-size:15px;font-weight:900;color:#0f172a;margin-top:2px">' + _pubCnt + ' đề đã xuất bản</div><div style="font-size:11.5px;font-weight:700;color:#475569">0 lượt đọc máy chủ</div></div>' +
            '<div style="' + _cardCss + (_fbArr.length ? '#a5b4fc;background:#eef2ff' : '#cbd5e1;background:#f8fafc') + '"><div style="font-size:11px;font-weight:900;color:#3730a3;text-transform:uppercase">Tầng 1 • Firebase Live</div><div style="font-size:15px;font-weight:900;color:#0f172a;margin-top:2px">' + (_fbArr.length ? (_fbArr.length + ' kho (~' + (_fbArr.length * 100) + ' kết nối)') : 'Chưa bật') + '</div><div style="font-size:11.5px;font-weight:700;color:#475569">Xoay vòng &amp; tự chuyển kho</div></div>' +
            '<div style="' + _cardCss + (_gCfg0.urls.length ? '#6ee7b7;background:#ecfdf5' : '#cbd5e1;background:#f8fafc') + '"><div style="font-size:11px;font-weight:900;color:#047857;text-transform:uppercase">Tầng 2 • Google Sheets</div><div style="font-size:15px;font-weight:900;color:#0f172a;margin-top:2px">' + (_gCfg0.urls.length ? (_gCfg0.urls.length + ' link /exec') : 'Chưa gắn link') + '</div><div style="font-size:11.5px;font-weight:700;color:#475569">' + _gQ0 + ' bài chờ gửi bù</div></div>' +
            '</div>';
        if (effStu()) h += '<div style="margin-top:6px;font-weight:800;font-size:13.5px;color:#334155">🗄️ Mã kho dữ liệu: <b style="font-size:16px;color:#0f766e">' + storeId() + '</b> — mọi máy giáo viên và học sinh phải hiện CÙNG mã này (học sinh xem ở thanh trạng thái trong Thư viện). Khác mã = đang dùng kho khác, sẽ không thấy đề/lớp của nhau.</div>';

        if (teacherReady()) {
            h += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
                '<button type="button" onclick="CloudSync.syncNow()" style="' + btn('linear-gradient(90deg,#059669,#0d9488)') + '">🔄 Đồng bộ ngay</button>' +
                '<button type="button" onclick="CloudSync.checkServer()" style="' + btn('#2563eb') + '">🔍 Kiểm tra kết quả học sinh</button>' +
                '<button type="button" onclick="CloudSync.pullAllResults()" style="' + btn('#7c3aed') + '">⬇️ Tải &amp; Gộp tất cả kết quả về máy</button>' +
                '<button type="button" onclick="CloudSync.downloadConfigJson()" style="' + btn('#0369a1') + '" title="Đặt cạnh index.html trên GitHub để mọi máy tự nhận đúng kho">📄 Tải cloud-config.json</button>' +
                (c ? '<button type="button" onclick="CloudSync.disconnect()" style="' + btn('#dc2626') + '">Ngắt kết nối</button>' : '') +
                '</div>';
        }
        if (S.diag) h += '<div style="margin-top:8px;padding:10px 14px;border-radius:12px;background:#f1f5f9;font-weight:700;font-size:13.5px;line-height:1.55;color:#0f172a;white-space:pre-wrap">' + esc(S.diag) + '</div>';

        // [HƯỚNG A - MICRO-TASK 2] Cấu hình Máy chủ Google Apps Script + Chế độ 2 tầng
        var gCfg = window.GasBridge ? window.GasBridge.getConfig() : { mode: 'hybrid', urls: [], key: '' };
        var gMode = keepGas.mode || gCfg.mode || 'hybrid';
        var gUrlsTxt = (typeof keepGas.urls === 'string') ? keepGas.urls : (gCfg.urls || []).join('\n');
        var gKeyVal = (typeof keepGas.key === 'string') ? keepGas.key : (gCfg.key || '');
        var gCount = (gCfg.urls || []).length;
        h += '<div style="margin-top:14px;padding:14px;border-radius:16px;background:#f8fafc;border:2px solid #0ea5e9">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<div style="font-size:16px;font-weight:900;color:#0369a1">🚀 MÁY CHỦ HƯỚNG A (Google Apps Script + GitHub Pages)</div>' +
            '<span style="font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;background:' + (gCount ? '#dcfce7;color:#166534' : '#e2e8f0;color:#475569') + '">' + (gCount ? 'Đã gắn ' + gCount + ' link' : 'Chưa gắn link') + '</span></div>' +
            '<div style="margin-top:8px;font-size:13px;font-weight:600;color:#334155;line-height:1.45">Gắn 1 hoặc nhiều link Web App (<code>/exec</code>) từ Google Sheets để lưu điểm chính thức &amp; tự động dự phòng khi lớp đông.</div>' +
            '<div style="margin-top:10px"><label style="font-weight:900;font-size:13.5px;color:#0f172a">1) Chế độ vận hành</label>' +
            '<select id="gas-mode" style="' + inp + ';background:#fff;font-size:14px">' +
            '<option value="hybrid"' + (gMode === 'hybrid' ? ' selected' : '') + '>Hướng A — Tự động 2 tầng (Khuyên dùng: Firebase Live + Apps Script lưu điểm &amp; dự phòng)</option>' +
            '<option value="gas"' + (gMode === 'gas' ? ' selected' : '') + '>Chỉ Google Apps Script + Google Sheets (Không dùng Firebase)</option>' +
            '<option value="firebase"' + (gMode === 'firebase' ? ' selected' : '') + '>Chỉ Firebase (Chế độ cũ)</option>' +
            '</select></div>' +
            '<div style="margin-top:10px"><label style="font-weight:900;font-size:13.5px;color:#0f172a">2) Danh sách Link Web App Apps Script (mỗi dòng 1 link <code>https://script.google.com/.../exec</code>)</label>' +
            '<textarea id="gas-urls" rows="2" style="' + inp + ';font-family:monospace;font-size:12.5px" placeholder="https://script.google.com/macros/s/.../exec">' + esc(gUrlsTxt) + '</textarea></div>' +
            '<div style="margin-top:10px"><label style="font-weight:900;font-size:13.5px;color:#0f172a">3) Mã bảo mật SECRET_KEY (tùy chọn — để trống nếu không đặt trong Apps Script)</label>' +
            '<input id="gas-key" type="text" style="' + inp + ';font-size:13.5px" placeholder="Để trống nếu không dùng khóa" value="' + esc(gKeyVal) + '"></div>' +
            '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
            '<button type="button" onclick="CloudSync.saveGasConfig()" style="' + btn('#0284c7') + '">💾 Lưu cấu hình Hướng A</button>' +
            '<button type="button" onclick="CloudSync.testGasConnection()" style="' + btn('linear-gradient(90deg,#059669,#0d9488)') + '">🔌 Kiểm tra kết nối</button>' +
            (gCount ? '<button type="button" onclick="CloudSync.pullAllResults()" style="' + btn('#7c3aed') + '">⬇️ Tải &amp; Gộp kết quả từ Sheets</button>' : '') +
            '</div>' +
            (gCount ? '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
                '<button type="button" onclick="CloudSync.syncClassesAndAccountsGas()" style="' + btn('#0f766e') + '">🏫 Đồng bộ Lớp &amp; TK lên Sheets</button>' +
                '<button type="button" onclick="CloudSync.pullClassesAndAccountsGas()" style="' + btn('#0369a1') + '">⬇️ Tải Lớp &amp; TK từ Sheets</button>' +
                '<button type="button" onclick="CloudSync.backupBankGas()" style="' + btn('#b45309') + '">💾 Sao lưu Ngân hàng đề</button>' +
                '<button type="button" onclick="CloudSync.restoreBankGas()" style="' + btn('#4f46e5') + '">📥 Khôi phục Ngân hàng đề</button>' +
                '<button type="button" onclick="CloudSync.pushLibraryToDriveGas()" style="' + btn('linear-gradient(90deg,#0284c7,#2563eb)') + '">☁️ Đẩy Thư viện &amp; MinMap lên Drive</button>' +
                '<button type="button" onclick="CloudSync.pullLibraryFromDriveGas()" style="' + btn('linear-gradient(90deg,#059669,#0d9488)') + '">⬇️ Kéo Thư viện &amp; MinMap từ Drive</button>' +
                '</div>' : '') +
            (gCfg && window.GasBridge && window.GasBridge.getQueueCount() > 0 ? '<div style="margin-top:8px;font-size:12.5px;font-weight:800;color:#b45309">⏳ Đang có ' + window.GasBridge.getQueueCount() + ' bài nộp chờ gửi bù lên Sheets.</div>' : '') +
            '<div id="gas-test-status" style="margin-top:10px"></div>' +
            '</div>';

        if (!c) {
            h += '<div style="margin-top:16px;padding-top:12px;border-top:2px dashed #cbd5e1"><label style="font-weight:900;font-size:14px">Dán <b>Mã kết nối (MQT1...)</b> lấy từ máy tính vào đây:</label><textarea id="cloud-code" rows="2" style="' + inp + ';font-size:13px" placeholder="MQT1...."></textarea><button type="button" onclick="CloudSync.connectCode()" style="' + btn('linear-gradient(90deg,#2563eb,#4f46e5)') + ';margin-top:8px">📥 Nhập mã &amp; đồng bộ</button></div>';
            h += '<details style="margin-top:12px;background:#eff6ff;border-radius:14px;padding:10px 14px"><summary style="cursor:pointer;font-weight:900;color:#1d4ed8">⚙️ Hoặc thiết lập kho Firebase mới từ đầu</summary>' +
                '<div style="margin-top:8px;padding:8px 12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:13px;line-height:1.5">⚠️ CHỈ dùng ở lần đầu tiên, trên MỘT máy duy nhất. Nếu đã có kho ở máy khác thì phải dán <b>Mã MQT1</b> ở trên. Mỗi lần tạo “kho mới” là một nơi lưu dữ liệu RIÊNG nên đề, lớp và học sinh sẽ không thấy nhau.</div>' +
                '<div style="margin-top:10px"><label style="font-weight:900;font-size:14px">1) Địa chỉ Realtime Database (URL)</label><input id="cloud-url" style="' + inp + '" placeholder="https://ten-du-an-default-rtdb.asia-southeast1.firebasedatabase.app" autocomplete="off" value="' + esc(keep.u || '') + '"></div>' +
                '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap"><div style="flex:1;min-width:230px"><label style="font-weight:900;font-size:14px">2) Mã giáo viên (bí mật)</label><input id="cloud-t" style="' + inp + '" value="' + esc(keep.t || S.defT) + '"></div>' +
                '<div style="flex:1;min-width:200px"><label style="font-weight:900;font-size:14px">3) Mã học sinh</label><input id="cloud-p" style="' + inp + '" value="' + esc(keep.p || S.defP) + '"></div></div>' +
                '<div style="margin-top:12px"><button type="button" onclick="CloudSync.connect()" style="' + btn('linear-gradient(90deg,#059669,#0d9488)') + '">🔗 Kết nối &amp; đồng bộ</button></div></details>';
        } else {
            h += '<div style="margin-top:16px;padding:12px 14px;border-radius:14px;background:#fffbeb;border:2px solid #fcd34d"><div style="font-weight:900;color:#92400e">📱 Mã kết nối dành cho trang GitHub / thiết bị giáo viên khác</div><div style="font-weight:600;font-size:13.5px;color:#78350f;margin:4px 0 8px">Sao chép mã này dán vào mục ĐỒNG BỘ trên trang GitHub (hoặc xuất file index.html mới đẩy lên GitHub):</div>' +
                '<textarea id="cloud-fullcode" readonly rows="3" style="' + inp + ';font-size:12px">' + esc(fullCode()) + '</textarea>' +
                '<button type="button" onclick="CloudSync.copyFull()" style="' + btn('#d97706') + ';margin-top:8px">📋 Sao chép Mã kết nối</button></div>';
        }
        var fbExtra = loadFbPoolRaw();
        var fbAll = getFbPool();
        var keepPoolTxt = ($('fb-pool-codes') || {}).value;
        var fbPoolTxt = (typeof keepPoolTxt === 'string') ? keepPoolTxt : fbExtra.map(function (x) { return x.raw || tokenFor(x); }).join('\n');
        h += '<div style="margin-top:14px;padding:14px;border-radius:16px;background:#eef2ff;border:2px solid #6366f1">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<div style="font-size:15.5px;font-weight:900;color:#3730a3">🔥 KHO FIREBASE PHỤ (Multi-Firebase Pool — >100 kết nối Live)</div>' +
            '<span id="fb-pool-badge" style="font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;background:#e0e7ff;color:#3730a3">' + fbAll.length + ' kho Live (~' + (fbAll.length * 100) + ' kết nối)</span></div>' +
            '<div style="margin-top:6px;font-size:13px;font-weight:600;color:#334155">Dán thêm <b>link Database</b> (<code>https://...firebasedatabase.app/</code>) hoặc mã <b>MQT1...</b> tạo từ Gmail của Thầy, mỗi dòng 1 kho. App tự xoay vòng chia phòng &amp; chuyển kho dự phòng khi đông.</div>' +
            '<textarea id="fb-pool-codes" rows="2" style="' + inp + ';font-family:monospace;font-size:12px;margin-top:8px" placeholder="MQT1.... (mỗi dòng 1 mã kho phụ)">' + esc(fbPoolTxt) + '</textarea>' +
            '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<button type="button" onclick="CloudSync.saveFbPoolUI()" style="' + btn('#4f46e5') + '">💾 Lưu kho Firebase phụ</button>' +
            '<button type="button" onclick="CloudSync.testFbPoolUI()" style="' + btn('#059669') + '">🔌 Kiểm tra kho Firebase</button>' +
            '<span id="fb-pool-status" style="font-size:13px;font-weight:800;color:#3730a3"></span></div><div id="fb-pool-diag" style="margin-top:6px"></div></div>';
        h += '<details style="margin-top:14px"><summary style="cursor:pointer;font-weight:900;color:#334155">🔐 Rules cần dán trong Firebase (bấm để xem)</summary><textarea id="cloud-rules" readonly rows="9" style="' + inp + ';font-family:monospace;font-size:12.5px">' + esc(RULES) + '</textarea><button type="button" onclick="CloudSync.copyRules()" style="' + btn('#475569') + ';margin-top:6px">📋 Sao chép Rules</button></details>';
        body.innerHTML = h;
    }

    /* ---------------- hành động ---------------- */
    function testAndStart(cfg) {
        S.cfg = cfg; lsSet(LS_CFG, cfg);
        S.stu = { u: cfg.u, p: cfg.p }; lsSet(LS_STU, S.stu);
        S.meta = { cfgId: hash(cfg.u + '|' + cfg.t + '|' + cfg.p), rev: {} }; saveMeta();
        localWaited = false;
        setMsg('Đang kiểm tra kết nối...', true); renderModal();
        return req('PATCH', 't', '', { 'info/created': SV, 'info/app': 'matrix-quiz' }).then(function () {
            return req('PATCH', 's', '', { 'info/created': SV });
        }).then(function () {
            setMsg('✓ Kết nối thành công. Đang đồng bộ & hợp nhất dữ liệu...', true);
            installBtn(); updateBtn(); startPolling(); S.dirty = true;
            return sync().then(function () {
                if (S.lastErr) setMsg('⚠️ ' + S.lastErr, false);
                else setMsg('✓ Đồng bộ xong lúc ' + fmtTime(S.lastOk) + '.', true);
                renderModal();
            });
        }).catch(function (e) {
            S.cfg = null; localStorage.removeItem(LS_CFG);
            setMsg('⚠️ ' + (e.message || e), false); renderModal(); updateBtn();
        });
    }
    function connect() {
        var u = normUrl(($('cloud-url') || {}).value), t = String(($('cloud-t') || {}).value || '').trim(), p = String(($('cloud-p') || {}).value || '').trim();
        if (!u) return setMsg('⚠️ Hãy nhập địa chỉ Realtime Database (bắt đầu bằng https://).', false);
        if (t.length < 16) return setMsg('⚠️ Mã giáo viên phải có ít nhất 16 ký tự.', false);
        if (p.length < 12) return setMsg('⚠️ Mã học sinh phải có ít nhất 12 ký tự.', false);
        if (!/^[A-Za-z0-9_\-]+$/.test(t) || !/^[A-Za-z0-9_\-]+$/.test(p)) return setMsg('⚠️ Mã chỉ gồm chữ cái, số, gạch ngang, gạch dưới.', false);
        testAndStart({ u: u, t: t, p: p });
    }
    function connectCode() {
        var c = parseFullCode(($('cloud-code') || {}).value);
        if (!c) return setMsg('⚠️ Mã kết nối không hợp lệ. Hãy sao chép đầy đủ từ máy đầu tiên.', false);
        testAndStart(c);
    }
    function disconnect() {
        if (!confirm('Ngắt kết nối đồng bộ trên thiết bị này?')) return;
        S.cfg = null; localStorage.removeItem(LS_CFG); localStorage.removeItem(LS_META);
        S.meta = { rev: {} }; S.lastErr = ''; S.lastOk = 0; clearInterval(S.poll);
        setMsg('Đã ngắt kết nối.', true); updateBtn(); renderModal();
    }
    function syncNow() {
        /* Làm mới cưỡng bức revision để tải lại đề, thư mục, lớp và kết quả từ Firebase. */
        S.meta.rev = {}; S.meta.recoveryRev = {}; S.dirty = true;
        setMsg('Đang tải dữ liệu mới nhất từ máy chủ...', true);
        sync().then(function () {
            setMsg(S.lastErr ? '⚠️ ' + S.lastErr + ' — dữ liệu chưa được xác nhận đồng bộ.' : '✓ Đã kiểm tra và đồng bộ dữ liệu lúc ' + fmtTime(S.lastOk) + '.', !S.lastErr);
            renderModal();
        });
    }
    function copyFull() { copyText(fullCode()); setMsg('✓ Đã sao chép Mã kết nối.', true); }
    function copyRules() { copyText(RULES); setMsg('✓ Đã sao chép Rules.', true); }

    /* ---------------- gắn vào app ---------------- */
    function installBtn() {
        var ex = $('btn-cloud-sync');
        if (ex) { ex.onclick = openUI; updateBtn(); return; }
        var host = $('library-footer-teacher-actions'); if (!host) return;
        var b = document.createElement('button');
        b.type = 'button'; b.id = 'btn-cloud-sync'; b.onclick = openUI;
        b.className = 'px-4 py-2 rounded-xl font-black text-white shadow-sm text-[15px] uppercase';
        host.appendChild(b); updateBtn();
    }
    function wrap(name) {
        var f = window[name];
        if (typeof f !== 'function' || orig[name]) return;
        orig[name] = f;
        window[name] = function () {
            if (name === 'saveStudentResultsToStorage') enrichLocalResults();
            var r = f.apply(this, arguments);
            var stuRes = (name === 'saveStudentResultsToStorage' && isStu());
            if (stuRes) {
                S.dirty = true;
                if (!effStu()) resultState('nolink');
                else {
                    resultState('sending');
                    flushBeacon();
                    clearTimeout(S.timer); setTimeout(function () { sync(); }, 0);
                }
            } else if (!S.applying) schedule(false);
            return r;
        };
    }
    function wrapOpen(name) {
        var f = window[name];
        if (typeof f !== 'function' || orig[name]) return;
        orig[name] = f;
        window[name] = function () {
            var r = f.apply(this, arguments);
            if (teacherReady()) {
                schedule(true, true);
                if (name === 'openResultsModal') refreshResultsNow(arguments[0]);
            } else if (name === 'openResultsModal') {
                S.hint = null; repaintResults();
            }
            return r;
        };
    }
    /* [CODE75] Tệp cloud-config.json đặt cạnh index.html trên GitHub = nơi duy nhất báo cho MỌI máy biết đang dùng kho nào. */
    function fetchRemoteConfig() {
        try {
            if (S.cfg || S.remoteCfgBusy || location.protocol === 'file:') return;
            S.remoteCfgBusy = true;
            var u = location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/, '') + 'cloud-config.json?cb=' + Date.now();
            fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (o) {
                S.remoteCfgBusy = false;
                if (!o || typeof o !== 'object') return;
                var c = o.token ? parseStuToken(o.token) : ((o.u && o.p) ? { u: normUrl(o.u), p: String(o.p) } : null);
                if (!c || !c.u || String(c.p).length < 12) return;
                if (S.stu && S.stu.u === c.u && S.stu.p === c.p) return;
                S.stu = { u: c.u, p: c.p, ts: Date.now(), src: 'json' }; lsSet(LS_STU, S.stu);
                S.meta = { cfgId: hash(c.u + '|' + c.p), buildId: String(window.__PRELOADED_BUILD_ID__ || ''), rev: {} }; saveMeta();
                S.stuInfo = {};
                schedule(true, true);
                try { if (typeof window.renderLibraryList === 'function') window.renderLibraryList(); } catch (e) { }
            }).catch(function () { S.remoteCfgBusy = false; });
        } catch (e) { S.remoteCfgBusy = false; }
    }
    function downloadConfigJson() {
        var c = effStu();
        if (!c) { setMsg('Chưa có kết nối máy chủ để tạo cloud-config.json.', false); return; }
        var data = JSON.stringify({ u: c.u, p: c.p, note: 'Đặt tệp này cùng thư mục với index.html trên GitHub. Mọi máy học sinh/giáo viên mở trang sẽ tự nhận đúng kho dữ liệu này.' }, null, 2);
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = 'cloud-config.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setMsg('✓ Đã tải cloud-config.json. Hãy tải tệp này lên GitHub, cùng thư mục với index.html.', true);
    }

    function install() {
        if (S.installed) return; S.installed = true;
        loadCfg();
        fetchRemoteConfig();
        ['saveToStorage', 'saveFolders', 'cmSave', 'saveStudentResultsToStorage'].forEach(wrap);
        ['openResultsModal', 'openClassManager'].forEach(wrapOpen);
        document.addEventListener('visibilitychange', function () { if (document.hidden) flushBeacon(); });
        window.addEventListener('pagehide', flushBeacon);
        var bsu = window.buildStudentShareUrl;
        if (typeof bsu === 'function') {
            window.buildStudentShareUrl = function (topic) {
                if (topic && teacherReady()) {
                    S.forcePub.add(topic.id); schedule(true);
                    var baseUrl = (typeof window.getEffectiveBaseUrl === 'function') ? window.getEffectiveBaseUrl() : (location.href.split('#')[0].split('?')[0]);
                    return baseUrl + '?id=' + encodeURIComponent(topic.id) + '&mode=hs&cl=' + token();
                }
                return bsu.apply(this, arguments);
            };
        }
        var esm = window.enableStudentModeUI;
        if (typeof esm === 'function') {
            window.enableStudentModeUI = function () {
                var r = esm.apply(this, arguments);
                try { S.stuInfo = {}; S.dirty = true; fetchRemoteConfig(); setTimeout(function () { schedule(true, true); }, 50); } catch (e) { }
                return r;
            };
        }
        installBtn(); updateBtn();
        window.addEventListener('online', function () { schedule(true, true); });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(true, true); });
        window.addEventListener('focus', function () { if (Date.now() - S.lastPullTs > 4000) { S.lastPullTs = Date.now(); schedule(true, true); } });
        if (teacherReady()) { startPolling(); }
        S.dirty = true;
        setTimeout(function () { schedule(true); }, 900);
        setInterval(function () {
            if (studentReady() && !S.busy && (S.dirty || !S.lastOk || (!document.hidden && Date.now() - S.lastPullTs > 30000))) { S.lastPullTs = Date.now(); schedule(true, true); }   /* [CODE158] học sinh: 30 giây/lần (vẫn tải ngay khi mở lại tab / có mạng) */
        }, 8000);
    }

    function bootStudentLink() {
        try {
            if (!S.installed) install();
            var p = new URLSearchParams(location.search), id = p.get('id');
            if (!id || p.get('mode') !== 'hs') return false;
            var c = effStu(); if (!c) return false;
            window.enableStudentModeUI(); window.checkSavedLoginSession(true);
            var st = $('status-message'); if (st) st.textContent = '⏳ Đang tải đề thi từ máy chủ...';
            var cached = function () { var T = g('savedTopics'); return T.find(function (t) { return t && t.id === id; }) || null; };
            req('GET', 's', 'pub/' + enc(id)).then(function (env) {
                var o = env && typeof env.d === 'string' ? parseEnv(env) : null;
                if (!o) {
                    var c0 = cached(); if (c0) { window.applyTopic(c0); schedule(true); return; }
                    throw new Error('Đề thi này chưa được giáo viên xuất bản hoặc đã bị xóa.');
                }
                S.pubTopics[enc(o.id)] = o;
                var T = g('savedTopics'), i = T.findIndex(function (t) { return t && t.id === o.id; });
                if (i >= 0) T[i] = o; else T.push(o);
                S.applying = true; try { orig.saveToStorage ? orig.saveToStorage() : window.saveToStorage(); } catch (e) { } S.applying = false;
                window.applyTopic(o);
                schedule(true, true);
            }).catch(function (e) {
                var c1 = cached();
                if (c1) { window.applyTopic(c1); return; }
                window.showModal('Không tải được đề', (e && e.message ? e.message : 'Lỗi không xác định') + '\nHãy kiểm tra mạng rồi tải lại trang (hoặc nhờ giáo viên gửi lại link).', 'info');
            });
            return true;
        } catch (e) { return false; }
    }

    /* [CODE67] Học sinh dán link / mã MQC1 do giáo viên gửi để kết nối khi chưa mở bằng link */
    function setStudentToken(v) {
        v = String(v || '').trim();
        var m = v.match(/[?&]cl=([^&#\s]+)/);
        if (m) { try { v = decodeURIComponent(m[1]); } catch (e) { v = m[1]; } }
        var c = parseStuToken(v);
        if (!c) return false;
        c.ts = Date.now(); c.src = 'link'; S.stu = c; lsSet(LS_STU, c);
        S.meta = { cfgId: hash(c.u + '|' + c.p), buildId: String(window.__PRELOADED_BUILD_ID__ || ''), rev: {} }; saveMeta();
        schedule(true, true);
        return true;
    }

    window.CloudSync = {
        setStudentToken: setStudentToken,
        liveCfg: function () { var c = effStu(); return c ? { u: c.u, p: c.p } : null; }, liveToken: token, tokenFor: tokenFor, parseToken: parseStuToken,
        getFbPool: getFbPool, pickLiveCfg: pickLiveCfg, nextFbIdx: nextFbIdx, saveFbPool: saveFbPool, testFbPool: testFbPool,
        testFbPoolUI: function () {
            if ($('fb-pool-codes') && window.CloudSync && window.CloudSync.saveFbPoolUI) {
                window.CloudSync.saveFbPoolUI();
            }
            var diag = $('fb-pool-diag');
            if (diag) diag.innerHTML = '<div style="font-size:12.5px;font-weight:800;color:#1d4ed8">⏳ Đang kiểm tra Ghi-Đọc-Xóa thật (PUT → GET → DELETE) trên từng kho Firebase...</div>';
            return testFbPool().then(function (rep) {
                if (!diag) return rep;
                if (!rep.results.length) {
                    diag.innerHTML = '<div style="font-size:12.5px;font-weight:800;color:#dc2626">⚠️ Chưa có kho Firebase nào được cấu hình.</div>';
                    return rep;
                }
                diag.innerHTML = rep.results.map(function (r) {
                    return r.ok
                        ? '<div style="margin-top:4px;padding:6px 10px;border-radius:8px;background:#ecfdf5;color:#047857;font-size:12.5px;font-weight:800">✅ Kho #' + r.idx + ': Ghi-Đọc-Xóa thật thành công (' + r.ms + ' ms) — ' + esc(r.u) + '</div>'
                        : '<div style="margin-top:4px;padding:6px 10px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:12.5px;font-weight:800">❌ Kho #' + r.idx + ': ' + esc(r.error) + ' — ' + esc(r.u) + '</div>';
                }).join('');
                return rep;
            });
        },
        saveFbPoolUI: function () {
            var raw = ($('fb-pool-codes') || {}).value || '';
            var r = saveFbPool(raw);
            var st = $('fb-pool-status');
            var total = getFbPool().length;
            var bg = $('fb-pool-badge');
            if (bg) bg.textContent = total + ' kho Live (~' + (total * 100) + ' kết nối)';
            if (!r.ok) {
                if (st) { st.style.color = '#dc2626'; st.textContent = '⚠️ Đã lưu ' + r.saved.length + ' kho hợp lệ, bỏ qua ' + r.invalid.length + ' mã sai định dạng.'; }
                return r;
            }
            if (st) { st.style.color = '#047857'; st.textContent = '✅ Đã lưu! Tổng ' + total + ' kho Live (~' + (total * 100) + ' kết nối).'; }
            return r;
        },
        install: install, bootStudentLink: bootStudentLink, openUI: openUI, closeUI: closeUI,
        connect: connect, connectCode: connectCode, disconnect: disconnect, syncNow: syncNow,
        copyFull: copyFull, copyRules: copyRules, schedule: schedule, sync: sync, retry: retry,
        statusHtml: statusHtml, checkServer: checkServer, refreshResultsNow: refreshResultsNow,
        hintHtml: hintHtml, studentBannerHtml: studentBannerHtml, studentRefresh: studentRefresh, studentConnect: studentConnect, downloadConfigJson: downloadConfigJson, pullAllResults: pullAllResults, noteResultDeleted: noteResultDeleted,
        adoptOrphanResults: adoptOrphanResults, unifySameTitleResults: unifySameTitleResults,
        linkSuffix: function () { var t = (S.cfg || effStu()) ? token() : ''; return t ? '&cl=' + t : ''; },
        saveGasConfig: function () {
            if (!window.GasBridge) return;
            var mode = ($('gas-mode') || {}).value || 'hybrid';
            var rawUrls = ($('gas-urls') || {}).value || '';
            var key = ($('gas-key') || {}).value || '';
            var res = window.GasBridge.saveConfig({ mode: mode, urls: rawUrls, key: key });
            var box = $('gas-test-status');
            if (!res.ok) {
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:13.5px">❌ ' + esc(res.error) + '</div>';
                setMsg('❌ ' + res.error, false);
                return res;
            }
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#ecfdf5;color:#047857;font-weight:800;font-size:13.5px">✅ Đã lưu cấu hình Hướng A (' + esc(res.config.mode) + ' • ' + res.config.urls.length + ' link). Bấm "Kiểm tra kết nối" để xác nhận máy chủ.</div>';
            setMsg('✅ Đã lưu cấu hình Hướng A.', true);
            return res;
        },
        testGasConnection: function () {
            if (!window.GasBridge) return Promise.resolve();
            var mode = ($('gas-mode') || {}).value || 'hybrid';
            var rawUrls = ($('gas-urls') || {}).value || '';
            var key = ($('gas-key') || {}).value || '';
            var saved = window.GasBridge.saveConfig({ mode: mode, urls: rawUrls, key: key });
            var box = $('gas-test-status');
            if (!saved.ok) {
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:13.5px">❌ ' + esc(saved.error) + '</div>';
                return Promise.resolve(saved);
            }
            if (!saved.config.urls.length) {
                var msg = '⚠️ Hãy dán ít nhất 1 link Web App Apps Script (/exec) trước khi kiểm tra.';
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:13.5px">' + msg + '</div>';
                return Promise.resolve({ ok: false, error: msg });
            }
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13.5px">⏳ Đang gọi kiểm tra ' + saved.config.urls.length + ' máy chủ Apps Script...</div>';
            return window.GasBridge.pingAll(saved.config.urls, saved.config.key).then(function (report) {
                var out = '';
                report.results.forEach(function (r, idx) {
                    if (r.ok) {
                        var sheetNote = r.missingSheets && r.missingSheets.length
                            ? '⚠️ Thiếu trang tính: ' + r.missingSheets.join(', ')
                            : 'Đủ 4 trang tính (' + (r.sheets || []).join(', ') + ')';
                        out += '<div style="margin-top:6px;padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #86efac;color:#047857;font-weight:800;font-size:13px">✅ Link #' + (idx + 1) + ': Kết nối thành công (' + r.latencyMs + ' ms) • ' + esc(sheetNote) + '</div>';
                    } else {
                        out += '<div style="margin-top:6px;padding:10px 12px;border-radius:10px;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;font-weight:800;font-size:13px">❌ Link #' + (idx + 1) + ': ' + esc(r.error || 'Lỗi không xác định') + '</div>';
                    }
                });
                if (box) box.innerHTML = out;
                setMsg(report.allOk ? '✅ Kết nối Apps Script thành công!' : '⚠️ Có link Apps Script chưa kết nối được.', report.allOk);
                return report;
            });
        },
        syncClassesAndAccountsGas: function () {
            if (!window.GasBridge) return Promise.resolve();
            var box = $('gas-test-status');
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang đồng bộ Lớp học &amp; Tài khoản HS lên Google Sheets...</div>';
            return Promise.all([
                window.GasBridge.syncClassesToGas(),
                window.GasBridge.syncAllAccountsToGas()
            ]).then(function (arr) {
                var cRes = arr[0] || {}, aRes = arr[1] || {};
                var ok = !!(cRes.ok && aRes.ok);
                var msg = ok
                    ? ('✅ Đã đồng bộ lên Sheets: ' + (cRes.count || 0) + ' lớp học &amp; ' + (aRes.count || 0) + ' tài khoản HS.')
                    : ('⚠️ Đồng bộ chưa đủ: ' + (cRes.error || aRes.error || 'Lỗi kết nối'));
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:' + (ok ? '#ecfdf5;color:#047857' : '#fef2f2;color:#b91c1c') + ';font-weight:800;font-size:13px">' + msg + '</div>';
                return { ok: ok, classes: cRes, accounts: aRes };
            });
        },
        pullClassesAndAccountsGas: function () {
            if (!window.GasBridge) return Promise.resolve();
            var box = $('gas-test-status');
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang tải Lớp học &amp; Tài khoản HS từ Google Sheets...</div>';
            return window.GasBridge.pullClassesAndAccountsFromGas().then(function (res) {
                if (res && res.ok) {
                    try { if (window.ClassNet && ClassNet.onSyncDone) ClassNet.onSyncDone(); } catch (e) { }
                    if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#ecfdf5;color:#047857;font-weight:800;font-size:13px">✅ Đã tải &amp; gộp từ Sheets: ' + res.classesAdded + ' lớp mới (tổng ' + res.classesTotal + ' lớp), ' + res.accountsAdded + ' tài khoản HS mới.</div>';
                } else {
                    if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:13px">❌ ' + esc((res && res.error) || 'Không tải được dữ liệu.') + '</div>';
                }
                return res;
            });
        },
        backupBankGas: function () {
            if (!window.GasBridge) return Promise.resolve();
            var box = $('gas-test-status');
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang sao lưu Ngân hàng câu hỏi lên Google Sheets...</div>';
            return window.GasBridge.backupBankToGas().then(function (res) {
                var ok = !!(res && res.ok);
                var msg = ok
                    ? ('✅ Đã sao lưu Ngân hàng đề lên Sheets (' + (res.questionCount || 0) + ' câu hỏi, chia ' + (res.chunks || 1) + ' gói).')
                    : ('❌ ' + esc((res && res.error) || 'Sao lưu thất bại.'));
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:' + (ok ? '#ecfdf5;color:#047857' : '#fef2f2;color:#b91c1c') + ';font-weight:800;font-size:13px">' + msg + '</div>';
                return res;
            });
        },
        restoreBankGas: function () {
            if (!window.GasBridge) return Promise.resolve();
            var box = $('gas-test-status');
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang khôi phục Ngân hàng câu hỏi từ Google Sheets...</div>';
            return window.GasBridge.restoreBankFromGas().then(function (res) {
                var ok = !!(res && res.ok);
                var msg = ok
                    ? ('✅ Đã khôi phục Ngân hàng đề từ Sheets (' + (res.questionCount || 0) + ' câu hỏi).')
                    : ('❌ ' + esc((res && res.error) || 'Khôi phục thất bại.'));
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:' + (ok ? '#ecfdf5;color:#047857' : '#fef2f2;color:#b91c1c') + ';font-weight:800;font-size:13px">' + msg + '</div>';
                return res;
            });
        },
        pushLibraryToDriveGas: function () {
            if (!window.GasBridge || !window.GasBridge.pushLibraryToDrive) return Promise.resolve();
            var box = $('gas-test-status');
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang chuẩn bị đẩy Thư viện &amp; MinMap lên Google Drive (GAS #1)...</div>';
            return window.GasBridge.pushLibraryToDrive(function (prog) {
                if (!box || !prog) return;
                box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang đẩy lên Drive: ' + (prog.done || 0) + '/' + (prog.total || 0) + ' đề...</div>';
            }).then(function (res) {
                var ok = !!(res && res.ok);
                var msg = ok
                    ? ('✅ Đã đẩy lên Drive: ' + (res.topicCount || 0) + ' đề (' + (res.batches || 1) + ' lô) &amp; ' + (res.imageCount || 0) + ' ảnh WebP vào thư mục Thi_Online_LTD_CloudData.')
                    : ('❌ ' + esc((res && res.error) || 'Đẩy lên Drive thất bại.'));
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:' + (ok ? '#ecfdf5;color:#047857' : '#fef2f2;color:#b91c1c') + ';font-weight:800;font-size:13px">' + msg + '</div>';
                return res;
            });
        },
        pullLibraryFromDriveGas: function () {
            if (!window.GasBridge || !window.GasBridge.pullLibraryFromDrive) return Promise.resolve();
            var box = $('gas-test-status');
            if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang tải Mục lục Thư viện từ Google Drive (GAS #1)...</div>';
            return window.GasBridge.pullLibraryFromDrive(function (prog) {
                if (!box || !prog) return;
                box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800;font-size:13px">⏳ Đang kéo từ Drive: ' + (prog.done || 0) + '/' + (prog.total || 0) + ' đề...</div>';
            }).then(function (res) {
                var ok = !!(res && res.ok);
                var msg = ok
                    ? ('✅ Đã kéo từ Drive: ' + (res.pulledCount || 0) + ' đề mới/cập nhật (tổng ' + (res.totalInIndex || 0) + ' đề trong Mục lục).')
                    : ('❌ ' + esc((res && res.error) || 'Kéo từ Drive thất bại.'));
                if (box) box.innerHTML = '<div style="padding:10px 12px;border-radius:10px;background:' + (ok ? '#ecfdf5;color:#047857' : '#fef2f2;color:#b91c1c') + ';font-weight:800;font-size:13px">' + msg + '</div>';
                return res;
            });
        },
        gas: function () { return window.GasBridge; },
        embedSnippet: function () {
            var c = effStu();
            var s = c ? 'window.__CLOUD_CONFIG__ = ' + JSON.stringify(c).replace(/</g, '\u003c') + '; ' : '';
            var extra = loadFbPoolRaw().map(function (x) { return { u: x.u, p: x.p }; });
            if (extra.length) s += 'window.__FB_POOL__ = ' + JSON.stringify(extra).replace(/</g, '\u003c') + '; ';
            if (window.GasBridge) s += window.GasBridge.embedSnippet();
            return s;
        },
        _state: S, _hash: hash, _enc: enc,
        api: { req: req, enc: enc, effStu: effStu, teacherReady: teacherReady, teacherFull: teacherFullReady, fullCode: fullCode, isStu: isStu, hash: hash, token: token,
                status: function () { return { lastOk: S.lastOk, lastErr: S.lastErr, busy: S.busy }; } }
    };
})();

// === [gas-bridge-module] ===
/* ======================================================================
   [HƯỚNG A - MICRO-TASK 2] GAS BRIDGE: CẤU HÌNH & KIỂM TRA KẾT NỐI APPS SCRIPT
   - Lưu cấu hình vào localStorage (matrix_gas_cfg_v1) + đọc fallback window.__GAS_CONFIG__.
   - Hỗ trợ 3 chế độ: hybrid (Hướng A 2 tầng), gas (Chỉ Apps Script), firebase (Chỉ Firebase).
   - Hỗ trợ 1 hoặc nhiều link /exec (xoay vòng chia tải ở các chặng sau).
   - Kiểm tra kết nối bằng GET ?action=ping (không gửi custom header để tránh lỗi CORS).
====================================================================== */
(function () {
    var LS_GAS_CFG = 'matrix_gas_cfg_v1';
    var EXPECTED_SHEETS = ['DeThi_CauHinh', 'KetQua_NopBai', 'LopHoc_TaiKhoan', 'PhongThi_Live'];
    var rrIndex = 0;

    function safeJsonParse(raw, fallback) {
        try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
    }

    function normalizeMode(m) {
        return (m === 'gas' || m === 'firebase' || m === 'hybrid') ? m : 'hybrid';
    }

    function parseUrls(input) {
        var list = Array.isArray(input) ? input : String(input || '').split(/[\r\n,;]+/);
        var seen = {};
        var valid = [];
        var invalid = [];
        for (var i = 0; i < list.length; i++) {
            var u = String(list[i] || '').trim();
            if (!u) continue;
            if (!/^https:\/\//i.test(u) || u.indexOf('script.google.com') === -1 || u.indexOf('/exec') === -1) {
                invalid.push(u);
                continue;
            }
            if (!seen[u]) {
                seen[u] = true;
                valid.push(u);
            }
        }
        return { valid: valid, invalid: invalid };
    }

    function getConfig() {
        var saved = null;
        try {
            if (typeof localStorage !== 'undefined') {
                saved = safeJsonParse(localStorage.getItem(LS_GAS_CFG), null);
            }
        } catch (e) { }
        var emb = (typeof window !== 'undefined' && window.__GAS_CONFIG__ && typeof window.__GAS_CONFIG__ === 'object') ? window.__GAS_CONFIG__ : null;
        if (!saved && emb) saved = emb;
        saved = saved || {};
        var parsed = parseUrls(saved.urls || []);
        if (!parsed.valid.length && emb) {
            var embParsed = parseUrls(emb.urls || []);
            if (embParsed.valid.length) {
                parsed = embParsed;
                if (!saved.mode) saved.mode = emb.mode;
                if (!saved.key && emb.key) saved.key = emb.key;
            }
        }
        return {
            mode: normalizeMode(saved.mode),
            urls: parsed.valid,
            key: String(saved.key || '').trim()
        };
    }

    function saveConfig(input) {
        input = input || {};
        var mode = normalizeMode(input.mode);
        var parsed = parseUrls(input.urls || '');
        if (parsed.invalid.length > 0) {
            return {
                ok: false,
                error: 'Link không đúng định dạng Web App Apps Script (phải bắt đầu bằng https://script.google.com/... và kết thúc bằng /exec): ' + parsed.invalid[0]
            };
        }
        if (mode === 'gas' && parsed.valid.length === 0) {
            return {
                ok: false,
                error: 'Chế độ "Chỉ Google Apps Script" yêu cầu nhập ít nhất 1 link /exec.'
            };
        }
        var cfg = {
            mode: mode,
            urls: parsed.valid,
            key: String(input.key || '').trim()
        };
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LS_GAS_CFG, JSON.stringify(cfg));
            }
        } catch (e) {
            return { ok: false, error: 'Không lưu được vào bộ nhớ trình duyệt: ' + (e.message || e) };
        }
        return { ok: true, config: cfg };
    }

    function pickUrl(seed) {
        var cfg = getConfig();
        if (!cfg.urls.length) return '';
        if (typeof seed === 'number' && isFinite(seed)) {
            return cfg.urls[Math.abs(Math.floor(seed)) % cfg.urls.length];
        }
        var u = cfg.urls[rrIndex % cfg.urls.length];
        rrIndex = (rrIndex + 1) % cfg.urls.length;
        return u;
    }

    function pingUrl(url, key) {
        var started = Date.now();
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        var fullUrl = url + sep + 'action=ping' + (key ? '&key=' + encodeURIComponent(key) : '') + '&_t=' + started;
        return fetch(fullUrl, { method: 'GET', redirect: 'follow' }).then(function (res) {
            return res.text().then(function (txt) {
                var data = safeJsonParse(txt, null);
                var latencyMs = Date.now() - started;
                if (!res.ok) {
                    return { url: url, ok: false, latencyMs: latencyMs, error: 'HTTP ' + res.status };
                }
                if (!data) {
                    return { url: url, ok: false, latencyMs: latencyMs, error: 'Phản hồi không phải JSON (kiểm tra quyền "Anyone / Bất kỳ ai" khi triển khai Web App).' };
                }
                if (!data.ok || data.status !== 'OK') {
                    return { url: url, ok: false, latencyMs: latencyMs, error: data.message || data.error || 'Máy chủ trả về trạng thái lỗi.' };
                }
                var sheets = Array.isArray(data.sheets) ? data.sheets : [];
                var missing = EXPECTED_SHEETS.filter(function (s) { return sheets.indexOf(s) === -1; });
                return {
                    url: url,
                    ok: true,
                    latencyMs: latencyMs,
                    app: data.app || '',
                    version: data.version || '',
                    sheets: sheets,
                    missingSheets: missing
                };
            });
        }).catch(function (err) {
            return {
                url: url,
                ok: false,
                latencyMs: Date.now() - started,
                error: 'Không kết nối được (' + (err && err.message ? err.message : 'Lỗi mạng/CORS') + ')'
            };
        });
    }

    function pingAll(urls, key) {
        var parsed = parseUrls(urls);
        var list = parsed.valid;
        if (!list.length) {
            return Promise.resolve({ allOk: false, results: [] });
        }
        return Promise.all(list.map(function (u) { return pingUrl(u, key); })).then(function (results) {
            var allOk = results.length > 0 && results.every(function (r) { return r.ok; });
            return { allOk: allOk, results: results };
        });
    }

    function embedSnippet() {
        var cfg = getConfig();
        if (!cfg.urls.length && cfg.mode === 'hybrid') return '';
        var pub = { mode: cfg.mode, urls: cfg.urls, key: cfg.key };
        return 'window.__GAS_CONFIG__ = ' + JSON.stringify(pub).replace(/</g, '\u003c') + '; ';
    }

    var LS_GAS_QUEUE = 'matrix_gas_retry_q_v1';

    function getQueue() {
        try {
            if (typeof localStorage === 'undefined') return [];
            var q = safeJsonParse(localStorage.getItem(LS_GAS_QUEUE), []);
            return Array.isArray(q) ? q : [];
        } catch (e) { return []; }
    }

    function saveQueue(q) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LS_GAS_QUEUE, JSON.stringify(Array.isArray(q) ? q : []));
            }
        } catch (e) { }
    }

    function getQueueCount() { return getQueue().length; }

    function enqueueResult(submitId, payload) {
        var q = getQueue();
        var idx = -1;
        for (var i = 0; i < q.length; i++) {
            if (q[i] && q[i].submitId === submitId) { idx = i; break; }
        }
        var item = { submitId: submitId, payload: payload, attempts: (idx >= 0 ? (q[idx].attempts || 0) : 0), ts: Date.now() };
        if (idx >= 0) q[idx] = item; else q.push(item);
        saveQueue(q);
    }

    function removeFromQueue(submitId) {
        var q = getQueue().filter(function (x) { return x && x.submitId !== submitId; });
        saveQueue(q);
    }

    function postToGas(payload, retryLeft, seed) {
        var cfg = getConfig();
        if (cfg.mode === 'firebase' || !cfg.urls.length) {
            return Promise.resolve({ ok: false, skipped: true });
        }
        var url = pickUrl(seed);
        var bodyObj = Object.assign({}, payload, cfg.key ? { key: cfg.key } : {});
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(bodyObj),
            redirect: 'follow'
        }).then(function (res) {
            return res.text().then(function (txt) {
                var data = safeJsonParse(txt, null);
                if (!res.ok || !data || !data.ok) {
                    throw new Error((data && (data.message || data.error)) || ('HTTP ' + res.status));
                }
                return data;
            });
        }).catch(function (err) {
            if ((retryLeft || 0) > 0) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(postToGas(payload, retryLeft - 1));
                    }, 900);
                });
            }
            throw err;
        });
    }

    function mapResultToGas(topicId, r, examTitle) {
        r = r || {};
        var submitId = String(r.id || ('res_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)));
        return {
            submitId: submitId,
            submittedAt: r.submittedAt || new Date().toISOString(),
            examId: String(topicId || 'default_topic'),
            examTitle: String(examTitle || ''),
            studentName: String(r.studentName || 'Học sinh'),
            className: String(r.className || r.studentClass || ''),
            sbd: String(r.studentUser || ''),
            score: (r.score10 !== null && r.score10 !== undefined) ? Number(r.score10) : Number(r.scorePercent || 0),
            totalQuestions: Number(r.totalQuestions || 0),
            durationSec: Number(r.durationSec || 0),
            detail: {
                scorePercent: r.scorePercent,
                score10: r.score10,
                firstTryCorrect: r.firstTryCorrect,
                studentClass: r.studentClass,
                classIds: r.classIds || null,
                submittedTs: r.submittedTs || Date.now(),
                rawDetail: r.detail || null
            }
        };
    }

    function submitResult(topicId, resultObj, examTitle, opts) {
        opts = opts || {};
        var cfg = getConfig();
        if (cfg.mode === 'firebase' || !cfg.urls.length) {
            return Promise.resolve({ ok: false, skipped: true });
        }
        var mapped = mapResultToGas(topicId, resultObj, examTitle);
        var payload = { action: 'submitResult', result: mapped };
        var maxJitter = (typeof opts.maxJitterMs === 'number') ? opts.maxJitterMs : 2000;
        var delayMs = maxJitter > 0 ? Math.floor(Math.random() * maxJitter) : 0;
        var retries = (typeof opts.retries === 'number') ? opts.retries : 2; // tổng 3 lần thử (1 lần đầu + 2 lần thử lại)

        return new Promise(function (resolve) {
            setTimeout(function () {
                postToGas(payload, retries).then(function (res) {
                    removeFromQueue(mapped.submitId);
                    resolve({ ok: true, submitId: mapped.submitId, duplicate: !!res.duplicate, jitterMs: delayMs });
                }).catch(function (err) {
                    enqueueResult(mapped.submitId, payload);
                    resolve({ ok: false, queued: true, submitId: mapped.submitId, error: (err && err.message) || String(err) });
                });
            }, delayMs);
        });
    }

    function flushQueue() {
        var cfg = getConfig();
        if (cfg.mode === 'firebase' || !cfg.urls.length) return Promise.resolve({ ok: true, sent: 0, remaining: getQueueCount() });
        var q = getQueue();
        if (!q.length) return Promise.resolve({ ok: true, sent: 0, remaining: 0 });
        var sent = 0;
        return q.reduce(function (p, item) {
            return p.then(function () {
                return postToGas(item.payload, 1).then(function () {
                    removeFromQueue(item.submitId);
                    sent++;
                }).catch(function () { });
            });
        }, Promise.resolve()).then(function () {
            return { ok: true, sent: sent, remaining: getQueueCount() };
        });
    }

    function fetchResults(filterExamId, filterClass) {
        var cfg = getConfig();
        if (cfg.mode === 'firebase' || !cfg.urls.length) {
            return Promise.resolve({ ok: false, items: [], error: 'Chưa cấu hình link Apps Script.' });
        }
        var url = pickUrl();
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        var fullUrl = url + sep + 'action=getResults' +
            (cfg.key ? '&key=' + encodeURIComponent(cfg.key) : '') +
            (filterExamId ? '&examId=' + encodeURIComponent(filterExamId) : '') +
            (filterClass ? '&className=' + encodeURIComponent(filterClass) : '') +
            '&_t=' + Date.now();
        return fetch(fullUrl, { method: 'GET', redirect: 'follow' }).then(function (res) {
            return res.text().then(function (txt) {
                var data = safeJsonParse(txt, null);
                if (!res.ok || !data || !data.ok) {
                    return { ok: false, items: [], error: (data && (data.message || data.error)) || ('HTTP ' + res.status) };
                }
                return { ok: true, items: Array.isArray(data.items) ? data.items : [] };
            });
        }).catch(function (err) {
            return { ok: false, items: [], error: (err && err.message) || 'Lỗi mạng' };
        });
    }

    function mergeGasResultsToLocal() {
        return fetchResults().then(function (res) {
            if (!res.ok) return { ok: false, added: 0, total: 0, error: res.error };
            var cur = {};
            try {
                if (typeof localStorage !== 'undefined') {
                    cur = safeJsonParse(localStorage.getItem('matrix_student_results_v1'), {}) || {};
                }
            } catch (e) { cur = {}; }
            var added = 0;
            res.items.forEach(function (it) {
                if (!it || !it.submitId) return;
                var topicKey = String(it.examId || 'default_topic');
                if (!Array.isArray(cur[topicKey])) cur[topicKey] = [];
                var det = (it.detail && typeof it.detail === 'object') ? it.detail : {};
                var rec = {
                    id: String(it.submitId),
                    studentName: String(it.studentName || 'Học sinh'),
                    studentClass: String(det.studentClass || it.className || ''),
                    studentUser: String(it.sbd || ''),
                    scorePercent: (det.scorePercent !== undefined) ? det.scorePercent : it.score,
                    score10: (det.score10 !== undefined) ? det.score10 : it.score,
                    firstTryCorrect: det.firstTryCorrect || 0,
                    totalQuestions: Number(it.totalQuestions || 0),
                    submittedAt: String(it.submittedAt || ''),
                    submittedTs: Number(det.submittedTs || Date.parse(it.submittedAt) || Date.now()),
                    classIds: det.classIds || undefined,
                    className: it.className || undefined,
                    detail: det.rawDetail || null
                };
                var idx = cur[topicKey].findIndex(function (x) { return x && x.id === rec.id; });
                if (idx < 0) {
                    cur[topicKey].push(rec);
                    added++;
                } else if (rec.detail && !cur[topicKey][idx].detail) {
                    cur[topicKey][idx] = rec;
                }
                cur[topicKey].sort(function (a, b) { return (b.submittedTs || 0) - (a.submittedTs || 0); });
            });
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('matrix_student_results_v1', JSON.stringify(cur));
                }
            } catch (e) { }
            return { ok: true, added: added, total: res.items.length };
        });
    }

    try {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('online', function () { flushQueue(); });
            setTimeout(function () { flushQueue(); }, 2500);
        }
    } catch (e) { }

    function isGasEnabled() {
        var cfg = getConfig();
        return cfg.mode !== 'firebase' && cfg.urls.length > 0;
    }

    function safeAccKey(u) {
        return 'HS_ACC_' + String(u || '').replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    function getFromGas(action, extraParams) {
        var cfg = getConfig();
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        var url = pickUrl();
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        var qs = 'action=' + encodeURIComponent(action) + (cfg.key ? '&key=' + encodeURIComponent(cfg.key) : '');
        if (extraParams) {
            Object.keys(extraParams).forEach(function (k) {
                if (extraParams[k] !== undefined && extraParams[k] !== null && extraParams[k] !== '') {
                    qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(String(extraParams[k]));
                }
            });
        }
        return fetch(url + sep + qs + '&_t=' + Date.now(), { method: 'GET', redirect: 'follow' }).then(function (res) {
            return res.text().then(function (txt) {
                var data = safeJsonParse(txt, null);
                if (!res.ok || !data || !data.ok) {
                    return { ok: false, error: (data && (data.message || data.error)) || ('HTTP ' + res.status) };
                }
                return data;
            });
        }).catch(function (err) {
            return { ok: false, error: (err && err.message) || 'Lỗi mạng' };
        });
    }

    function syncClassesToGas() {
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        var classes = [];
        try {
            if (typeof localStorage !== 'undefined') {
                classes = safeJsonParse(localStorage.getItem('matrix_classes_v1'), []) || [];
            }
        } catch (e) { classes = []; }
        if (!Array.isArray(classes)) classes = [];
        return postToGas({
            action: 'saveClassData',
            keyName: 'ALL_CLASSES',
            title: 'Danh sách Lớp học (' + classes.length + ')',
            data: { classes: classes, updatedAt: Date.now() }
        }, 1).then(function () {
            return { ok: true, count: classes.length };
        }).catch(function (err) {
            return { ok: false, error: (err && err.message) || String(err) };
        });
    }

    function saveAccountToGas(u, rec) {
        if (!isGasEnabled() || !u || !rec) return Promise.resolve(false);
        return postToGas({
            action: 'saveClassData',
            keyName: safeAccKey(u),
            title: String(rec.className || rec.fullName || u),
            data: { username: u, account: rec }
        }, 1).then(function () { return true; }).catch(function () { return false; });
    }

    function syncAllAccountsToGas() {
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        var db = { users: {} };
        try {
            if (typeof localStorage !== 'undefined') {
                db = safeJsonParse(localStorage.getItem('matrix_hs_accounts_v1'), { users: {} }) || { users: {} };
            }
        } catch (e) { db = { users: {} }; }
        var users = (db && db.users && typeof db.users === 'object') ? db.users : {};
        var keys = Object.keys(users);
        return postToGas({
            action: 'saveClassData',
            keyName: 'HS_ACCOUNTS',
            title: 'Tài khoản Học sinh (' + keys.length + ')',
            data: { users: users, updatedAt: Date.now() }
        }, 1).then(function () {
            return { ok: true, count: keys.length };
        }).catch(function (err) {
            return { ok: false, error: (err && err.message) || String(err) };
        });
    }

    function getAccountFromGas(u) {
        if (!isGasEnabled() || !u) return Promise.resolve(null);
        return getFromGas('getClassData', { keyName: safeAccKey(u) }).then(function (r1) {
            if (r1 && r1.ok && r1.data && r1.data.account) return r1.data.account;
            return getFromGas('getClassData', { keyName: 'HS_ACCOUNTS' }).then(function (r2) {
                if (r2 && r2.ok && r2.data && r2.data.users && r2.data.users[u]) return r2.data.users[u];
                return null;
            });
        });
    }

    function pullClassesAndAccountsFromGas() {
        return Promise.all([
            getFromGas('getClassData', { keyName: 'ALL_CLASSES' }),
            getFromGas('getClassData', { keyName: 'HS_ACCOUNTS' })
        ]).then(function (arr) {
            var rCls = arr[0] || {}, rAcc = arr[1] || {};
            if (!rCls.ok && !rAcc.ok) return { ok: false, error: rCls.error || rAcc.error || 'Không tải được dữ liệu.' };

            var curClasses = [];
            var curAcc = { users: {} };
            try {
                if (typeof localStorage !== 'undefined') {
                    curClasses = safeJsonParse(localStorage.getItem('matrix_classes_v1'), []) || [];
                    curAcc = safeJsonParse(localStorage.getItem('matrix_hs_accounts_v1'), { users: {} }) || { users: {} };
                }
            } catch (e) { }
            if (!Array.isArray(curClasses)) curClasses = [];
            if (!curAcc || typeof curAcc.users !== 'object') curAcc = { users: {} };

            var classesAdded = 0, accountsAdded = 0;
            if (rCls.ok && rCls.data && Array.isArray(rCls.data.classes)) {
                rCls.data.classes.forEach(function (cls) {
                    if (!cls || !cls.id) return;
                    var idx = curClasses.findIndex(function (x) { return x && x.id === cls.id; });
                    if (idx < 0) { curClasses.push(cls); classesAdded++; }
                    else { curClasses[idx] = cls; }
                });
            }
            if (rAcc.ok && rAcc.data && rAcc.data.users && typeof rAcc.data.users === 'object') {
                Object.keys(rAcc.data.users).forEach(function (u) {
                    if (!curAcc.users[u]) { curAcc.users[u] = rAcc.data.users[u]; accountsAdded++; }
                });
            }

            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('matrix_classes_v1', JSON.stringify(curClasses));
                    localStorage.setItem('matrix_hs_accounts_v1', JSON.stringify(curAcc));
                }
            } catch (e) { }
            return { ok: true, classesAdded: classesAdded, classesTotal: curClasses.length, accountsAdded: accountsAdded };
        });
    }

    function backupBankToGas() {
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        var meta = null, questions = null;
        try {
            if (typeof localStorage !== 'undefined') {
                meta = safeJsonParse(localStorage.getItem('matrix_bank_v1'), null);
                questions = safeJsonParse(localStorage.getItem('matrix_bank_questions_v1'), null);
            }
        } catch (e) { }
        var qCount = Array.isArray(questions) ? questions.length : (questions && typeof questions === 'object' ? Object.keys(questions).length : 0);
        return postToGas({
            action: 'saveBankData',
            keyName: 'MAIN',
            title: 'Sao lưu Ngân hàng câu hỏi',
            data: { meta: meta, questions: questions, savedAt: Date.now() }
        }, 1).then(function () {
            return { ok: true, questionCount: qCount, chunks: 1 };
        }).catch(function (err) {
            return { ok: false, error: (err && err.message) || String(err) };
        });
    }

    function restoreBankFromGas() {
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        return getFromGas('getBankData', { keyName: 'MAIN' }).then(function (r) {
            if (!r || !r.ok || !r.data) {
                return { ok: false, error: (r && r.error) || 'Chưa có bản sao lưu Ngân hàng đề trên Sheets.' };
            }
            var payload = r.data;
            try {
                if (typeof localStorage !== 'undefined') {
                    if (payload.meta !== null && payload.meta !== undefined) {
                        localStorage.setItem('matrix_bank_v1', JSON.stringify(payload.meta));
                    }
                    if (payload.questions !== null && payload.questions !== undefined) {
                        localStorage.setItem('matrix_bank_questions_v1', JSON.stringify(payload.questions));
                    }
                }
            } catch (e) {
                return { ok: false, error: 'Không ghi được vào bộ nhớ trình duyệt: ' + (e.message || e) };
            }
            var qs = payload.questions;
            var qCount = Array.isArray(qs) ? qs.length : (qs && typeof qs === 'object' ? Object.keys(qs).length : 0);
            return { ok: true, questionCount: qCount };
        });
    }

    // [MT-18A] GAS #1 (urls[0]) la may chu chinh quan ly kho Google Drive (Topics/ & MinMap_Images/)
    function pickPrimaryUrl() {
        var cfg = getConfig();
        return (cfg.urls && cfg.urls.length) ? cfg.urls[0] : '';
    }

    function postToPrimaryGas(payload, retryLeft) {
        var cfg = getConfig();
        if (cfg.mode === 'firebase' || !cfg.urls.length) {
            return Promise.resolve({ ok: false, skipped: true, error: 'Chưa gắn link Apps Script.' });
        }
        var url = pickPrimaryUrl();
        var bodyObj = Object.assign({}, payload, cfg.key ? { key: cfg.key } : {});
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(bodyObj),
            redirect: 'follow'
        }).then(function (res) {
            return res.text().then(function (txt) {
                var data = safeJsonParse(txt, null);
                if (!res.ok || !data || !data.ok) {
                    throw new Error((data && (data.message || data.error)) || ('HTTP ' + res.status));
                }
                return data;
            });
        }).catch(function (err) {
            if ((retryLeft || 0) > 0) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(postToPrimaryGas(payload, retryLeft - 1));
                    }, 900);
                });
            }
            return { ok: false, error: (err && err.message) || String(err) };
        });
    }

    function getFromPrimaryGas(action, extraParams) {
        var cfg = getConfig();
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        var url = pickPrimaryUrl();
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        var qs = 'action=' + encodeURIComponent(action) + (cfg.key ? '&key=' + encodeURIComponent(cfg.key) : '');
        if (extraParams) {
            Object.keys(extraParams).forEach(function (k) {
                if (extraParams[k] !== undefined && extraParams[k] !== null && extraParams[k] !== '') {
                    qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(String(extraParams[k]));
                }
            });
        }
        return fetch(url + sep + qs + '&_t=' + Date.now(), { method: 'GET', redirect: 'follow' }).then(function (res) {
            return res.text().then(function (txt) {
                var data = safeJsonParse(txt, null);
                if (!res.ok || !data || !data.ok) {
                    return { ok: false, error: (data && (data.message || data.error)) || ('HTTP ' + res.status) };
                }
                return data;
            });
        }).catch(function (err) {
            return { ok: false, error: (err && err.message) || 'Lỗi mạng' };
        });
    }

    function saveLibIndexToDrive(indexObj) {
        return postToPrimaryGas({
            action: 'saveLibIndex',
            data: indexObj || {}
        }, 1);
    }

    function loadLibIndexFromDrive() {
        return getFromPrimaryGas('getLibIndex');
    }

    function saveTopicToDrive(topicObj) {
        if (!topicObj || !topicObj.id) {
            return Promise.resolve({ ok: false, error: 'Thiếu topic.id.' });
        }
        return postToPrimaryGas({
            action: 'saveTopicToDrive',
            topicId: String(topicObj.id),
            topic: topicObj
        }, 1);
    }

    function loadTopicFromDrive(topicId) {
        if (!topicId) return Promise.resolve({ ok: false, error: 'Thiếu topicId.' });
        return getFromPrimaryGas('getTopicFromDrive', { topicId: String(topicId) });
    }

    function saveImageToDrive(imageId, dataUrl) {
        if (!imageId || !dataUrl) return Promise.resolve({ ok: false, error: 'Thiếu imageId hoặc dataUrl.' });
        return postToPrimaryGas({
            action: 'saveImageToDrive',
            imageId: String(imageId),
            dataUrl: String(dataUrl)
        }, 1);
    }

    function loadImageFromDrive(imageId) {
        if (!imageId) return Promise.resolve({ ok: false, error: 'Thiếu imageId.' });
        return getFromPrimaryGas('getImageFromDrive', { imageId: String(imageId) });
    }

    // [MT-18B] Outbox hang doi + Day/Keo theo lo 10 de/luot + Lazy-load may moi
    var LS_GAS_TOPIC_OUTBOX = 'matrix_gas_topic_outbox_v1';
    var TOPIC_BATCH_SIZE = 10;

    function getGlobalVarSafe(name, fallback) {
        try {
            if (typeof window !== 'undefined' && window.LTDLibBridge && typeof window.LTDLibBridge.getVar === 'function') {
                var v = window.LTDLibBridge.getVar(name);
                if (v !== undefined) return v;
            }
            if (typeof window !== 'undefined' && window[name] !== undefined) return window[name];
        } catch (e) { }
        return fallback;
    }

    function setGlobalVarSafe(name, val) {
        try {
            if (typeof window !== 'undefined' && window.LTDLibBridge && typeof window.LTDLibBridge.setVar === 'function') {
                window.LTDLibBridge.setVar(name, val);
                return;
            }
            if (typeof window !== 'undefined') window[name] = val;
        } catch (e) { }
    }

    function getTopicOutbox() {
        try {
            if (typeof localStorage === 'undefined') return [];
            var arr = safeJsonParse(localStorage.getItem(LS_GAS_TOPIC_OUTBOX), []);
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }

    function saveTopicOutbox(arr) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LS_GAS_TOPIC_OUTBOX, JSON.stringify(Array.isArray(arr) ? arr : []));
            }
        } catch (e) { }
    }

    function getTopicOutboxCount() { return getTopicOutbox().length; }

    function enqueueTopicSync(topicId) {
        if (!topicId) return;
        var id = String(topicId);
        var q = getTopicOutbox();
        if (q.indexOf(id) === -1) {
            q.push(id);
            saveTopicOutbox(q);
        }
    }

    function buildLightLibIndex(topics, folders, deletedIds) {
        var lightTopics = (Array.isArray(topics) ? topics : []).filter(Boolean).map(function (t) {
            return {
                id: String(t.id || ''),
                title: String(t.title || ''),
                subtitle: String(t.subtitle || ''),
                subject: String(t.subject || ''),
                grade: String(t.grade || ''),
                folderId: t.folderId || null,
                isMinMapDeck: !!t.isMinMapDeck,
                minMapRole: t.minMapRole || '',
                updatedAt: Number(t.updatedAt || 0),
                qCount: Array.isArray(t.questions) ? t.questions.length : 0,
                hsCount: Array.isArray(t.hsSlideKeys) ? t.hsSlideKeys.length : 0
            };
        });
        return {
            version: 'LIB_INDEX_V2',
            updatedAt: Date.now(),
            topics: lightTopics,
            folders: Array.isArray(folders) ? folders : [],
            deletedTopicIds: Array.isArray(deletedIds) ? deletedIds : []
        };
    }

    function pushSingleTopicWithImages(t) {
        if (!t || !t.id) return Promise.resolve({ ok: false, images: 0 });
        var imgJobs = [];
        if (Array.isArray(t.questions)) {
            t.questions.forEach(function (q, idx) {
                if (q && q.obsSlideData && /^data:image\//i.test(q.obsSlideData)) {
                    var imgId = q.obsSlideKey || (t.id + '_q_' + idx);
                    imgJobs.push(saveImageToDrive(imgId, q.obsSlideData));
                }
            });
        }
        if (Array.isArray(t.hsSlideKeys)) {
            t.hsSlideKeys.forEach(function (k, idx) {
                if (k && k.dataUrl && /^data:image\//i.test(k.dataUrl)) {
                    var hId = k.id || (t.id + '_hs_' + idx);
                    imgJobs.push(saveImageToDrive(hId, k.dataUrl));
                }
            });
        }
        return saveTopicToDrive(t).then(function (tRes) {
            if (!tRes || !tRes.ok) return { ok: false, error: (tRes && tRes.error) || 'Lỗi lưu đề', images: 0 };
            if (!imgJobs.length) return { ok: true, images: 0 };
            return Promise.all(imgJobs).then(function (resList) {
                var okImgs = resList.filter(function (r) { return r && r.ok; }).length;
                return { ok: true, images: okImgs };
            });
        });
    }

    function pushLibraryToDrive(onProgress) {
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        var topics = getGlobalVarSafe('savedTopics', []);
        var folders = getGlobalVarSafe('libraryFolders', []);
        if ((!folders || !folders.length) && typeof window !== 'undefined' && window.LTDLibBridge && typeof window.LTDLibBridge.getFolders === 'function') folders = window.LTDLibBridge.getFolders();
        var deletedIds = getGlobalVarSafe('deletedTopicIds', []);
        if (!Array.isArray(topics)) topics = [];

        var indexObj = buildLightLibIndex(topics, folders, deletedIds);
        return saveLibIndexToDrive(indexObj).then(function (idxRes) {
            if (!idxRes || !idxRes.ok) {
                return { ok: false, error: (idxRes && idxRes.error) || 'Không lưu được Mục lục LIB_INDEX_V2 lên Drive.' };
            }
            var total = topics.length;
            var batches = Math.max(1, Math.ceil(total / TOPIC_BATCH_SIZE));
            var done = 0;
            var imgTotal = 0;
            var chain = Promise.resolve();

            for (var start = 0; start < total; start += TOPIC_BATCH_SIZE) {
                (function (slice) {
                    chain = chain.then(function () {
                        return Promise.all(slice.map(pushSingleTopicWithImages)).then(function (results) {
                            results.forEach(function (r) {
                                if (r && r.ok) imgTotal += (r.images || 0);
                            });
                            done += slice.length;
                            if (typeof onProgress === 'function') {
                                try { onProgress({ phase: 'topics', done: done, total: total }); } catch (e) { }
                            }
                        });
                    });
                })(topics.slice(start, start + TOPIC_BATCH_SIZE));
            }

            return chain.then(function () {
                saveTopicOutbox([]);
                return { ok: true, topicCount: total, batches: batches, imageCount: imgTotal };
            });
        });
    }

    function flushTopicOutbox() {
        if (!isGasEnabled()) return Promise.resolve({ ok: false, skipped: true });
        var q = getTopicOutbox();
        if (!q.length) return Promise.resolve({ ok: true, flushed: 0 });
        var topics = getGlobalVarSafe('savedTopics', []);
        var folders = getGlobalVarSafe('libraryFolders', []);
        if ((!folders || !folders.length) && typeof window !== 'undefined' && window.LTDLibBridge && typeof window.LTDLibBridge.getFolders === 'function') folders = window.LTDLibBridge.getFolders();
        var deletedIds = getGlobalVarSafe('deletedTopicIds', []);
        var map = {};
        (Array.isArray(topics) ? topics : []).forEach(function (t) { if (t && t.id) map[String(t.id)] = t; });

        var batchIds = q.slice(0, TOPIC_BATCH_SIZE);
        var restIds = q.slice(TOPIC_BATCH_SIZE);
        var jobs = batchIds.map(function (id) {
            var t = map[String(id)];
            return t ? pushSingleTopicWithImages(t) : Promise.resolve({ ok: true });
        });
        return saveLibIndexToDrive(buildLightLibIndex(topics, folders, deletedIds)).then(function () {
            return Promise.all(jobs).then(function (results) {
                var remaining = restIds.slice();
                results.forEach(function (r, idx) {
                    if (!r || !r.ok) remaining.push(batchIds[idx]);
                });
                saveTopicOutbox(remaining);
                return { ok: remaining.length === 0, flushed: batchIds.length - (remaining.length - restIds.length), remaining: remaining.length };
            });
        }).catch(function () {
            return { ok: false, remaining: q.length };
        });
    }

    function upsertLocalTopicSafe(topicObj) {
        if (!topicObj || !topicObj.id) return;
        if (typeof window !== 'undefined' && window.LTDLibBridge && typeof window.LTDLibBridge.upsertTopic === 'function') {
            window.LTDLibBridge.upsertTopic(topicObj);
            return;
        }
        var cur = getGlobalVarSafe('savedTopics', []);
        var list = Array.isArray(cur) ? cur.slice() : [];
        var idx = list.findIndex(function (x) { return x && String(x.id) === String(topicObj.id); });
        if (idx >= 0) list[idx] = topicObj;
        else list.push(topicObj);
        setGlobalVarSafe('savedTopics', list);
        try { if (typeof window !== 'undefined' && typeof window.saveToStorage === 'function') window.saveToStorage(); } catch (e) { }
    }

    function pullLibraryFromDrive(onProgress) {
        if (!isGasEnabled()) return Promise.resolve({ ok: false, error: 'Chưa gắn link Apps Script.' });
        return loadLibIndexFromDrive().then(function (res) {
            if (!res || !res.ok || !res.data) {
                return { ok: false, error: (res && res.error) || 'Chưa có Mục lục LIB_INDEX_V2 trên Drive.' };
            }
            var idxData = res.data;
            var folderIdRemap = {};
            if (Array.isArray(idxData.folders) && idxData.folders.length) {
                var curFolders = getGlobalVarSafe('libraryFolders', null);
                var normF = function (s) { return String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); };
                if (Array.isArray(curFolders)) {
                    idxData.folders.forEach(function (f) {
                        if (!f || !f.id) return;
                        if (curFolders.some(function (x) { return x && x.id === f.id; })) return;
                        var pid = f.parentId && folderIdRemap[f.parentId] ? folderIdRemap[f.parentId] : (f.parentId || '');
                        var dup = curFolders.find(function (x) {
                            if (!x || !x.id) return false;
                            return normF(x.subject || '') === normF(f.subject || '') &&
                                String(x.parentId || '') === String(pid) &&
                                normF(x.name || '') === normF(f.name || '');
                        });
                        if (dup) {
                            folderIdRemap[f.id] = dup.id;
                        } else {
                            if (f.parentId && folderIdRemap[f.parentId]) f.parentId = folderIdRemap[f.parentId];
                            curFolders.push(f);
                        }
                    });
                    try { if (typeof localStorage !== 'undefined') localStorage.setItem('matrix_library_folders_v1', JSON.stringify(curFolders)); } catch (e) { }
                } else {
                    setGlobalVarSafe('libraryFolders', idxData.folders.slice());
                }
            }
            if (Array.isArray(idxData.deletedTopicIds) && idxData.deletedTopicIds.length) {
                var curDel = getGlobalVarSafe('deletedTopicIds', null);
                if (Array.isArray(curDel)) {
                    idxData.deletedTopicIds.forEach(function (d) { if (curDel.indexOf(d) === -1) curDel.push(d); });
                } else {
                    setGlobalVarSafe('deletedTopicIds', idxData.deletedTopicIds.slice());
                }
            }

            var remoteList = Array.isArray(idxData.topics) ? idxData.topics : [];
            var localTopics = getGlobalVarSafe('savedTopics', []);
            var localMap = {};
            (Array.isArray(localTopics) ? localTopics : []).forEach(function (t) { if (t && t.id) localMap[String(t.id)] = t; });

            var toPull = remoteList.filter(function (rt) {
                if (!rt || !rt.id) return false;
                var lt = localMap[String(rt.id)];
                if (!lt) return true;
                return Number(rt.updatedAt || 0) > Number(lt.updatedAt || 0);
            });

            var total = toPull.length;
            var done = 0;
            var pulledCount = 0;
            var chain = Promise.resolve();

            for (var start = 0; start < total; start += TOPIC_BATCH_SIZE) {
                (function (slice) {
                    chain = chain.then(function () {
                        return Promise.all(slice.map(function (rt) { return loadTopicFromDrive(rt.id); })).then(function (tResList) {
                            tResList.forEach(function (tr) {
                                if (tr && tr.ok && tr.data && tr.data.id) {
                                    if (tr.data.folderId && folderIdRemap[tr.data.folderId]) tr.data.folderId = folderIdRemap[tr.data.folderId];
                                    upsertLocalTopicSafe(tr.data);
                                    pulledCount++;
                                }
                            });
                            done += slice.length;
                            if (typeof onProgress === 'function') {
                                try { onProgress({ phase: 'topics', done: done, total: total }); } catch (e) { }
                            }
                        });
                    });
                })(toPull.slice(start, start + TOPIC_BATCH_SIZE));
            }

            return chain.then(function () {
                try { if (typeof window !== 'undefined' && window.LTDLibBridge && typeof window.LTDLibBridge.dedupeFolders === 'function') window.LTDLibBridge.dedupeFolders(); } catch (e) { }
                try { if (typeof window !== 'undefined' && typeof window.saveToStorage === 'function') window.saveToStorage(); } catch (e) { }
                try { if (typeof window !== 'undefined' && typeof window.renderLibraryList === 'function') window.renderLibraryList(); } catch (e) { }
                return { ok: true, pulledCount: pulledCount, totalInIndex: remoteList.length };
            });
        });
    }

    function ensureTopicLoadedFromDrive(topicId) {
        if (!topicId) return Promise.resolve({ ok: false, error: 'Thiếu topicId.' });
        var localTopics = getGlobalVarSafe('savedTopics', []);
        var existing = (Array.isArray(localTopics) ? localTopics : []).find(function (t) { return t && String(t.id) === String(topicId); });
        var hasContent = existing && ((Array.isArray(existing.questions) && existing.questions.length > 0) || (Array.isArray(existing.hsSlideKeys) && existing.hsSlideKeys.length > 0));
        if (hasContent) return Promise.resolve({ ok: true, data: existing, fromCache: true });
        return loadTopicFromDrive(topicId).then(function (res) {
            if (res && res.ok && res.data) {
                upsertLocalTopicSafe(res.data);
                return { ok: true, data: res.data, fromCache: false };
            }
            return { ok: false, error: (res && res.error) || 'Không tải được đề từ Drive.' };
        });
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('online', function () { flushTopicOutbox(); });
        setTimeout(function () { flushTopicOutbox(); }, 4000);
    }

    window.GasBridge = {
        getConfig: getConfig,
        saveConfig: saveConfig,
        parseUrls: parseUrls,
        pickUrl: pickUrl,
        pickPrimaryUrl: pickPrimaryUrl,
        pingUrl: pingUrl,
        pingAll: pingAll,
        submitResult: submitResult,
        flushQueue: flushQueue,
        getQueueCount: getQueueCount,
        fetchResults: fetchResults,
        mergeGasResultsToLocal: mergeGasResultsToLocal,
        isGasEnabled: isGasEnabled,
        syncClassesToGas: syncClassesToGas,
        saveAccountToGas: saveAccountToGas,
        syncAllAccountsToGas: syncAllAccountsToGas,
        getAccountFromGas: getAccountFromGas,
        pullClassesAndAccountsFromGas: pullClassesAndAccountsFromGas,
        backupBankToGas: backupBankToGas,
        restoreBankFromGas: restoreBankFromGas,
        saveLibIndexToDrive: saveLibIndexToDrive,
        loadLibIndexFromDrive: loadLibIndexFromDrive,
        saveTopicToDrive: saveTopicToDrive,
        loadTopicFromDrive: loadTopicFromDrive,
        saveImageToDrive: saveImageToDrive,
        loadImageFromDrive: loadImageFromDrive,
        enqueueTopicSync: enqueueTopicSync,
        getTopicOutboxCount: getTopicOutboxCount,
        flushTopicOutbox: flushTopicOutbox,
        pushLibraryToDrive: pushLibraryToDrive,
        pullLibraryFromDrive: pullLibraryFromDrive,
        ensureTopicLoadedFromDrive: ensureTopicLoadedFromDrive,
        embedSnippet: embedSnippet,
        EXPECTED_SHEETS: EXPECTED_SHEETS
    };
})();

// === [hs-auth-module] ===
/* ======================================================================
   [CODE111] TÀI KHOẢN HỌC SINH: ĐĂNG KÍ / ĐĂNG NHẬP
   - "Tôi là HS" -> 2 nút: ĐĂNG NHẬP | ĐĂNG KÍ.
   - ĐĂNG KÍ: Họ và tên, Lớp, Tên đăng nhập (không được trùng), Mật khẩu.
   - ĐĂNG NHẬP: Tên đăng nhập + Mật khẩu -> vào ứng dụng với quyền học sinh,
     Họ tên + Lớp lấy từ tài khoản (khóa, không sửa được) để kết quả không bị nhầm tên.
   - Lưu trên trình duyệt (localStorage). Nếu máy đã kết nối máy chủ của giáo viên (Firebase)
     thì tài khoản còn được lưu lên đó để kiểm tra trùng tên & đăng nhập ở máy khác.
   - Mật khẩu không lưu dạng thô: băm SHA-256 + muối riêng từng tài khoản.
   ====================================================================== */
(function () {
    'use strict';
    var LS_ACC = 'matrix_hs_accounts_v1';
    var view = 'menu';              // menu | login | register
    var busy = false;

    function $(id) { return document.getElementById(id); }
    function show(id, on) { var el = $(id); if (el) el.classList.toggle('hidden', !on); }
    function api() { return (window.CloudSync && window.CloudSync.api) || null; }
    function cloudOn() { try { var a = api(); return !!(a && a.effStu()); } catch (e) { return false; } }

    /* ---------- kho tài khoản cục bộ ---------- */
    function load() {
        try { var o = JSON.parse(localStorage.getItem(LS_ACC) || 'null'); if (o && o.users) return o; } catch (e) {}
        return { users: {} };
    }
    function save(o) { try { localStorage.setItem(LS_ACC, JSON.stringify(o)); return true; } catch (e) { return false; } }
    function normUser(u) { return String(u == null ? '' : u).normalize('NFC').trim().toLowerCase(); }
    function validUser(u) { return /^[a-z0-9._-]{3,30}$/.test(u); }
    function cleanText(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
    function cloudKey(u) { return 'accounts/' + String(u).replace(/[.$#\[\]\/\u0000-\u001f\u007f]/g, '_'); }

    function rndSalt() {
        var a = 'abcdefghijklmnopqrstuvwxyz0123456789', out = '';
        try { var b = new Uint8Array(12); crypto.getRandomValues(b); for (var i = 0; i < 12; i++) out += a[b[i] % a.length]; }
        catch (e) { for (var j = 0; j < 12; j++) out += a[Math.floor(Math.random() * a.length)]; }
        return out;
    }
    function fallbackHash(str) {
        var h1 = 0x811c9dc5, h2 = 0x1b873593;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            h1 ^= c; h1 = Math.imul(h1, 0x01000193);
            h2 = Math.imul(h2 ^ c, 0x85ebca6b); h2 ^= h2 >>> 13;
        }
        return 'f' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
    }
    function hashPw(salt, pw) {
        var s = 'hs|' + salt + '|' + pw;
        try {
            if (window.crypto && crypto.subtle && window.TextEncoder) {
                return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
                    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
                }).catch(function () { return fallbackHash(s); });
            }
        } catch (e) {}
        return Promise.resolve(fallbackHash(s));
    }

    /* ---------- máy chủ (không bắt buộc) ---------- */
    function cloudGet(u) {
        var gasOn = !!(window.GasBridge && window.GasBridge.isGasEnabled && window.GasBridge.isGasEnabled());
        var p = cloudOn()
            ? api().req('GET', 's', cloudKey(u)).then(function (r) { return r && r.ph ? r : null; }, function () { return null; })
            : Promise.resolve(null);
        return p.then(function (r) {
            if (r) return r;
            return gasOn ? window.GasBridge.getAccountFromGas(u) : null;
        });
    }
    function cloudPut(u, rec) {
        var gasOn = !!(window.GasBridge && window.GasBridge.isGasEnabled && window.GasBridge.isGasEnabled());
        var pFb = cloudOn()
            ? api().req('PUT', 's', cloudKey(u), rec).then(function () { return true; }, function () { return false; })
            : Promise.resolve(false);
        var pGas = gasOn ? window.GasBridge.saveAccountToGas(u, rec) : Promise.resolve(false);
        return Promise.all([pFb, pGas]).then(function (arr) { return !!(arr[0] || arr[1]); });
    }
    /* Tìm tài khoản: ưu tiên cục bộ, rồi máy chủ */
    function findAccount(u) {
        var local = load().users[u];
        if (local) return Promise.resolve(local);
        return cloudGet(u).then(function (r) {
            if (r) { var db = load(); db.users[u] = r; save(db); }
            return r;
        });
    }

    /* ---------- giao diện ---------- */
    function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
    function clearErr() { if (typeof clearLoginError === 'function') clearLoginError(); }
    function err(msg, input, box) { if (typeof showLoginError === 'function') showLoginError(msg, input, box); }
    function ok(msg) {
        var el = $('login-error-msg'); if (!el) return;
        el.textContent = msg;
        el.className = 'bg-emerald-50 border-2 border-emerald-300 text-emerald-700 rounded-xl px-3.5 py-2 text-xs font-black text-center shadow-sm';
    }
    function resetErrClass() {
        var el = $('login-error-msg'); if (el) el.className = 'hidden bg-red-50 border-2 border-red-300 text-red-600 rounded-xl px-3.5 py-2 text-xs font-black text-center shadow-sm';
    }
    function setBtn(txt, visible) {
        var b = $('login-submit-btn'); if (!b) return;
        b.textContent = txt; b.parentElement.classList.toggle('hidden', !visible);
    }

    function showView(v, keepMsg) {
        view = v;
        if (!keepMsg) { clearErr(); resetErrClass(); }
        ['login-name-group', 'login-class-group', 'login-user-group', 'login-pass-group', 'login-pass2-group',
         'login-showpass-wrap', 'login-gv-greet', 'login-gv-blocked', 'login-gv-hint', 'login-reset-wrap', 'login-hs-menu', 'login-hs-back']
            .forEach(function (id) { show(id, false); });
        ['login-pass-input', 'login-pass2-input'].forEach(function (id) { var el = $(id); if (el) { el.value = ''; el.type = 'password'; } });
        var chk = $('login-showpass-check'); if (chk) chk.checked = false;
        setText('login-pass2-label', '4. Xác nhận lại mật khẩu:');
        var pi = $('login-pass-input');

        if (v === 'menu') {
            show('login-hs-menu', true);
            setBtn('', false);
            setText('login-hero-title', 'CỔNG HỌC SINH');
            return;
        }
        show('login-hs-back', true);
        show('login-user-group', true);
        show('login-pass-group', true);
        show('login-showpass-wrap', true);
        if (v === 'register') {
            show('login-name-group', true);
            show('login-class-group', true);
            setText('login-name-label', '2. Họ và tên:');
            setText('login-class-label', '3. Lớp:');
            setText('login-user-label', '4. Tên đăng nhập (không được trùng):');
            setText('login-pass-label', '5. Mật khẩu (ít nhất 4 ký tự):');
            show('login-pass2-group', true);   // [CODE118] Nhập lại mật khẩu khi đăng kí
            setText('login-pass2-label', '6. Nhập lại mật khẩu:');
            if (pi) pi.setAttribute('autocomplete', 'new-password');
            var ni = $('login-name-input'), ci = $('login-class-input');
            if (ni) { ni.value = ''; ni.placeholder = 'Họ và tên đầy đủ của em...'; }
            if (ci) ci.value = '';
            var ui = $('login-user-input'); if (ui) ui.value = '';
            setBtn('ĐĂNG KÍ ➜', true);
            setText('login-hero-title', 'ĐĂNG KÍ HỌC SINH');
        } else {
            setText('login-user-label', '2. Tên đăng nhập:');
            setText('login-pass-label', '3. Mật khẩu:');
            if (pi) pi.setAttribute('autocomplete', 'current-password');
            setBtn('ĐĂNG NHẬP ➜', true);
            setText('login-hero-title', 'ĐĂNG NHẬP HỌC SINH');
        }
        if (!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) {
            setTimeout(function () {
                var f = (v === 'register') ? $('login-name-input') : $('login-user-input');
                if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
            }, 60);
        }
    }

    /* ---------- đăng kí ---------- */
    function doRegister() {
        var ni = $('login-name-input'), ci = $('login-class-input'), ui = $('login-user-input'), pi = $('login-pass-input');
        var name = cleanText(ni && ni.value), cls = cleanText(ci && ci.value);
        var userRaw = ui ? ui.value : '', user = normUser(userRaw), pass = pi ? pi.value : '';
        var p2i = $('login-pass2-input'), pass2 = p2i ? p2i.value : '';
        if (!name) return err('⚠️ Vui lòng nhập Họ và tên của em!', ni, $('login-name-box'));
        if (!cls) return err('⚠️ Vui lòng nhập Lớp của em (VD: 12A1)!', ci, $('login-class-box'));
        if (!user) return err('⚠️ Vui lòng nhập Tên đăng nhập!', ui, $('login-user-box'));
        if (!validUser(user)) return err('⚠️ Tên đăng nhập gồm 3–30 ký tự: chữ không dấu, số, dấu . _ - (không có khoảng trắng).', ui, $('login-user-box'));
        if (pass.length < 4) return err('⚠️ Mật khẩu cần có ít nhất 4 ký tự!', pi, $('login-pass-box'));
        if (!pass2) return err('⚠️ Vui lòng nhập lại mật khẩu để xác nhận!', p2i, $('login-pass2-box'));
        if (pass2 !== pass) { if (p2i) p2i.value = ''; return err('⚠️ Mật khẩu nhập lại chưa khớp. Em nhập lại nhé!', p2i, $('login-pass2-box')); }
        if (busy) return; busy = true; setBtn('ĐANG XỬ LÝ...', true);

        findAccount(user).then(function (exist) {
            if (exist) { busy = false; setBtn('ĐĂNG KÍ ➜', true); return err('❌ Tên đăng nhập "' + user + '" đã có người dùng. Em hãy chọn tên khác!', ui, $('login-user-box')); }
            var salt = rndSalt();
            return hashPw(salt, pass).then(function (ph) {
                var rec = { u: user, name: name, cls: cls, salt: salt, ph: ph, ts: Date.now() };
                var db = load(); db.users[user] = rec;
                if (!save(db)) { busy = false; setBtn('ĐĂNG KÍ ➜', true); return err('⚠️ Không lưu được tài khoản trên trình duyệt này (có thể đang ở chế độ ẩn danh).'); }
                return cloudPut(user, rec).then(function (cloudOk) {
                    busy = false;
                    showView('login', true);
                    var ui2 = $('login-user-input'); if (ui2) ui2.value = user;
                    ok('✅ Đăng kí thành công! Em hãy nhập mật khẩu để ĐĂNG NHẬP.' + (cloudOn() && !cloudOk ? ' (Tài khoản mới lưu trên máy này.)' : ''));
                    var p = $('login-pass-input'); if (p && !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) p.focus();
                });
            });
        }).catch(function () { busy = false; setBtn('ĐĂNG KÍ ➜', true); err('⚠️ Có lỗi khi đăng kí, em thử lại nhé!'); });
    }

    /* ---------- đăng nhập ---------- */
    function doLogin() {
        var ui = $('login-user-input'), pi = $('login-pass-input');
        var user = normUser(ui && ui.value), pass = pi ? pi.value : '';
        if (!user) return err('⚠️ Vui lòng nhập Tên đăng nhập!', ui, $('login-user-box'));
        if (!pass) return err('⚠️ Vui lòng nhập Mật khẩu!', pi, $('login-pass-box'));
        if (busy) return; busy = true; setBtn('ĐANG KIỂM TRA...', true);
        var bad = function (msg, el, box) { busy = false; setBtn('ĐĂNG NHẬP ➜', true); err(msg, el, box); };

        findAccount(user).then(function (acc) {
            if (!acc) return bad('❌ Chưa có tài khoản "' + user + '". Em hãy bấm "Quay lại" và chọn ĐĂNG KÍ trước!', ui, $('login-user-box'));
            return hashPw(acc.salt, pass).then(function (ph) {
                if (ph !== acc.ph) { if (pi) pi.value = ''; return bad('❌ Mật khẩu chưa đúng. Em nhập lại nhé!', pi, $('login-pass-box')); }
                busy = false; setBtn('ĐĂNG NHẬP ➜', true);
                if (typeof finishLoginModal === 'function') finishLoginModal('HS', acc.name, acc.cls, acc.u);
            });
        }).catch(function () { bad('⚠️ Có lỗi khi đăng nhập, em thử lại nhé!'); });
    }

    window.HSAuth = {
        view: function () { return view; },
        show: showView,
        submit: function () { if (view === 'register') doRegister(); else if (view === 'login') doLogin(); },
        hasAccount: function (u) { return !!load().users[normUser(u)]; },
        get: function (u) { return load().users[normUser(u)] || null; }
    };
    window.hsAuthShow = showView;
})();
