// === [code126-bank] ===
/* [CODE126] Khung NGÂN HÀNG ĐỀ (máy tính) / TỰ LUYỆN (điện thoại) - dùng chung 1 nội dung nên luôn đồng bộ.
   Nội dung sẽ bổ sung sau: gọi CODE126Bank.setContent(htmlHoặcNode) hoặc CODE126Bank.onOpen = function (bodyEl) { ... }. */
(function () {
    'use strict';
    var modal = null, body = null;
    function build() {
        if (modal) return;
        modal = document.createElement('div');
        modal.id = 'bank-modal';
        modal.className = 'no-print';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML =
            '<div class="bk-panel">' +
              '<div class="bk-head">' +
                '<div class="bk-title"><span class="t-desk">📚 Ngân hàng đề</span><span class="t-mob">📚 Tự luyện</span></div>' +
                '<button type="button" class="bk-ib" data-act="home" title="Trang chủ" aria-label="Trang chủ"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg></button>' +
                '<button type="button" class="bk-ib" data-act="close" title="Đóng" aria-label="Đóng"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
              '</div>' +
              '<div class="bk-body" id="bank-body"><div class="bk-empty"><b>Đang cập nhật nội dung</b><span>Mục này sẽ sớm có đề luyện tập cho học sinh.</span></div></div>' +
            '</div>';
        document.body.appendChild(modal);
        body = modal.querySelector('#bank-body');
        modal.addEventListener('click', function (e) {
            if (e.target === modal) { close(); return; }
            var b = e.target.closest ? e.target.closest('[data-act]') : null;
            if (!b) return;
            if (b.getAttribute('data-act') === 'close') close();
            else if (b.getAttribute('data-act') === 'home') { close(); try { window.goHome && window.goHome(); } catch (x) {} }
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
    }
    function open() {
        build();
        modal.classList.add('open');
        try { if (typeof API.onOpen === 'function') API.onOpen(body); } catch (e) { console.error('[CODE126] onOpen', e); }
    }
    function close() { if (modal) modal.classList.remove('open'); }
    function setContent(c) {
        build();
        body.innerHTML = '';
        if (typeof c === 'string') body.innerHTML = c; else if (c && c.nodeType) body.appendChild(c);
    }
    var API = { open: open, close: close, setContent: setContent, onOpen: null };
    window.CODE126Bank = API;
    /* Bấm TRANG CHỦ ở bất kỳ nơi nào => đóng luôn khung này */
    var gh = window.goHome;
    if (typeof gh === 'function') window.goHome = function () { close(); return gh.apply(this, arguments); };
})();

// === [code129-bank] ===
/* [CODE129] NGÂN HÀNG ĐỀ: Môn học (có ⬆⬇ trên máy tính) -> Khối lớp -> Danh sách bài học (SGK thống nhất "Kết nối tri thức với cuộc sống", GDPT 2018)
   -> nút "Tạo ngân hàng đề" / "Cập nhật ngân hàng đề". Dữ liệu lưu localStorage (chạy tốt trên GitHub Pages).
   Móc nối nội dung sau: CODE129Bank.onLessonAction = function (info) {...}; CODE129Bank.setCount(info.key, soCau). */
(function () {
    'use strict';
    var LSK0 = 'matrix_bank_v1', LSQ0 = 'matrix_bank_questions_v1', qMem = null, qMemFor = '', applying = false;
    function lsk() { return LSK0 + (isStu() ? '_stu' : ''); }
    function lsq() { return LSQ0 + (isStu() ? '_stu' : ''); }
    var SUBJ = [
        ['Hóa học', '⚗️', [10, 11, 12]]
    ];
    /* Danh sách bài mẫu (# = tên chương). Các môn/lớp chưa có sẵn: giáo viên bấm "Thêm bài". Có thể sửa/xóa từng bài. */
    var CUR = {};   /* [CODE137] đã xóa toàn bộ danh sách bài mẫu - giáo viên tự nhập / tải từ file */
    var st = { order: [], lessons: {}, q: {}, m: {} }, path = [], modal, body, keepPath = false;
    function loadSt() { st = { order: [], lessons: {}, q: {}, m: {} }; try { var s = JSON.parse(localStorage.getItem(lsk()) || '{}'); st.order = s.order || []; st.lessons = s.lessons || {}; st.q = s.q || {}; st.m = s.m || {}; } catch (e) {} }
    loadSt();
try { if (!isStu() && !localStorage.getItem(LSK0 + '_c137')) { st.lessons = {}; st.q = st.q || {}; localStorage.setItem(LSK0 + '_c137', '1'); } } catch (e) {}
    function save() { try { localStorage.setItem(lsk(), JSON.stringify(st)); } catch (e) {} if (!applying) BS.touch(false); }
    var esc = window.LTDUtils.esc;
    var isStu = window.LTDUtils.isStuDom;
    function subjects() {
        var names = SUBJ.map(function (x) { return x[0]; });
        var o = st.order.filter(function (n) { return names.indexOf(n) >= 0; });
        names.forEach(function (n) { if (o.indexOf(n) < 0) o.push(n); });
        return o;
    }
    function info(n) { return SUBJ.filter(function (x) { return x[0] === n; })[0]; }
    function lessons(sj, g) {
        var k = sj + '|' + g;
        if (st.lessons[k]) return st.lessons[k];
        var raw = CUR[k]; if (!raw) return [];
        return raw.split('|').map(function (t, i) { return t.charAt(0) === '#' ? { id: 'c' + i, h: 1, n: t.slice(1) } : { id: 'l' + i, n: t }; });
    }
    function setL(sj, g, arr) { st.lessons[sj + '|' + g] = arr; save(); }
    function moveSubj(n, d) {
        var l = subjects(), i = l.indexOf(n), j = i + d;
        if (i < 0 || j < 0 || j >= l.length) return;
        var t = l[i]; l[i] = l[j]; l[j] = t; st.order = l; save(); render(true);
        /* [CODE158] vị trí mới được CỐ ĐỊNH (lưu máy + đồng bộ Firebase cho học sinh); giữ nguyên chỗ cuộn và nháy khung môn vừa chuyển */
        try {
            var cards = body.querySelectorAll('.bk-card');
            for (var ci = 0; ci < cards.length; ci++) if (cards[ci].getAttribute('data-sj') === n) { cards[ci].classList.add('bk-flash'); if (cards[ci].scrollIntoView) cards[ci].scrollIntoView({ block: 'nearest' }); break; }
        } catch (e) {}
    }
    var ARW = 'bk-mv';
    function crumb() {
        var h = '<div class="bk-crumb"><a data-go="0">📚 Ngân hàng đề</a>';
        if (path[0]) h += ' › <a data-go="1">' + esc(path[0]) + '</a>';
        if (path[1]) h += path.length > 2 ? ' › <a data-go="2">' + esc(path[0]) + ' ' + path[1] + '</a>' : ' › <b>' + esc(path[0]) + ' ' + path[1] + '</b>';
        if (path[2]) h += ' › <b>' + esc(lessonName(path)) + '</b>';
        return h + '</div>';
    }
    /* [CODE138] ngân hàng câu hỏi: lưu / đọc câu hỏi từng bài (localStorage) */
    /* [CODE160] Câu hỏi ngân hàng đề lưu trong IndexedDB (hàng trăm MB, mỗi bài 1 bản ghi) thay cho localStorage (~5MB, gây lỗi "Không lưu được").
       Bộ nhớ đệm qMem giữ API đọc/ghi đồng bộ như cũ; dữ liệu cũ trong localStorage tự chuyển sang IndexedDB rồi xóa khỏi localStorage. */
    var QDB = {};
    function qdb() {
        var mk = lsq();
        if (QDB[mk]) return QDB[mk];
        var s = QDB[mk] = { name: mk, saved: {}, rec: null, merged: false, chain: Promise.resolve(), warned: false };
        s.dbP = new Promise(function (res) {
            try {
                var rq = indexedDB.open('mxbank_' + mk, 1);
                rq.onupgradeneeded = function () { rq.result.createObjectStore('q', { keyPath: 'k' }); };
                rq.onsuccess = function () { res(rq.result); };
                rq.onerror = rq.onblocked = function () { res(null); };
            } catch (e) { res(null); }
        });
        s.loadP = s.dbP.then(function (db) {
            if (!db) return null;
            return new Promise(function (res) {
                try {
                    var out = {}, rq = db.transaction('q', 'readonly').objectStore('q').getAll();
                    rq.onsuccess = function () { (rq.result || []).forEach(function (r) { out[r.k] = { q: r.q, t: r.t || 0 }; }); res(out); };
                    rq.onerror = function () { res(null); };
                } catch (e) { res(null); }
            });
        }).then(function (rec) {
            s.rec = rec || {};
            if (qMemFor === s.name) applyRec(s);
        });
        return s;
    }
    function applyRec(s) {
        if (s.merged || !s.rec || !qMem || qMemFor !== s.name) return;
        s.merged = true;
        var changed = false;
        Object.keys(s.rec).forEach(function (k) {
            var r = s.rec[k], c = qMem[k];
            if (!c || (r.t || 0) > (c.t || 0)) { qMem[k] = r; changed = true; }
            s.saved[k] = r.t || 0;
        });
        persist(s);   /* đưa dữ liệu cũ còn trong localStorage (nếu có) sang IndexedDB */
        if (changed) { try { if (modal && modal.classList.contains('open') && editIdx < 0 && !editDirty) render(true); } catch (e) {} }
    }
    function persist(s) {
        s.chain = s.chain.then(function () { return s.loadP; }).then(function () { return s.dbP; }).then(function (db) {
            var snap = qMem && qMemFor === s.name ? qMem : null;
            if (!snap) return;
            if (!db) {   /* trình duyệt không có IndexedDB: thử localStorage, nếu đầy thì chỉ giữ tạm trong phiên */
                try { localStorage.setItem(s.name, JSON.stringify(snap)); }
                catch (e) { if (!s.warned) { s.warned = true; try { status('⚠ Trình duyệt không cho lưu lâu dài: ngân hàng đề chỉ giữ tạm đến khi đóng trang. Hãy bấm ĐỒNG BỘ LÊN để lưu lên máy chủ.'); setTimeout(unstatus, 7000); } catch (e2) {} } }
                return;
            }
            return new Promise(function (res) {
                try {
                    var tx = db.transaction('q', 'readwrite'), os = tx.objectStore('q'), kr = os.getAllKeys();
                    kr.onsuccess = function () {
                        (kr.result || []).forEach(function (k) { if (!snap[k]) { os.delete(k); delete s.saved[k]; } });
                        Object.keys(snap).forEach(function (k) {
                            var t = snap[k].t || 0;
                            if (s.saved[k] !== t) { os.put({ k: k, q: snap[k].q || [], t: t }); s.saved[k] = t; }
                        });
                    };
                    tx.oncomplete = function () { try { localStorage.removeItem(s.name); } catch (e) {} res(true); };
                    tx.onabort = tx.onerror = function () {
                        s.saved = {};
                        if (!s.warned) { s.warned = true; try { status('⚠ Không ghi được vào bộ nhớ trình duyệt (có thể ổ đĩa đầy). Hãy bấm ĐỒNG BỘ LÊN để lưu lên máy chủ.'); setTimeout(unstatus, 7000); } catch (e2) {} }
                        res(false);
                    };
                } catch (e) { res(false); }
            });
        });
        return s.chain;
    }
    function readQ() {
        var mk = lsq();
        if (qMem && qMemFor === mk) return qMem;
        var o = {}; try { o = JSON.parse(localStorage.getItem(mk) || '{}') || {}; } catch (e) {}
        qMem = o; qMemFor = mk;
        var s = qdb(); applyRec(s);
        return qMem;
    }
    function writeQ(o) { qMem = o; qMemFor = lsq(); persist(qdb()); return true; }
    try { readQ(); } catch (e) {}   /* mở IndexedDB và nạp dữ liệu ngay khi tải trang */
    function getQuestions(key) { var o = readQ(), r = (o[key] && o[key].q) ? o[key].q : []; try { if (!isStu() && window.__bankBase) window.__bankBase(key, r); } catch (e) {} return r; }
    function lvCount(arr) { var c = { NB: 0, TH: 0, VD: 0, VDC: 0 }; arr.forEach(function (x) { if (c[x.level] != null) c[x.level]++; }); return c; }
    function saveQuestions(key, arr) {
        var chg = null; try { if (!isStu() && window.__bankPre) chg = window.__bankPre(key, arr); } catch (e) { console.error(e); }
        var o = readQ(); o[key] = { q: arr, t: Date.now() };
        if (!writeQ(o)) { console.error('[CODE138] quota'); return false; }
        st.q[key] = arr.length; st.m[key] = lvCount(arr); save(); try { if (chg && window.__bankPost) window.__bankPost(key, arr, chg); } catch (e) { console.error(e); } return true;
    }
    function removeQuestions(key) {
        var o = readQ(); if (o[key]) { delete o[key]; writeQ(o); }
        delete st.q[key]; delete st.m[key]; save();
    }
    function lvText(key) {
        var m = st.m && st.m[key]; if (!m) return '';
        var t = (m.NB ? ' • NB ' + m.NB : '') + (m.TH ? ' • TH ' + m.TH : '') + (m.VD ? ' • VD ' + m.VD : '') + (m.VDC ? ' • VDC ' + m.VDC : '');
        return t;
    }
    function exportBank() {
        var data = { app: 'matrix-bank', v: 1, state: st, questions: readQ() }, a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
        a.download = 'ngan-hang-de_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function importBank() {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = function () {
            var f = inp.files && inp.files[0]; if (!f) return;
            var r = new FileReader();
            r.onload = function () {
                try {
                    var d = JSON.parse(r.result);
                    if (!d || d.app !== 'matrix-bank' || !d.state) throw new Error('Không phải file sao lưu ngân hàng đề.');
                    if (!confirm('Khôi phục sẽ GHI ĐÈ toàn bộ ngân hàng đề hiện có trên trình duyệt này. Tiếp tục?')) return;
                    if (!writeQ(d.questions || {})) throw new Error('Bộ nhớ trình duyệt đầy.');
                    st.order = d.state.order || []; st.lessons = d.state.lessons || {}; st.q = d.state.q || {}; st.m = d.state.m || {};
                    save(); BS.touch(true); render(); status('Đã khôi phục ngân hàng đề.'); setTimeout(unstatus, 2500);
                } catch (e) { alert('Không khôi phục được: ' + (e && e.message ? e.message : e)); }
            };
            r.readAsText(f);
        };
        inp.click();
    }
    /* [CODE139] XEM CÂU HỎI của từng bài trong ngân hàng đề (+ sửa / xóa từng câu) */
    function lessonName(p) { var a = lessons(p[0], p[1]); for (var i = 0; i < a.length; i++) if (a[i].id === p[2]) return a[i].n; return ''; }
    function fmtQ(t) {
        t = String(t == null ? '' : t);
        try { if (typeof window.formatMathAndChemHTML === 'function') return window.formatMathAndChemHTML(t); } catch (e) {}
        return esc(t);
    }
    /* [CODE143] Hình vẽ trong câu hỏi / đáp án / lời giải tự động căn giữa. Ảnh công thức nhỏ nằm trong dòng chữ giữ nguyên. */
    function markFig(img) {
        if (!img || img.tagName !== 'IMG' || !img.closest || !img.closest('.bk-view') || img.closest('.katex')) return;
        if (img.hasAttribute('data-al')) { img.classList.remove('bk-fig'); return; }   /* [CODE161] ảnh đã có căn lề theo file nguồn */
        var nw = img.naturalWidth, nh = img.naturalHeight; if (!nw || !nh) return;
        var sw = parseFloat(img.style.width) || 0, dw = sw || nw, dh = nh * dw / nw;
        if (dh >= 60 || dw >= 300) img.classList.add('bk-fig'); else img.classList.remove('bk-fig');
    }
    /* [CODE144] Lời giải mặc định ẨN (nút "💡 XEM HƯỚNG DẪN"); trạng thái mở chỉ giữ trong lúc xem 1 bài, đổi bài/xóa câu thì ẩn lại */
    function resetSol() { var o = window.LVSO; if (!o) return; Object.keys(o).forEach(function (k) { if (k.indexOf('bk_') === 0) delete o[k]; }); }
    var lvFilter = 'all';
    var LVL = [['NB', 'NHẬN BIẾT', 'Nhận biết'], ['TH', 'THÔNG HIỂU', 'Thông hiểu'], ['VD', 'VẬN DỤNG', 'Vận dụng'], ['VDC', 'VẬN DỤNG CAO', 'Vận dụng cao'], ['', 'CHƯA PHÂN MỨC ĐỘ', 'Chưa phân mức']];
    function lvOf(x) { return (x.level === 'NB' || x.level === 'TH' || x.level === 'VD' || x.level === 'VDC') ? x.level : ''; }
    function viewHtml() {
        /* [CODE142] Phân loại theo mức độ: bộ lọc Nhận biết / Thông hiểu / Vận dụng; luôn hiện đủ 3 nhóm chính; đổi mức độ nhanh ngay trên thẻ. Hiển thị câu hỏi dùng thẻ làm bài. */
        var key = path.join('|'), qs = getQuestions(key), stu = isStu(), B = window.BKView;
        var h = '<div class="bk-view"><div class="bk-tools"><b>' + esc(lessonName(path)) + '</b>' + (stu ? '' : '<span><button class="bk-b bk-up" data-act2="' + esc(path[2]) + '">➕ Cập nhật ngân hàng đề</button>' + (qs.length ? '<button class="bk-b bk-rm" data-qdelall="1" title="Xóa tất cả câu hỏi của bài này">🗑 Xóa toàn bộ câu hỏi</button>' : '') + '</span>') + '</div>';
        if (!qs.length) return h + '<div class="bk-empty"><b>Bài này chưa có câu hỏi</b><span>Bấm "Cập nhật ngân hàng đề" để thêm câu hỏi.</span></div></div>';
        if (!B) return h + '<div class="bk-empty"><b>Chưa tải xong giao diện câu hỏi</b><span>Hãy tải lại trang (Ctrl+F5) rồi mở lại.</span></div></div>';
        var ordered = [], cnt = { NB: 0, TH: 0, VD: 0, VDC: 0, '': 0 };
        LVL.forEach(function (L) {
            ['mc', 'tf', 'sa'].forEach(function (t) {
                qs.forEach(function (x, i) {
                    var tt = (x.type === 'tf' || x.type === 'sa') ? x.type : 'mc';
                    if (lvOf(x) === L[0] && tt === t) { ordered.push(Object.assign({}, x, { id: 'bk_' + i, type: t, _oi: i, _lv: L[0] })); cnt[L[0]]++; }
                });
            });
        });
        if (lvFilter !== 'all' && lvFilter !== 'none' && !cnt.hasOwnProperty(lvFilter)) lvFilter = 'all';
        /* thanh lọc mức độ */
        h += '<div class="bk-flt"><button class="bk-fc' + (lvFilter === 'all' ? ' on' : '') + '" data-lvf="all">Tất cả <span>(' + qs.length + ')</span></button>';
        LVL.forEach(function (L) {
            var code = L[0] || 'none';
            if (cnt[L[0]] || L[0] === 'NB' || L[0] === 'TH' || L[0] === 'VD' || lvFilter === code)
                h += '<button class="bk-fc' + (lvFilter === code ? ' on' : '') + '" data-lvf="' + code + '">' + L[2] + ' <span>(' + cnt[L[0]] + ')</span></button>';
        });
        h += '</div>';
        var nm = B.numMap(ordered), ctx = { nm: nm };
        window.LVSO = window.LVSO || {};
        LVL.forEach(function (L) {
            var code = L[0] || 'none', main = (L[0] === 'NB' || L[0] === 'TH' || L[0] === 'VD');
            if (lvFilter === 'all' ? !(cnt[L[0]] || main) : lvFilter !== code) return;
            h += '<div class="bk-lvh bk-lvh-' + code + '">' + L[1] + ' <span>(' + cnt[L[0]] + ' câu)</span></div>';
            var items = ordered.filter(function (o) { return o._lv === L[0]; });
            if (!items.length) { h += '<div class="bk-lve">Chưa có câu hỏi ở mức độ này.' + (stu ? '' : ' Chọn mức độ ở mục "🎯 Mức độ" của từng câu để phân loại.') + '</div>'; return; }
            var lastT = null;
            h += '<div class="qc-live">';
            items.forEach(function (q) {
                if (window.LVSO[q.id] !== true) window.LVSO[q.id] = false;   /* [CODE145] mặc định ẨN hướng dẫn; chỉ mở khi giáo viên bấm "XEM HƯỚNG DẪN" */
                if (q.type !== lastT) { h += B.partHd(q.type); lastT = q.type; }
                if (!stu && q._oi === editIdx) { h += editFormHtml(qs[q._oi], q._oi, q.type, (nm[q.id] || {}).num || ''); return; }
                var k = { correct: q.correct, tf: q.tfAnswers, sa: q.shortAnswer, sol: q.solution || '', tfSol: q.tfSol || [] };
                var a = q.type === 'sa' ? { value: String(q.shortAnswer == null ? '' : q.shortAnswer) } : null;
                var c = B.card(q, a, k, null, false, ctx, {});
                if (!stu) c = c.replace(/^<div[^>]*>/, function (m) {
                    var sel = LVL.map(function (V) { return '<option value="' + V[0] + '"' + (V[0] === q._lv ? ' selected' : '') + '>' + (V[0] ? V[2] : 'Chưa chọn') + '</option>'; }).join('');
                    return m + '<div class="bk-ctb"><label class="bk-lsl">🎯 Mức độ <select class="bk-lsel" data-qlv="' + q._oi + '">' + sel + '</select></label><span class="bk-sp"></span><button class="bk-b" data-qedit="' + q._oi + '">✏️ Chỉnh sửa</button><button class="bk-b bk-rm" data-qdel="' + q._oi + '">🗑 Xóa</button></div>';
                });
                h += c;
            });
            h += '</div>';
        });
        return h + '<div class="bk-ver">Hướng dẫn giải mặc định ẩn – bấm "XEM HƯỚNG DẪN" ở từng câu để hiện</div></div>';
    }
    function setLevel(i, v, sel) {
        var key = path.join('|'), qs = getQuestions(key), q = qs[i];
        if (!q) return;
        if (editIdx >= 0 && editDirty) { alert('Hãy lưu hoặc hủy câu đang chỉnh sửa trước khi đổi mức độ câu khác.'); if (sel) sel.value = lvOf(q); return; }
        if (v) q.level = v; else delete q.level;
        if (!saveQuestions(key, qs)) { alert('Không lưu được thay đổi (bộ nhớ trình duyệt đầy).'); return; }
        render(true);
    }
    /* [CODE141] SỬA TRỰC TIẾP: bấm "Chỉnh sửa" => thẻ câu hỏi đó chuyển thành biểu mẫu ngay tại chỗ (ảnh/bảng nhúng được rút gọn thành [[HÌNH n]]) */
    var editIdx = -1, editHolder = [], editDirty = false;
    var MASK_RE = /@@(?:IMG|TBL)_[A-Za-z0-9+\/=_-]+(?:~\d+x\d+)?@@|<img\b[^>]*>/gi;
    function maskT(t) {
        return String(t == null ? '' : t).replace(MASK_RE, function (tk) {
            var i = editHolder.indexOf(tk); if (i < 0) { editHolder.push(tk); i = editHolder.length - 1; }
            return (tk.slice(0, 5) === '@@TBL' ? '[[BẢNG ' : '[[HÌNH ') + (i + 1) + ']]';
        });
    }
    function unmaskT(t) { return String(t == null ? '' : t).replace(/\[\[(?:HÌNH|BẢNG) (\d+)\]\]/g, function (m, n) { return editHolder[n - 1] || m; }); }
    function taField(name, val, rows) {
        return '<textarea class="bk-ta2" data-f="' + name + '" rows="' + (rows || 2) + '" spellcheck="false">' + esc(maskT(val)) + '</textarea><div class="bk-pv math-content"></div>';
    }
    function autosize(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }
    function preview(ta) {
        var pv = ta.nextElementSibling; if (!pv || !pv.classList.contains('bk-pv')) return;
        var raw = ta.value;
        if (!raw.trim() || !/[$\\@<^_]|\[\[/.test(raw)) { pv.style.display = 'none'; pv.innerHTML = ''; return; }
        pv.innerHTML = fmtQ(unmaskT(raw)); pv.style.display = 'block';
    }
    function editFormHtml(x, i, t, num) {
        var PMT = { mc: 'Phần I – Nhiều lựa chọn', tf: 'Phần II – Đúng/Sai', sa: 'Phần III – Trả lời ngắn' }, lv = x.level || '', opts = x.options || [], j;
        function lo(v, tx) { return '<option value="' + v + '"' + (lv === v ? ' selected' : '') + '>' + tx + '</option>'; }
        var h = '<div class="bk-ef" data-edit-form="' + i + '"><div class="bk-efh"><b>✏️ Đang chỉnh sửa Câu ' + num + '</b><span class="bk-efp">' + PMT[t] + '</span><span class="bk-sp"></span>' +
            '<label>🎯 Mức độ <select data-f="level">' + lo('', 'Chưa chọn') + lo('NB', 'Nhận biết') + lo('TH', 'Thông hiểu') + lo('VD', 'Vận dụng') + lo('VDC', 'Vận dụng cao') + '</select></label></div>';
        if (x.ginfo) h += '<div class="bk-el">🔗 Thông tin chung của nhóm câu</div>' + taField('ginfo', x.ginfo, 3);
        h += '<div class="bk-el">Nội dung câu hỏi</div>' + taField('text', x.text, 3);
        if (t === 'mc') {
            h += '<div class="bk-el">Các phương án (chọn ◉ ở đáp án đúng)</div>';
            for (j = 0; j < opts.length; j++) h += '<div class="bk-eo"><label class="bk-er"><input type="radio" name="bk-correct" value="' + esc(opts[j].letter) + '"' + (opts[j].letter === x.correct ? ' checked' : '') + '><b>' + esc(opts[j].letter) + '.</b></label><div class="bk-ec">' + taField('opt' + j, opts[j].text, 1) + '</div></div>';
        } else if (t === 'tf') {
            h += '<div class="bk-el">Các ý a), b), c), d)</div>';
            for (j = 0; j < 4; j++) {
                var ok = !!(x.tfAnswers && x.tfAnswers[j]);
                h += '<div class="bk-eo"><b class="bk-etl">' + 'abcd'.charAt(j) + ')</b><div class="bk-ec">' + taField('opt' + j, opts[j] ? opts[j].text : '', 1) +
                    '<div class="bk-etr"><label><input type="radio" name="bk-tf' + j + '" value="1"' + (ok ? ' checked' : '') + '> Đúng</label><label><input type="radio" name="bk-tf' + j + '" value="0"' + (ok ? '' : ' checked') + '> Sai</label></div>' +
                    '<div class="bk-es">Giải thích ý ' + 'abcd'.charAt(j) + ') (nếu có)</div>' + taField('tfsol' + j, (x.tfSol && x.tfSol[j]) || '', 1) + '</div></div>';
            }
        } else {
            h += '<div class="bk-el">Đáp án (trả lời ngắn)</div><input class="bk-ei" data-f="sa" value="' + esc(x.shortAnswer == null ? '' : x.shortAnswer) + '">';
        }
        h += '<div class="bk-el">📖 Lời giải / Hướng dẫn giải' + (t === 'tf' ? ' chung' : '') + ' (nếu có)</div>' + taField('sol', x.solution || '', 3);
        return h + '<div class="bk-eb"><button class="bk-b bk-up" data-qsave="1">💾 Lưu thay đổi</button><button class="bk-b" data-qcancel="1">Hủy</button></div></div>';
    }
    function editQ(i) {
        if (editIdx === i) return;
        if (editIdx >= 0 && editDirty && !confirm('Câu đang sửa chưa được lưu. Bỏ thay đổi và sửa câu khác?')) return;
        editIdx = i; editHolder = []; editDirty = false; render(true);
        var f = body.querySelector('[data-edit-form]');
        if (f) { try { f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} var tx = f.querySelector('[data-f="text"]'); if (tx) { try { tx.focus({ preventScroll: true }); } catch (e) { tx.focus(); } } }
    }
    function cancelEdit() {
        if (editDirty && !confirm('Bỏ các thay đổi chưa lưu của câu này?')) return;
        editIdx = -1; editDirty = false; render(true);
    }
    function saveEdit() {
        var key = path.join('|'), qs = getQuestions(key), q = qs[editIdx], f = body.querySelector('[data-edit-form]'), j;
        if (!q || !f) return;
        function g(n) { var e = f.querySelector('[data-f="' + n + '"]'); return e ? unmaskT(e.value) : ''; }
        var t = (q.type === 'tf' || q.type === 'sa') ? q.type : 'mc';
        if (!g('text').trim()) { alert('Nội dung câu hỏi không được để trống.'); return; }
        if (t === 'sa' && !g('sa').trim()) { alert('Hãy nhập đáp án của câu trả lời ngắn.'); return; }
        q.text = g('text').trim();
        var lv = g('level'); if (lv) q.level = lv; else delete q.level;
        if (f.querySelector('[data-f="ginfo"]')) { var gi = g('ginfo').trim(); if (gi) q.ginfo = gi; else delete q.ginfo; }
        if (t === 'mc') {
            (q.options || []).forEach(function (o, k) { o.text = g('opt' + k).trim(); });
            var r = f.querySelector('input[name="bk-correct"]:checked'); if (r) q.correct = r.value;
        } else if (t === 'tf') {
            q.options = q.options || []; q.tfAnswers = q.tfAnswers || [];
            for (j = 0; j < 4; j++) {
                if (!q.options[j]) q.options[j] = { letter: 'abcd'.charAt(j), text: '' };
                q.options[j].text = g('opt' + j).trim();
                var rt = f.querySelector('input[name="bk-tf' + j + '"]:checked'); q.tfAnswers[j] = !!(rt && rt.value === '1');
            }
            var ts = [0, 1, 2, 3].map(function (k) { return g('tfsol' + k).trim(); });
            if (ts.some(Boolean)) q.tfSol = ts; else delete q.tfSol;
        } else { q.shortAnswer = g('sa').trim(); }
        var so = g('sol').trim(); if (so) q.solution = so; else delete q.solution;
        if (!saveQuestions(key, qs)) { alert('Không lưu được thay đổi (bộ nhớ trình duyệt đầy).'); return; }
        editIdx = -1; editDirty = false; render(true);
        status('Đã lưu câu hỏi.'); setTimeout(unstatus, 1800);
    }
    function delAllQ() {
        var key = path.join('|'), qs = getQuestions(key);
        if (!qs.length) return;
        if (!confirm('Xóa TOÀN BỘ ' + qs.length + ' câu hỏi của bài "' + lessonName(path) + '" khỏi ngân hàng đề?\nThao tác này không thể hoàn tác.')) return;
        if (!confirm('Xác nhận lần cuối: xóa toàn bộ câu hỏi của bài này?')) return;
        removeQuestions(key); editIdx = -1;
        path.pop(); render();   /* quay về danh sách bài (bài học vẫn giữ nguyên, chỉ xóa câu hỏi) */
        status('Đã xóa toàn bộ câu hỏi của bài.'); setTimeout(unstatus, 2500);
    }
    function delQ(i) {
        var key = path.join('|'), qs = getQuestions(key), rm = qs[i];
        if (!rm || !confirm('Xóa câu hỏi này khỏi ngân hàng đề?')) return;
        editIdx = -1; resetSol();
        qs.splice(i, 1);
        if (rm.gid && rm.ginfo) { for (var k = 0; k < qs.length; k++) if (qs[k].gid === rm.gid) { if (!qs[k].ginfo) qs[k].ginfo = rm.ginfo; break; } }
        qs.forEach(function (x, k) { x.id = k + 1; });
        if (!qs.length) { removeQuestions(key); path.pop(); render(); return; }
        if (!saveQuestions(key, qs)) { alert('Không lưu được thay đổi (bộ nhớ trình duyệt đầy).'); return; }
        render(true);
    }
    function render(keep) {
        if (!body) return;
        if (path.length < 3) editIdx = -1;
        var top = keep ? body.scrollTop : 0, h = BS.barHtml() + crumb(), stu = isStu();
        if (!path.length) {
            var l = subjects();
            if (!stu) h += '<div class="bk-tools"><b>Chọn môn học</b><span><button class="bk-b" data-bkexp="1" title="Tải file sao lưu toàn bộ ngân hàng đề về máy">💾 Sao lưu ngân hàng đề</button><button class="bk-b" data-bkimp="1" title="Khôi phục từ file sao lưu">📥 Khôi phục</button></span></div>';
            h += '<div class="bk-grid">' + l.map(function (n, i) {
                return '<div class="bk-card" data-sj="' + esc(n) + '"><div class="bk-ic">' + info(n)[1] + '</div><div class="bk-nm">' + esc(n) + '</div><div class="bk-sub">' + info(n)[2].length + ' khối lớp</div>' +
                    (stu ? '' : '<div class="bk-mvw"><button type="button" class="bk-mv" data-mvs="' + esc(n) + '" data-d="-1" title="Chuyển môn học lên trước"' + (i === 0 ? ' disabled' : '') + '>◀</button><button type="button" class="bk-mv" data-mvs="' + esc(n) + '" data-d="1" title="Chuyển môn học ra sau"' + (i === l.length - 1 ? ' disabled' : '') + '>▶</button></div>') + '</div>';   /* [CODE158] hiện lại nút di chuyển môn học (máy tính) */
            }).join('') + '</div>';
        } else if (path.length === 1) {
            h += '<div class="bk-grid">' + info(path[0])[2].map(function (g) {
                var c = lessons(path[0], g).filter(function (x) { return !x.h; }).length;
                return '<div class="bk-card" data-gr="' + g + '"><div class="bk-ic">📁</div><div class="bk-nm">' + esc(path[0]) + ' ' + g + '</div><div class="bk-sub">' + (c ? c + ' bài học' : 'Chưa có danh sách bài') + '</div></div>';
            }).join('') + '</div>';
        } else if (path.length === 2) {
            var sj = path[0], g = path[1], arr = lessons(sj, g), n = 0;
            var allQ = 0; arr.forEach(function (x) { if (!x.h) allQ += st.q[sj + '|' + g + '|' + x.id] || 0; });
            h += '<div class="bk-root"><span class="bk-rootn">' + esc(sj) + ' ' + g + '</span>' + (stu && allQ ? '<button class="bk-b bk-rootgo" data-allprac="1">ÔN LUYỆN</button>' : '') + (stu ? '' : '<span class="bk-rootb">' + (allQ ? '<button class="bk-b bk-xw" data-xwr="1" title="Xuất file Word cho cả môn học (chọn chương / bài trong trang xuất)">📄 Xuất file word</button>' : '') + '<button class="bk-b" data-file="1">📎 Thêm danh sách từ file (Word, Excel, PDF, ảnh)</button><button class="bk-b" data-add="1">➕ Thêm / dán danh sách bài</button>' + (st.lessons[sj + '|' + g] && CUR[sj + '|' + g] ? '<button class="bk-b" data-reset="1">↺ Mặc định</button>' : '') + '</span>') + '</div>';
            if (!arr.length) h += '<div class="bk-empty"><b>Chưa có danh sách bài học</b><span>' + (stu ? 'Giáo viên sẽ cập nhật sớm.' : 'Bấm "➕ Thêm / dán danh sách bài" để nhập các bài học của lớp này.') + '</span></div>';
            h += arr.map(function (x, ai) {
                if (x.h) {
                    var cq = 0; for (var z = ai + 1; z < arr.length && !arr[z].h; z++) cq += st.q[sj + '|' + g + '|' + arr[z].id] || 0;
                    return '<div class="bk-ch"><span class="bk-chn">' + esc(x.n) + '</span>' + (stu && cq ? '<button class="bk-b bk-go" data-chap="' + x.id + '">ÔN LUYỆN</button>' : '') + (stu ? '' : ' <button class="bk-i" data-ren="' + x.id + '">✏️</button><button class="bk-i" data-del="' + x.id + '">🗑</button>') + '</div>'; }
                n++; var key = sj + '|' + g + '|' + x.id, q = st.q[key] || 0;
                return '<div class="bk-ls"><span class="bk-no">' + n + '</span><span class="bk-ln">' + esc(x.n) + '' + '</span>' +
                    (stu ? (q ? '<button class="bk-b bk-go" data-act2="' + x.id + '">ÔN LUYỆN</button>' : '') :
                    '<button class="bk-i" data-ren="' + x.id + '">✏️</button><button class="bk-i" data-del="' + x.id + '">🗑</button>' + (q ? '<button class="bk-b bk-vw" data-view="' + x.id + '">👁 Xem câu hỏi</button>' : '') + '<button class="bk-b ' + (q ? 'bk-up' : 'bk-go') + '" data-act2="' + x.id + '">' + (q ? 'Cập nhật ngân hàng đề' : 'Tạo ngân hàng đề') + '</button>') + '</div>';
            }).join('');
        } else { h += viewHtml(); }
        body.innerHTML = h; body.scrollTop = top;
        if (editIdx >= 0) body.querySelectorAll('[data-edit-form] textarea.bk-ta2').forEach(function (ta) { autosize(ta); preview(ta); });
        body.querySelectorAll('.bk-view img').forEach(markFig);
    }
    /* [CODE136] Thêm danh sách bài TỪ FILE: Word (.docx), Excel (.xlsx/.xls/.csv), PDF, ảnh (OCR tiếng Việt). Chạy hoàn toàn trên trình duyệt (GitHub Pages). */
    var URL_PDF = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', URL_PDFW = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
        URL_TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', URL_ZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
        URL_XLS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', NSW = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', stEl = null;
    function lib(url, test) {
        return new Promise(function (res, rej) {
            if (test()) return res();
            var sc = document.createElement('script'); sc.src = url; sc.onload = function () { res(); };
            sc.onerror = function () { rej(new Error('Không tải được thư viện xử lý file (kiểm tra mạng): ' + url)); };
            document.head.appendChild(sc);
        });
    }
    function status(t) {
        if (!stEl) { stEl = document.createElement('div'); stEl.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:120;background:#9a3412;color:#fff;padding:10px 18px;border-radius:12px;font:700 15px Roboto,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3);max-width:90vw;text-align:center'; document.body.appendChild(stEl); }
        stEl.textContent = t; stEl.style.display = 'block';
    }
    function unstatus() { if (stEl) stEl.style.display = 'none'; }
    function fromDocx(f) {
        return f.arrayBuffer().then(function (b) { return lib(URL_ZIP, function () { return window.JSZip; }).then(function () { return JSZip.loadAsync(b); }); })
            .then(function (z) { var e = z.file('word/document.xml'); if (!e) throw new Error('Không đọc được file Word. Hãy dùng định dạng .docx (không phải .doc cũ).'); return e.async('string'); })
            .then(function (x) {
                var d = new DOMParser().parseFromString(x, 'application/xml'), ps = d.getElementsByTagNameNS(NSW, 'p'), out = [];
                for (var i = 0; i < ps.length; i++) {
                    var ns = ps[i].getElementsByTagNameNS(NSW, '*'), t = '';
                    for (var k = 0; k < ns.length; k++) { var ln = ns[k].localName; if (ln === 't') t += ns[k].textContent; else if (ln === 'tab' || ln === 'br') t += ' '; }
                    out.push(t);
                }
                return out;
            });
    }
    function fromExcel(f) {
        return f.arrayBuffer().then(function (b) { return lib(URL_XLS, function () { return window.XLSX; }).then(function () { return XLSX.read(b, { type: 'array' }); }); })
            .then(function (wb) {
                var out = [];
                wb.SheetNames.forEach(function (n) {
                    XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' }).forEach(function (r) { r.forEach(function (c) { c = String(c).trim(); if (c) out.push(c); }); });
                });
                return out;
            });
    }
    function ocr(srcs) {
        var idx = 0, total = srcs.length;
        return lib(URL_TESS, function () { return window.Tesseract; }).then(function () {
            status('Đang tải bộ nhận dạng chữ tiếng Việt...');
            return Tesseract.createWorker('vie', 1, { logger: function (m) { if (m.status === 'recognizing text') status('Đang nhận dạng chữ ' + idx + '/' + total + ': ' + Math.round(m.progress * 100) + '%'); } });
        }).then(function (w) {
            var acc = [], p = Promise.resolve();
            srcs.forEach(function (s) {
                p = p.then(function () { idx++; status('Đang xử lý ảnh/trang ' + idx + '/' + total + '...'); return Promise.resolve(typeof s === 'function' ? s() : s); })
                    .then(function (img) { return w.recognize(img); })
                    .then(function (r) { acc = acc.concat(r.data.text.split('\n')); });
            });
            return p.then(function () { return w.terminate(); }).then(function () { return acc; });
        });
    }
    function fromPdf(f) {
        var pdf;
        return f.arrayBuffer().then(function (b) {
            return lib(URL_PDF, function () { return window.pdfjsLib; }).then(function () {
                return fetch(URL_PDFW).then(function (r) { return r.text(); }).then(function (t) { pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([t], { type: 'text/javascript' })); })
                    .catch(function () { pdfjsLib.GlobalWorkerOptions.workerSrc = URL_PDFW; });
            }).then(function () { return pdfjsLib.getDocument({ data: b }).promise; });
        }).then(function (d) {
            pdf = d; var n = Math.min(d.numPages, 80), p = Promise.resolve([]);
            for (var i = 1; i <= n; i++) (function (i) {
                p = p.then(function (acc) {
                    status('Đang đọc PDF trang ' + i + '/' + n + '...');
                    return pdf.getPage(i).then(function (pg) { return pg.getTextContent(); }).then(function (c) {
                        var rows = [], y = null, cur = '';
                        c.items.forEach(function (it) { var yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 3) { rows.push(cur); cur = ''; } y = yy; cur += (cur ? ' ' : '') + it.str; });
                        if (cur) rows.push(cur); return acc.concat(rows);
                    });
                });
            })(i);
            return p;
        }).then(function (lines) {
            if (lines.join('').replace(/\s/g, '').length >= 40) return lines;
            var n = Math.min(pdf.numPages, 10), srcs = [];   /* PDF dạng ảnh scan -> OCR */
            for (var i = 1; i <= n; i++) (function (i) {
                srcs.push(function () {
                    status('Đang chuyển trang ' + i + '/' + n + ' sang ảnh...');
                    return pdf.getPage(i).then(function (pg) { var vp = pg.getViewport({ scale: 2 }), cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; return pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function () { return cv; }); });
                });
            })(i);
            return ocr(srcs);
        });
    }
    /* Phân tích các dòng chữ -> danh sách chương (#) và bài học */
    function parseLines(lines) {
        var chRe = /^(chương|chủ đề|chuyên đề|phần|chapter|part|module)\s+([ivxlcdm]+|\d+)(?![a-zà-ỹ])/i,
            junk = /^(mục lục|trang|stt|tt|nội dung|tên bài|bài học|chương|chủ đề|page|contents|table of contents|lớp \d+)$/i, out = [];
        lines.forEach(function (l) {
            l = String(l).replace(/[\u00a0\t]+/g, ' ').replace(/\s+/g, ' ').trim()
                .replace(/\s*[\.…·_\-–]{3,}\s*\d*\s*$/, '').replace(/^[•●▪■◦*]\s*/, '').replace(/^[-–]\s+/, '').trim();
            if (l.length < 3 || /^[\d\s\.\-–,;:]+$/.test(l) || junk.test(l) || /^(trang|page)\s*\d+$/i.test(l) || l.length > 160) return;
            var isCh = chRe.test(l), prev = out[out.length - 1];
            if (!isCh && prev && !prev.ch && /^[a-zà-ỹ]/.test(l) && prev.t.length < 140) { prev.t += ' ' + l; return; }   /* dòng bị xuống hàng */
            if (prev && prev.t === l) return;
            out.push({ ch: isCh, t: l });
        });
        return out.map(function (x) { return (x.ch ? '#' : '') + x.t; }).join('\n');
    }
    function fExt(f) { return (f.name.split('.').pop() || '').toLowerCase(); }
    function isImg(f) { return /^(png|jpe?g|webp|bmp|gif)$/.test(fExt(f)) || /^image\//.test(f.type || ''); }
    function readOne(f) {
        var ext = fExt(f);
        if (ext === 'docx') return fromDocx(f);
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return fromExcel(f);
        if (ext === 'pdf') return fromPdf(f);
        return Promise.reject(new Error('Chưa hỗ trợ định dạng "' + f.name + '". Hãy chọn Word (.docx), Excel, PDF hoặc ảnh.'));
    }
    function handleFiles(list, sj, g, arr) {
        var files = Array.prototype.slice.call(list).sort(function (a, b) { return a.name.localeCompare(b.name, 'vi', { numeric: true }); }), groups = [];
        files.forEach(function (f) { var l = groups[groups.length - 1]; if (isImg(f) && l && l.img) l.f.push(f); else groups.push({ img: isImg(f), f: [f] }); });
        var p = Promise.resolve([]);
        groups.forEach(function (gr) {
            p = p.then(function (acc) {
                status('Đang đọc ' + (gr.img ? gr.f.length + ' ảnh' : gr.f[0].name) + '...');
                return (gr.img ? ocr(gr.f) : readOne(gr.f[0])).then(function (l) { return acc.concat(l); });
            });
        });
        p.then(function (lines) {
            unstatus(); var txt = parseLines(lines);
            if (!txt) { alert('Không tìm thấy danh sách bài trong file. Với ảnh/PDF scan, hãy chụp rõ nét hơn hoặc dán danh sách thủ công.'); return; }
            bulk(sj, g, arr, txt);
        }).catch(function (err) { unstatus(); console.error(err); alert('Không đọc được file: ' + (err && err.message ? err.message : err)); });
    }
    function pickFile(sj, g, arr) {
        var inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;   /* chọn được nhiều ảnh/file cùng lúc */
        inp.accept = '.docx,.xlsx,.xls,.csv,.pdf,image/*';
        inp.onchange = function () { if (inp.files && inp.files.length) handleFiles(inp.files, sj, g, arr); };
        inp.click();
    }
    function bulk(sj, g, arr, init) {
        var o = document.createElement('div');
        o.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:12px';
        o.innerHTML = '<div style="background:#fff;border-radius:16px;padding:16px;width:100%;max-width:640px;font-family:Roboto,Arial,sans-serif"><b style="color:#9a3412;font-size:17px">Thêm bài: ' + esc(sj) + ' ' + g + '</b>' +
            '<p style="font-size:13px;color:#64748b;margin:6px 0">Mỗi dòng là một bài học. Dòng bắt đầu bằng # là tên chương. Có thể dán trực tiếp từ mục lục sách.' + (init ? ' <b style="color:#b45309">Danh sách dưới đây do phần mềm tự phân tích từ file - hãy kiểm tra và sửa trước khi thêm.</b>' : '') + '</p>' +
            '<textarea id="bk-ta" style="width:100%;height:260px;border:2px solid #fdba74;border-radius:10px;padding:8px;font-size:15px" placeholder="#Chương 1. ...&#10;Bài 1. ...&#10;Bài 2. ..."></textarea>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap"><button class="bk-b" id="bk-x">Hủy</button><button class="bk-b" id="bk-r">Thay toàn bộ</button><button class="bk-b bk-go" id="bk-a">Thêm vào cuối</button></div></div>';
        document.body.appendChild(o);
        var ta = o.querySelector('#bk-ta'); if (init) ta.value = init; ta.focus();
        function done(rep) {
            var add = ta.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (t, i) {
                var h = t.charAt(0) === '#'; return { id: 'x' + Date.now() + '_' + i, h: h ? 1 : 0, n: h ? t.slice(1).trim() : t };
            });
            if (add.length) { setL(sj, g, rep ? add : arr.concat(add)); render(true); }
            o.remove();
        }
        o.querySelector('#bk-x').onclick = function () { o.remove(); };
        o.querySelector('#bk-a').onclick = function () { done(false); };
        o.querySelector('#bk-r').onclick = function () { done(true); };
    }
    function up() { if (path.length) { path.pop(); render(); return true; } return false; }
    /* [CODE154] đảm bảo câu hỏi đã có trên máy (học sinh) rồi mới mở ÔN LUYỆN */
    function withQ(keys, fn) {
        var miss = isStu() ? keys.filter(function (k) { return (st.q[k] || 0) > 0 && !getQuestions(k).length; }) : [];
        if (!miss.length) { fn(); return; }
        status('⟳ Đang tải câu hỏi từ giáo viên…');
        BS.fetchLessons(miss).then(function () { unstatus(); fn(); }, function (er) {
            unstatus();
            var m = 'Chưa tải được câu hỏi (' + (er && er.message ? er.message : 'lỗi mạng') + '). Em kiểm tra mạng rồi bấm lại nhé.';
            if (window.prNotice) window.prNotice('Chưa tải được câu hỏi', m); else alert(m);
        });
    }
    /* [CODE155] Gom bài theo chương. upToId = chỉ lấy từ chương đầu đến hết chương upToId (chương đã học + chương đang chọn) */
    function buildChapters(arr, sj, g, upToId) {
        var list = [], cur = null, done = false;
        for (var i = 0; i < arr.length; i++) {
            var x = arr[i];
            if (x.h) {
                if (done) break;
                cur = { id: x.id, name: x.n, items: [] }; list.push(cur);
                if (upToId && x.id === upToId) done = true;
            } else {
                if (!cur) { cur = { id: '_0', name: 'Các bài chưa thuộc chương', items: [] }; list.push(cur); }
                cur.items.push({ key: sj + '|' + g + '|' + x.id, name: x.n });
            }
        }
        return list;
    }
    function fillChapterPools(chs) {
        chs.forEach(function (c) {
            c.pools = [];
            c.items.forEach(function (it) { var qq = getQuestions(it.key); if (qq.length) c.pools.push({ key: it.key, lesson: it.name, qs: qq }); });
        });
    }
    function onClick(e) {
        try { onClick0(e); } catch (er) { console.error(er); try { if (window.prNotice) window.prNotice('Có lỗi xảy ra', String(er && er.message || er)); } catch (e2) {} }
    }
    function onClick0(e) {
        var t = e.target, q = function (s) { return t.closest ? t.closest(s) : null; }, b;
        if ((b = q('[data-bksync]'))) { BS.manual(b.getAttribute('data-bksync')); return; }
        if ((b = q('[data-go]'))) { path = path.slice(0, +b.getAttribute('data-go')); render(); return; }
        if ((b = q('[data-mvs]'))) { if (!b.disabled && !isStu()) moveSubj(b.getAttribute('data-mvs'), +b.getAttribute('data-d')); return; }   /* [CODE158] */
        if ((b = q('[data-sj]'))) { path = [b.getAttribute('data-sj')]; render(); return; }
        if ((b = q('[data-gr]'))) { path = [path[0], +b.getAttribute('data-gr')]; render(); return; }
        if (q('[data-bkexp]')) { exportBank(); return; }
        if (q('[data-bkimp]')) { importBank(); return; }
        if (path.length < 2) return;
        var sj = path[0], g = path[1], arr = lessons(sj, g).slice(), id;
        if ((b = q('[data-allprac]'))) {   /* [CODE155] ÔN LUYỆN toàn bộ: học sinh tick chọn chương + mức độ */
            var chsA = buildChapters(arr, sj, g, null), keysA = [];
            chsA.forEach(function (c) { c.items.forEach(function (it) { keysA.push(it.key); }); });
            withQ(keysA, function () {
                fillChapterPools(chsA);
                if (window.openPracticeSetup) window.openPracticeSetup({ subject: sj, grade: g, scope: 'toàn bộ', title: sj + ' ' + g, chapters: chsA, defaultChapters: [] });
            });
            return;
        }
        if ((b = q('[data-view]'))) { path = [sj, g, b.getAttribute('data-view')]; lvFilter = 'all'; resetSol(); render(); return; }
        if ((b = q('[data-lvf]'))) { lvFilter = b.getAttribute('data-lvf'); render(true); return; }
        if (q('[data-qdelall]')) { delAllQ(); return; }
        if ((b = q('[data-qedit]'))) { editQ(+b.getAttribute('data-qedit')); return; }
        if (q('[data-qsave]')) { saveEdit(); return; }
        if (q('[data-qcancel]')) { cancelEdit(); return; }
        if ((b = q('[data-qdel]'))) { delQ(+b.getAttribute('data-qdel')); return; }
        if (q('[data-file]')) { pickFile(sj, g, arr); } else if (q('[data-add]')) { bulk(sj, g, arr);
        } else if (q('[data-reset]')) { if (confirm('Khôi phục danh sách bài mặc định?')) { delete st.lessons[sj + '|' + g]; save(); render(); } }
        else if ((b = q('[data-ren]'))) { id = b.getAttribute('data-ren'); var it = arr.filter(function (x) { return x.id === id; })[0]; var v = prompt('Đổi tên:', it.n); if (v && v.trim()) { it.n = v.trim(); setL(sj, g, arr); render(true); } }
        else if ((b = q('[data-del]'))) { id = b.getAttribute('data-del'); if (confirm('Xóa mục này khỏi danh sách? (Câu hỏi đã lưu trong ngân hàng của bài này cũng sẽ bị xóa)')) { removeQuestions(sj + '|' + g + '|' + id); setL(sj, g, arr.filter(function (x) { return x.id !== id; })); render(true); } }
        else if ((b = q('[data-chap]'))) {   /* [CODE155] ÔN LUYỆN chương: hiện các chương đã học (1..n) + chương đang chọn */
            id = b.getAttribute('data-chap');
            var chsC = buildChapters(arr, sj, g, id), keysC = [], ctitle = '';
            chsC.forEach(function (c) { if (c.id === id) ctitle = c.name; c.items.forEach(function (it) { keysC.push(it.key); }); });
            withQ(keysC, function () {
                fillChapterPools(chsC);
                if (window.openPracticeSetup) { window.openPracticeSetup({ subject: sj, grade: g, scope: 'chương', title: ctitle, chapters: chsC, defaultChapters: [id] }); }
            });
        }
        else if ((b = q('[data-act2]'))) {
            id = b.getAttribute('data-act2'); var ls = arr.filter(function (x) { return x.id === id; })[0], key = sj + '|' + g + '|' + id;
            var inf = { key: key, subject: sj, grade: g, lessonId: id, lesson: ls.n, count: st.q[key] || 0, mode: st.q[key] ? 'update' : 'create' };
            if (typeof API.onLessonAction === 'function') API.onLessonAction(inf);
            else if (isStu()) { withQ([key], function () { if (window.startBankPractice) window.startBankPractice(inf, getQuestions(key)); }); }
            else if (window.openBankEditor) window.openBankEditor(inf);   /* [CODE138] mở khung soạn đề (ẩn Bài học/Lớp/Môn) */
            else alert('Chưa tải xong trình soạn đề, vui lòng thử lại.');
        }
    }
    function init(bodyEl) {
        if (!document.getElementById('code129-css')) {
            var c = document.createElement('style'); c.id = 'code129-css';
            c.textContent = '.bk-crumb{font-size:14px;margin-bottom:12px;color:#64748b;font-weight:700}.bk-crumb a{color:#c2410c;cursor:pointer;text-decoration:underline}.bk-crumb b{color:#0f172a}' +
                '.bk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.bk-card{position:relative;background:#fff7ed;border:2px solid #fdba74;border-radius:16px;padding:14px;cursor:pointer;text-align:center;transition:.15s}.bk-card:hover{background:#ffedd5;transform:translateY(-2px);box-shadow:0 6px 14px rgba(234,88,12,.2)}' +
                '.bk-ic{font-size:34px}.bk-nm{font-weight:900;font-size:16px;color:#9a3412;margin-top:4px}.bk-sub{font-size:13px;color:#64748b;margin-top:2px}.bk-mvw{display:flex;gap:6px;justify-content:center;margin-top:8px}' +
                '.bk-mv{width:36px;height:30px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:900;cursor:pointer}.bk-mv:disabled{opacity:.3;cursor:not-allowed}' +
                '.bk-tools{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-size:18px;color:#9a3412}.bk-tools span{display:flex;gap:6px}' +
                '.bk-b{border:0;border-radius:10px;padding:7px 12px;font-weight:900;font-size:14px;cursor:pointer;background:#e2e8f0;color:#334155}.bk-go{background:linear-gradient(90deg,#f59e0b,#ea580c);color:#fff}.bk-up{background:linear-gradient(90deg,#16a34a,#15803d);color:#fff}' +
                '.bk-ch{margin:14px 0 6px;padding:8px 12px;border-radius:10px;background:#fed7aa;color:#7c2d12;font-weight:900}.bk-ls{display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap}' +
                '.bk-no{flex:0 0 28px;height:28px;border-radius:50%;background:#ea580c;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:13px}.bk-ln{flex:1 1 200px;min-width:0;font-weight:700;color:#0f172a}.bk-ln em{color:#15803d;font-style:normal;font-size:13px}' +
                '.bk-i{border:0;background:transparent;cursor:pointer;font-size:16px;padding:2px 4px}body.layout-portrait .bk-ls .bk-go,body.layout-portrait .bk-ls .bk-up,body.layout-portrait .bk-ls .bk-vw{flex:1 0 100%}' +
                '#bank-modal .bk-view .qc-live,#bank-modal .bk-view .qc-live *:not(.katex):not(.katex *),#bank-modal .bk-view .bk-ta2,#bank-modal .bk-view .bk-ei,#bank-modal .bk-view .bk-pv,#bank-modal .bk-view .bk-pv *:not(.katex):not(.katex *){font-family:Roboto,Arial,"Helvetica Neue",sans-serif !important}' +
                '#bank-modal#bank-modal .bk-view .bk-tools,#bank-modal#bank-modal .bk-view .bk-tools *,#bank-modal#bank-modal .bk-view .bk-b,#bank-modal#bank-modal .bk-view .bk-lvh,#bank-modal#bank-modal .bk-view .bk-lvh *,#bank-modal#bank-modal .bk-view .bk-lve,#bank-modal#bank-modal .bk-view .bk-flt,#bank-modal#bank-modal .bk-view .bk-flt *,#bank-modal#bank-modal .bk-view .bk-ctb,#bank-modal#bank-modal .bk-view .bk-ctb *,#bank-modal#bank-modal .bk-view .bk-efh,#bank-modal#bank-modal .bk-view .bk-efh *,#bank-modal#bank-modal .bk-view .bk-el,#bank-modal#bank-modal .bk-view .bk-es,#bank-modal#bank-modal .bk-view .bk-eb,#bank-modal#bank-modal .bk-view .bk-eb *,#bank-modal#bank-modal .bk-view .bk-er,#bank-modal#bank-modal .bk-view .bk-er *,#bank-modal#bank-modal .bk-view .bk-etl,#bank-modal#bank-modal .bk-view .bk-etr,#bank-modal#bank-modal .bk-view .bk-etr *,#bank-modal#bank-modal .bk-view .bk-empty,#bank-modal#bank-modal .bk-view .bk-empty *{font-family:"UTM HelvetIns","Helvetica Neue",Helvetica,Arial,sans-serif !important}' +
                '#bank-modal#bank-modal .bk-view .bk-ctb .bk-b,#bank-modal#bank-modal .bk-view .bk-ctb .bk-lsl,#bank-modal#bank-modal .bk-view .bk-ctb .bk-lsel{font-family:"UTM HelvetIns","Helvetica Neue",Helvetica,Arial,sans-serif !important}' +
                '.bk-lvh{margin:18px 0 4px;padding:9px 14px;border-radius:12px;font-weight:900;font-size:17px;letter-spacing:.3px;color:#fff;background:#64748b}.bk-lvh span{font-weight:500;font-size:14px;opacity:.9}.bk-lvh-NB{background:linear-gradient(90deg,#0ea5e9,#0369a1)}.bk-lvh-TH{background:linear-gradient(90deg,#22c55e,#15803d)}.bk-lvh-VD{background:linear-gradient(90deg,#f59e0b,#c2410c)}.bk-lvh-VDC{background:linear-gradient(90deg,#ef4444,#991b1b)}' +
                '.bk-vw{background:#e0f2fe;color:#075985}.bk-rm{background:#fee2e2;color:#b91c1c}.bk-q{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin:8px 0;background:#fff}.bk-qh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;color:#334155}.bk-sp{flex:1}' +
                '.bk-lv{background:#dbeafe;color:#1d4ed8;font-weight:900;font-size:12px;padding:2px 8px;border-radius:999px}.bk-lv.sol{background:#fef3c7;color:#92400e}.bk-qt{white-space:pre-line;font-weight:700;color:#0f172a;margin-bottom:6px;overflow-wrap:anywhere}.bk-gi{background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:13px;white-space:pre-line}' +
                '.bk-op{display:grid;grid-template-columns:1fr 1fr;gap:6px}.bk-op.one{grid-template-columns:1fr}.bk-op>div{border:1px solid #e2e8f0;border-radius:8px;padding:5px 8px;font-size:14px;overflow-wrap:anywhere}.bk-op>div.ok{background:#dcfce7;border-color:#86efac}.bk-op em{font-style:normal;font-weight:900;color:#475569}body.layout-portrait .bk-op{grid-template-columns:1fr}' + 'body.layout-portrait .bk-grid{grid-template-columns:1fr 1fr}';
            document.head.appendChild(c);
        }
        body = bodyEl; modal = document.getElementById('bank-modal');
        if (!modal.__c129) {
            modal.__c129 = 1;
            body.addEventListener('click', onClick);
            body.addEventListener('load', function (e) { markFig(e.target); }, true);
            body.addEventListener('input', function (e) {
                var ta = e.target; if (!ta.closest || !ta.closest('[data-edit-form]')) return;
                editDirty = true; if (ta.classList && ta.classList.contains('bk-ta2')) { autosize(ta); preview(ta); }
            });
            body.addEventListener('change', function (e) {
                var t = e.target;
                if (t.hasAttribute && t.hasAttribute('data-qlv')) { setLevel(+t.getAttribute('data-qlv'), t.value, t); return; }
                if (t.closest && t.closest('[data-edit-form]')) editDirty = true;
            });
            /* Nút X lùi từng cấp rồi mới đóng */
            modal.addEventListener('click', function (e) {
                var b = e.target.closest && e.target.closest('[data-act="close"]');
                if (b && path.length) { e.stopPropagation(); up(); }
            }, true);
        }
        editIdx = -1; editDirty = false; lvFilter = 'all'; resetSol();
        if (!document.getElementById('code141-css')) {
            var c2 = document.createElement('style'); c2.id = 'code141-css';
            c2.textContent = '#bank-modal .bk-body{overflow-y:auto !important;overscroll-behavior:auto !important;-webkit-overflow-scrolling:touch}' +
                '#bank-modal .bk-view .qc-live{display:flex !important;flex-direction:column !important;justify-content:flex-start !important;align-items:stretch !important;gap:14px;flex:none !important;height:auto !important;min-height:0 !important;max-height:none !important;margin:0 0 8px !important;padding:0 !important;overflow:visible !important;overflow-x:visible !important;overflow-y:visible !important;overscroll-behavior:auto !important}' +
                '.bk-ctb{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.bk-lsl{font-size:14px;font-weight:700;color:#075985}.bk-lsel{border:1px solid #7dd3fc;border-radius:8px;padding:3px 6px;background:#f0f9ff;font-weight:700;font-size:14px;color:#0c4a6e;cursor:pointer}' +
                '.bk-flt{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}.bk-fc{border:2px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:5px 12px;font-weight:700;font-size:14px;cursor:pointer}.bk-fc span{opacity:.75;font-weight:400}.bk-fc.on{color:#fff;border-color:transparent;background:linear-gradient(90deg,#f59e0b,#ea580c)}' +
                '.bk-ver{margin:10px 0 2px;text-align:center;font-size:12px;color:#94a3b8}.bk-lve{padding:12px;color:#64748b;font-style:italic;border:1px dashed #cbd5e1;border-radius:10px;margin:6px 0 10px}' +
                '#bank-modal .bk-view img.bk-fig{display:block !important;margin:10px auto !important;max-width:100% !important;height:auto !important}' +
                '.bk-ef{border:2px solid #fb923c;background:#fffbeb;border-radius:14px;padding:12px;box-shadow:0 4px 14px rgba(234,88,12,.18)}.bk-efh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#9a3412;font-size:17px;margin-bottom:6px}.bk-efp{background:#ffedd5;border-radius:999px;padding:2px 10px;font-size:13px;font-weight:700}.bk-efh label{font-size:14px;font-weight:700;color:#075985}.bk-efh select{border:1px solid #7dd3fc;border-radius:8px;padding:3px 6px;background:#f0f9ff;font-weight:700}' +
                '.bk-el{margin:10px 0 4px;font-weight:900;font-size:14px;color:#7c2d12}.bk-es{margin:6px 0 3px;font-weight:700;font-size:13px;color:#64748b}' +
                '.bk-ta2,.bk-ei{width:100%;box-sizing:border-box;border:2px solid #fdba74;border-radius:10px;padding:8px 10px;font-size:18px;line-height:1.4;background:#fff;color:#0f172a;resize:vertical;overflow:hidden}.bk-ta2:focus,.bk-ei:focus{outline:none;border-color:#ea580c;box-shadow:0 0 0 3px rgba(234,88,12,.2)}' +
                '.bk-pv{display:none;margin-top:4px;padding:6px 10px;border-radius:8px;background:#f0fdf4;border:1px dashed #86efac;font-size:17px;overflow-wrap:anywhere}.bk-pv:before{content:"Xem trước: ";font-weight:900;color:#15803d;font-size:12px}' +
                '.bk-eo{display:flex;gap:8px;align-items:flex-start;margin:6px 0}.bk-er{display:flex;align-items:center;gap:4px;padding-top:10px;font-size:17px;cursor:pointer;color:#0f172a}.bk-etl{padding-top:10px;font-size:17px;color:#0f172a;width:22px}.bk-ec{flex:1;min-width:0}.bk-etr{display:flex;gap:16px;margin:6px 0 0;font-weight:700;font-size:15px}.bk-etr label{display:flex;align-items:center;gap:4px;cursor:pointer}' +
                '.bk-eb{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;position:sticky;bottom:0;background:linear-gradient(180deg,rgba(255,251,235,0),#fffbeb 40%);padding-top:8px}';
            document.head.appendChild(c2);
        }
        if (!document.getElementById('code147-css')) {
            var c3 = document.createElement('style'); c3.id = 'code147-css';
            c3.textContent = '.bk-ch{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.bk-ch .bk-chn{flex:1 1 200px;min-width:0}.bk-ch .bk-go{margin-left:auto;white-space:nowrap}';
            document.head.appendChild(c3);
        }
        var kp = keepPath; keepPath = false; if (!kp) path = [];
        loadSt(); BS.onOpen(); render(kp); BS.pull(false);
    }
    /* [CODE149] ĐỒNG BỘ qua máy chủ (Firebase, nhánh s/<mã>/bank): giáo viên đẩy lên, học sinh tải về */
    var BS = (function () {
        var SY = { busy: false, pbusy: false, timer: 0, force: false, again: 0, msg: '', ok: true, poll: 0, fullOnce: false };
        var SAME = {};   /* [CODE157] dấu hiệu "bản trên máy chủ không đổi" */
        /* [CODE157] tải song song tối đa n yêu cầu (nhanh hơn trên điện thoại, không tăng dung lượng) */
        function runPool(items, fn, n) {
            var i = 0;
            function w() { if (i >= items.length) return Promise.resolve(); var it = items[i++]; return fn(it).then(w); }
            var ws = []; for (var j = 0; j < Math.min(n, items.length); j++) ws.push(w());
            return Promise.all(ws);
        }
        /* [CODE160] Nén gzip nội dung từng bài trước khi đẩy lên Firebase (giảm 30-80% dung lượng lưu trữ + băng thông tải về của học sinh).
           Bản ghi cũ (không nén) vẫn đọc được; máy quá cũ không có DecompressionStream tự nạp thư viện pako. */
        function u8b64(u) { var s = '', i = 0; for (; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
        function b64u8(b) { var bin = atob(b), u = new Uint8Array(bin.length), i = 0; for (; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
        function pack(str) {
            if (str.length < 3000 || typeof CompressionStream === 'undefined') return Promise.resolve({ d: str });
            try {
                var cs = new CompressionStream('gzip'), w = cs.writable.getWriter();
                w.write(new TextEncoder().encode(str)); w.close();
                return new Response(cs.readable).arrayBuffer().then(function (buf) {
                    var b = u8b64(new Uint8Array(buf));
                    return b.length < str.length ? { d: b, z: 'gz' } : { d: str };
                }, function () { return { d: str }; });
            } catch (e) { return Promise.resolve({ d: str }); }
        }
        function loadPako() {
            if (window.pako) return Promise.resolve(window.pako);
            return new Promise(function (res, rej) {
                var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
                sc.onload = function () { window.pako ? res(window.pako) : rej(new Error('pako')); }; sc.onerror = function () { rej(new Error('Trình duyệt quá cũ, hãy cập nhật trình duyệt')); };
                document.head.appendChild(sc);
            });
        }
        function unpack(o) {
            if (!o || typeof o.d !== 'string') return Promise.resolve(null);
            if (o.z !== 'gz') { try { return Promise.resolve(JSON.parse(o.d)); } catch (e) { return Promise.reject(e); } }
            var u = b64u8(o.d);
            if (typeof DecompressionStream !== 'undefined') {
                var ds = new DecompressionStream('gzip'), w = ds.writable.getWriter();
                w.write(u); w.close();
                return new Response(ds.readable).text().then(function (t) { return JSON.parse(t); });
            }
            return loadPako().then(function (p) { return JSON.parse(p.ungzip(u, { to: 'string' })); });
        }
        function api() { return window.CloudSync && window.CloudSync.api ? window.CloudSync.api : null; }
        function connected() { try { var a = api(); return !!(a && a.effStu()); } catch (e) { return false; } }
        function mk() { return 'matrix_bank_sync' + (isStu() ? '_stu' : ''); }
        function metaGet() { try { var m = JSON.parse(localStorage.getItem(mk()) || 'null'); if (m && m.k) return m; } catch (e) {} return { rev: '', k: {} }; }
        function metaSet(m) { try { localStorage.setItem(mk(), JSON.stringify(m)); } catch (e) {} }
        function hhmm() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getHours()) + ':' + p(d.getMinutes()); }
        function setMsg(t, ok) { SY.msg = t; SY.ok = ok !== false; var e = document.getElementById('bk-synctxt'); if (e) e.textContent = t; var b = document.getElementById('bk-syncbar'); if (b) { b.className = 'bk-sync ' + (SY.ok ? 'ok' : 'bad'); b.style.display = SY.ok ? 'none' : 'flex'; } }
        function barHtml() {
            var b = isStu() ? '<button class="bk-b" data-bksync="pull">⟳ Cập nhật</button>' : '<button class="bk-b" data-bksync="push">☁ Đồng bộ lên</button><button class="bk-b" data-bksync="pull">⬇ Tải về</button>';
            return '<div id="bk-syncbar" class="bk-sync ' + (SY.ok ? 'ok' : 'bad') + '" style="display:' + (SY.ok ? 'none' : 'flex') + '"><span id="bk-synctxt">' + esc(SY.msg) + '</span>' + b + '</div>';
        }
        function hasLocal() { return Object.keys(readQ()).length > 0 || Object.keys(st.lessons || {}).length > 0; }
        function noConn() {
            setMsg(isStu() ? '⚠ Chưa kết nối với giáo viên nên chưa tải được ngân hàng đề. Em hãy mở bằng liên kết / mã QR do giáo viên gửi.' : '⚠ Chưa kết nối máy chủ: ngân hàng đề mới chỉ lưu trên máy này, học sinh chưa thấy. Hãy bấm ĐỒNG BỘ và dán Mã kết nối.', false);
        }
        /* ---- giáo viên: đẩy lên ---- */
        function push(force) {
            if (isStu()) return Promise.resolve();
            if (!connected()) { noConn(); return Promise.resolve(); }
            if (SY.busy) { SY.again = force ? 2 : (SY.again || 1); return Promise.resolve(); }
            SY.busy = true; setMsg('☁ Đang đồng bộ lên máy chủ…', true);
            var a = api(), Q = readQ(), M = metaGet(), keys = Object.keys(Q), newK = {}, del = {}, chain = Promise.resolve();
            var rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            /* [CODE157] chỉ lấy DANH SÁCH KHÓA (shallow) để dọn bài đã xóa, không tải cả bản mục lục nặng */
            if (force) chain = chain.then(function () { return a.req('GET', 's', 'bank/lq?shallow=true'); }).then(function (r) {
                if (r) { var have = {}; keys.forEach(function (k) { have[a.enc(k)] = 1; }); Object.keys(r).forEach(function (ek) { if (!have[ek]) del[ek] = null; }); }
            });
            keys.forEach(function (k) {
                var t = Q[k].t || 0; newK[k] = t;
                if (!force && M.k[k] === t) return;
                chain = chain.then(function () { return pack(JSON.stringify(Q[k].q || [])).then(function (pk) { var body = { k: k, t: t, d: pk.d }; if (pk.z) body.z = pk.z; return a.req('PUT', 's', 'bank/lq/' + a.enc(k) + '?print=silent', body); }); });   /* [CODE160] nén gzip */
            });
            chain = chain.then(function () {
                Object.keys(M.k).forEach(function (k) { if (!(k in Q)) del[a.enc(k)] = null; });
                if (Object.keys(del).length) return a.req('PATCH', 's', 'bank/lq?print=silent', del);
            }).then(function () {
                var ik = {}; keys.forEach(function (k) { ik[a.enc(k)] = { k: k, t: newK[k] }; });
                return a.req('PUT', 's', 'bank/idx?print=silent', { rev: rev, ts: Date.now(), state: JSON.stringify(st), keys: ik })
                    .then(function () { return a.req('PUT', 's', 'bank/rev?print=silent', rev).catch(function () { }); });   /* [CODE157] nút "rev" nhỏ xíu để máy học sinh kiểm tra có bản mới không */
            });
            return chain.then(function () {
                metaSet({ rev: rev, k: newK }); SY.busy = false;
                setMsg('☁ Đã đồng bộ lên máy chủ lúc ' + hhmm() + ' • học sinh sẽ thấy ngay', true);
                if (SY.again) { var f = SY.again === 2; SY.again = 0; return push(f); }
            }, function (e) {
                SY.busy = false; setMsg('⚠ Chưa đồng bộ được (' + (e && e.message ? e.message : 'lỗi mạng') + ') • sẽ tự thử lại', false);
                clearTimeout(SY.timer); SY.timer = setTimeout(function () { SY.timer = 0; push(false); }, 20000);
            });
        }
        function touch(force) {
            if (applying || isStu()) return;
            if (force) SY.force = true;
            clearTimeout(SY.timer);
            SY.timer = setTimeout(function () { SY.timer = 0; var f = SY.force; SY.force = false; push(f); }, force ? 1500 : 4000);   /* [CODE158] gom nhiều thao tác thành 1 lần ghi */
        }
        /* ---- tải về (học sinh; giáo viên máy mới) ---- */
        function pull(force, silent) {
            if (SY.pbusy) return Promise.resolve();
            if (!connected()) { noConn(); return Promise.resolve(); }
            if (!isStu() && (SY.timer || SY.busy)) return Promise.resolve();
            var a = api(), M = metaGet(); SY.pbusy = true;
            /* [CODE157] kiểm tra nhanh "bank/rev" (vài byte) trước; chỉ tải mục lục đầy đủ khi có bản mới */
            var pre = (!force && SY.fullOnce && M.rev) ? a.req('GET', 's', 'bank/rev').then(function (rv) { return rv; }, function () { return null; }) : Promise.resolve(null);
            return pre.then(function (rv) { return (typeof rv === 'string' && rv === M.rev) ? SAME : a.req('GET', 's', 'bank/idx?cb=' + Date.now()); }).then(function (idx) {
                if (idx === SAME) { SY.pbusy = false; setMsg('☁ Đã cập nhật • ' + hhmm(), true); return; }
                SY.fullOnce = true;
                if (!idx || typeof idx.state !== 'string') {
                    SY.pbusy = false;
                    if (!isStu()) { if (hasLocal()) return push(true); setMsg('☁ Đã kết nối • máy chủ chưa có ngân hàng đề.', true); }
                    else setMsg('Giáo viên chưa đưa ngân hàng đề lên máy chủ.', false);
                    return;
                }
                var lackLocal = false; try { var Q0 = readQ(), rk0 = idx.keys || {}; lackLocal = Object.keys(rk0).some(function (ek) { var r0 = rk0[ek]; return r0 && r0.k && !Q0[r0.k]; }); } catch (e) {}   /* [CODE154] */
                if (!force && idx.rev === M.rev && !lackLocal) { SY.pbusy = false; setMsg('☁ Đã cập nhật • ' + hhmm(), true); return; }
                if (!isStu() && !force && !M.rev && hasLocal()) {
                    if (silent) { SY.pbusy = false; return; }
                    if (!confirm('Máy chủ đã có ngân hàng đề.\nOK = TẢI từ máy chủ về máy này (ghi đè dữ liệu trên máy này).\nHủy = GIỮ dữ liệu máy này và đẩy lên máy chủ.')) { SY.pbusy = false; return push(true); }
                }
                setMsg('⬇ Đang tải ngân hàng đề…', true);
                var rk = idx.keys || {}, Q = readQ(), newQ = {}, newM = {}, need = [];
                Object.keys(rk).forEach(function (ek) {
                    var r = rk[ek]; if (!r || !r.k) return;
                    if (!force && Q[r.k] && Q[r.k].t === r.t) { newQ[r.k] = Q[r.k]; newM[r.k] = r.t; } else need.push(r);
                });
                var chain = runPool(need, function (r) {   /* [CODE157] chỉ tải các bài mới/đổi, song song 3 luồng */
                    return a.req('GET', 's', 'bank/lq/' + a.enc(r.k) + '?cb=' + Date.now()).then(function (o) {
                        return unpack(o).then(function (arr) {   /* [CODE160] giải nén nếu cần */
                            if (!arr) return;
                            newQ[r.k] = { q: arr, t: o.t || r.t }; newM[r.k] = o.t || r.t;
                        });
                    });
                }, 3);
                return chain.then(function () {
                    var rs = JSON.parse(idx.state) || {};
                    applying = true;
                    try {
                        writeQ(newQ);
                        st.order = rs.order || []; st.lessons = rs.lessons || {}; st.q = rs.q || {}; st.m = rs.m || {};
                        Object.keys(newQ).forEach(function (k) { st.q[k] = (newQ[k].q || []).length; st.m[k] = lvCount(newQ[k].q || []); });
                        save();
                    } finally { applying = false; }
                    metaSet({ rev: idx.rev, k: newM });
                    setMsg('☁ Đã cập nhật ' + Object.keys(newQ).length + ' bài • ' + hhmm(), true);
                    if (modal && modal.classList.contains('open') && editIdx < 0 && !editDirty) render(true);
                });
            }).then(function () { SY.pbusy = false; }, function (e) {
                SY.pbusy = false; setMsg('⚠ Không tải được (' + (e && e.message ? e.message : 'lỗi mạng') + ') • đang dùng bản đã lưu trên máy.', false);
            });
        }
        /* [CODE154] học sinh: tải trực tiếp câu hỏi các bài còn thiếu trên máy (điện thoại không đủ bộ nhớ lưu / chưa tải xong) */
        function fetchLessons(keys) {
            if (!connected()) return Promise.reject(new Error('chưa kết nối với giáo viên'));
            var a = api(), got = {};
            var chain = runPool(keys, function (k) {   /* [CODE157] tải song song 3 luồng */
                return a.req('GET', 's', 'bank/lq/' + a.enc(k) + '?cb=' + Date.now()).then(function (o) {
                    return unpack(o).then(function (arr) { if (arr) got[k] = { q: arr, t: (o && o.t) || 0 }; });   /* [CODE160] */
                });
            }, 3);
            return chain.then(function () {
                var Q = readQ(); Object.keys(got).forEach(function (k) { Q[k] = got[k]; });
                applying = true; try { writeQ(Q); } finally { applying = false; }
                return got;
            });
        }
        function manual(kind) {
            if (kind === 'push') { clearTimeout(SY.timer); SY.timer = 0; push(true); }
            else if (isStu()) pull(true);
            else if (confirm('Tải ngân hàng đề từ máy chủ về máy này?\nDữ liệu hiện có trên máy này sẽ được thay bằng bản trên máy chủ.')) pull(true);
        }
        function onOpen() {
            if (!connected()) noConn(); else setMsg(isStu() ? '⟳ Đang kiểm tra ngân hàng đề mới…' : '☁ Đang kiểm tra máy chủ…', true);
            if (!SY.poll) {
                SY.poll = setInterval(function () { if (modal && modal.classList.contains('open') && !document.hidden) pull(false); }, 60000);   /* [CODE159] */
                document.addEventListener('visibilitychange', function () { if (!document.hidden && modal && modal.classList.contains('open')) pull(false); });
                window.addEventListener('online', function () { pull(false); });
            }
        }
        /* giáo viên đã có sẵn ngân hàng trên máy: tự đưa lên máy chủ 1 lần nếu máy chủ còn trống */
        setInterval(function () {
            try {
                if (isStu() || SY.auto || SY.busy || SY.pbusy || SY.timer || !connected() || metaGet().rev || !hasLocal()) return;
                SY.auto = true; pull(false, true);
            } catch (e) {}
        }, 30000);
        return { touch: touch, push: push, pull: pull, manual: manual, onOpen: onOpen, barHtml: barHtml, fetchLessons: fetchLessons };
    })();

    var API = { sync: BS, path: function () { return path.slice(); },
        /* [CODE153] đọc danh sách môn / khối / bài + câu hỏi cho trình soạn đề */
        subjectNames: function () { return subjects(); },
        gradesOf: function (sj) { var i = info(sj); return i ? i[2].slice() : []; },
        lessonsOf: function (sj, g) { return lessons(sj, g).map(function (x) { return { id: x.id, n: x.n, h: !!x.h }; }); },
        meta: function (key) { return { n: (st.q && st.q[key]) || 0, m: (st.m && st.m[key]) || {} }; },
        getMany: function (keys) { var o = readQ(); return keys.map(function (k) { return (o[k] && o[k].q) ? o[k].q : []; }); },
        LEVELS: ['NB', 'TH', 'VD', 'VDC'], getByLevel: function (key, lv) { return getQuestions(key).filter(function (x) { return lvOf(x) === (lv || ''); }); },
        levelCounts: function (key) { return lvCount(getQuestions(key)); }, onLessonAction: null, setCount: function (key, n) { st.q[key] = n; save(); render(true); }, open: function () { window.CODE126Bank.open(); },
        getQuestions: getQuestions, saveQuestions: saveQuestions, removeQuestions: removeQuestions,
        restore: function () { keepPath = true; window.CODE126Bank.open(); },
        toast: function (t) { status(t); setTimeout(unstatus, 4000); } };
        API.parseFilesForLibrary = function (fileList) {
        var files = Array.prototype.slice.call(fileList || []).sort(function (a, b) {
            return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { numeric: true });
        });
        var groups = [];
        files.forEach(function (f) {
            var l = groups[groups.length - 1];
            if (isImg(f) && l && l.img) l.f.push(f);
            else groups.push({ img: isImg(f), f: [f] });
        });
        var out = [], p = Promise.resolve();
        groups.forEach(function (gr) {
            p = p.then(function () {
                var title = String(gr.f[0] && gr.f[0].name || 'De_thi').replace(/\.[^.]+$/, '');
                var job = gr.img ? ocr(gr.f) : readOne(gr.f[0]);
                return job.then(function (qs) {
                    if (Array.isArray(qs) && qs.length) out.push({ title: title, questions: qs });
                });
            });
        });
        return p.then(function () { return out; });
    };
        API.extractOutlineLinesFromFiles = function (fileList) {
        var files = Array.prototype.slice.call(fileList || []).sort(function (a, b) {
            return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { numeric: true });
        });
        var groups = [];
        files.forEach(function (f) {
            var l = groups[groups.length - 1];
            if (isImg(f) && l && l.img) l.f.push(f);
            else groups.push({ img: isImg(f), f: [f] });
        });
        var rawLines = [], p = Promise.resolve();
        groups.forEach(function (gr) {
            p = p.then(function () {
                var job = gr.img ? ocr(gr.f) : readOne(gr.f[0]);
                return job.then(function (res) {
                    if (Array.isArray(res)) {
                        res.forEach(function (item) {
                            var t = typeof item === 'string' ? item : (item && (item.text || item.title || ''));
                            String(t || '').split(/\r?\n/).forEach(function (ln) {
                                ln = ln.trim();
                                if (ln) rawLines.push(ln);
                            });
                        });
                    }
                });
            });
        });
        return p.then(function () {
            return parseLines(rawLines);
        });
    };
    API._parseLines = parseLines;
    window.CODE129Bank = API;
    function hook() { if (window.CODE126Bank) window.CODE126Bank.onOpen = init; }
    hook();
})();

// === [code153-bank-import] ===
/* [CODE153] TẠO VÀ CHỈNH SỬA ĐỀ THI <-> NGÂN HÀNG ĐỀ
   (1) Nút "NHẬP TỪ NGÂN HÀNG ĐỀ": chọn Môn > Khối > Chương / Bài, lấy toàn bộ hoặc theo số câu từng mức độ (NB/TH/VD/VDC).
   (2) Ô "Chủ đề bài học" đồng bộ tên bài từ NGÂN HÀNG ĐỀ theo Môn học + Khối lớp đang chọn; vẫn sửa tự do.
   Dữ liệu đọc từ CODE129Bank (localStorage / đồng bộ Firebase) nên chạy tốt trên GitHub Pages. */
(function () {
    'use strict';
    var MAP = { 'Toán học': 'Toán', 'GDCD': 'Giáo dục công dân', 'GDKT&PL': 'Giáo dục kinh tế và pháp luật' };
    var LV = ['NB', 'TH', 'VD', 'VDC'];
    var S = { sj: '', g: 0, sel: {}, col: {}, pickKey: '', man: {} };

    function $(id) { return document.getElementById(id); }
    function bank() { return window.CODE129Bank && window.CODE129Bank.lessonsOf ? window.CODE129Bank : null; }
    var esc = window.LTDUtils.esc;
    var norm = window.LTDUtils.normFold;
    function show(id) { var m = $(id); if (!m) return; m.classList.remove('hidden'); setTimeout(function () { m.classList.remove('opacity-0'); }, 10); }
    function hide(id) { var m = $(id); if (!m) return; m.classList.add('opacity-0'); setTimeout(function () { m.classList.add('hidden'); }, 300); }
    function alertBox(t, msg, type) { try { showModal(t, msg, type || 'info'); } catch (e) { alert(msg); } }

    function edSubject() { var el = $('edit-subject'), v = el ? el.value : ''; return MAP[v] || v; }
    function edGrade() { var el = $('edit-grade'), m = el && /(\d+)/.exec(el.value || ''); return m ? parseInt(m[1], 10) : 0; }

    /* Cây dữ liệu: [{id, n, items:[{id, n, key, cnt, lv}]}] */
    function tree(sj, g) {
        var B = bank(), out = [], cur = null;
        if (!B || !sj || !g) return out;
        B.lessonsOf(sj, g).forEach(function (x) {
            if (x.h) { cur = { id: x.id, n: x.n, items: [] }; out.push(cur); return; }
            if (!cur) { cur = { id: '_0', n: '', items: [] }; out.push(cur); }
            var key = sj + '|' + g + '|' + x.id, m = B.meta(key);
            cur.items.push({ id: x.id, n: x.n, key: key, cnt: m.n || 0, lv: m.m || {} });
        });
        return out;
    }
    function lvText(lv) {
        var t = [];
        LV.forEach(function (k) { if (lv && lv[k]) t.push(k + ' ' + lv[k]); });
        return t.join(' • ');
    }

    /* ===================== (2) CHỦ ĐỀ BÀI HỌC đồng bộ với Ngân hàng đề ===================== */
    function refresh() {
        var dl = $('edit-subtitle-list'), hint = $('ed-subtitle-hint'), btn = $('ed-subtitle-pick');
        if (!dl && !hint) return;
        var sj = edSubject(), g = edGrade(), names = [], chapters = 0;
        try { tree(sj, g).forEach(function (c) { if (c.n) chapters++; c.items.forEach(function (it) { names.push(it.n); }); }); } catch (e) {}
        if (dl) dl.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('');
        if (btn) btn.classList.toggle('ib-has', names.length > 0);
        if (hint) {
            if (!bank()) hint.textContent = '';
            else if (names.length) hint.innerHTML = '📚 Ngân hàng đề có <b>' + names.length + ' bài</b> cho ' + esc(sj) + ' • Lớp ' + g + '. Bấm <b>📚 Chọn bài</b> hoặc gõ để chọn tên bài; vẫn sửa tên tự do.';
            else hint.innerHTML = 'Ngân hàng đề chưa có bài cho ' + esc(sj || 'môn này') + (g ? ' • Lớp ' + g : '') + '. Bạn vẫn nhập tên chủ đề tự do.';
        }
    }
    function onSubjGrade() { refresh(); var el = $('edit-subtitle'); if (el) el.dataset.bankKey = ''; }

    function openPick() {
        if (!bank()) { alertBox('Chưa có Ngân hàng đề', 'Không đọc được dữ liệu Ngân hàng đề. Hãy tải lại trang rồi thử lại.'); return; }
        var sj = edSubject(), g = edGrade();
        var sub = $('ib-pick-sub'); if (sub) sub.textContent = (sj || '—') + ' • Lớp ' + (g || '—');
        var se = $('ib-pick-search'); if (se) se.value = '';
        renderPick(); show('ib-pick-modal');
        setTimeout(function () { try { if (se && window.innerWidth > 700) se.focus(); } catch (e) {} }, 60);
    }
    function closePick() { hide('ib-pick-modal'); }
    function renderPick() {
        var box = $('ib-pick-list'); if (!box) return;
        var q = norm(($('ib-pick-search') || {}).value || ''), data = tree(edSubject(), edGrade()), h = '', shown = 0;
        data.forEach(function (c) {
            var items = c.items.filter(function (it) { return !q || norm(it.n).indexOf(q) >= 0 || norm(c.n).indexOf(q) >= 0; });
            var chHit = c.n && (!q || norm(c.n).indexOf(q) >= 0);
            if (!items.length && !chHit) return;
            if (c.n) h += '<button type="button" class="ib-chap" data-pick="' + esc(c.n) + '" data-k="">📁 ' + esc(c.n) + '<span class="ib-tag">chọn cả chương</span></button>';
            items.forEach(function (it) {
                shown++;
                h += '<button type="button" class="ib-lesson" data-pick="' + esc(it.n) + '" data-k="' + esc(it.key) + '"><span class="ib-ln">' + esc(it.n) + '</span>' +
                    (it.cnt ? '<span class="ib-badge">' + it.cnt + ' câu</span>' : '<span class="ib-badge ib-zero">chưa có câu</span>') + '</button>';
            });
        });
        if (!h) h = '<div class="ib-empty">' + (data.length ? 'Không tìm thấy bài phù hợp.' : 'Ngân hàng đề chưa có bài cho Môn học / Khối lớp này.<br>Vào <b>NGÂN HÀNG ĐỀ</b> để thêm danh sách bài, hoặc nhập tên chủ đề tự do.') + '</div>';
        box.innerHTML = h;
    }
    function pickValue(name, key) {
        var el = $('edit-subtitle'); if (!el) return;
        el.value = name; el.dataset.bankKey = key || '';
        try { syncTopicTitleLive(name); } catch (e) {}
        closePick();
        setTimeout(function () { try { el.focus(); } catch (e) {} }, 320);
    }

    /* ===================== (1) NHẬP TỪ NGÂN HÀNG ĐỀ ===================== */
    function subjectsWithData() { var B = bank(); return B ? B.subjectNames() : []; }
    function fillSubjects(selected) {
        var sel = $('ib-subject'), B = bank(); if (!sel || !B) return;
        sel.innerHTML = B.subjectNames().map(function (n) { return '<option value="' + esc(n) + '"' + (n === selected ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
    }
    function fillGrades(sj, wantG) {
        var sel = $('ib-grade'), B = bank(); if (!sel || !B) return;
        var gs = B.gradesOf(sj); if (!gs.length) gs = [];
        if (gs.indexOf(wantG) < 0) {   // chọn khối đầu tiên đã có bài nếu khối mong muốn chưa có
            var pick = gs.filter(function (x) { return B.lessonsOf(sj, x).length; })[0];
            wantG = pick || gs[gs.length - 1] || 0;
        }
        sel.innerHTML = gs.slice().sort(function (a, b) { return b - a; }).map(function (x) { return '<option value="' + x + '"' + (x === wantG ? ' selected' : '') + '>Lớp ' + x + '</option>'; }).join('');
        S.g = wantG;
    }
    function openImport() {
        if (window.__bankCtx) return;
        var B = bank();
        if (!B) { alertBox('Chưa có Ngân hàng đề', 'Không đọc được dữ liệu Ngân hàng đề. Hãy tải lại trang rồi thử lại.'); return; }
        var names = B.subjectNames(), sj = edSubject(), g = edGrade();
        if (names.indexOf(sj) < 0) sj = names.filter(function (n) { return B.gradesOf(n).some(function (x) { return B.lessonsOf(n, x).length; }); })[0] || names[0];
        S.sj = sj; S.sel = {}; S.man = {}; S.col = {};
        fillSubjects(sj); fillGrades(sj, g); S.g = parseInt(($('ib-grade') || {}).value, 10) || 0;
        // nếu chủ đề đang chọn từ ngân hàng thì tick sẵn bài đó
        var el = $('edit-subtitle'), tk = el && el.dataset.bankKey;
        if (tk && tk.indexOf(sj + '|' + S.g + '|') === 0) S.sel[tk] = true;
        var ft = $('ib-fill-title'); if (ft) ft.checked = !(el && el.value.trim());
        var sr = $('ib-search'); if (sr) sr.value = '';
        var al = $('ib-all'); if (al) al.checked = false;
        ['mc', 'tf', 'sa'].forEach(function (k) { var e = $('ib-p-' + k); if (e) e.value = 0; });
        var md = document.querySelector('input[name="ib-mode"][value="append"]'); if (md) md.checked = true;
        renderTree(); show('ib-modal');
    }
    function closeImport() { hide('ib-modal'); }
    function onSubject() {
        var sel = $('ib-subject'); if (!sel) return;
        S.sj = sel.value; S.sel = {}; S.man = {}; S.col = {};
        fillGrades(S.sj, S.g); S.g = parseInt(($('ib-grade') || {}).value, 10) || 0;
        var al = $('ib-all'); if (al) al.checked = false;
        renderTree();
    }
    function onGrade() { S.g = parseInt(($('ib-grade') || {}).value, 10) || 0; S.sel = {}; S.man = {}; S.col = {}; var al = $('ib-all'); if (al) al.checked = false; renderTree(); }

    function renderTree() {
        var box = $('ib-tree'); if (!box) return;
        var q = norm(($('ib-search') || {}).value || ''), data = tree(S.sj, S.g), h = '', any = false;
        data.forEach(function (c, ci) {
            var items = c.items.filter(function (it) { return !q || norm(it.n).indexOf(q) >= 0 || norm(c.n).indexOf(q) >= 0; });
            if (!items.length) return;
            any = true;
            var tot = 0, sel = 0, selable = 0;
            items.forEach(function (it) { tot += it.cnt; if (it.cnt) { selable++; if (S.sel[it.key]) sel++; } });
            var open = q ? true : !S.col[c.id];
            if (c.n) {
                h += '<div class="ib-chap-row"><input type="checkbox" class="ib-cb" data-ch="' + ci + '"' + (selable && sel === selable ? ' checked' : '') + (selable ? '' : ' disabled') + '>' +
                    '<button type="button" class="ib-chap-name" data-tg="' + esc(c.id) + '"><span class="ib-arrow">' + (open ? '▾' : '▸') + '</span> ' + esc(c.n) + '</button>' +
                    '<span class="ib-badge">' + tot + ' câu</span></div>';
            }
            if (open) {
                items.forEach(function (it) {
                    h += '<label class="ib-ls' + (it.cnt ? '' : ' ib-off') + (c.n ? ' ib-indent' : '') + '"><input type="checkbox" class="ib-cb" data-ls="' + esc(it.key) + '"' + (S.sel[it.key] ? ' checked' : '') + (it.cnt ? '' : ' disabled') + '>' +
                        '<span class="ib-ln">' + esc(it.n) + '</span>' +
                        (it.cnt ? '<span class="ib-badge">' + it.cnt + ' câu' + (lvText(it.lv) ? ' • ' + lvText(it.lv) : '') + '</span>' : '<span class="ib-badge ib-zero">chưa có câu</span>') + (it.cnt ? manBtn(it) : '') + '</label>';
                });
            }
        });
        if (!any) h = '<div class="ib-empty">' + (data.length ? 'Không tìm thấy bài phù hợp.' : 'Ngân hàng đề chưa có bài cho <b>' + esc(S.sj) + ' • Lớp ' + S.g + '</b>.<br>Vào mục <b>NGÂN HÀNG ĐỀ</b> để thêm danh sách bài và tạo câu hỏi.') + '</div>';
        box.innerHTML = h;
        updateSummary();
    }
    function chapterItems(ci) {
        var data = tree(S.sj, S.g), q = norm(($('ib-search') || {}).value || ''), c = data[ci];
        if (!c) return [];
        return c.items.filter(function (it) { return !q || norm(it.n).indexOf(q) >= 0 || norm(c.n).indexOf(q) >= 0; });
    }
    function toggleAll(on) {
        tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (it) { if (it.cnt) { if (on) S.sel[it.key] = true; else delete S.sel[it.key]; } }); });
        renderTree();
    }
    function expandAll(on) { tree(S.sj, S.g).forEach(function (c) { S.col[c.id] = !on; }); renderTree(); }

    function selectedItems() {
        var out = [];
        tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (it) { if (S.sel[it.key] && it.cnt) out.push({ it: it, chap: c }); }); });
        return out;
    }
    function takeMode() { var t = 0; PART.forEach(function (p) { t += Math.max(0, parseInt(($('ib-p-' + p[0]) || {}).value, 10) || 0); }); return t > 0 ? 'part' : 'all'; }   /* chỉ còn lấy theo phần: để 0 cả 3 phần = lấy toàn bộ */
    /* [CODE161] Phần I = trắc nghiệm nhiều lựa chọn (mc), Phần II = đúng/sai (tf), Phần III = trả lời ngắn (sa) */
    var PART = [['mc', 'Phần I'], ['tf', 'Phần II'], ['sa', 'Phần III']];
    function partOf(q) { return q && q.type === 'tf' ? 'tf' : (q && q.type === 'sa' ? 'sa' : 'mc'); }
    function selTake() { updateSummary(); }
    function updateSummary() {
        var box = $('ib-summary'), sl = selectedItems(), tot = 0, lv = { NB: 0, TH: 0, VD: 0, VDC: 0 };
        sl.forEach(function (x) { tot += x.it.cnt; LV.forEach(function (k) { lv[k] += (x.it.lv && x.it.lv[k]) || 0; }); });
        var withLv = lv.NB + lv.TH + lv.VD + lv.VDC;
        var pc = { mc: 0, tf: 0, sa: 0 };   /* [CODE161] số câu có sẵn theo Phần I / II / III */
        try { if (sl.length) bank().getMany(sl.map(function (x) { return x.it.key; })).forEach(function (arr) { (arr || []).forEach(function (q) { pc[partOf(q)]++; }); }); } catch (e) {}
        PART.forEach(function (p) { var a = $('ib-pv-' + p[0]); if (a) a.textContent = 'có ' + pc[p[0]]; });
        if (box) {
            if (!sl.length) box.innerHTML = '👉 Tích chọn <b>bài</b> hoặc cả <b>chương</b> ở bên trái để lấy câu hỏi.';
            else {
                var needP = PART.reduce(function (a, p) { return a + Math.max(0, parseInt(($('ib-p-' + p[0]) || {}).value, 10) || 0); }, 0);
                box.innerHTML = 'Đã chọn <b>' + sl.length + ' bài</b> • có sẵn <b>' + tot + ' câu</b>' + (withLv ? '<br><span class="text-slate-600">' + lvText(lv) + (tot > withLv ? ' • chưa phân mức ' + (tot - withLv) : '') + '</span>' : '') +
                    '<br><span class="text-slate-600">Phần I: ' + pc.mc + ' • Phần II: ' + pc.tf + ' • Phần III: ' + pc.sa + '</span>' +
                    (takeMode() === 'part' ? '<br>Sẽ lấy: <b>' + needP + ' câu</b> theo phần' : '<br>Sẽ lấy: <b>' + tot + ' câu</b>');
            }
        }
    }

    var shuffle = window.LTDUtils.shuffle;
    function rid() { return 'g_' + Math.random().toString(36).slice(2, 8); }

    /* [CODE163] Lấy theo phần: mức độ tự động theo Bộ GD&ĐT (mỗi phần 4 : 3 : 3 = Nhận biết : Thông hiểu : Vận dụng; VDC tính vào Vận dụng; thiếu thì bù mức khác);
       chia đều: các chương đã chọn nhận số câu bằng nhau, trong mỗi chương các bài đã chọn nhận số câu bằng nhau (bài hết câu thì bài khác bù). */
    var TIERS = ['NB', 'TH', 'VD'], RATIO = { NB: 4, TH: 3, VD: 3 };
    function tierOf(q) { var l = q && q.level; return l === 'NB' ? 'NB' : l === 'TH' ? 'TH' : (l === 'VD' || l === 'VDC') ? 'VD' : 'NO'; }
    var balancedTake = window.LTDUtils.balancedTake;
    function pickByPart(pool) {
        var need = {}, rnd = ($('ib-rand') || {}).checked, lack = [], units = [], gm = {}, T = { c: {}, l: {} }, picked = [];
        PART.forEach(function (p) { need[p[0]] = Math.max(0, parseInt(($('ib-p-' + p[0]) || {}).value, 10) || 0); });
        pool.forEach(function (q) {
            if (q.gid) { var k = q.__k + '#' + q.gid; if (!gm[k]) { gm[k] = []; units.push(gm[k]); } gm[k].push(q); } else units.push([q]);
        });
        units.forEach(function (u) { u.c = u[0].__c; u.l = u[0].__l; u.t = tierOf(u[0]); u.p = partOf(u[0]); });
        PART.forEach(function (p) {
            var n = need[p[0]]; if (!n) return;
            var cells = { NB: [], TH: [], VD: [], NO: [] };
            units.forEach(function (u) { if (u.p === p[0]) cells[u.t].push(u); });
            if (rnd) Object.keys(cells).forEach(function (t) { shuffle(cells[t]); });
            var raw = TIERS.map(function (l) { return n * RATIO[l] / 10; }), tg = raw.map(Math.floor), rest = n - tg.reduce(function (a, b) { return a + b; }, 0);
            raw.map(function (v, i) { return [v - Math.floor(v), i]; }).sort(function (a, b) { return b[0] - a[0]; }).forEach(function (x) { if (rest > 0) { tg[x[1]]++; rest--; } });
            var left = n, got = 0;
            var take = function (t, k) {
                if (!(k > 0) || left <= 0) return;
                balancedTake(cells[t], Math.min(k, left), T).forEach(function (u) { picked.push(u); left -= u.length; got += u.length; });
            };
            TIERS.forEach(function (l, i) { take(l, tg[i]); });
            ['TH', 'NB', 'VD', 'NO'].forEach(function (l) { take(l, left); });
            if (got < n) lack.push(p[1] + ': cần ' + n + ', chỉ có ' + got);
        });
        return { chosen: [].concat.apply([], picked), lack: lack };
    }

    function doImport() {
        var B = bank(), sl = selectedItems(), msl = manualItems();
        if (!B) return;
        if (!sl.length && !msl.length) { alertBox('Chưa chọn bài', 'Hãy tích chọn ít nhất 1 bài (hoặc cả chương) có câu hỏi trong Ngân hàng đề.'); return; }
        try { if (window.__bankEnsure) window.__bankEnsure(sl.concat(msl).map(function (x) { return x.it.key; })); } catch (e) {}
        var all = B.getMany(sl.map(function (x) { return x.it.key; })), pool = [];
        var cIdx = {}, cn = 0;
        sl.forEach(function (x, i) { if (!(x.chap.id in cIdx)) cIdx[x.chap.id] = cn++; (all[i] || []).forEach(function (q) { var c = JSON.parse(JSON.stringify(q)); c.__k = x.it.key; c.bankKey = x.it.key; c.__c = cIdx[x.chap.id]; c.__l = i; c.__i = pool.length; pool.push(c); }); });
        if (!pool.length && !msl.length) { alertBox('Không có câu hỏi', 'Các bài đã chọn chưa có câu hỏi nào trong Ngân hàng đề.'); return; }

        var chosen = pool;
        window.__ibLack = null;
        if (takeMode() === 'part' && pool.length) {
            var res = pickByPart(pool);
            chosen = res.chosen; window.__ibLack = res.lack;
            if (!chosen.length) { alertBox('Không đủ câu', 'Các bài đã chọn không có câu hỏi ở phần bạn yêu cầu.'); return; }
            chosen.sort(function (a, b) { return a.__i - b.__i; });
        }

                var forced = [];   // [CODE164] câu giáo viên chọn tay: luôn được lấy
        msl.forEach(function (x) { var arr = B.getQuestions(x.it.key); Object.keys(S.man[x.it.key]).map(Number).sort(function (p, q) { return p - q; }).forEach(function (i) { if (arr[i]) { var c = JSON.parse(JSON.stringify(arr[i])); c.__k = x.it.key; c.bankKey = x.it.key; forced.push(c); } }); });
        chosen = forced.concat(chosen); pool = pool.concat(forced); sl = sl.concat(msl);
        if (!chosen.length) { alertBox('Không có câu hỏi', 'Chưa có câu hỏi nào được chọn.'); return; }

        // Nhóm câu (đoạn văn / dữ kiện chung): tạo mã nhóm mới, giữ dữ kiện ở câu đầu nhóm được chọn
        var info = {}, remap = {}, seen = {};
        pool.forEach(function (q) { var k = q.__k + '#' + q.gid; if (q.gid && q.ginfo && !info[k]) info[k] = q.ginfo; });
        chosen.forEach(function (q) {
            if (!q.gid) return;
            var k = q.__k + '#' + q.gid;
            if (!remap[k]) remap[k] = rid();
            var first = !seen[k]; seen[k] = 1; q.gid = remap[k];
            if (first && info[k]) q.ginfo = info[k]; else delete q.ginfo;
        });

        var drafts = chosen.map(function (q) { delete q.__k; delete q.__i; delete q.__c; delete q.__l; return topicQuestionToDraft(q); });
        try { syncEditorDOMToDraft(); } catch (e) {}
        var mode = (document.querySelector('input[name="ib-mode"]:checked') || {}).value || 'append', merged;
        if (mode === 'append') {
            var keep = editorDraftQuestions.filter(function (q) { return String(q.text || '').trim() || String(q.answer || '').trim() || (q.options || []).some(function (o) { return String((o && o.text) || '').trim(); }); });
            merged = keep.concat(drafts);
        } else merged = drafts;
        editorDraftQuestions = sortDraftsByType(normalizeDraftGroups(merged));

        // Môn học / Khối lớp / Chủ đề
        var sjSel = $('edit-subject'), grSel = $('edit-grade'), titleEl = $('edit-subtitle');
        if (($('ib-fill-sg') || {}).checked) {
            try {
                var v = bankSubjectToEditorValue(S.sj);
                if (sjSel && v && !sjSel.disabled && sjSel.value !== v) { sjSel.value = v; try { refreshScoringSummary(); } catch (e) {} }
                if (grSel && !grSel.disabled) { var gv = 'Lớp ' + S.g; if (Array.prototype.some.call(grSel.options, function (o) { return o.value === gv; })) grSel.value = gv; }
            } catch (e) {}
            refresh();
        }
        if (($('ib-fill-title') || {}).checked && titleEl) {
            var nm = titleName(sl);
            titleEl.value = nm; titleEl.dataset.bankKey = sl.length === 1 ? sl[0].it.key : '';
            try { syncTopicTitleLive(nm); } catch (e) {}
        }

        try { syncPaletteAndPatternToCount(editorDraftQuestions.length); } catch (e) {}
        renderEditorForm();
        closeImport();
        var c = countByType(editorDraftQuestions), lc = { NB: 0, TH: 0, VD: 0, VDC: 0 };
        chosen.forEach(function (q) { if (lc[q.level] != null) lc[q.level]++; });
        var lt = lvText(lc);
        var lackTxt = (window.__ibLack && window.__ibLack.length) ? ' Lưu ý - không đủ câu: ' + window.__ibLack.join('; ') + '.' : ''; window.__ibLack = null;
        setTimeout(function () {
            alertBox('Thành công!', 'Đã nhập ' + chosen.length + ' câu hỏi từ Ngân hàng đề (' + sl.length + ' bài' + (lt ? ' • ' + lt : '') + '). Tổng đề hiện có ' + editorDraftQuestions.length + ' câu: Phần I = ' + c.mc + ', Phần II = ' + c.tf + ', Phần III = ' + c.sa + '.' + lackTxt, 'success');
        }, 340);
    }
    function titleName(sl) {
        if (sl.length === 1) return sl[0].it.n;
        var ch = sl[0].chap;
        if (ch.n && sl.every(function (x) { return x.chap === ch; })) return ch.n;
        var ns = sl.slice(0, 3).map(function (x) { return x.it.n; }).join('; ');
        return sl.length > 3 ? ns + ' (+' + (sl.length - 3) + ' bài)' : ns;
    }

    /* ===================== Sự kiện ===================== */
    document.addEventListener('click', function (e) {
        var t = e.target; if (!t || !t.closest) return;
        var vw = t.closest('[data-view]'); if (vw) { e.preventDefault(); openView(vw.getAttribute('data-view')); return; }
        var p = t.closest('[data-pick]');
        if (p && $('ib-pick-list') && $('ib-pick-list').contains(p)) { pickValue(p.getAttribute('data-pick'), p.getAttribute('data-k')); return; }
        var tg = t.closest('[data-tg]');
        if (tg && $('ib-tree') && $('ib-tree').contains(tg)) { var id = tg.getAttribute('data-tg'); S.col[id] = !S.col[id]; renderTree(); }
    });
    document.addEventListener('change', function (e) {
        var t = e.target; if (!t || !$('ib-tree') || !$('ib-tree').contains(t)) return;
        if (t.hasAttribute('data-ls')) { var k = t.getAttribute('data-ls'); if (t.checked) { S.sel[k] = true; delete S.man[k]; } else delete S.sel[k]; renderTree(); syncAll(); }
        else if (t.hasAttribute('data-ch')) {
            var its = chapterItems(parseInt(t.getAttribute('data-ch'), 10));
            its.forEach(function (it) { if (it.cnt) { if (t.checked) { S.sel[it.key] = true; delete S.man[it.key]; } else delete S.sel[it.key]; } });
            renderTree(); syncAll();
        }
    });
    function syncAll() {   // cập nhật ô "Chọn tất cả"
        var al = $('ib-all'); if (!al) return;
        var n = 0, s = 0; tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (it) { if (it.cnt) { n++; if (S.sel[it.key]) s++; } }); });
        al.checked = n > 0 && n === s;
    }
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var pk = $('ib-pick-modal'), im = $('ib-modal');
        if (pk && !pk.classList.contains('hidden')) closePick(); else if (im && !im.classList.contains('hidden')) closeImport();
    });


    /* [CODE164] Nút "Xem câu": giáo viên xem từng câu trong bài và tự tích chọn câu cần lấy */
    function manualItems() { var out = []; tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (it) { var m = S.man[it.key]; if (m && Object.keys(m).length && it.cnt) out.push({ it: it, chap: c }); }); }); return out; }
    function manBtn(it) { var n = S.man[it.key] ? Object.keys(S.man[it.key]).length : 0; return '<button type="button" class="ib-vw" data-view="' + esc(it.key) + '" style="margin-left:6px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:900;color:#5b21b6;background:#ede9fe;border:1px solid #c4b5fd;white-space:nowrap">👁 Xem câu' + (n ? ' • ✋' + n : '') + '</button>'; }
    var V = { key: '', sel: {} };
    function vwText(h, n) { var t = String(h || '').replace(/<img[^>]*>/gi, ' [Hình] ').replace(/<table[\s\S]*?<\/table>/gi, ' [Bảng] ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; }
    function vwEnsure() {
        var m = $('ib-view-modal'); if (m) return m;
        m = document.createElement('div'); m.id = 'ib-view-modal'; m.className = 'absolute inset-0 bg-black/70 z-[80] hidden flex justify-center items-center opacity-0 transition-opacity duration-300';
        m.innerHTML = '<div class="bg-white w-full h-full md:max-w-4xl md:h-[92%] md:rounded-2xl flex flex-col overflow-hidden shadow-2xl"><div class="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center gap-3 shrink-0"><div class="flex-1 min-w-0"><div class="font-black uppercase text-sm truncate" id="ib-vw-title"></div><div class="text-xs font-bold opacity-90" id="ib-vw-count"></div></div><button type="button" onclick="CODE153.vwClose()" class="text-2xl font-black px-2">✕</button></div>' +
            '<div class="px-4 py-2 bg-slate-100 border-b flex flex-wrap gap-2 shrink-0"><button type="button" onclick="CODE153.vwAll(true)" class="px-3 py-1 rounded-full text-xs font-black bg-white border border-violet-300 text-violet-800">Chọn tất cả</button><button type="button" onclick="CODE153.vwAll(false)" class="px-3 py-1 rounded-full text-xs font-black bg-white border border-violet-300 text-violet-800">Bỏ chọn</button><span class="text-[11px] font-bold text-slate-600 self-center">Các câu tích chọn ở đây luôn được lấy vào đề.</span></div>' +
            '<div id="ib-vw-list" class="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50"></div><div class="px-4 py-3 bg-slate-100 border-t flex justify-end gap-2 shrink-0"><button type="button" onclick="CODE153.vwClose()" class="px-5 py-2 rounded-full font-black text-slate-700 bg-white border border-slate-300 text-sm uppercase">Hủy</button><button type="button" onclick="CODE153.vwSave()" class="px-6 py-2 rounded-full font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm uppercase">✔ Dùng các câu đã chọn</button></div></div>';
        ($('ib-modal').parentNode || document.body).appendChild(m);
        m.addEventListener('change', function (e) { var t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-qi')) { var i = t.getAttribute('data-qi'); if (t.checked) V.sel[i] = true; else delete V.sel[i]; vwCount(); } });
        return m;
    }
    function vwQs() { var B = bank(); return B ? B.getQuestions(V.key) : []; }
    function vwCount() { var e = $('ib-vw-count'); if (e) e.textContent = 'Đã chọn ' + Object.keys(V.sel).length + ' / ' + vwQs().length + ' câu'; }
    function vwRender() {
        var h = '';
        vwQs().forEach(function (q, i) {
            var p = partOf(q), pn = p === 'mc' ? 'Phần I' : p === 'tf' ? 'Phần II' : 'Phần III', body;
            if (p === 'sa') body = '<div class="text-xs font-black text-emerald-700 mt-1">Đáp án: ' + esc(q.shortAnswer) + '</div>';
            else body = (q.options || []).map(function (o, j) {
                var ok = p === 'tf' ? !!(q.tfAnswers && q.tfAnswers[j]) : o.letter === q.correct;
                return '<div class="text-xs ' + (p === 'mc' && ok ? 'font-black text-emerald-700' : 'text-slate-700') + '">' + (p === 'tf' ? 'abcd'[j] + ') ' : esc(o.letter) + '. ') + esc(vwText(o.text, 160)) + (p === 'tf' ? (ok ? ' <b class="text-emerald-700">[Đúng]</b>' : ' <b class="text-rose-600">[Sai]</b>') : (ok ? ' ✔' : '')) + '</div>';
            }).join('');
            h += '<label class="block bg-white rounded-xl border border-slate-200 p-3 cursor-pointer"><div class="flex items-start gap-2"><input type="checkbox" data-qi="' + i + '" class="mt-1 w-4 h-4 accent-violet-600"' + (V.sel[i] ? ' checked' : '') + '><div class="min-w-0 flex-1"><div class="text-[11px] font-black text-violet-700">Câu ' + (i + 1) + ' • ' + pn + (q.level ? ' • ' + esc(q.level) : '') + (q.gid ? ' • câu chùm' : '') + '</div><div class="text-sm font-bold text-slate-900 break-words">' + esc(vwText(q.text, 400)) + '</div>' + body + '</div></div></label>';
        });
        $('ib-vw-list').innerHTML = h || '<div class="p-6 text-center font-bold text-slate-500">Bài này chưa có câu hỏi.</div>';
        vwCount();
    }
    function openView(key) {
        var it = null; tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (x) { if (x.key === key) it = x; }); });
        vwEnsure(); V.key = key; V.sel = JSON.parse(JSON.stringify(S.man[key] || {}));
        $('ib-vw-title').textContent = '👁 ' + (it ? it.n : key); vwRender(); show('ib-view-modal');
    }
    function vwAll(on) { V.sel = {}; if (on) vwQs().forEach(function (q, i) { V.sel[i] = true; }); vwRender(); }
    function vwClose() { hide('ib-view-modal'); }
    function vwSave() {
        if (Object.keys(V.sel).length) { S.man[V.key] = JSON.parse(JSON.stringify(V.sel)); delete S.sel[V.key]; } else delete S.man[V.key];
        vwClose(); renderTree(); syncAll();
    }
    var _us = updateSummary;
    updateSummary = function () {
        _us();
        var m = manualItems(), n = 0, box = $('ib-summary'); m.forEach(function (x) { n += Object.keys(S.man[x.it.key]).length; });
        if (box && n) box.innerHTML = (box.innerHTML.indexOf('Tích chọn') >= 0 ? '' : box.innerHTML + '<br>') + '✋ Chọn tay: <b>' + n + ' câu</b> từ ' + m.length + ' bài (luôn được lấy, không tính vào số câu theo phần)';
    };

    window.CODE153 = { openView: openView, vwAll: vwAll, vwClose: vwClose, vwSave: vwSave, refresh: refresh, onSubjGrade: onSubjGrade, openPick: openPick, closePick: closePick, renderPick: renderPick,
        openImport: openImport, closeImport: closeImport, onSubject: onSubject, onGrade: onGrade, renderTree: renderTree,
        toggleAll: toggleAll, expandAll: expandAll, updateSummary: updateSummary, doImport: doImport, selTake: selTake };
    setTimeout(refresh, 0);
})();

// === [code162-bank-word] ===
/* [CODE162] XUẤT FILE WORD TỪ NGÂN HÀNG ĐỀ
   - Ở NGÂN HÀNG ĐỀ (giáo viên): nút "📄 Xuất file word" nằm ở THƯ MỤC CHÍNH (môn học + khối, ví dụ Hóa học 12), không còn ở từng chương / bài. Trang xuất tự chọn sẵn toàn bộ bài đã có câu hỏi; giáo viên tích chọn lại chương / bài cần xuất.
   - Trang xuất: chọn Chương / Bài của Môn - Khối đang mở, lấy toàn bộ hoặc theo số câu từng Phần I-II-III (mức độ tự động theo Bộ GD&ĐT 4:3:3, chia đều chương -> bài), nhập thông tin trang đầu của đề,
     rồi xuất Word đúng định dạng của TRỘN ĐỀ THI (Phần I/II/III, MathType, bảng Auto Fit, đáp án...).
   - Chạy hoàn toàn trên trình duyệt (GitHub Pages): đọc câu hỏi từ bộ nhớ ngân hàng đã có sẵn trên máy, KHÔNG thêm lượt đọc/ghi Firebase nào. */
(function () {
    'use strict';
    var LV = ['NB', 'TH', 'VD', 'VDC'];
    var PART = [['mc', 'Phần I'], ['tf', 'Phần II'], ['sa', 'Phần III']];
    var LSK = 'matrix_xw_cfg_v1', DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    var INFO = ['sgd', 'school', 'exam', 'subject', 'grade', 'year', 'time'];
    var S = { sj: '', g: 0, sel: {}, col: {}, touched: {}, busy: false, built: false };

    function $(id) { return document.getElementById(id); }
    function bank() { return window.CODE129Bank && window.CODE129Bank.lessonsOf ? window.CODE129Bank : null; }
    var esc = window.LTDUtils.esc;
    var norm = window.LTDUtils.normFold;
    function val(id) { var e = $(id); return e ? String(e.value || '').trim() : ''; }
    function chk(id) { var e = $(id); return !!(e && e.checked); }
    function safe(s, def) { var r = norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40); return r || def; }

    /* ===================== CSS ===================== */
    var CSS = '' +
        '.bk-xw{background:linear-gradient(90deg,#2563eb,#4f46e5);color:#fff}' +
        'body.layout-portrait #bank-modal .bk-ls .bk-xw{flex:1 0 100%}' +
        '.xw-modal{position:fixed;inset:0;z-index:85;background:rgba(0,0,0,.75);display:flex;transition:opacity .25s;font-family:Roboto,Arial,sans-serif}' +
        '.xw-modal.xw-off{display:none}.xw-modal.xw-fade{opacity:0}' +
        '.xw-panel{background:#f8fafc;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;position:relative;color:#0f172a}' +
        '.xw-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 20px;color:#fff;background:linear-gradient(90deg,#2563eb,#4f46e5)}' +
        '.xw-head h2{margin:0;font-size:21px;font-weight:900;text-transform:uppercase;letter-spacing:.02em;min-width:0}' +
        '.xw-head .xw-tag{background:#fde047;color:#0f172a;font-size:13px;font-weight:900;border-radius:999px;padding:2px 10px;margin-left:8px;white-space:nowrap}' +
        '.xw-x{border:0;border-radius:999px;background:rgba(255,255,255,.2);color:#fff;font-weight:900;font-size:15px;padding:7px 16px;cursor:pointer;white-space:nowrap}.xw-x:hover{background:rgba(255,255,255,.35)}' +
        '.xw-f label{display:block;margin-bottom:3px;font-size:13px;font-weight:900;color:#334155;text-transform:uppercase}' +
        '.xw-f select,.xw-f input[type=text],.xw-f input[type=number]{width:100%;box-sizing:border-box;border:2px solid #cbd5e1;border-radius:12px;padding:8px 10px;font-size:16px;font-weight:700;color:#0f172a;background:#fff;outline:none}' +
        '.xw-f select:focus,.xw-f input:focus{border-color:#4f46e5}' +
        '.xw-info{flex:none;margin:10px 20px 0;background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:8px 16px 12px;box-shadow:0 1px 4px rgba(15,23,42,.06)}' +
        '.xw-info>summary{cursor:pointer;list-style:none;font-size:17px;font-weight:900;color:#4338ca;text-transform:uppercase;padding:4px 0}' +
        '.xw-info>summary::-webkit-details-marker{display:none}.xw-info>summary:after{content:" ▾";font-size:14px}.xw-info:not([open])>summary:after{content:" ▸"}' +
        '.xw-grid{display:grid;grid-template-columns:1.3fr 1.5fr 1.5fr 1fr .55fr .95fr .95fr;gap:8px;align-items:end;margin-top:6px}' +
        '.xw-grid .xw-f{min-width:0}.xw-grid .xw-f label{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.xw-grid .xw-f input[type=text]{font-size:15.5px;padding:8px 9px;background:#f8fafc}' +
        '.xw-main{flex:1;min-height:0;display:flex;margin-top:10px;border-top:1px solid #e2e8f0}' +
        '.xw-left{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;border-right:1px solid #e2e8f0;background:#fff}' +
        '.xw-bar{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 14px;background:#f1f5f9;border-bottom:1px solid #e2e8f0}' +
        '.xw-bar label{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:900;color:#1e293b;cursor:pointer}' +
        '.xw-pill{margin-left:auto;border:1px solid #a5b4fc;background:#fff;color:#3730a3;border-radius:999px;font-size:13px;font-weight:900;padding:4px 12px;cursor:pointer}.xw-pill+.xw-pill{margin-left:0}' +
        '.xw-tree{flex:1;min-height:0;overflow-y:auto;padding:10px 12px;-webkit-overflow-scrolling:touch}' +
        '.xw-chap{display:flex;align-items:center;gap:8px;margin:8px 0 4px;padding:7px 10px;border-radius:12px;background:linear-gradient(90deg,#e0e7ff,#fae8ff);border:1px solid #c7d2fe}' +
        '.xw-chap button{flex:1;min-width:0;text-align:left;background:none;border:0;padding:0;cursor:pointer;font-weight:900;font-size:15px;color:#312e81;text-transform:uppercase}' +
        '.xw-ls{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:700;color:#1e293b}.xw-ls:hover{background:#eef2ff}' +
        '.xw-ls.ind{margin-left:18px}.xw-ls.off{opacity:.5;cursor:not-allowed}' +
        '.xw-cb{width:18px;height:18px;accent-color:#4f46e5;flex:none;cursor:pointer}' +
        '.xw-ln{flex:1;min-width:0}' +
        '.xw-badge{flex:none;font-size:13px;font-weight:900;color:#3730a3;background:#e0e7ff;border-radius:999px;padding:2px 9px;white-space:nowrap}.xw-badge.z{color:#64748b;background:#f1f5f9}' +
        '.xw-empty{padding:28px 12px;text-align:center;font-size:15px;font-weight:700;color:#64748b;line-height:1.6}' +
        '.xw-right{flex:none;width:400px;min-height:0;overflow-y:auto;background:#f8fafc;padding:14px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}' +
        '.xw-box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px}' +
        '.xw-box h4{margin:0 0 6px;font-size:14px;font-weight:900;color:#1e293b;text-transform:uppercase}' +
        '.xw-hint{margin:8px 0 0;font-size:13px;font-weight:600;color:#475569;line-height:1.45;text-align:justify;text-justify:inter-word;-webkit-hyphens:auto;hyphens:auto}' +
        '.xw-rd{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:14.5px;font-weight:800;color:#1e293b;cursor:pointer}' +
        '.xw-rd input{accent-color:#4f46e5;width:17px;height:17px}' +
        '.xw-q{display:grid;gap:8px;margin:6px 0 4px}.xw-q.l4{grid-template-columns:repeat(4,1fr)}.xw-q.l3{grid-template-columns:repeat(3,1fr)}' +
        '.xw-q label{text-align:center;font-size:13px;font-weight:900}.xw-q input{width:100%;box-sizing:border-box;margin-top:2px;border:1px solid #cbd5e1;border-radius:10px;padding:5px 2px;text-align:center;font-size:17px;font-weight:900;color:#0f172a;outline:none;background:#fff}' +
        '.xw-q span{display:block;font-size:12px;font-weight:700;color:#64748b}' +
        '.xw-foot{flex:none;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;padding:10px 20px;background:#f1f5f9;border-top:1px solid #e2e8f0}' +
        '.xw-btn{border:0;border-radius:999px;padding:10px 24px;font-size:15px;font-weight:900;text-transform:uppercase;cursor:pointer;transition:transform .12s}.xw-btn:active{transform:scale(.96)}' +
        '.xw-btn.gry{background:#fff;color:#334155;border:1px solid #cbd5e1}.xw-btn.go{color:#fff;background:linear-gradient(90deg,#2563eb,#4f46e5);box-shadow:0 3px 8px rgba(79,70,229,.4)}' +
        '.xw-btn[disabled]{opacity:.5;cursor:wait}' +
        '.xw-ov{position:absolute;inset:0;z-index:5;background:rgba(15,23,42,.6);display:none;align-items:center;justify-content:center;padding:16px}.xw-ov.show{display:flex}' +
        '.xw-ov>div{background:#fff;border-radius:18px;padding:20px 26px;max-width:min(520px,92vw);text-align:center;font-weight:700;color:#1e293b;line-height:1.55;white-space:pre-line}' +
        '.xw-ov b{display:block;font-size:19px;font-weight:900;color:#3730a3;margin-bottom:6px}.xw-ov.ok b{color:#047857}' +
        '.xw-ov button{margin-top:12px;border:0;border-radius:999px;padding:8px 26px;font-weight:900;font-size:15px;color:#fff;background:linear-gradient(90deg,#2563eb,#4f46e5);cursor:pointer}' +
        '@media (max-width:1100px){.xw-grid{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}}' +
        '@media (max-width:767px){' +
        '.xw-head{padding:10px 12px}.xw-head h2{font-size:17px}.xw-head .xw-tag{display:none}' +
        '.xw-info{margin:8px 12px 0}' +
        '.xw-main{flex-direction:column;overflow-y:auto}.xw-left{flex:none;border-right:0}.xw-tree{max-height:44vh;flex:none}' +
        '.xw-right{width:auto;overflow:visible}.xw-ls.ind{margin-left:8px}.xw-foot{padding:8px 12px}}';

    /* ===================== HTML ===================== */
    function inp(id, label, ph, extra) { return '<div class="xw-f"><label>' + label + '</label><input type="text" id="' + id + '" placeholder="' + ph + '" ' + (extra || 'oninput="CODE162.onInfo()"') + '></div>'; }
    var HTML = '' +
        '<div class="xw-panel">' +
        '<div class="xw-head"><div style="display:flex;align-items:center;min-width:0"><h2>📄 Xuất file Word từ Ngân hàng đề</h2><span class="xw-tag">Theo bài • Theo chương • Cả khối</span></div>' +
        '<button type="button" class="xw-x" onclick="CODE162.close()">✕ Đóng</button></div>' +
        '<details id="xw-info" class="xw-info" open><summary>Thông tin trang đầu của đề thi</summary><div class="xw-grid">' +
        inp('xw-sgd', 'Sở giáo dục', 'VD: SỞ GD – ĐT QUẢNG TRỊ') + inp('xw-school', 'Tên trường', 'VD: THPT NGUYỄN CHÍ THANH') + inp('xw-exam', 'Tên kì thi', 'VD: KIỂM TRA GIỮA KÌ I') +
        inp('xw-subject-t', 'Môn thi', 'VD: Hóa học', 'oninput="CODE162.onInfo(\'subject\')"') + inp('xw-grade-t', 'Lớp', 'VD: 12', 'oninput="CODE162.onInfo(\'grade\')"') +
        inp('xw-year', 'Năm học', 'VD: 2026 – 2027') + inp('xw-time', 'Thời gian làm bài (phút)', 'VD: 50') +
        '</div></details>' +
        '<div class="xw-main">' +
        '<div class="xw-left"><div class="xw-bar"><label><input id="xw-all" type="checkbox" class="xw-cb" onchange="CODE162.toggleAll(this.checked)"> Chọn tất cả (cả khối)</label>' +
        '<button type="button" class="xw-pill" onclick="CODE162.expandAll(true)">Mở hết chương</button><button type="button" class="xw-pill" onclick="CODE162.expandAll(false)">Thu gọn</button></div>' +
        '<div id="xw-tree" class="xw-tree"></div></div>' +
        '<div class="xw-right">' +
        '<div class="xw-box"><h4>Số câu lấy vào đề (theo phần)</h4>' +
        '<div id="xw-pquota" class="xw-q l3">' +
        '<label style="color:#1d4ed8">Phần I<input id="xw-p-mc" type="number" min="0" value="0" onfocus="this.select()" oninput="CODE162.updateSummary()"><span id="xw-pv-mc">có 0</span></label>' +
        '<label style="color:#047857">Phần II<input id="xw-p-tf" type="number" min="0" value="0" onfocus="this.select()" oninput="CODE162.updateSummary()"><span id="xw-pv-tf">có 0</span></label>' +
        '<label style="color:#c2410c">Phần III<input id="xw-p-sa" type="number" min="0" value="0" onfocus="this.select()" oninput="CODE162.updateSummary()"><span id="xw-pv-sa">có 0</span></label></div>' +
        '<p class="xw-hint">Để 0 ở cả ba phần = lấy toàn bộ câu hỏi của các bài đã chọn.</p>' +
        '<p class="xw-hint">📐 Mức độ tự động theo Bộ GD&amp;ĐT: Nhận biết 40% – Thông hiểu 30% – Vận dụng 30% (thiếu mức nào thì tự bù từ mức khác).</p>' +
        '<p class="xw-hint">⚖️ Số câu chia đều giữa các chương đã chọn; trong mỗi chương chia đều giữa các bài đã chọn.</p>' +
        '<label class="xw-rd" style="margin-top:8px;font-size:13.5px"><input id="xw-rand" type="checkbox" checked> Chọn ngẫu nhiên câu hỏi trong từng bài</label></div>' +
        '<div class="xw-box"><h4>Tệp Word cần xuất</h4>' +
        '<label class="xw-rd"><input id="xw-o-exam" type="checkbox" checked> Đề thi (dành cho học sinh)</label>' +
        '<label class="xw-rd"><input id="xw-o-ans" type="checkbox" checked> Đề có đáp án (dành cho giáo viên)</label>' +
        '<label class="xw-rd"><input id="xw-o-key" type="checkbox" checked> Bảng đáp án</label>' +
        '<div class="xw-f" style="margin-top:8px"><label>Mã đề (không bắt buộc)</label><input type="text" id="xw-code" maxlength="4" inputmode="numeric" placeholder="VD: 0101 — để trống nếu không cần"></div></div>' +
        '</div></div>' +
        '<div class="xw-foot"><button type="button" class="xw-btn gry" onclick="CODE162.close()">Hủy</button>' +
        '<button type="button" class="xw-btn go" id="xw-do" onclick="CODE162.doExport()">📄 Xuất file Word</button></div>' +
        '<div id="xw-ov" class="xw-ov"><div id="xw-ov-b"></div></div>' +
        '</div>';

    function build() {
        if (S.built && $('xw-modal')) return;
        if (!$('code162-css')) { var st = document.createElement('style'); st.id = 'code162-css'; st.textContent = CSS; document.head.appendChild(st); }
        var m = document.createElement('div'); m.id = 'xw-modal'; m.className = 'xw-modal xw-off xw-fade'; m.innerHTML = HTML;
        document.body.appendChild(m); S.built = true;
        var tr = $('xw-tree');
        tr.addEventListener('click', function (e) {
            var tg = e.target.closest && e.target.closest('[data-tg]');
            if (tg) { var id = tg.getAttribute('data-tg'); S.col[id] = !S.col[id]; renderTree(); }
        });
        tr.addEventListener('change', function (e) {
            var t = e.target;
            if (t.hasAttribute('data-ls')) { var k = t.getAttribute('data-ls'); if (t.checked) S.sel[k] = true; else delete S.sel[k]; updateSummary(); syncAll(); }
            else if (t.hasAttribute('data-ch')) {
                chapterItems(parseInt(t.getAttribute('data-ch'), 10)).forEach(function (it) { if (it.cnt) { if (t.checked) S.sel[it.key] = true; else delete S.sel[it.key]; } });
                renderTree(); syncAll();
            }
        });
    }
    function showM() { var m = $('xw-modal'); m.classList.remove('xw-off'); setTimeout(function () { m.classList.remove('xw-fade'); }, 10); }
    function close() {
        var m = $('xw-modal'); if (!m || S.busy) return;
        m.classList.add('xw-fade'); setTimeout(function () { m.classList.add('xw-off'); }, 260);
    }
    function note(title, msg, ok) {
        var o = $('xw-ov'); if (!o) return;
        $('xw-ov-b').innerHTML = '<b>' + esc(title) + '</b>' + esc(msg) + '<br><button type="button" onclick="CODE162.closeNote()">OK</button>';
        o.className = 'xw-ov show' + (ok ? ' ok' : '');
    }
    function closeNote() { var o = $('xw-ov'); if (o) o.className = 'xw-ov'; }
    function progress(msg) {
        var o = $('xw-ov'); if (!o) return;
        if (!msg) { if (S.busy === false) closeNote(); return; }
        $('xw-ov-b').innerHTML = '<b>⏳ ' + esc(msg) + '</b>Vui lòng chờ trong giây lát…';
        o.className = 'xw-ov show';
    }

    /* ===================== Dữ liệu ngân hàng ===================== */
    function tree(sj, g) {
        var B = bank(), out = [], cur = null;
        if (!B || !sj || !g) return out;
        B.lessonsOf(sj, g).forEach(function (x) {
            if (x.h) { cur = { id: x.id, n: x.n, items: [] }; out.push(cur); return; }
            if (!cur) { cur = { id: '_0', n: '', items: [] }; out.push(cur); }
            var key = sj + '|' + g + '|' + x.id, m = B.meta(key);
            cur.items.push({ id: x.id, n: x.n, key: key, cnt: m.n || 0, lv: m.m || {} });
        });
        return out;
    }
    function lvText(lv) { var t = []; LV.forEach(function (k) { if (lv && lv[k]) t.push(k + ' ' + lv[k]); }); return t.join(' • '); }
    /* ===================== Thông tin trang đầu ===================== */
    function mixCfg() { try { var k = window.__CODE93_CORE && window.__CODE93_CORE.LS_KEY; return k ? (JSON.parse(localStorage.getItem(k) || '{}') || {}) : {}; } catch (e) { return {}; } }
    function ownCfg() { try { return JSON.parse(localStorage.getItem(LSK) || '{}') || {}; } catch (e) { return {}; } }
    function fieldId(k) { return k === 'subject' ? 'xw-subject-t' : k === 'grade' ? 'xw-grade-t' : 'xw-' + k; }
    function fillInfo() {
        var own = ownCfg(), mx = mixCfg();
        INFO.forEach(function (k) {
            var el = $(fieldId(k)); if (!el) return;
            if (k === 'subject') el.value = S.sj;
            else if (k === 'grade') el.value = S.g ? String(S.g) : '';
            else el.value = own[k] != null ? own[k] : (mx[k] || '');   // lần đầu lấy thông tin trường từ mục TRỘN ĐỀ THI
        });
    }
    function readInfo() { var o = {}; INFO.forEach(function (k) { o[k] = val(fieldId(k)); }); return o; }
    function saveInfo() { try { var o = readInfo(); delete o.subject; delete o.grade; localStorage.setItem(LSK, JSON.stringify(o)); } catch (e) {} }
    function onInfo(k) { if (k) S.touched[k] = true; saveInfo(); }
    /* ===================== Mở trang ===================== */
    function open(sj, g, kind, id) {
        var B = bank(); if (!B) return;
        build();
        S.sj = sj; S.g = g; S.sel = {}; S.col = {}; S.touched = {}; S.busy = false;
        tree(sj, g).forEach(function (c) {
            if (kind === 'root') c.items.forEach(function (it) { if (it.cnt) S.sel[it.key] = true; });
            if (kind === 'chap' && c.id === id) c.items.forEach(function (it) { if (it.cnt) S.sel[it.key] = true; });
            if (kind === 'les') c.items.forEach(function (it) { if (it.id === id && it.cnt) S.sel[it.key] = true; });
        });
        ['mc', 'tf', 'sa'].forEach(function (k) { var e = $('xw-p-' + k); if (e) e.value = 0; });
        var rd = $('xw-rand'); if (rd) rd.checked = true;
        ['xw-o-exam', 'xw-o-ans', 'xw-o-key'].forEach(function (i) { var e = $(i); if (e) e.checked = true; });
        var cd = $('xw-code'); if (cd) cd.value = '';
        fillInfo(); closeNote();
        $('xw-info').open = window.innerWidth > 767;
        renderTree(); showM();
        setTimeout(function () { try { var f = document.querySelector('#xw-tree input[data-ls]:checked'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' }); } catch (e) {} }, 60);
    }

    /* ===================== Cây Chương / Bài ===================== */
    function renderTree() {
        var box = $('xw-tree'); if (!box) return;
        var data = tree(S.sj, S.g), h = '', any = false;
        data.forEach(function (c, ci) {
            if (!c.items.length) return;
            any = true;
            var tot = 0, sel = 0, selable = 0;
            c.items.forEach(function (it) { tot += it.cnt; if (it.cnt) { selable++; if (S.sel[it.key]) sel++; } });
            var open = !S.col[c.id];
            if (c.n) h += '<div class="xw-chap"><input type="checkbox" class="xw-cb" data-ch="' + ci + '"' + (selable && sel === selable ? ' checked' : '') + (selable ? '' : ' disabled') + '>' +
                '<button type="button" data-tg="' + esc(c.id) + '"><span style="display:inline-block;width:14px">' + (open ? '▾' : '▸') + '</span> ' + esc(c.n) + '</button><span class="xw-badge">' + tot + ' câu</span></div>';
            if (open) c.items.forEach(function (it) {
                h += '<label class="xw-ls' + (it.cnt ? '' : ' off') + (c.n ? ' ind' : '') + '"><input type="checkbox" class="xw-cb" data-ls="' + esc(it.key) + '"' + (S.sel[it.key] ? ' checked' : '') + (it.cnt ? '' : ' disabled') + '>' +
                    '<span class="xw-ln">' + esc(it.n) + '</span>' + (it.cnt ? '<span class="xw-badge">' + it.cnt + ' câu' + (lvText(it.lv) ? ' • ' + lvText(it.lv) : '') + '</span>' : '<span class="xw-badge z">chưa có câu</span>') + '</label>';
            });
        });
        if (!any) h = '<div class="xw-empty">Ngân hàng đề chưa có bài cho <b>' + esc(S.sj) + ' • Lớp ' + S.g + '</b>.</div>';
        box.innerHTML = h; updateSummary(); syncAll();
    }
    function chapterItems(ci) { var c = tree(S.sj, S.g)[ci]; return c ? c.items : []; }
    function toggleAll(on) { tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (it) { if (it.cnt) { if (on) S.sel[it.key] = true; else delete S.sel[it.key]; } }); }); renderTree(); }
    function expandAll(on) { tree(S.sj, S.g).forEach(function (c) { S.col[c.id] = !on; }); renderTree(); }
    function syncAll() {
        var al = $('xw-all'); if (!al) return;
        var n = 0, s = 0; tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (it) { if (it.cnt) { n++; if (S.sel[it.key]) s++; } }); });
        al.checked = n > 0 && n === s;
    }
    function selectedItems() {
        var out = []; tree(S.sj, S.g).forEach(function (c) { c.items.forEach(function (it) { if (S.sel[it.key] && it.cnt) out.push({ it: it, chap: c }); }); }); return out;
    }
    function partOf(q) { return q && q.type === 'tf' ? 'tf' : (q && q.type === 'sa' ? 'sa' : 'mc'); }
    function updateSummary() {   // số câu có sẵn của từng phần trong các bài đã chọn
        var sl = selectedItems(), pc = { mc: 0, tf: 0, sa: 0 };
        try { if (sl.length) bank().getMany(sl.map(function (x) { return x.it.key; })).forEach(function (arr) { (arr || []).forEach(function (q) { pc[partOf(q)]++; }); }); } catch (e) {}
        PART.forEach(function (p) { var a = $('xw-pv-' + p[0]); if (a) a.textContent = 'có ' + pc[p[0]]; });
    }

    /* ===================== Chọn câu hỏi ===================== */
    /* Theo Bộ GD&ĐT: mỗi phần chia 4 : 3 : 3 (Nhận biết : Thông hiểu : Vận dụng; câu VDC tính vào Vận dụng); thiếu thì bù từ mức khác.
       Chia đều: các chương đã chọn nhận số câu bằng nhau; trong mỗi chương các bài đã chọn nhận số câu bằng nhau (bài nào hết câu thì bài khác bù). */
    var TIERS = ['NB', 'TH', 'VD'], RATIO = { NB: 4, TH: 3, VD: 3 };
    function tierOf(q) { var l = q && q.level; return l === 'NB' ? 'NB' : l === 'TH' ? 'TH' : (l === 'VD' || l === 'VDC') ? 'VD' : 'NO'; }
    var shuffle = window.LTDUtils.shuffle;
    function rid() { return 'g_' + Math.random().toString(36).slice(2, 8); }
    var balancedTake = window.LTDUtils.balancedTake;
    function pick() {
        var B = bank(), sl = selectedItems();
        if (!sl.length) { note('Chưa chọn bài', 'Hãy tích chọn ít nhất 1 bài (hoặc cả chương) có câu hỏi trong Ngân hàng đề.'); return null; }
        var all = B.getMany(sl.map(function (x) { return x.it.key; })), pool = [], cIdx = {}, cn = 0;
        sl.forEach(function (x, i) {
            if (!(x.chap.id in cIdx)) cIdx[x.chap.id] = cn++;
            (all[i] || []).forEach(function (q) { var c = Object.assign({}, q); c.__k = x.it.key; c.__c = cIdx[x.chap.id]; c.__l = i; c.__i = pool.length; pool.push(c); });
        });
        if (!pool.length) { note('Không có câu hỏi', 'Các bài đã chọn chưa có câu hỏi nào trong Ngân hàng đề.'); return null; }
        var need = {}, total = 0;
        PART.forEach(function (p) { need[p[0]] = Math.max(0, parseInt(val('xw-p-' + p[0]), 10) || 0); total += need[p[0]]; });
        var chosen = pool, lack = [], rnd = chk('xw-rand');
        if (total > 0) {
            var units = [], gm = {};
            pool.forEach(function (q) {
                if (q.gid) { var k = q.__k + '#' + q.gid; if (!gm[k]) { gm[k] = []; units.push(gm[k]); } gm[k].push(q); } else units.push([q]);
            });
            units.forEach(function (u) { u.c = u[0].__c; u.l = u[0].__l; u.t = tierOf(u[0]); u.p = partOf(u[0]); });
            var T = { c: {}, l: {} }, picked = [];
            PART.forEach(function (p) {
                var n = need[p[0]]; if (!n) return;
                var cells = { NB: [], TH: [], VD: [], NO: [] };
                units.forEach(function (u) { if (u.p === p[0]) cells[u.t].push(u); });
                if (rnd) Object.keys(cells).forEach(function (t) { shuffle(cells[t]); });
                var raw = TIERS.map(function (l) { return n * RATIO[l] / 10; }), tg = raw.map(Math.floor), rest = n - tg.reduce(function (a, b) { return a + b; }, 0);
                raw.map(function (v, i) { return [v - Math.floor(v), i]; }).sort(function (a, b) { return b[0] - a[0]; }).forEach(function (x) { if (rest > 0) { tg[x[1]]++; rest--; } });
                var left = n, got = 0;
                var take = function (t, k) {
                    if (!(k > 0) || left <= 0) return;
                    balancedTake(cells[t], Math.min(k, left), T).forEach(function (u) { picked.push(u); left -= u.length; got += u.length; });
                };
                TIERS.forEach(function (l, i) { take(l, tg[i]); });
                ['TH', 'NB', 'VD', 'NO'].forEach(function (l) { take(l, left); });
                if (got < n) lack.push(p[1] + ': cần ' + n + ', chỉ có ' + got);
            });
            chosen = [].concat.apply([], picked);
        }
        if (!chosen.length) { note('Không đủ câu', 'Các bài đã chọn không có câu hỏi theo yêu cầu của bạn.'); return null; }
        chosen.sort(function (a, b) { return a.__i - b.__i; });
        // thống kê phân bổ (hiện sau khi xuất)
        var lvc = { NB: 0, TH: 0, VD: 0, NO: 0 }, cc = {}, lc = {};
        chosen.forEach(function (q) { lvc[tierOf(q)]++; cc[q.__c] = (cc[q.__c] || 0) + 1; lc[q.__l] = (lc[q.__l] || 0) + 1; });
        var stat = 'Mức độ: NB ' + lvc.NB + ' • TH ' + lvc.TH + ' • VD ' + lvc.VD + (lvc.NO ? ' • chưa phân mức ' + lvc.NO : '');
        var chNames = []; sl.forEach(function (x) { if (chNames.indexOf(x.chap) < 0) chNames.push(x.chap); });
        if (total > 0 && chNames.length > 1) stat += '\nTheo chương: ' + chNames.map(function (c, i) { return (c.n || ('Nhóm ' + (i + 1))).slice(0, 24) + ' = ' + (cc[i] || 0); }).join(' • ');
        if (total > 0 && sl.length > 1 && sl.length <= 12) stat += '\nTheo bài: ' + sl.map(function (x, i) { return x.it.n.slice(0, 22) + ' = ' + (lc[i] || 0); }).join(' • ');
        // nhóm câu (dữ kiện chung): tạo mã nhóm mới cho từng bài, giữ dữ kiện ở câu đầu nhóm được chọn
        var info = {}, remap = {}, seen = {};
        pool.forEach(function (q) { var k = q.__k + '#' + q.gid; if (q.gid && q.ginfo && !info[k]) info[k] = q.ginfo; });
        chosen.forEach(function (q) {
            if (!q.gid) return;
            var k = q.__k + '#' + q.gid; if (!remap[k]) remap[k] = rid();
            var first = !seen[k]; seen[k] = 1; q.gid = remap[k];
            if (first && info[k]) q.ginfo = info[k]; else delete q.ginfo;
        });
        chosen.forEach(function (q) { delete q.__k; delete q.__i; delete q.__c; delete q.__l; });
        return { list: chosen, sl: sl, lack: lack, stat: stat };
    }
    function titleName(sl) {
        if (sl.length === 1) return sl[0].it.n;
        var ch = sl[0].chap;
        if (ch.n && sl.every(function (x) { return x.chap === ch; })) return ch.n;
        return sl[0].it.n + '_va_' + (sl.length - 1) + '_bai_khac';
    }

    /* ===================== Xuất file ===================== */
    function download(blob, name) {
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2500);
    }
    async function ensureZip() {
        if (typeof JSZip !== 'undefined') return;
        if (window.__code98LoadLib) { try { await window.__code98LoadLib('JSZip', ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js']); } catch (e) {} }
        if (typeof JSZip === 'undefined') throw new Error('Không tải được thư viện tạo file Word (JSZip). Hãy kiểm tra Internet rồi tải lại trang.');
    }
    async function doExport() {
        if (S.busy) return;
        var pk = pick(); if (!pk) return;
        var opt = { exam: chk('xw-o-exam'), ans: chk('xw-o-ans'), key: chk('xw-o-key'), code: val('xw-code').replace(/\D/g, '').slice(0, 4) };
        if (!opt.exam && !opt.ans && !opt.key) { note('Chưa chọn tệp xuất', 'Hãy tích chọn ít nhất một loại: Đề thi / Đề có đáp án / Bảng đáp án.'); return; }
        var M = window.CODE93Mix;
        if (!M || !M.bankWord) { note('Chưa sẵn sàng', 'Chưa nạp được bộ xuất Word. Hãy tải lại trang rồi thử lại.'); return; }
        var info = readInfo(); saveInfo();
        var tn = titleName(pk.sl);
        var base = 'De_' + safe(info.subject || S.sj, 'de_thi') + '_lop_' + safe(info.grade || String(S.g), '') + '_' + safe(tn, 'ngan_hang');
        opt.base = base.replace(/_+/g, '_').replace(/_$/, '');
        var btn = $('xw-do'); if (btn) btn.disabled = true;
        S.busy = true; progress('Đang chuẩn bị…');
        try {
            await ensureZip();
            var files = await M.bankWord(pk.list, info, opt, progress);
            var lackTxt = (pk.lack.length ? '\nLưu ý – không đủ câu: ' + pk.lack.join('; ') + '.' : '') + (pk.stat ? '\n' + pk.stat : ''), name;
            if (files.length === 1) {
                name = files[0].name;
                download(new Blob([files[0].data], { type: DOCX }), name);
                S.busy = false; note('Đã xuất file Word', 'Đã tải về “' + name + '” (' + pk.list.length + ' câu).' + lackTxt, true);
            } else {
                progress('Đang nén thành 1 thư mục…');
                var root = 'Xuat_' + opt.base, zip = new JSZip();
                files.forEach(function (f) { zip.file(root + '/' + f.dir + '/' + f.name, f.data); });
                var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
                download(blob, root + '.zip');
                S.busy = false; note('Đã xuất file Word', 'Đã tải về “' + root + '.zip” (' + pk.list.length + ' câu). Giải nén sẽ được thư mục “' + root + '” gồm ' + files.length + ' file Word.' + lackTxt, true);
            }
        } catch (err) {
            console.error('[CODE162] export', err);
            S.busy = false; note('Lỗi xuất file', String(err && err.message ? err.message : err));
        } finally { S.busy = false; if (btn) btn.disabled = false; }
    }

    /* ===================== Sự kiện ===================== */
    document.addEventListener('click', function (e) {   // nút "Xuất file word" trong NGÂN HÀNG ĐỀ (chỉ giáo viên)
        var t = e.target; if (!t || !t.closest) return;
        var b = t.closest('[data-xwr],[data-xw],[data-xwc]'); if (!b) return;
        var bm = $('bank-modal'); if (!bm || !bm.contains(b)) return;
        e.preventDefault(); e.stopPropagation();
        if (document.body.classList.contains('is-student')) return;
        var B = bank(), p = B && B.path ? B.path() : [];
        if (p.length < 2) return;
        if (b.hasAttribute('data-xwr')) { open(p[0], p[1], 'root', ''); return; }   // nút ở thư mục chính (môn học)
        var chap = b.hasAttribute('data-xwc');
        open(p[0], p[1], chap ? 'chap' : 'les', b.getAttribute(chap ? 'data-xwc' : 'data-xw'));
    }, true);
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var m = $('xw-modal'); if (!m || m.classList.contains('xw-off')) return;
        var o = $('xw-ov'); if (o && o.classList.contains('show')) { if (!S.busy) closeNote(); } else close();
    });

    window.CODE162 = { open: open, close: close, closeNote: closeNote, onInfo: onInfo, renderTree: renderTree,
        toggleAll: toggleAll, expandAll: expandAll, updateSummary: updateSummary, doExport: doExport };
})();
