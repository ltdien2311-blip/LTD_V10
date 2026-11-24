// === [classnet-module] ===
/* [CODE67] Lớp học qua ĐỒNG BỘ (Firebase): giáo viên bật đồng bộ ngay trong Quản lí lớp học -> lớp tự lên máy chủ -> học sinh thấy lớp trên điện thoại */
    (function () {
        'use strict';
        var API = function () { return window.CloudSync && window.CloudSync.api; };
        var E = function (x) { return _escHtml(x); };
        var state = { classes: [], joins: {}, view: 'mine', msg: '', loading: false, q: '', pending: {}, pendTotal: 0, polledOnce: false,
                      pub: { st: 'idle', ts: 0, msg: '', n: 0 }, lastPoll: 0, connMsg: '' };
        var LS_MY = 'matrix_my_classes_v1', LS_PUB = 'matrix_classnet_pub_v3';
        var LS_LEFT = 'matrix_classnet_left_v1', LS_CTX = 'matrix_active_assign_v1', LS_CACHE = 'matrix_classnet_mycache_v1';   // [CODE78]
        function ls(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
        function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
        function sKey() { var i = getStudentIdentity(); return cmNormLoose(i.name) + '_' + cmNormClass(i.cls); }
        function myMap() { return ls(LS_MY, {}); }
        function fmtT(ts) { if (!ts) return '—'; var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); }; return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); }
        function toast(t) {
            var d = document.createElement('div');
            d.textContent = t;
            d.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100001;background:#0f766e;color:#fff;padding:12px 22px;border-radius:12px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:92vw;text-align:center';
            document.body.appendChild(d);
            setTimeout(function () { d.remove(); }, 4500);
        }
        function copyText(t) {
            try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t); return; } } catch (e) {}
            var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(a); a.select();
            try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(a);
        }
        function teacherName() { try { return (document.getElementById('main-fullname-input').value || '').trim(); } catch (e) { return ''; } }
        var _rkCache = {};   /* [CODE80] ghi nhớ mã băm để không tính lại mỗi 10 giây */
        function rosterKey(name) { var n = cmNormLoose(name); var v = _rkCache[n]; if (v === undefined) { v = _rkCache[n] = API().hash(n); } return v; }

        /* ================= GIÁO VIÊN ================= */
        function classLink() {
            var base = (typeof getEffectiveBaseUrl === 'function') ? getEffectiveBaseUrl() : location.href.split('#')[0].split('?')[0];
            var suf = (window.CloudSync && CloudSync.linkSuffix && CloudSync.linkSuffix()) || '';
            return suf ? base + '?mode=hs' + suf : '';
        }
        /* [CODE81] Môn học, khối lớp và đường dẫn thư mục của đề (theo Thư viện giáo viên) để học sinh biết mình đang học môn nào, khối mấy */
        function topicMeta(tid) {
            var o = { sj: '', g: '', fp: '' };
            try {
                var t = savedTopics.filter(function (z) { return z && z.id === tid; })[0]; if (!t) return o;
                o.sj = t.subject || ''; o.g = t.grade || '';
                var names = [], fid = t.folderId, guard = 0;
                while (fid && guard++ < 30) {
                    var f = getFolderById(fid); if (!f) break;
                    names.unshift(f.name); if (!o.sj && f.subject) o.sj = f.subject;
                    fid = (f.parentId && f.parentId !== '__subjmeta') ? f.parentId : null;
                }
                o.fp = names.join(' › ');
            } catch (e) {}
            return o;
        }
        function buildPayload() {
            var out = {}, a = API(), tn = teacherName();
            classesData.forEach(function (c) {
                if (!c || !c.id) return;
                out[a.enc(c.id)] = {
                    id: c.id, name: c.name, grade: c.grade || '', sj: c.subject || '', year: c.year || '', note: c.note || '', teacher: c.teacher || tn,
                    n: (c.students || []).length,
                    rk: (c.students || []).map(function (s) { return rosterKey(s.name); }),
                    as: (c.assignments || []).map(function (x) {
                        var o = { t: x.topicId, n: cmTopicTitle(x), d: x.dueAt || null, s: x.startAt || null, m: x.note || '', at: x.assignedAt || 0 }, mt = topicMeta(x.topicId);
                        if (mt.sj) o.sj = mt.sj; if (mt.g) o.g = mt.g; if (mt.fp) o.fp = mt.fp;   /* [CODE81] môn / khối / thư mục như bên Thư viện */
                        return o;
                    })
                };
                (c.assignments || []).forEach(function (x) {
                    if (window.CloudSync._state && window.CloudSync._state.forcePub && x.topicId) window.CloudSync._state.forcePub.add(x.topicId);
                });
            });
            return out;
        }
        /* Đẩy danh sách lớp lên máy chủ (nhánh s/classes mà học sinh đọc được) */
        function publishClasses(force) {
            var a = API();
            if (!a || isStudentMode) return Promise.resolve(false);
            if (!a.teacherReady()) { if (state.pub.st !== 'off') { state.pub = { st: 'off', ts: 0, msg: '', n: 0 }; paintBanner(); } return Promise.resolve(false); }
            var out = buildPayload(), n = Object.keys(out).length, h = a.hash(JSON.stringify(out)), tok = a.token(), last = ls(LS_PUB, {});
            /* [CODE74-CRITICAL] Danh sách lớp local rỗng KHÔNG đồng nghĩa giáo viên muốn xóa hết lớp.
               Bản cũ vẫn gửi PATCH null cho mọi ID trong LS_PUB khi n=0 và last.h còn tồn tại,
               có thể xóa sạch danh sách lớp trên Firebase/GitHub chỉ vì một máy đang thiếu localStorage.
               Chỉ xóa dữ liệu máy chủ qua thao tác xóa chủ động; tuyệt đối không xóa trong lần tự đồng bộ rỗng. */
            if (!n) {
                if (state.pub.st !== 'empty') { state.pub = { st: 'empty', ts: Date.now(), msg: '', n: 0 }; paintBanner(); }
                return Promise.resolve(true);
            }
            /* Không tin trạng thái local vô thời hạn: định kỳ xác nhận lại bằng cách đẩy lớp lên máy chủ,
               phòng trường hợp dữ liệu bị xóa/khôi phục trên Firebase hoặc lần đồng bộ trước bị gián đoạn. */
            if (!force && last.h === h && last.tok === tok && last.ts && (Date.now() - last.ts) < 30000) {
                if (state.pub.st !== 'ok' && state.pub.st !== 'sending') state.pub = { st: 'ok', ts: last.ts, msg: '', n: n };
                return Promise.resolve(true);
            }
            if (state.pub.st === 'sending' && state.pub.h === h) return Promise.resolve(false);
            state.pub = { st: 'sending', ts: 0, msg: '', n: n, h: h }; paintBanner();
            /* [CODE73] Đồng bộ an toàn đa thiết bị:
               - PATCH từng lớp, không ghi đè toàn bộ danh sách lớp trên máy chủ.
               - Chỉ xóa lớp cũ nếu dấu vết xuất bản thuộc ĐÚNG mã kết nối (tok) hiện tại.
               - Khi đổi Firebase/mã kết nối, tuyệt đối không dùng danh sách ID cũ để xóa dữ liệu của kho mới.
               - Nếu danh sách rỗng, không tự động xóa dữ liệu trên máy chủ; việc xóa lớp phải do giáo viên chủ động. */
            var ids = Object.keys(out), body = {};
            ids.forEach(function (k) { body[k] = out[k]; });
            if (last.tok && last.tok === tok) {
                (last.ids || []).forEach(function (k) { if (!out[k]) body[k] = null; });
            }
            if (!Object.keys(body).length) {
                lsSet(LS_PUB, { h: '', tok: tok, ts: Date.now(), ids: [] });
                state.pub = { st: 'empty', ts: Date.now(), msg: '', n: 0 };
                paintBanner();
                return Promise.resolve(true);
            }
            return a.req('PATCH', 's', 'classes', body).then(function () {
                lsSet(LS_PUB, { h: n ? h : '', tok: tok, ts: Date.now(), ids: ids });
                state.pub = { st: 'ok', ts: Date.now(), msg: '', n: n };
                paintBanner();
                try { window.CloudSync.schedule(true); } catch (e) {}   /* đẩy luôn các đề đã giao để học sinh mở được */
                return true;
            }).catch(function (e) {
                state.pub = { st: 'err', ts: 0, msg: (e && e.message) || 'Lỗi không xác định', n: n };
                paintBanner();
                return false;
            });
        }
        function publishNow() {
            var a = API(); if (!a || !a.teacherReady()) { openSync(); return; }
            toast('⏳ Đang đẩy lớp học lên máy chủ...');
            publishClasses(true).then(function (ok) { toast(ok ? '✅ Đã đưa ' + state.pub.n + ' lớp lên máy chủ. Học sinh bấm LỚP HỌC để thấy (danh sách tự cập nhật).' : '⚠️ Chưa đẩy được: ' + (state.pub.msg || 'kiểm tra mạng / Rules Firebase')); pollJoins(); });
        }
        function openSync() { try { CloudSync.openUI(); } catch (e) {} }
        function copyTeacherLink() {
            var a = API(), code = a && a.fullCode ? a.fullCode() : '';
            if (!code) { openSync(); return; }
            var base = (typeof getEffectiveBaseUrl === 'function') ? getEffectiveBaseUrl() : location.href.split('#')[0].split('?')[0];
            copyText(base + '?ct=' + code);
            toast('🔑 Đã sao chép LINK GIÁO VIÊN. Mở link này trên trang GitHub/máy khác 1 lần để đồng bộ lớp học. Đừng gửi cho học sinh!');
        }
        function copyLink() {
            var l = classLink();
            if (!l) { openSync(); return; }
            copyText(l); toast('📋 Đã sao chép link vào lớp. Gửi cho học sinh (Zalo, Messenger...).');
        }
        function showQr() {
            var l = classLink(); if (!l) { openSync(); return; }
            var old = document.getElementById('cn-qr'); if (old) old.remove();
            var el = document.createElement('div'); el.id = 'cn-qr';
            el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100000;display:flex;align-items:center;justify-content:center;padding:14px';
            var cv = document.createElement('canvas'), url = null;
            try { url = drawQrToCanvasElement(cv, l); } catch (e) {}
            el.innerHTML = '<div style="background:#fff;border-radius:20px;padding:20px;max-width:420px;width:100%;text-align:center;font-family:Roboto,Arial,sans-serif"><div style="font-weight:900;font-size:19px;color:#0f766e;margin-bottom:8px">📱 QR cho học sinh vào LỚP HỌC</div>' +
                (url ? '<img src="' + url + '" style="width:100%;max-width:340px;margin:0 auto;image-rendering:pixelated" alt="QR">' : '<div style="color:#b91c1c;font-weight:800">Không tạo được QR. Hãy dùng nút sao chép link.</div>') +
                '<div style="font-size:13px;font-weight:700;color:#475569;margin:8px 0">Học sinh quét QR → chọn “Tôi là HS” → đăng nhập → bấm <b>LỚP HỌC</b>.</div>' +
                '<button type="button" onclick="document.getElementById(\'cn-qr\').remove()" style="padding:9px 28px;border-radius:12px;background:#e2e8f0;font-weight:900">Đóng</button></div>';
            document.body.appendChild(el);
        }
        function pollJoins() {
            var a = API(); if (!a || !a.teacherReady() || isStudentMode) return Promise.resolve();
            state.lastPoll = Date.now();
            return a.req('GET', 's', 'joins').then(function (j) {
                state.joins = j || {};
                var jsig = ''; try { jsig = JSON.stringify(state.joins); } catch (e) {}
                var joinsChanged = jsig !== state.joinSig; state.joinSig = jsig;   /* [CODE81] chỉ vẽ lại khi có thay đổi */
                var pend = {}, total = 0, prev = state.pendTotal || 0;
                classesData.forEach(function (c) {
                    var m = state.joins[a.enc(c.id)] || {}, n = 0;
                    Object.keys(m).forEach(function (k) { if (m[k] && m[k].status === 'pending') n++; });
                    pend[c.id] = n; total += n;
                });
                processLeft();   /* [CODE79] học sinh bấm RỜI LỚP -> tự xóa khỏi danh sách lớp của giáo viên */
                state.pending = pend; state.pendTotal = total;
                updateBadge();
                if (total > prev && state.polledOnce) toast('🔔 Có ' + (total - prev) + ' học sinh mới xin vào lớp!');
                state.polledOnce = true;
                if (joinsChanged || state.forceRefresh) { state.forceRefresh = false; refreshOpen(); }
            }).catch(function () {});
        }
        /* [CODE79] Học sinh rời lớp -> xóa khỏi danh sách lớp của giáo viên (một lần cho mỗi lần rời) */
        function processLeft() {
            var a = API(); if (!a || isStudentMode) return;
            var changed = false, names = [];
            classesData.forEach(function (c) {
                if (!c || !c.id) return;
                var m = state.joins[a.enc(c.id)] || {};
                Object.keys(m).forEach(function (k) {
                    var r = m[k]; if (!r || r.status !== 'left' || r.ok) return;
                    var nn = cmNormLoose(r.name || '');
                    var idx = (c.students || []).findIndex(function (s) { return cmNormLoose(s.name) === nn; });
                    if (idx >= 0) {
                        var st = c.students[idx]; c.students.splice(idx, 1); cmTombStudent(c, st);
                        changed = true; names.push(st.name + ' (' + c.name + ')');
                    }
                    r.ok = 1;
                    a.req('PATCH', 's', 'joins/' + a.enc(c.id) + '/' + a.enc(k), { ok: 1 }).catch(function () {});
                });
            });
            if (changed) {
                cmSave(); state.forceRefresh = true;
                toast('🚪 ' + names.join(', ') + ' đã rời lớp — đã xóa khỏi danh sách lớp.');
                publishClasses(true);
            }
        }
        /* [CODE79] Giáo viên xóa học sinh: đánh dấu bản ghi xin vào lớp là "removed" + đẩy danh sách mới lên máy chủ ngay */
        function studentRemoved(cid, name) {
            var a = API(); if (!a || isStudentMode || !a.teacherReady()) return;
            publishClasses(true);
            var nn = cmNormLoose(name);
            a.req('GET', 's', 'joins/' + a.enc(cid)).then(function (m) {
                m = m || {};
                Object.keys(m).forEach(function (k) {
                    var r = m[k]; if (!r || r.status !== 'approved' || cmNormLoose(r.name || '') !== nn) return;
                    a.req('PATCH', 's', 'joins/' + a.enc(cid) + '/' + a.enc(k), { status: 'removed', rts: Date.now() }).catch(function () {});
                });
            }).then(function () { pollJoins(); }).catch(function () {});
        }
        /* [CODE79] Xóa lớp: gỡ hẳn khỏi máy chủ (kể cả khi đó là lớp cuối cùng) */
        function classDeleted(id) {
            var a = API(); if (!a || isStudentMode || !a.teacherReady()) return Promise.resolve(false);
            var body = {}; body[a.enc(id)] = null;
            return a.req('PATCH', 's', 'classes', body).then(function () {
                var last = ls(LS_PUB, {});
                if (last && Array.isArray(last.ids)) { last.ids = last.ids.filter(function (k) { return k !== a.enc(id); }); last.h = ''; lsSet(LS_PUB, last); }
                return true;
            }).catch(function () { return false; });
        }
        function updateBadge() {
            var b = document.getElementById('btn-class-manager'); if (!b) return;
            var old = b.querySelector('.cn-badge'); if (old) old.remove();
            if (state.pendTotal > 0) {
                var sp = document.createElement('span'); sp.className = 'cn-badge';
                sp.style.cssText = 'margin-left:8px;background:#ef4444;color:#fff;border-radius:999px;padding:1px 9px;font-size:14px';
                sp.textContent = state.pendTotal; b.appendChild(sp);
            }
        }
        function refreshOpen() {
            var m = document.getElementById('class-modal');
            if (m && !m.classList.contains('hidden') && typeof cmRender === 'function') {
                var active = document.activeElement;
                if (active && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) return;
                cmRender();
            }
        }
        function paintBanner() { refreshOpen(); }
        function pendingCount(id) { return state.pending[id] || 0; }

        /* Khung ĐỒNG BỘ ở đầu danh sách lớp (giống mục ĐỒNG BỘ của Thư viện) + thông báo yêu cầu xin vào lớp */
        function syncPanelHtml() {
            var a = API();
            if (!a || !a.teacherReady()) {
                return '<div class="cm-card p-4 mb-4" style="border:2px solid #ef4444;background:#fef2f2"><div class="font-black text-red-700 text-lg">⚠️ Chưa bật ĐỒNG BỘ (Firebase)</div>' +
                    '<div class="font-bold text-red-600 mt-1" style="font-size:14px;line-height:1.5">Lớp học đang chỉ lưu trên máy này nên <u>học sinh sẽ KHÔNG thấy lớp</u> trên điện thoại. Hãy bật ĐỒNG BỘ giống mục Thư viện (dán “Mã kết nối MQT1” hoặc thiết lập Firebase mới), lớp sẽ tự đưa lên máy chủ.</div>' +
                    '<button type="button" onclick="CloudSync.openUI()" class="cm-btn bg-emerald-600 text-white mt-3" style="font-size:15px;padding:9px 20px">☁️ Bật ĐỒNG BỘ ngay</button></div>';
            }
            var fullWarn = '';
            if (!(a.teacherFull && a.teacherFull())) {
                fullWarn = '<div class="cm-card p-4 mb-4" style="border:2px solid #f59e0b;background:#fffbeb"><div class="font-black text-amber-800 text-lg">⚠️ Máy/trang này chưa có Mã giáo viên (MQT1)</div>' +
                    '<div class="font-bold text-amber-800 mt-1" style="font-size:14px;line-height:1.5">Học sinh vẫn thấy lớp, nhưng <u>danh sách học sinh và đề đã giao của lớp CHƯA đồng bộ</u> giữa máy tính và trang GitHub (mỗi nơi đang lưu riêng một bản). Hãy dán “Mã kết nối MQT1” (lấy ở máy đã có đủ dữ liệu: ☁️ ĐỒNG BỘ → sao chép mã) hoặc mở “Link giáo viên” trên trang này một lần.</div>' +
                    '<button type="button" onclick="CloudSync.openUI()" class="cm-btn bg-amber-600 text-white mt-3" style="font-size:15px;padding:9px 20px">🔑 Nhập mã MQT1 ngay</button></div>';
            }
            /* [CODE76] Đã bỏ khung ĐỒNG BỘ ở Quản lí lớp học (đồng bộ thực hiện ở Thư viện). Chỉ giữ cảnh báo khi có lỗi thật. */
            var p = state.pub;
            if (p.st === 'err') {
                return fullWarn + '<div class="cm-card p-4 mb-4" style="border:2px solid #ef4444;background:#fef2f2;color:#b91c1c"><div class="font-black" style="font-size:15px;line-height:1.5">⚠️ Chưa đưa được lớp lên máy chủ: ' + E(p.msg) + ' (kiểm tra mạng và ☁️ ĐỒNG BỘ ở Thư viện).</div>' +
                    '<button type="button" onclick="ClassNet.publishNow()" class="cm-btn bg-emerald-600 text-white mt-2">🔄 Thử đẩy lại</button></div>';
            }
            return fullWarn;
        }
        function bannerHtml() {
            var h = syncPanelHtml();
            var tot = state.pendTotal || 0;
            if (!tot) return h;
            var rows = classesData.filter(function (c) { return pendingCount(c.id) > 0; }).map(function (c) {
                return '<button type="button" onclick="cmOpenClass(\'' + c.id + '\');cmSetTab(\'requests\')" class="cm-btn bg-amber-500 text-white" style="margin:4px 6px 0 0">' + E(c.name) + ' (' + pendingCount(c.id) + ')</button>';
            }).join('');
            return h + '<div class="cm-card p-4 mb-4" style="border:2px solid #f59e0b;background:#fffbeb"><div class="font-black text-amber-800">🔔 Có ' + tot + ' yêu cầu xin vào lớp đang chờ phê duyệt</div>' + rows + '</div>';
        }
        function approve(cid, k, ok) {
            var a = API(); var cls = cmGetClass(cid); if (!a || !cls) return;
            var rec = (state.joins[a.enc(cid)] || {})[k]; if (!rec) return;
            if (ok && !cls.students.some(function (s) { return cmNormLoose(s.name) === cmNormLoose(rec.name); })) {
                cls.students.push({ id: cmUid('st'), addedAt: Date.now(), name: rec.name, note: 'Tham gia qua mã lớp' }); cmSave();
            }
            rec.status = ok ? 'approved' : 'rejected';
            /* [CODE79] Đẩy danh sách lớp (đã có học sinh mới) lên TRƯỚC, rồi mới ghi trạng thái "đã duyệt" -> máy học sinh không bị nháy mất lớp */
            (ok ? publishClasses(true) : Promise.resolve(true)).catch(function () {}).then(function () {
                return a.req('PUT', 's', 'joins/' + a.enc(cid) + '/' + a.enc(k), rec);
            }).then(function () {
                pollJoins(); cmRender();
            }).catch(function (e) { showModal('Lỗi', e.message, 'error'); });
            cmRender();
        }
        window.cmRequestsHtml = function (cls) {
            var a = API();
            if (!a || !a.teacherReady()) return '<div class="cm-card p-8 text-center font-bold text-slate-500">Hãy bật ĐỒNG BỘ (đám mây) để nhận yêu cầu xin vào lớp từ học sinh.<div style="margin-top:12px"><button type="button" onclick="CloudSync.openUI()" class="cm-btn bg-emerald-600 text-white" style="font-size:15px;padding:9px 20px">☁️ Bật ĐỒNG BỘ ngay</button></div></div>';
            var m = state.joins[a.enc(cls.id)] || {};
            var list = Object.keys(m).map(function (k) { return { k: k, r: m[k] }; }).filter(function (x) { return x.r; });
            list.sort(function (x, y) { return (y.r.ts || 0) - (x.r.ts || 0); });
            var pend = list.filter(function (x) { return x.r.status === 'pending'; });
            var done = list.filter(function (x) { return x.r.status !== 'pending'; });
            var h = '<div class="flex justify-between items-center mb-3"><div class="font-black text-slate-700">Yêu cầu chờ duyệt (' + pend.length + ')</div><button type="button" class="cm-btn bg-slate-200" onclick="ClassNet.refreshT()">↻ Làm mới</button></div>';
            h += pend.length ? pend.map(function (x) {
                return '<div class="cm-card p-3 mb-2 flex items-center justify-between gap-3"><div><b>' + E(x.r.name) + '</b> <span class="text-slate-500 font-bold">· Lớp ' + E(x.r.cls) + '</span><div class="text-xs text-slate-400">' + E(cmFmtDate(x.r.ts)) + '</div></div><div>' +
                    '<button type="button" class="cm-btn bg-green-600 text-white" onclick="ClassNet.approve(\'' + cls.id + '\',\'' + E(x.k) + '\',true)">✓ Duyệt</button> ' +
                    '<button type="button" class="cm-btn bg-red-100 text-red-700" onclick="ClassNet.approve(\'' + cls.id + '\',\'' + E(x.k) + '\',false)">✕ Từ chối</button></div></div>';
            }).join('') : '<div class="cm-card p-6 text-center font-bold text-slate-400">Không có yêu cầu nào đang chờ.</div>';
            if (done.length) h += '<div class="font-black text-slate-600 mt-5 mb-2">Đã xử lý</div>' + done.map(function (x) {
                return '<div class="cm-card p-2 mb-1 text-sm font-bold">' + E(x.r.name) + ' · ' + E(x.r.cls) + ' — ' + (x.r.status === 'approved' ? '<span class="text-green-700">Đã duyệt</span>' : (x.r.status === 'left' ? '<span class="text-slate-500">Đã rời lớp</span>' : (x.r.status === 'removed' ? '<span class="text-slate-500">Đã bị xóa khỏi lớp</span>' : '<span class="text-red-600">Đã từ chối</span>'))) + '</div>';
            }).join('');
            return h;
        };

        /* ================= HỌC SINH ================= */
        /* [CODE79] Tên học sinh có trong danh sách lớp giáo viên đã đưa lên máy chủ (không xét tên lớp) */
        function rosterHas(cl) {
            var a = API(), i = getStudentIdentity();
            return !!(a && i.name && Array.isArray(cl.rk) && cl.rk.indexOf(rosterKey(i.name)) >= 0);
        }
        function rosterMatch(cl) {
            var a = API(), i = getStudentIdentity();
            if (!a || !i.name || !Array.isArray(cl.rk)) return false;
            if (cl.rk.indexOf(rosterKey(i.name)) < 0) return false;
            return !i.cls || cmClassEq(i.cls, cl.name);   /* [CODE78] so khớp tên lớp linh hoạt */
        }
        function statusOf(cl) { var my = myMap(); return my[cl.id]; }
        function loadClasses(silent) {
            var a = API();
            if (!a || !a.effStu()) { state.msg = ''; state.noConn = true; state.loading = false; render(); return Promise.resolve(); }
            state.noConn = false; state.lastLoad = Date.now();   /* [CODE79] */
            if (!silent) { state.loading = true; render(); }
            /* [CODE73] Một số điện thoại/mạng di động trả dữ liệu lỗi thời hoặc lỗi tạm thời:
               thử tải lại tối đa 3 lần, dùng query chống cache; chỉ báo lỗi sau khi đã thử lại. */
            function fetchClassList(attempt) {
                return a.req('GET', 's', 'classes?cb=' + Date.now()).catch(function (err) {
                    if (attempt < 2) return new Promise(function (resolve) {
                        setTimeout(resolve, 350 * (attempt + 1));
                    }).then(function () { return fetchClassList(attempt + 1); });
                    throw err;
                });
            }
            return fetchClassList(0).then(function (c) {
                var raw = Object.keys(c || {}).map(function (k) { return c[k]; }).filter(function (x) { return x && x.id; });
                raw.forEach(function (cl) { if (!Array.isArray(cl.as)) cl.as = cl.as ? Object.keys(cl.as).map(function (k) { return cl.as[k]; }) : []; if (!Array.isArray(cl.rk)) cl.rk = cl.rk ? Object.keys(cl.rk).map(function (k) { return cl.rk[k]; }) : []; });
                /* [CODE72] Cùng một lớp được đưa lên từ nhiều máy (khác mã) -> gộp thành 1 lớp: hợp nhất danh sách học sinh và đề giao */
                var groups = {}, order = [];
                raw.sort(function (x, y) { return String(x.id) < String(y.id) ? -1 : 1; }).forEach(function (cl) {
                    var gk = cmNormLoose(cl.name);
                    var gr = groups[gk];
                    if (!gr) { gr = groups[gk] = Object.assign({}, cl, { ids: [cl.id], rk: cl.rk.slice(), as: cl.as.slice() }); order.push(gk); return; }
                    gr.ids.push(cl.id);
                    cl.rk.forEach(function (x) { if (gr.rk.indexOf(x) < 0) gr.rk.push(x); });
                    cl.as.forEach(function (x) {
                        var j = gr.as.findIndex(function (y) { return y && x && y.t === x.t; });
                        if (j < 0) gr.as.push(x); else if ((x.at || 0) > (gr.as[j].at || 0)) gr.as[j] = x;
                    });
                    gr.n = Math.max(gr.n || 0, cl.n || 0);
                });
                state.classes = order.map(function (gk) { return groups[gk]; });
                var k = sKey(), my = myMap(), left = ls(LS_LEFT, {}), idOk = !!(getStudentIdentity().name), removedNames = [], prevCache = ls(LS_CACHE, []);   /* [CODE79] */
                return Promise.all(state.classes.map(function (cl) {
                    var wasLeft = (cl.ids || [cl.id]).some(function (i) { return left[i]; });   /* [CODE78] lớp đã chủ động rời -> không tự vào lại */
                    if (!idOk) return null;   /* [CODE79] chưa đăng nhập học sinh: giữ nguyên, không đổi trạng thái lớp */
                    if (wasLeft) { delete my[cl.id]; return null; }
                    if (rosterMatch(cl)) { my[cl.id] = 'approved'; return null; }   /* [CODE80] đã có tên trong danh sách lớp: không cần hỏi bản ghi xin vào lớp */
                    return Promise.all(cl.ids.map(function (cid) {
                        return a.req('GET', 's', 'joins/' + a.enc(cid) + '/' + a.enc(k)).then(function (r) { return r && r.status || ''; }, function () { return ''; });
                    })).then(function (sts) {
                        var best = sts.indexOf('approved') >= 0 ? 'approved' : (sts.indexOf('pending') >= 0 ? 'pending' : (sts.indexOf('rejected') >= 0 ? 'rejected' : ''));
                        if (best === 'approved') {
                            /* [CODE79] Bản ghi "đã duyệt" chỉ có giá trị khi học sinh CÒN trong danh sách lớp của giáo viên. */
                            if (rosterHas(cl)) my[cl.id] = 'approved';
                            else { if (my[cl.id] === 'approved') removedNames.push(cl.name); delete my[cl.id]; }
                        }
                        else if (best) my[cl.id] = best;
                        else if (my[cl.id]) { if (my[cl.id] === 'approved') removedNames.push(cl.name); delete my[cl.id]; }
                    });
                })).then(function () {
                    Object.keys(my).forEach(function (id) {
                        if (state.classes.some(function (c) { return c.id === id; })) return;
                        if (idOk && my[id] === 'approved') {   /* [CODE79] lớp đã bị giáo viên xóa khỏi máy chủ */
                            var pc = prevCache.filter(function (z) { return z.id === id; })[0];
                            if (pc && !state.classes.some(function (c) { return my[c.id] === 'approved' && cmNormLoose(c.name) === cmNormLoose(pc.name); })) removedNames.push(pc.name);
                        }
                        delete my[id];
                    });
                    lsSet(LS_MY, my);
                    try {   /* [CODE79] bỏ ngữ cảnh lớp nếu học sinh không còn trong lớp đó */
                        var cx = ls(LS_CTX, null);
                        if (cx && cx.ids && !state.classes.some(function (c) { return my[c.id] === 'approved' && (c.ids || [c.id]).some(function (j) { return cx.ids.indexOf(j) >= 0; }); })) localStorage.removeItem(LS_CTX);
                    } catch (e) {}
                    if (removedNames.length) toast('⚠️ Giáo viên đã xóa em khỏi lớp: ' + removedNames.filter(function (v, i, ar) { return ar.indexOf(v) === i; }).join(', ') + '.');
                    try {   /* [CODE78] nhớ lớp + đề được giao để gắn lớp vào kết quả kể cả khi làm bài từ Thư viện */
                        lsSet(LS_CACHE, state.classes.filter(function (c) { return my[c.id] === 'approved'; }).map(function (c) {
                            return { id: c.id, ids: c.ids || [c.id], name: c.name, t: (c.as || []).map(function (x) { return x && x.t; }).filter(Boolean) };
                        }));
                    } catch (e) {}
                });
            }).then(function () { state.msg = ''; }, function (e) {
                state.msg = (e && e.message) || 'Không tải được danh sách lớp.';
                /* Không xóa state.classes khi mạng lỗi: giữ danh sách đã tải trước đó để người học thử lại. */
            }).then(function () {
                state.loading = false;
                /* [CODE81] làm mới ngầm: chỉ vẽ lại khi danh sách lớp / trạng thái thay đổi (không giật, giữ vị trí cuộn) */
                var sig = ''; try { sig = JSON.stringify([state.classes, myMap(), state.msg, state.noConn, state.view]); } catch (e) {}
                if (silent && sig && sig === state.renderSig) return;
                state.renderSig = sig; render();
            });
        }
        function join(cid) {
            var a = API(), id = getStudentIdentity();
            if (!id.name || !id.cls) { showModal('Thiếu thông tin', 'Hãy nhập Họ tên và Lớp ở trang chủ trước khi xin vào lớp.', 'error'); return; }
            var k = sKey();
            var grp = state.classes.filter(function (c) { return c.id === cid; })[0], targets = (grp && grp.ids) || [cid];
            var lf = ls(LS_LEFT, {}); targets.forEach(function (t) { delete lf[t]; }); delete lf[cid]; lsSet(LS_LEFT, lf);   /* [CODE78] */
            Promise.all(targets.map(function (t) {
                return a.req('PUT', 's', 'joins/' + a.enc(t) + '/' + a.enc(k), { k: k, name: id.name, cls: id.cls, ts: Date.now(), status: 'pending' });
            })).then(function () {
                var my = myMap(); my[cid] = 'pending'; lsSet(LS_MY, my);
                toast('Đã gửi yêu cầu. Chờ giáo viên phê duyệt.'); state.view = 'mine'; render();
            }).catch(function (e) { showModal('Lỗi', e.message, 'error'); });
        }
        function startTopic(id) { window.closeStudentClasses(); loadTopic(id); }
        function open(id, start, cid) {
            if (start && Date.now() < start) { showModal('Chưa đến giờ làm bài', 'Bài này sẽ mở lúc ' + cmFmtDate(start) + '. Em quay lại đúng giờ nhé!', 'info'); return; }
            try {   /* [CODE78] ghi nhớ lớp của bài đang làm để kết quả được gắn đúng lớp */
                var g0 = state.classes.filter(function (c) { return c.id === cid; })[0];
                if (g0) lsSet(LS_CTX, { t: id, ids: g0.ids || [g0.id], name: g0.name, ts: Date.now() });
            } catch (e) {}
            var a = API();
            if (!id || typeof loadTopic !== 'function') return;
            if (savedTopics.some(function (t) { return t.id === id; })) { startTopic(id); return; }
            toast('⏳ Đang tải đề từ máy chủ...');
            a.req('GET', 's', 'pub/' + a.enc(id)).then(function (env) {
                var o = null; try { o = env && typeof env.d === 'string' ? JSON.parse(env.d) : null; } catch (e) {}
                if (!o || !o.id) throw new Error('Đề này giáo viên chưa đưa lên máy chủ. Nhờ giáo viên bật ĐỒNG BỘ rồi bấm “Đẩy lớp lên máy chủ ngay”.');
                if (!savedTopics.some(function (t) { return t.id === o.id; })) savedTopics.push(o);
                try { saveToStorage(); } catch (e) {}
                startTopic(o.id);
            }).catch(function (e) { showModal('Chưa tải được đề', (e && e.message) || 'Hãy thử lại.', 'error'); });
        }
        /* [CODE78] Ngữ cảnh lớp của bài đang làm -> gắn vào kết quả */
        function ctxFor(topicId) {
            var c = ls(LS_CTX, null);
            if (c && c.t === topicId && c.ids && (Date.now() - (c.ts || 0)) < 12 * 3600 * 1000) return { classIds: c.ids, className: c.name };
            var cache = ls(LS_CACHE, []), left = ls(LS_LEFT, {});
            for (var i = 0; i < cache.length; i++) {
                var x = cache[i];
                if ((x.t || []).indexOf(topicId) >= 0 && !(x.ids || [x.id]).some(function (j) { return left[j]; })) return { classIds: x.ids || [x.id], className: x.name };
            }
            return null;
        }
        function attemptInfo(tid) {
            var n = 0, best = null;
            try { var L = myAttemptResults(tid); n = L.length; L.forEach(function (r) { var s = _mrScore(r); if (best === null || s > best) best = s; }); } catch (e) {}
            return { n: n, best: best };
        }
        var SUBJ_LABEL = { 'GDKT&PL': 'Giáo dục kinh tế và pháp luật', 'GDCD': 'Giáo dục công dân' };
        function subjOf(x) {   /* môn học của bài giao (ưu tiên dữ liệu giáo viên, dự phòng đề đã tải trên máy) */
            var v = x.sj || '';
            if (!v) { try { var t = savedTopics.filter(function (z) { return z && z.id === x.t; })[0]; if (t) v = t.subject || ''; } catch (e) {} }
            return v;
        }
        function gradeOf(x) {
            var v = x.g || '';
            if (!v) { try { var t = savedTopics.filter(function (z) { return z && z.id === x.t; })[0]; if (t) v = t.grade || ''; } catch (e) {} }
            return v;
        }
        function metaChips(x) {
            var g = gradeOf(x), out = '';
            if (g) out += '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 mr-1.5">🎓 ' + E(/^\d+$/.test(String(g)) ? 'Lớp ' + g : g) + '</span>';
            if (x.fp) out += '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 mr-1.5">📁 ' + E(x.fp) + '</span>';
            return out ? '<div class="sc-meta mt-1">' + out + '</div>' : '';
        }
        /* gom các bài giao theo MÔN HỌC (giống Thư viện bên giáo viên) */
        function assignGroupsHtml(cl, as) {
            /* [CODE119] Gom theo MÔN HỌC rồi tới THƯ MỤC CON (đồng bộ từ Thư viện): tiêu đề "📚 MÔN › 📁 thư mục"; trên điện thoại bỏ số bài và các nhãn Lớp/thư mục trong từng bài để tiết kiệm chỗ */
            var groups = {}, order = [];
            as.forEach(function (x) {
                var k = subjOf(x), f = String(x.fp || '').trim(), key = k + '\u0001' + f;
                if (!groups[key]) { groups[key] = { k: k, f: f, items: [] }; order.push(key); }
                groups[key].items.push(x);
            });
            order.sort(function (a, b) {
                var A = groups[a], B = groups[b];
                if (!A.k && B.k) return 1; if (A.k && !B.k) return -1;
                return A.k.localeCompare(B.k, 'vi') || A.f.localeCompare(B.f, 'vi');
            });
            var first = groups[order[0]];
            var showHead = order.length > 1 || (order.length === 1 && (first.k || first.f));
            return order.map(function (key) {
                var g = groups[key];
                var head = showHead ? '<div class="sc-subj-head mt-3 mb-1 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-black uppercase" style="font-size:15px;line-height:1.35">\uD83D\uDCDA ' + E(g.k ? (SUBJ_LABEL[g.k] || g.k) : 'Bài khác') +
                    (g.f ? ' <span class="sc-fp-inline normal-case text-amber-800" style="font-size:.92em;overflow-wrap:anywhere">\u203A \uD83D\uDCC1 ' + E(g.f) + '</span>' : '') +
                    ' <span class="sc-cnt text-teal-600 normal-case">(' + g.items.length + ' bài)</span></div>' : '';
                return head + g.items.map(function (x) { return rowHtml(cl, x); }).join('');
            }).join('');
        }
        function rowHtml(cl, x) {
            var info = attemptInfo(x.t), notYet = x.s && Date.now() < x.s, did = info.n > 0;
            var st = did
                ? '<div class="text-xs font-black text-emerald-700 mt-0.5">✅ Đã làm ' + info.n + ' lần' + (info.best !== null ? ' • Điểm cao nhất: ' + E(_mrFmt(info.best)) + '/10' : '') + '</div>'
                : '<div class="text-xs font-black text-slate-400 mt-0.5">Chưa làm bài này</div>';
            var go = 'ClassNet.open(\'' + E(x.t) + '\',' + (x.s || 0) + ',\'' + E(cl.id) + '\')';
            return '<div class="sc-row border-t py-3"><div><b>' + E(x.n) + '</b>' + metaChips(x) +
                ((x.s || x.d) ? '<div class="sc-dates">' +
                    (x.s ? '<span class="text-xs text-sky-700 font-bold">Bắt đầu: ' + E(cmFmtDate(x.s)) + '</span>' : '') +
                    (x.d ? '<span class="text-xs text-red-600 font-bold">Hạn nộp: ' + E(cmFmtDate(x.d)) + '</span>' : '') + '</div>' : '') +
                (x.m ? '<div class="text-xs text-slate-500">' + E(x.m) + '</div>' : '') + st + '</div>' +
                '<div class="sc-acts flex flex-wrap gap-2 mt-2">' +
                '<button type="button" class="sc-act cm-btn bg-indigo-600 text-white" style="padding:8px 16px;border-radius:10px;font-weight:900" onclick="' + go + '">' + (notYet ? '🕒 Chưa đến giờ' : (did ? '🔁 Làm lại' : '▶ Làm bài')) + '</button>' +
                '<button type="button" class="sc-act cm-btn bg-white text-indigo-700 border-2 border-indigo-300" style="padding:8px 16px;border-radius:10px;font-weight:900' + (did ? '' : ';opacity:.75') + '" onclick="ClassNet.viewResult(\'' + E(x.t) + '\')">📋 Xem kết quả</button>' +
                '</div></div>';
        }
        function viewResult(tid) {
            var has = false;
            try { has = attemptInfo(tid).n > 0 || hasAttemptFor(tid); } catch (e) {}
            if (!has) { showModal('Chưa có kết quả', 'Em chưa làm bài này trên thiết bị này nên chưa có kết quả để xem.\nHãy bấm “Làm bài” trước nhé!', 'info'); return; }
            openMyResults(tid);
        }
        function leave(cid) {
            var grp = state.classes.filter(function (c) { return c.id === cid; })[0], name = grp ? grp.name : '';
            if (!confirm('Em muốn RỜI lớp "' + name + '"?\n\nEm sẽ không còn thấy các bài giao của lớp này. Kết quả đã làm vẫn được giữ trên máy.\nMuốn vào lại, em bấm "Tìm lớp học" và xin vào lớp.')) return;
            var a = API(), k = sKey(), id = getStudentIdentity(), targets = (grp && grp.ids) || [cid];
            var lf = ls(LS_LEFT, {}); targets.forEach(function (t) { lf[t] = Date.now(); }); lf[cid] = Date.now(); lsSet(LS_LEFT, lf);
            var my = myMap(); targets.forEach(function (t) { delete my[t]; }); delete my[cid]; lsSet(LS_MY, my);
            try { var cx = ls(LS_CTX, null); if (cx && (cx.ids || []).some(function (j) { return targets.indexOf(j) >= 0; })) localStorage.removeItem(LS_CTX); } catch (e) {}
            try { lsSet(LS_CACHE, ls(LS_CACHE, []).filter(function (c) { return targets.indexOf(c.id) < 0; })); } catch (e) {}
            render();
            toast('🚪 Đã rời lớp ' + name);
            if (a && a.effStu()) {
                Promise.all(targets.map(function (t) {
                    return a.req('PUT', 's', 'joins/' + a.enc(t) + '/' + a.enc(k), { k: k, name: id.name, cls: id.cls, ts: Date.now(), status: 'left' });
                })).catch(function () {});
            }
        }
        function useCode() {
            var el = document.getElementById('sc-code'), v = el ? el.value : '';
            if (window.CloudSync && CloudSync.setStudentToken(v)) { state.noConn = false; toast('✅ Đã kết nối với giáo viên'); loadClasses(); try { CloudSync.sync(); } catch (e) {} }
            else { state.connMsg = 'Mã/link không hợp lệ. Hãy dán đúng link hoặc mã MQC1... do giáo viên gửi.'; render(); }
        }
        function card(cl, status) {
            var btn = status === 'approved' ? '<span class="font-black text-emerald-700">✅ Đã vào lớp</span>' : status === 'pending' ? '<span class="font-black text-amber-600">⏳ Chờ giáo viên duyệt</span>'
                : (status === 'rejected' ? '<div class="text-xs font-black text-red-600 mb-1 text-right">Yêu cầu trước bị từ chối</div>' : '') + '<button type="button" class="cm-btn bg-emerald-600 text-white" style="padding:8px 18px;border-radius:10px;font-weight:900" onclick="ClassNet.join(\'' + E(cl.id) + '\')">Tham gia lớp</button>';
            return '<div class="bg-white rounded-xl border p-4 mb-3 flex items-center justify-between gap-3 shadow-sm"><div><div class="sc-clname">' + E(cl.name) + '</div><div class="text-sm font-bold text-slate-500">' + E(cl.teacher || '') + (cl.grade ? ' · Khối ' + E(cl.grade) : '') + (cl.year ? ' · ' + E(cl.year) : '') + ' · ' + (cl.n || 0) + ' học sinh</div></div><div>' + btn + '</div></div>';
        }
        function render() {
            var body = document.getElementById('sc-body'); if (!body) return;
            var h;
            if (state.noConn) {
                h = '<div class="bg-white rounded-xl border p-5 shadow-sm"><div class="text-xl font-black text-slate-700 mb-2">📡 Chưa kết nối với giáo viên</div>' +
                    '<div class="font-bold text-slate-500 mb-3" style="line-height:1.55">Hãy mở app bằng <b>link / mã QR vào lớp</b> do giáo viên gửi, hoặc dán link/mã kết nối (bắt đầu bằng <b>MQC1.</b>) vào ô dưới:</div>' +
                    '<textarea id="sc-code" rows="3" class="w-full border-2 rounded-lg px-3 py-2 font-bold" style="font-size:14px" placeholder="Dán link hoặc mã MQC1... vào đây"></textarea>' +
                    (state.connMsg ? '<div class="text-red-600 font-bold mt-2">' + E(state.connMsg) + '</div>' : '') +
                    '<button type="button" class="cm-btn bg-emerald-600 text-white mt-3" style="padding:10px 24px;border-radius:10px;font-weight:900" onclick="ClassNet.useCode()">Kết nối</button></div>';
                body.innerHTML = h; return;
            }
            var my = myMap(), mine = state.classes.filter(function (c) { return my[c.id] === 'approved'; });
            h = '<div class="flex gap-2 mb-4 flex-wrap"><button type="button" class="cm-btn ' + (state.view === 'mine' ? 'bg-teal-600 text-white' : 'bg-white border') + '" style="padding:8px 16px;border-radius:10px;font-weight:900" onclick="ClassNet.setView(\'mine\')">Lớp của tôi</button><button type="button" class="cm-btn ' + (state.view === 'find' ? 'bg-teal-600 text-white' : 'bg-white border') + '" style="padding:8px 16px;border-radius:10px;font-weight:900" onclick="ClassNet.setView(\'find\')">🔍 Tìm lớp học</button></div>';
            if (state.msg) h += '<div class="p-3 mb-3 rounded-lg bg-red-50 text-red-700 font-bold">⚠️ ' + E(state.msg) + '</div>';
            if (state.loading) h += '<div class="font-bold text-slate-500">Đang tải…</div>';
            else if (state.view === 'mine') {
                if (!mine.length) h += '<div class="text-center p-10"><div class="text-5xl mb-2">🏫</div><div class="text-xl font-black text-slate-600 mb-3">Bạn chưa tham gia lớp học nào</div><div class="text-sm font-bold text-slate-400 mb-3">' + (state.classes.length ? 'Có ' + state.classes.length + ' lớp giáo viên đã công bố. Hãy bấm “Tìm lớp học” để tham gia.' : 'Giáo viên chưa công bố lớp nào (hoặc chưa bật ĐỒNG BỘ).') + '</div><button type="button" class="cm-btn bg-emerald-600 text-white" style="padding:10px 26px;font-size:16px;border-radius:10px;font-weight:900" onclick="ClassNet.setView(\'find\')">Tìm lớp học</button></div>';
                mine.forEach(function (cl) {
                    h += '<div class="bg-white rounded-xl border p-4 mb-4 shadow-sm"><div class="flex items-start justify-between gap-2 mb-2"><div class="min-w-0"><div class="sc-clname">' + E(cl.name) + '</div><div class="text-sm font-bold text-slate-500">' + E(cl.teacher || '') + (cl.grade ? ' · Khối ' + E(cl.grade) : '') + '</div></div>' +
                        '<button type="button" class="cm-btn bg-red-50 text-red-700 border-2 border-red-300" style="padding:7px 14px;border-radius:10px;font-weight:900;white-space:nowrap" onclick="ClassNet.leave(\'' + E(cl.id) + '\')">🚪 Rời lớp</button></div>';
                    var as = (cl.as || []).slice().sort(function (x, y) { return (y.at || 0) - (x.at || 0); });
                    h += as.length ? assignGroupsHtml(cl, as) : '<div class="text-slate-400 font-bold border-t pt-2">Chưa có đề nào được giao.</div>';
                    h += '</div>';
                });
            } else {
                var q = cmNormLoose(state.q);
                h += '<input id="sc-search" type="text" value="' + E(state.q) + '" placeholder="Tìm theo tên lớp / giáo viên…" oninput="ClassNet.search(this.value)" class="w-full border-2 rounded-lg px-4 py-2 mb-4 font-bold">';
                var list = state.classes.filter(function (c) { return !q || cmNormLoose(c.name + ' ' + (c.teacher || '')).indexOf(q) >= 0; });
                h += '<div id="sc-list">' + (list.length ? list.map(function (c) { return card(c, my[c.id]); }).join('') : '<div class="text-slate-400 font-bold p-6 text-center">Chưa có lớp nào được giáo viên công bố.</div>') + '</div>';
            }
            body.innerHTML = h;
            if (state.view === 'find') { var si = document.getElementById('sc-search'); if (si && state.q) { si.focus(); si.setSelectionRange(state.q.length, state.q.length); } }
        }
        /* [CODE86] ✕ Đóng: đang ở "Tìm lớp học" thì lùi về "Lớp của tôi"; ở "Lớp của tôi" thì đóng hẳn về trang chủ */
        function closeStep() {
            if (!state.noConn && state.view === 'find') { state.view = 'mine'; state.q = ''; render(); return; }
            window.closeStudentClasses();
        }
        window.openStudentClasses = function () {
            var m = document.getElementById('student-class-modal'); if (!m) return;
            m.classList.remove('hidden'); requestAnimationFrame(function () { m.classList.remove('opacity-0'); });
            state.msg = ''; state.view = 'mine'; loadClasses();
            try { window.CloudSync.sync(); } catch (e) {}
        };
        window.closeStudentClasses = function () {
            var m = document.getElementById('student-class-modal'); if (!m) return;
            m.classList.add('opacity-0'); setTimeout(function () { m.classList.add('hidden'); }, 250);
        };

        window.ClassNet = {
            bannerHtml: bannerHtml, pendingCount: pendingCount, approve: approve, join: join, open: open, useCode: useCode,
            leave: leave, viewResult: viewResult, ctxFor: ctxFor, closeStep: closeStep,   /* [CODE78] */
            studentRemoved: studentRemoved, classDeleted: classDeleted,   /* [CODE79] */
            setView: function (v) { state.view = v; state.q = ''; render(); },
            search: function (v) { state.q = v; render(); },
            refreshS: function () { return loadClasses(); }, refreshT: function () { publishClasses(true); pollJoins(); },
            publish: publishClasses, publishNow: publishNow, copyLink: copyLink, copyTeacherLink: copyTeacherLink, showQr: showQr, classLink: classLink,
            onSyncDone: function () { if (isStudentMode) return; publishClasses(false); if (Date.now() - state.lastPoll > 6000) pollJoins(); }
        };

        /* Giáo viên: đẩy lớp lên mạng khi lưu; hỏi yêu cầu mới mỗi 10 giây */
        var _cs = window.cmSave, _t = null;
        if (typeof _cs === 'function') {
            window.cmSave = function () { var r = _cs.apply(this, arguments); clearTimeout(_t); _t = setTimeout(function () { publishClasses(false); }, 800); return r; };
        }
        var _oc = window.openClassManager;
        if (typeof _oc === 'function') {
            window.openClassManager = function () { var r = _oc.apply(this, arguments); try { publishClasses(false); pollJoins(); } catch (e) {} try { window.CloudSync.schedule(true); } catch (e) {} return r; };
        }
        setInterval(function () { if (!document.hidden && !isStudentMode) { pollJoins(); publishClasses(false); } }, 15000);   /* [CODE80] 10s -> 15s */
        setTimeout(function () { if (!isStudentMode) { publishClasses(false); pollJoins(); } }, 3000);
        /* Học sinh: tự làm mới danh sách lớp khi đang mở cửa sổ LỚP HỌC */
        /* [CODE79] Làm mới danh sách lớp: 15 giây/lần khi đang mở LỚP HỌC, 60 giây/lần khi đóng; và ngay khi quay lại trang */
        setInterval(function () {
            if (!isStudentMode || document.hidden || state.noConn || state.loading) return;
            var m = document.getElementById('student-class-modal');
            var open = m && !m.classList.contains('hidden');
            if (open || Date.now() - (state.lastLoad || 0) > 90000) loadClasses(true);
        }, 20000);   /* [CODE80] nhẹ hơn: 20s khi mở LỚP HỌC, 90s khi đóng */
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && isStudentMode && !state.noConn && Date.now() - (state.lastLoad || 0) > 5000) loadClasses(true);
        });

        /* Link vào lớp (?mode=hs&cl=...) tự chọn sẵn vai “Tôi là HS” */
        try {
            var P = new URLSearchParams(location.search);
            if (P.get('cl') && P.get('mode') === 'hs' && !P.get('id') && !P.get('hs')) {
                var rs = document.getElementById('login-role-select');
                if (rs && rs.value !== 'HS') { rs.value = 'HS'; if (typeof handleLoginRoleChange === 'function') handleLoginRoleChange(); }
            }
        } catch (e) {}

        /* Đăng xuất: đóng cửa sổ lớp học */
        var _lo = window.logoutApp;
        if (typeof _lo === 'function') {
            window.logoutApp = function () { var m = document.getElementById('student-class-modal'); if (m) m.classList.add('hidden', 'opacity-0'); return _lo.apply(this, arguments); };
        }
    })();

// === [code83-home-js] ===
/* [CODE85] Trang chủ dạng dashboard cho GIÁO VIÊN và HỌC SINH (học sinh: Vinh danh Top 5 + nút truy cập nhanh Lớp học của tôi).
   [CODE83] Trang chủ dạng dashboard cho giáo viên: Thư viện đề thi, Lớp học, Học sinh tiêu biểu,
   Đề thi được đề xuất, Hoạt động gần đây, Khu vực tạo đề nhanh. Chỉ đọc dữ liệu sẵn có (không ghi/sửa dữ liệu). */
(function () {
    'use strict';
    var DAY = 864e5;
    var H = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var N = function (n) { try { return Number(n || 0).toLocaleString('vi-VN'); } catch (e) { return String(n || 0); } };
    var F1 = function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); };
    var el = null, lastSig = '', timer = 0, tick = 0, uid = 0;
    /* [CODE85] ---- Phần dành cho HỌC SINH ---- */
    var LS_CACHE85 = 'matrix_classnet_mycache_v1', LS_BOARD85 = 'matrix_c85_board_v1';
    var boardMode = 'all', cloud = { ts: 0, busy: false, recs: {} }, cloudTried = 0;
    function isStu() { return typeof isStudentMode !== 'undefined' && isStudentMode === true; }
    function lsGet85(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    function myClasses() { var c = lsGet85(LS_CACHE85); return Array.isArray(c) ? c : []; }
    function myName() { try { return String(document.getElementById('main-fullname-input').value || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); } catch (e) { return ''; } }
    function loadCloudCache() { var o = lsGet85(LS_BOARD85); if (o && o.recs && typeof o.recs === 'object') { cloud.recs = o.recs; cloud.ts = o.ts || 0; } }
    function slim(o) {
        return { id: o.id, studentName: o.studentName || o.name || '', studentClass: o.studentClass || '', className: o.className || '', classIds: o.classIds,
            score10: o.score10, scorePercent: o.scorePercent, submittedTs: o.submittedTs || o.submittedAt || 0 };
    }
    /* Học sinh: tải kết quả của các bạn trong lớp (chỉ các đề được giao cho lớp mình), lưu nhớ 2 phút, bỏ phần chi tiết bài làm cho nhẹ */
    function fetchCloud(force) {
        var api = window.CloudSync && CloudSync.api;
        if (cloud.busy || document.hidden || !api) return;
        if (!force && Date.now() - cloud.ts < 120000) return;
        var ok = false; try { ok = !!api.effStu(); } catch (e) {}
        if (!ok) return;
        var tids = [];
        myClasses().forEach(function (c) { arr(c.t).forEach(function (t) { if (t && tids.indexOf(t) < 0) tids.push(t); }); });
        if (!tids.length) {
            if (Date.now() - cloudTried > 60000 && window.ClassNet && ClassNet.refreshS) { cloudTried = Date.now(); try { Promise.resolve(ClassNet.refreshS()).then(function () { lastSig = ''; schedule(); }); } catch (e) {} }
            return;
        }
        tids = tids.slice(0, 12);
        cloud.busy = true;
        Promise.all(tids.map(function (tid) {
            return api.req('GET', 's', 'results/' + api.enc(tid)).then(function (remote) {
                var out = [];
                Object.keys(remote || {}).forEach(function (k) {
                    var env = remote[k]; if (!env || typeof env.d !== 'string') return;
                    var o = null; try { o = JSON.parse(env.d); } catch (e) {}
                    if (o && o.id) out.push(slim(o));
                });
                return [tid, out];
            }, function () { return [tid, null]; });
        })).then(function (parts) {
            var recs = {};
            parts.forEach(function (p) { if (p[1]) recs[p[0]] = p[1]; else if (cloud.recs[p[0]]) recs[p[0]] = cloud.recs[p[0]]; });
            cloud.recs = recs; cloud.ts = Date.now(); cloud.busy = false;
            try { localStorage.setItem(LS_BOARD85, JSON.stringify({ ts: cloud.ts, recs: recs })); } catch (e) {}
            lastSig = ''; schedule();
        }, function () { cloud.busy = false; cloud.ts = Date.now() - 90000; });
    }
    function kick() { if (isStu()) { try { fetchCloud(false); } catch (e) {} } }
    function wrapHtml(d) { return '<div id="code83-home"' + (d.stu ? ' class="c85-stu"' : '') + '>' + html(d) + '</div>'; }

    var IC = {
        lib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M9 9v7M12 12v4M15 7v9"/></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.4c1.8.8 3 2.6 3 4.6"/></svg>',
        trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
        school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6-9 6z"/><path d="M7 12.5V17c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.5"/></svg>',
        medal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h4l1 5-3 1zM17 2h-4l-1 5 3 1z" opacity=".55"/><circle cx="12" cy="15" r="6.5"/><path d="M12 11.5l1.1 2.2 2.4.35-1.75 1.7.42 2.4L12 17l-2.17 1.15.42-2.4-1.75-1.7 2.4-.35z" fill="#fff6d6"/></svg>',
        q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
        word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 17v-6M9.5 13.5 12 11l2.5 2.5"/></svg>',
        folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
    };

    function arr(v) { return Array.isArray(v) ? v : []; }
    function startOfDay(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
    var norm = window.LTDUtils.normNfc;
    function score10(r) {
        var v = r.score10;
        if (v !== null && v !== undefined && v !== '') { var n = parseFloat(String(v).replace(',', '.')); if (isFinite(n)) return n; }
        if (r.scorePercent !== null && r.scorePercent !== undefined) { var p = parseFloat(r.scorePercent); if (isFinite(p)) return p / 10; }
        return null;
    }
    function createdTs(t) { var m = /^topic_(\d{10,})_/.exec(t.id || ''); return m ? +m[1] : (t.updatedAt || 0); }
    function initials(name) {
        var p = String(name || '?').trim().split(/\s+/);
        var a = p[p.length - 1] || '?', b = p.length > 1 ? p[0] : '';
        return (b.charAt(0) + a.charAt(0)).toUpperCase() || '?';
    }
    function hue(name) { var h = 0, s = String(name || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
    /* [CODE117] Ảnh đại diện thật của học sinh (đồng bộ từ máy chủ, dùng chung kho với nút ảnh tròn ở góc); chưa có ảnh thì hiện chữ cái đầu như cũ */
    var AKEY = 'matrix_avatar_v2:', amem = {}, achk = {}, aq = [], arun = 0;
    function afold(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
    function akey(name, cls) { var n = afold(name); return n ? 'hs_' + n + '_' + afold(cls) : ''; }
    function aok(d) { return typeof d === 'string' && d.length < 400000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(d); }
    function aget(k) {
        if (amem[k] !== undefined) return amem[k];
        var d = '';
        try { var o = JSON.parse(localStorage.getItem(AKEY + k) || 'null'); if (o && aok(o.d)) d = o.d; } catch (e) {}
        return (amem[k] = d);
    }
    function avatar(name, size, cls) {
        var h = hue(name), k = akey(name, cls), d = k ? aget(k) : '';
        return '<span class="c83-ava" aria-hidden="true"' + (k ? ' data-ak="' + k + '"' : '') + ' style="' + (size ? '--s:' + size + 'px;' : '') + 'background:linear-gradient(135deg,hsl(' + h + ' 70% 55%),hsl(' + ((h + 40) % 360) + ' 70% 42%))">' +
            (d ? '<img src="' + d + '" alt="" decoding="async">' : H(initials(name))) + '</span>';
    }
    function apaint(k, d) {
        var list = document.querySelectorAll('.c83-ava[data-ak="' + k + '"]');
        for (var i = 0; i < list.length; i++) list[i].innerHTML = '<img src="' + d + '" alt="" decoding="async">';
    }
    function apull() {
        var api = window.CloudSync && CloudSync.api;
        while (arun < 3 && aq.length) {
            var k = aq.shift(); arun++;
            (function (k) {
                var done = function () { arun--; apull(); };
                try {
                    api.req('GET', 's', 'avatars/' + api.enc(k) + '?cb=' + Date.now()).then(function (r) {
                        if (r && aok(r.d)) {
                            var l = 0; try { var o = JSON.parse(localStorage.getItem(AKEY + k) || 'null'); l = (o && +o.ts) || 0; } catch (e) {}
                            if ((+r.ts || 0) >= l || !aget(k)) { amem[k] = r.d; try { localStorage.setItem(AKEY + k, JSON.stringify({ d: r.d, ts: +r.ts || Date.now() })); } catch (e) {} }
                            apaint(k, amem[k]);
                        }
                        done();
                    }, done);
                } catch (e) { done(); }
            })(k);
        }
    }
    function hydrate(root) {
        try {
            var api = window.CloudSync && CloudSync.api;
            if (!root || !api || !api.effStu()) return;
            var nodes = root.querySelectorAll('.c83-ava[data-ak]'), now = Date.now();
            for (var i = 0; i < nodes.length; i++) {
                var k = nodes[i].getAttribute('data-ak');
                if (!k || (achk[k] && now - achk[k] < 600000) || aq.indexOf(k) >= 0) continue;
                achk[k] = now; aq.push(k);
            }
            apull();
        } catch (e) {}
    }
    function ago(ts) {
        var d = Date.now() - ts;
        if (d < 60e3) return 'Vừa xong';
        if (d < 3600e3) return Math.floor(d / 60e3) + ' phút trước';
        if (d < DAY) return Math.floor(d / 3600e3) + ' giờ trước';
        if (d < 30 * DAY) return Math.floor(d / DAY) + ' ngày trước';
        return new Date(ts).toLocaleDateString('vi-VN');
    }

    function collect() {
        var topics = (typeof savedTopics !== 'undefined') ? arr(savedTopics) : [];
        var stu = isStu(), classes, myCls = [], asgSet = {}, mineIds = {}, me = '', stuCls = '';
        if (stu) {
            try {
                if (typeof getStudentIdentity === 'function') {
                    var _sid = getStudentIdentity();
                    if (_sid && _sid.cls) stuCls = String(_sid.cls).trim();
                }
            } catch (e) {}
            topics = topics.filter(function (t) {
                if (!t) return false;
                if (typeof window !== 'undefined' && typeof window.LTDIsTopicAllowedForStudent === 'function') {
                    return window.LTDIsTopicAllowedForStudent(t);
                }
                return Boolean(t.isPublished);
            });
            myCls = myClasses(); classes = myCls; me = myName();
            myCls.forEach(function (c) { arr(c.t).forEach(function (t) { asgSet[t] = 1; }); arr(c.ids || [c.id]).forEach(function (i) { mineIds[i] = 1; }); });
        } else {
            classes = (typeof classesData !== 'undefined') ? arr(classesData) : [];
            if (!classes.length) {
                try { var raw = localStorage.getItem('matrix_classes_v1'); if (raw) classes = arr(JSON.parse(raw)); } catch (e) {}
            }
        }
        var resMap = (typeof studentResultsByTopic !== 'undefined' && studentResultsByTopic) ? studentResultsByTopic : {};
        function mine(r) { return !stu || norm(r.studentName || r.name) === me; }
        if (stu) {   /* gộp kết quả của máy này + kết quả các bạn cùng lớp lấy từ máy chủ (không trùng mã) */
            var merged = {};
            Object.keys(resMap).forEach(function (k) { merged[k] = arr(resMap[k]).slice(); });
            Object.keys(cloud.recs).forEach(function (k) {
                var have = {}; (merged[k] = merged[k] || []).forEach(function (r) { if (r && r.id) have[r.id] = 1; });
                arr(cloud.recs[k]).forEach(function (r) {
                    if (!r || have[r.id]) return;
                    if (Array.isArray(r.classIds) && r.classIds.length && !r.classIds.some(function (i) { return mineIds[i]; })) return;
                    merged[k].push(r);
                });
            });
            resMap = merged;
        }
        var now = Date.now(), today = startOfDay(now), weekAgo = now - 7 * DAY;
        var byId = {}; topics.forEach(function (t) { byId[t.id] = t; });

        // Đề thi
        var subj = {}, newDaily = [0, 0, 0, 0, 0, 0, 0], newCount = 0;
        topics.forEach(function (t) {
            var s = t.subject || 'Khác'; subj[s] = (subj[s] || 0) + 1;
            var c = createdTs(t);
            if (c >= weekAgo) newCount++;
            var idx = Math.floor((today - startOfDay(c)) / DAY);
            if (idx >= 0 && idx < 7) newDaily[6 - idx]++;
        });
        var subjList = Object.keys(subj).map(function (k) { return [k, subj[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);

        // Kết quả
        var all = [], attempts = {}, daily = [0, 0, 0, 0, 0, 0, 0], week = 0;
        Object.keys(resMap).forEach(function (k) {
            arr(resMap[k]).forEach(function (r) {
                if (!r) return;
                var ts = +r.submittedTs || 0;
                attempts[k] = (attempts[k] || 0) + 1;
                all.push({ k: k, r: r, ts: ts, sc: score10(r) });
                if (ts >= weekAgo && mine(r)) {
                    week++;
                    var idx = Math.floor((today - startOfDay(ts)) / DAY);
                    if (idx >= 0 && idx < 7) daily[6 - idx]++;
                }
            });
        });
        all.sort(function (a, b) { return b.ts - a.ts; });

        // Học sinh tiêu biểu: điểm TB cao nhất (ưu tiên 7 ngày qua)
        function best(list) {
            var m = {};
            list.forEach(function (x) {
                if (x.sc === null) return;
                var nm = (x.r.studentName || '').trim(); if (!nm) return;
                var key = norm(nm) + '|' + norm(x.r.className || x.r.studentClass);
                var o = m[key] || (m[key] = { name: nm, cls: x.r.className || x.r.studentClass || '', sum: 0, n: 0, subj: {} });
                o.sum += x.sc; o.n++;
                var tp = byId[x.k], sj = tp && tp.subject; if (sj) o.subj[sj] = (o.subj[sj] || 0) + 1;
            });
            var out = Object.keys(m).map(function (k) { var o = m[k]; o.avg = o.sum / o.n; var ks = Object.keys(o.subj).sort(function (a, b) { return o.subj[b] - o.subj[a]; }); o.sj = ks[0] || ''; return o; });
            out.sort(function (a, b) { return (b.avg - a.avg) || (b.n - a.n); });
            return out;
        }
        /* [CODE99] Bảng xếp hạng: ít nhất Top 3 (tối đa 10). Tuần này nếu đủ 3 học sinh, nếu không thì lấy cả thời gian */
        var starsW = best(all.filter(function (x) { return x.ts >= weekAgo; })), starsA = best(all);
        var starWeek = starsW.length >= 3 || (starsW.length > 0 && starsW.length >= starsA.length);
        var stars = (starWeek ? starsW : starsA).slice(0, 10), star = stars[0] || null;

        // [CODE85] Vinh danh học sinh tích cực: điểm trung bình (mỗi đề lấy điểm cao nhất) + chuyên cần (số lần làm bài)
        function leaders(list) {
            var m = {};
            list.forEach(function (x) {
                if (x.sc === null) return;
                var nm = (x.r.studentName || '').trim(); if (!nm) return;
                var cl = x.r.className || x.r.studentClass || '';
                var key = norm(nm) + '|' + norm(cl);
                var o = m[key] || (m[key] = { name: nm, cls: cl, n: 0, top: {} });
                o.n++;
                if (o.top[x.k] === undefined || x.sc > o.top[x.k]) o.top[x.k] = x.sc;
            });
            var out = Object.keys(m).map(function (k) {
                var o = m[k], ks = Object.keys(o.top), sum = 0;
                ks.forEach(function (t) { sum += o.top[t]; });
                o.avg = ks.length ? sum / ks.length : 0;
                o.pts = o.avg + Math.min(o.n, 10) * 0.15;
                o.self = !!me && norm(o.name) === me;
                return o;
            });
            out.sort(function (a, b) { return (b.pts - a.pts) || (b.avg - a.avg) || (b.n - a.n); });
            return out.slice(0, 5);
        }
        var lbAll = stu ? leaders(all) : [], lbWeek = stu ? leaders(all.filter(function (x) { return x.ts >= weekAgo; })) : [];

        // Đề được đề xuất
        /* [CODE97] Chỉ đề ĐÃ XUẤT BẢN mới được đề xuất; đề chưa xuất bản (bản nháp) không xuất hiện */
        var scored = topics.filter(function (t) { return t && Boolean(t.isPublished); }).map(function (t) {
            return { t: t, c: createdTs(t), a: attempts[t.id] || 0, u: t.updatedAt || 0 };
        });
        var picked = [], seen = {};
        function take(list, tag) { list.forEach(function (o) { if (picked.length < 4 && !seen[o.t.id]) { seen[o.t.id] = 1; picked.push({ t: o.t, a: o.a, tag: tag(o) }); } }); }
        if (stu) take(scored.filter(function (o) { return asgSet[o.t.id]; }).sort(function (a, b) { return b.c - a.c; }), function () { return 'asg'; });
        take(scored.filter(function (o) { return o.c >= weekAgo; }).sort(function (a, b) { return b.c - a.c; }), function () { return 'new'; });
        take(scored.filter(function (o) { return o.a >= 3; }).sort(function (a, b) { return b.a - a.a; }), function () { return 'hot'; });
        take(scored.slice().sort(function (a, b) { return (b.a - a.a) || (b.u - a.u); }), function () { return 'pub'; });

        var studentsPerClass = classes.map(function (c) { return arr(c.students).length; });
        var studentsTotal = studentsPerClass.reduce(function (a, b) { return a + b; }, 0);

        var classSubj = []; classes.forEach(function (c) { if (c.subject && classSubj.indexOf(c.subject) < 0) classSubj.push(c.subject); });
        var cap = '';
        if (stu) {
            studentsPerClass = myCls.map(function (c) { return arr(c.t).length; });
            cap = myCls.length ? myCls.slice(0, 2).map(function (c) { return c.name; }).join(', ') + (myCls.length > 2 ? '…' : '') : 'Chưa vào lớp nào';
            classSubj = [];
        }
        var assignedCount = 0; for (var ak in asgSet) assignedCount++;

        return {
            stu: stu, cap: cap, assignedCount: assignedCount, lbAll: lbAll, lbWeek: lbWeek, myCount: myCls.length,
            sigExtra: cloud.ts + '|' + boardMode + '|' + myCls.length + '|' + assignedCount + '|' + lbAll.length + '|' + lbWeek.length + '|' + me + '|' + stuCls + '|' + topics.length,
            classSubj: classSubj, topics: topics, byId: byId, subjList: subjList, newDaily: newDaily, newCount: newCount,
            classes: classes, studentsPerClass: studentsPerClass, studentsTotal: studentsTotal,
            week: week, daily: daily, star: star, stars: stars, starWeek: starWeek, picked: picked,
            recent: all.slice(0, 4), totalResults: all.length, latestTs: all.length ? all[0].ts : 0
        };
    }

    function bars(vals, soft, labels) {
        var max = Math.max.apply(null, vals.concat([1])), hi = vals.indexOf(Math.max.apply(null, vals));
        var out = '<div class="c83-bars' + (soft ? ' soft' : '') + '" role="img" aria-label="Biểu đồ cột">';
        vals.forEach(function (v, i) {
            var h = Math.max(14, Math.round(v / max * 100));
            out += '<i' + (v > 0 && i === hi ? ' class="hi"' : '') + ' style="height:' + h + '%" title="' + H((labels && labels[i] ? labels[i] + ': ' : '') + v) + '"></i>';
        });
        return out + '</div>';
    }

    function spark(vals) {
        var v = vals.length > 1 ? vals.slice() : (vals.length ? [vals[0], vals[0]] : [0, 0]);
        var W = 200, Hh = 50, n = v.length, max = Math.max.apply(null, v.concat([1]));
        var p = v.map(function (y, i) { return [i * W / (n - 1), Hh - 4 - (y / max) * (Hh - 12)]; });
        var d = 'M' + p[0][0] + ',' + p[0][1];
        for (var i = 0; i < n - 1; i++) {
            var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
            d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
                (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
        }
        var id = 'c83g' + (++uid);
        return '<svg class="c83-spark" viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="none" role="img" aria-label="Biểu đồ đường"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fed" stop-opacity=".28"/><stop offset="1" stop-color="#2f6fed" stop-opacity="0"/></linearGradient></defs>' +
            '<path d="' + d + ' L' + W + ',' + Hh + ' L0,' + Hh + ' Z" fill="url(#' + id + ')"/><path d="' + d + '" fill="none" stroke="#2f6fed" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
    }

    /* [CODE85] Khung "Vinh danh" Top 5 học sinh tích cực / điểm cao (thay cho Khu vực tạo đề nhanh) */
    function honorHtml(d) {
        var list = boardMode === 'week' ? d.lbWeek : d.lbAll, medals = ['🥇', '🥈', '🥉'];
        var s = '<section class="c83-col" aria-label="Vinh danh học sinh tích cực"><h3>Vinh Danh Học Sinh Tích Cực</h3><div class="c85-honor">' +
            '<div class="c85-tabs" role="tablist"><button type="button" role="tab" aria-selected="' + (boardMode === 'week') + '" class="' + (boardMode === 'week' ? 'on' : '') + '" data-c83="bw">Tuần này</button>' +
            '<button type="button" role="tab" aria-selected="' + (boardMode !== 'week') + '" class="' + (boardMode !== 'week' ? 'on' : '') + '" data-c83="ba">Tất cả</button></div>';
        if (list.length) {
            s += '<ol class="c85-rank">';
            list.forEach(function (o, i) {
                s += '<li class="c85-row r' + (i + 1) + (o.self ? ' me' : '') + '"><span class="c85-pos">' + (medals[i] || (i + 1)) + '</span>' + avatar(o.name, 42, o.cls) +
                    '<span class="c85-who"><b>' + H(o.name) + (o.self ? ' <em>(Bạn)</em>' : '') + '</b><small>' + (o.cls ? 'Lớp ' + H(o.cls) + ' • ' : '') + o.n + ' lượt làm bài</small></span>' +
                    '<span class="c85-pts"><b>' + F1(o.avg) + '</b><small>điểm TB</small></span></li>';
            });
            s += '</ol><p class="c85-note">Xếp hạng theo điểm trung bình, ưu tiên bạn làm nhiều bài. Cố lên, mỗi bài làm đều giúp em tiến gần bảng vàng!</p>';
        } else {
            s += '<div class="c85-empty"><span class="c85-cup">' + IC.trophy + '</span><b>' + (boardMode === 'week' ? 'Tuần này chưa có bài nộp nào' : 'Chưa có dữ liệu vinh danh') + '</b>' +
                '<span>Hãy làm bài được giao để trở thành học sinh đầu tiên lên bảng vàng!</span></div>';
        }
        return s + '</div></section>';
    }

    function html(d) {
        var days = [];
        for (var i = 6; i >= 0; i--) { var x = new Date(Date.now() - i * DAY); days.push(x.getDate() + '/' + (x.getMonth() + 1)); }
        var s = '';
        if (d.stu) {   /* [CODE85] nút truy cập nhanh */
            s += '<button type="button" class="c85-quick" data-c83="myclasses" aria-label="Truy cập nhanh lớp học của tôi"><span class="c85-quick-ic">' + IC.school + '</span>' +
                '<span class="c85-quick-tx"><b>TRUY CẬP NHANH LỚP HỌC CỦA TÔI</b><small>' + (d.myCount ? N(d.myCount) + ' lớp • ' + N(d.assignedCount) + ' bài được giao — bấm để làm bài ngay' : 'Bấm để tìm lớp và xin vào lớp') + '</small></span><span class="c85-quick-go" aria-hidden="true">›</span></button>';
        }
        s += '<div class="c83-top">';

        // 1. Thư viện đề thi
        s += '<section class="c83-card" aria-label="Thư viện đề thi"><div class="c83-card-head"><h3>Thư Viện Đề Thi</h3>' +
            '<button type="button" class="c83-ico" data-c83="lib" aria-label="Mở Thư viện" title="Mở Thư viện">' + IC.lib + '</button></div>' +
            '<div class="c83-pair"><div><div class="c83-lbl">Tổng số đề thi:</div><div class="c83-num">' + N(d.topics.length) + '</div>' +
            bars(d.subjList.length ? d.subjList.map(function (x) { return x[1]; }) : [0, 0, 0, 0, 0], false, d.subjList.map(function (x) { return x[0]; })) +
            '<div class="c83-cap" title="Số đề theo môn học">' + (d.subjList.length ? d.subjList.slice(0, 3).map(function (x) { return H(x[0]) + ' ' + x[1]; }).join(' • ') + (d.subjList.length > 3 ? ' …' : '') : 'Chưa có môn học') + '</div></div>' +
            '<div><div class="c83-lbl">Đề thi mới tạo:</div><div class="c83-num">' + N(d.newCount) + '</div>' + bars(d.newDaily, true, days) + '</div></div></section>';

        // 2. Lớp học của tôi
        s += '<section class="c83-card" aria-label="Lớp học của tôi"><div class="c83-card-head"><h3>Lớp Học Của Tôi</h3>' +
            '<button type="button" class="c83-ico" data-c83="' + (d.stu ? 'myclasses' : 'classes') + '" aria-label="' + (d.stu ? 'Mở Lớp học của tôi' : 'Mở Quản lí lớp học') + '" title="' + (d.stu ? 'Mở Lớp học của tôi' : 'Mở Quản lí lớp học') + '">' + IC.users + '</button></div>' +
            '<div class="c83-pair"><div><div class="c83-lbl">Tổng số Lớp:</div><div class="c83-num">' + N(d.classes.length) + '</div>' + spark(d.studentsPerClass.slice(0, 8)) + '<div class="c83-cap" title="Môn học của các lớp">' + (d.cap ? H(d.cap) : (d.classSubj.length ? 'Môn: ' + d.classSubj.slice(0, 3).map(H).join(', ') : N(d.studentsTotal) + ' học sinh')) + '</div></div>' +
            '<div><div class="c83-lbl">' + (d.stu ? 'Bài em làm tuần qua:' : 'Lượt học tuần qua:') + '</div><div class="c83-num">' + N(d.week) + '</div>' + spark(d.daily) + '</div></div></section>';

        // 3. Học sinh tiêu biểu
        s += '<section class="c83-card" aria-label="Học sinh tiêu biểu"><div class="c83-card-head"><h3>Học Sinh Tiêu Biểu</h3><span class="c83-medal" aria-hidden="true">' + IC.medal + '</span></div>';
        if (d.stars && d.stars.length) {
            s += '<div class="c99-rank" role="list" aria-label="Xếp hạng học sinh tiêu biểu">';
            d.stars.forEach(function (st, i) {
                s += '<div class="c99-row r' + (i < 3 ? i + 1 : 0) + '" role="listitem"><span class="c99-no">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1)) + '</span>' + avatar(st.name, 44, st.cls) +
                    '<div style="min-width:0;flex:1"><div class="c99-name">' + H(st.name) + '</div>' +
                    '<div class="c83-star-sub" style="margin:0">' + (st.cls ? 'Lớp ' + H(st.cls) + ' • ' : '') + (st.sj ? H(st.sj) + ' • ' : '') + st.n + ' bài' + (d.starWeek ? ' trong tuần' : '') + '</div></div>' +
                    '<b class="c99-sc">' + F1(st.avg) + '</b></div>';
            });
            s += '</div>';
        } else {
            s += '<div class="c83-star">' + avatar('?', 78).replace('>?<', '>–<').replace(/background:linear-gradient\([^)]*\)\)/, 'background:#b9cdf3') + '<div class="c83-star-sub" style="margin:0">Chưa có bài nộp nào.<br>' + (d.stu ? 'Hãy làm bài để lên bảng vinh danh nhé!' : 'Giao đề cho lớp để xem học sinh nổi bật.') + '</div></div>';
        }
        s += '</section></div>';

        // Hàng dưới
        s += '<div class="c83-main">';
        // Đề đề xuất
        s += '<section class="c83-col" aria-label="Đề thi được đề xuất"><h3>Đề Thi Được Đề Xuất</h3>';
        if (d.picked.length) {
            var tagTxt = { 'new': 'Mới', hot: 'Đã Phổ Biến', pub: 'Đã Xuất Bản', draft: 'Bản Nháp', asg: 'Được Giao' };
            s += '<div class="c83-recs">';
            d.picked.forEach(function (p) {
                var t = p.t, nq = arr(t.questions).length;
                s += '<button type="button" class="c83-rec" data-c83="topic" data-id="' + H(t.id) + '" title="Mở đề này">' +
                    '<span class="c83-tag ' + p.tag + '">' + tagTxt[p.tag] + '</span>' +
                    '<span class="c83-rec-title">' + H(t.subtitle || t.title || 'Đề chưa đặt tên') + '</span>' +
                    '<span class="c83-subj">' + H([t.subject, t.grade].filter(Boolean).join(' – ') || 'Chưa chọn môn') + '</span>' +
                    '<span class="c83-rec-meta"><span>' + IC.q + nq + ' câu hỏi</span><span>' + IC.clock + (Number(t.timeLimit) || 50) + ' phút</span></span></button>';
            });
            s += '</div>';
        } else {
            s += '<div class="c83-empty">' + (d.stu ? 'Chưa có đề nào được giao.<br>Bấm “TRUY CẬP NHANH LỚP HỌC CỦA TÔI” để xem bài của lớp.' : 'Thư viện chưa có đề nào.<br>Nhấn dấu + ở khung bên phải để soạn đề đầu tiên.') + '</div>';
        }
        s += '</section>';

        // Hoạt động gần đây
        s += '<section class="c83-col" aria-label="Hoạt động gần đây"><h3>Hoạt Động Gần Đây</h3>';
        if (d.recent.length) {
            s += '<div class="c83-acts">';
            d.recent.forEach(function (x) {
                var r = x.r, tp = d.byId[x.k], nm = r.studentName || 'Học sinh', cls = r.className || r.studentClass || '';
                s += (d.stu ? '<div class="c83-act">' : '<button type="button" class="c83-act" data-c83="result" data-id="' + H(x.k) + '" title="Xem kết quả của đề này">') + avatar(nm, 36, cls) +
                    '<span class="c83-act-body"><span class="c83-act-name" style="display:block">' + H(nm) + '</span><span class="c83-act-sub" style="display:block">' + H(tp ? ((tp.subject ? tp.subject + ': ' : '') + (tp.subtitle || tp.title)) : 'Đề đã xóa') + '</span></span>' +
                    '<span class="c83-act-right"><span class="c83-act-score" style="display:block">' + (x.sc === null ? '—' : F1(x.sc) + '/10') + '</span><span class="c83-act-time" style="display:block">' + (cls ? 'Lớp ' + H(cls) : (x.ts ? ago(x.ts) : '')) + '</span></span>' + (d.stu ? '</div>' : '</button>');
            });
            s += '</div>';
        } else {
            s += '<div class="c83-empty">Chưa có học sinh nào nộp bài.</div>';
        }
        s += '</section>';

        // Tạo đề nhanh
        s += d.stu ? honorHtml(d) : '<section class="c83-col" aria-label="Khu vực tạo đề nhanh"><h3>Khu Vực Tạo Đề Nhanh</h3><div class="c83-quickbox">' +
            '<div class="c83-orbit"><span class="c83-ring" aria-hidden="true"></span>' +
            '<button type="button" class="c83-plus" data-c83="new" aria-label="Tạo nhanh đề thi" title="Tạo nhanh đề thi">' + IC.plus + '</button>' +
            '<div class="c83-mini"><button type="button" class="c83-o-word" data-c83="word">' + IC.word + 'NHẬP TỪ WORD</button><button type="button" class="c83-o-lib" data-c83="lib">' + IC.folder + 'MỞ THƯ VIỆN</button><button type="button" class="c83-o-bank" data-c83="bank" title="Mở Ngân hàng đề">📚 NGÂN HÀNG ĐỀ</button></div>' +
            '<button type="button" class="c83-mixbtn c83-o-mix" data-c83="mix" title="Trộn đề thi thành nhiều mã đề">🔀 TRỘN ĐỀ THI</button></div>' +
            '<p class="c83-quick-t">Soạn đề mới trong vài bước</p>' +
            '<p class="c83-quick-p">Nhấn dấu <b>+</b> để tạo nhanh đề thi, hoặc chọn một nút xung quanh.</p></div></section>';
        s += '</div>';
        s += '<div class="c164-credit">🎨 ' + H(window.CODE164Designer ? window.CODE164Designer.line() : 'Design: ThS Nguyễn Phú Hoạt') + '</div>';   /* [CODE164] */
        return s;
    }

    function signature(d) {
        return (d.stu ? d.sigExtra : '') + '#' + [d.topics.length, d.newCount, d.classes.length, d.studentsTotal, d.week, d.totalResults, d.latestTs, Math.floor(Date.now() / 60000),
            d.topics.reduce(function (m, t) { return Math.max(m, t.updatedAt || 0); }, 0), d.topics.filter(function (t) { return t && t.isPublished; }).length, (window.CODE164Designer ? window.CODE164Designer.line() : '')].join('|');
    }

    function onClick(e) {
        var b = e.target.closest ? e.target.closest('[data-c83]') : null; if (!b) return;
        var a = b.getAttribute('data-c83'), id = b.getAttribute('data-id');
        try {
            if (a === 'myclasses') openStudentClasses();
            else if (a === 'bw' || a === 'ba') { boardMode = a === 'bw' ? 'week' : 'all'; lastSig = ''; refresh(); }
            else if (a === 'lib') openLibrary();
            else if (a === 'bank') { if (window.CODE126Bank) CODE126Bank.open(); }   /* [CODE165] */
            else if (a === 'classes') openClassManager();
            else if (a === 'new') openEditor(null);
            else if (a === 'word') { openEditor(null); setTimeout(function () { if (typeof openWordImportModal === 'function') openWordImportModal(); }, 350); }
            else if (a === 'mix') { if (window.CODE93Mix) CODE93Mix.open(); }
            else if (a === 'topic') loadTopic(id);
            else if (a === 'result') openResultsModal(id);
        } catch (err) { console.warn('[CODE83] ' + a, err); }
    }

    function render(container) {
        if (!container) return false;
        if (isStu()) { if (!cloud.ts) loadCloudCache(); }
        var d = collect();
        container.innerHTML = wrapHtml(d);
        el = container.firstChild;
        el.addEventListener('click', onClick);
        lastSig = signature(d);
        kick();
        hydrate(el);
        return true;
    }

    // Làm mới nhẹ nhàng: chỉ vẽ lại khi dữ liệu thật sự thay đổi (không giật, không mất vị trí cuộn)
    function refresh() {
        timer = 0;
        kick();
        if (!el || !document.body.contains(el)) { el = null; return; }
        if (document.hidden) return;
        var d = collect();
        var sig = signature(d);
        if (sig === lastSig) { hydrate(el); return; }
        var host = el.parentNode, top = host ? host.scrollTop : 0;
        el.removeEventListener('click', onClick);
        host.innerHTML = wrapHtml(d);
        el = host.firstChild; el.addEventListener('click', onClick);
        host.scrollTop = top; lastSig = sig; hydrate(el);
    }
    function schedule() { if (el && !timer) timer = setTimeout(refresh, 400); }

    function wrap(name) {
        var orig = window[name];
        if (typeof orig !== 'function' || orig.__c83) return;
        var w = function () { var r = orig.apply(this, arguments); schedule(); return r; };
        w.__c83 = true; window[name] = w;
    }
    function init() {
        ['saveToStorage', 'saveStudentResultsToStorage', 'cmSave', 'loadStudentResultsFromStorage', 'cmLoad', 'closeStudentClasses'].forEach(wrap);
        tick = setInterval(function () { if (el) schedule(); }, 30000);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(); });
    }
    window.CODE83Home = { render: render, refresh: refresh };
    window.CODE85Home = window.CODE83Home;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// === [code99-avatar] ===
/* [CODE99] Ảnh đại diện cho Giáo viên VÀ Học sinh: 1 nút duy nhất (bấm vào ảnh tròn), chạy được trên điện thoại,
   tự thu nhỏ 160px và ĐỒNG BỘ qua máy chủ (Firebase) để mở trên máy/trình duyệt nào cũng thấy cùng ảnh. */
(function () {
    'use strict';
    var KEY = 'matrix_avatar_v2:', box = null, input = null, lastPull = 0, busy = false, status = '';
    function $(id) { return document.getElementById(id); }
    function isStu() { return typeof isStudentMode !== 'undefined' && isStudentMode === true; }
    function fold(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
    function nm() { try { return String($('main-fullname-input').value || '').trim(); } catch (e) { return ''; } }
    function cl() { try { return String($('main-class-input').value || '').trim(); } catch (e) { return ''; } }
    function ukey() { var n = fold(nm()); if (!n) return ''; return isStu() ? 'hs_' + n + '_' + fold(cl()) : 'gv_' + n; }
    function api() { return window.CloudSync && CloudSync.api ? CloudSync.api : null; }
    function lget() { try { var o = JSON.parse(localStorage.getItem(KEY + ukey()) || 'null'); return (o && typeof o === 'object') ? o : { d: '', ts: 0 }; } catch (e) { return { d: '', ts: 0 }; } }
    function lset(o) { try { localStorage.setItem(KEY + ukey(), JSON.stringify(o)); return true; } catch (e) { return false; } }
    function css() {
        if ($('code99-css')) return;
        var st = document.createElement('style'); st.id = 'code99-css';
        st.textContent = '#c99-wrap{position:relative;width:80px;margin:0 auto 2px;flex:none;text-align:center}' +
            '#c99-ring{position:relative;width:76px;height:76px;margin:0 auto;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,.35);background:linear-gradient(135deg,#6366f1,#2563eb);color:#fff;font-weight:900;font-size:28px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
            '#c99-ring img{width:100%;height:100%;object-fit:cover;display:block}' +
            '#c99-in{position:absolute;left:0;top:0;width:76px;height:76px;margin:0;padding:0;opacity:0;cursor:pointer;border-radius:50%;z-index:3;font-size:0}' +
            '#c99-cam{position:absolute;right:2px;bottom:2px;width:24px;height:24px;border-radius:50%;background:#2563eb;color:#fff;border:2px solid #fff;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2}' +
            '#c99-cam.ok{background:#059669}#c99-cam.bad{background:#d97706}' +
            'body.layout-portrait:not(.printing-a4) #c99-wrap{width:auto;display:flex;align-items:center;gap:6px;margin:0}body.layout-portrait:not(.printing-a4) #c99-ring{width:40px;height:40px;font-size:15px;border-width:2px;margin:0}' +
            'body.layout-portrait:not(.printing-a4) #c99-in{width:40px;height:40px}body.layout-portrait:not(.printing-a4) #c99-cam{display:none}';
        document.head.appendChild(st);
    }
    function build() {
        var ub = $('user-box'); if (!ub) return false;
        /* [CODE100] Chống trùng nút: xóa MỌI khung ảnh cũ (kể cả khung bị lưu cứng vào file khi "Tải index.html") rồi chỉ tạo 1 khung */
        if (box && ub.contains(box) && document.querySelectorAll('#c99-wrap, #c98-ava-wrap').length === 1) return true;
        css();
        var olds = document.querySelectorAll('#c99-wrap, #c98-ava-wrap, .c99-dup');
        for (var i = 0; i < olds.length; i++) { if (olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]); }
        box = document.createElement('div'); box.id = 'c99-wrap';
        box.innerHTML = '<div id="c99-ring"></div><span id="c99-cam" aria-hidden="true">📷</span>' +
            '<input type="file" id="c99-in" accept="image/*" title="Bấm để đổi ảnh đại diện" aria-label="Tải ảnh đại diện lên">' +
            '';
        ub.insertBefore(box, ub.firstChild);
        input = $('c99-in');
        input.addEventListener('click', function (e) { if (!ukey()) { e.preventDefault(); alert('Hãy đăng nhập (nhập họ tên) trước khi tải ảnh đại diện.'); } });
        input.addEventListener('change', function () { var f = input.files && input.files[0]; if (f) readFile(f); try { input.value = ''; } catch (e) {} });
        return true;
    }
    /* Trạng thái đồng bộ hiển thị bằng màu + chú thích của biểu tượng 📷 (xanh = đã đồng bộ, cam = chưa) để không tốn chỗ */
    function setStatus(t, cls) { status = t; var e = $('c99-cam'); if (e) { e.className = cls || ''; e.title = t || 'Bấm vào ảnh để đổi ảnh đại diện'; } }
    function readFile(f) {
        if (f.type && !/^image\//.test(f.type)) { alert('Vui lòng chọn file ảnh (JPG, PNG, WEBP).'); return; }
        var url = null, im = new Image();
        try { url = (window.URL || window.webkitURL).createObjectURL(f); } catch (e) {}
        function done(src) {
            im.onload = function () {
                try {
                    var S = 160, c = document.createElement('canvas'); c.width = c.height = S;
                    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, side = Math.min(w, h);
                    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
                    g.drawImage(im, (w - side) / 2, (h - side) / 2, side, side, 0, 0, S, S);
                    var data = c.toDataURL('image/jpeg', 0.82);
                    if (url) { try { (window.URL || window.webkitURL).revokeObjectURL(url); } catch (e) {} }
                    if (!lset({ d: data, ts: Date.now() })) { alert('Không lưu được ảnh (bộ nhớ trình duyệt đầy). Hãy thử ảnh khác.'); return; }
                    paint(); push();
                } catch (e) { alert('Không xử lý được ảnh này. Hãy chọn ảnh JPG hoặc PNG khác.'); }
            };
            im.onerror = function () { alert('Không đọc được ảnh này (có thể là định dạng HEIC). Hãy chọn ảnh JPG hoặc PNG.'); };
            im.src = src;
        }
        if (url) done(url);
        else { var fr = new FileReader(); fr.onload = function () { done(fr.result); }; fr.onerror = function () { alert('Không đọc được file ảnh.'); }; fr.readAsDataURL(f); }
    }
    function initial() { var n = nm().split(/\s+/); return (n[n.length - 1] || '?').charAt(0).toUpperCase(); }
    function paint() {
        if (!build()) return;
        var ring = $('c99-ring'), o = lget();
        ring.innerHTML = '';
        if (o.d) { var im = document.createElement('img'); im.alt = 'Ảnh đại diện'; im.src = o.d; ring.appendChild(im); box.classList.add('has'); }
        else { ring.textContent = initial(); box.classList.remove('has'); }
        if (status) setStatus(status, $('c99-cam') && $('c99-cam').className);
    }
    /* ---- đồng bộ qua máy chủ: dùng chung kho dữ liệu của app (nhánh avatars/…) ---- */
    function remotePath() { return 'avatars/' + (api() ? api().enc(ukey()) : ukey()); }
    function connected() { var a = api(); try { return !!(a && a.effStu()); } catch (e) { return false; } }
    function push() {
        var k = ukey(); if (!k) return Promise.resolve();
        if (!connected()) { setStatus('⚠ Chưa kết nối máy chủ', 'bad'); return Promise.resolve(); }
        var o = lget(); setStatus('Đang đồng bộ…', '');
        return api().req('PUT', 's', remotePath(), { d: o.d || '', ts: o.ts || Date.now() }).then(function () {
            if (ukey() === k) setStatus('☁ Đã đồng bộ', 'ok');
        }, function () { if (ukey() === k) setStatus('⚠ Chưa đồng bộ được', 'bad'); });
    }
    function pull(force) {
        var k = ukey(); if (!k || busy || document.hidden) return;
        if (!connected()) return;
        if (!force && Date.now() - lastPull < 90000) return;
        busy = true; lastPull = Date.now();
        api().req('GET', 's', remotePath() + '?cb=' + Date.now()).then(function (r) {
            busy = false; if (ukey() !== k) return;
            var l = lget(), rts = (r && +r.ts) || 0;
            if (r && rts > (l.ts || 0) && typeof r.d === 'string') { lset({ d: r.d, ts: rts }); paint(); setStatus('☁ Đã đồng bộ', 'ok'); }
            else if ((l.ts || 0) > rts) push();
            else setStatus((l.ts || r) ? '☁ Đã đồng bộ' : '', 'ok');
        }, function () { busy = false; setStatus(lget().d ? '⚠ Chưa đồng bộ được' : '', 'bad'); });
    }
    function start() {
        paint(); pull(true);
        var t = 0, run = function () { if (t) return; t = setTimeout(function () { t = 0; paint(); lastPull = 0; pull(true); }, 150); };
        ['user-name', 'user-role-label'].forEach(function (id) {
            var e = $(id); if (e && window.MutationObserver) new MutationObserver(run).observe(e, { childList: true, characterData: true, subtree: true });
        });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) pull(false); });
        window.addEventListener('online', function () { lastPull = 0; pull(true); });
        setInterval(function () { pull(false); }, 120000);
        setTimeout(function () { lastPull = 0; pull(true); }, 4000);   /* chờ CloudSync khởi động xong */
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// === [code103-reload-home] ===
/* [CODE103] Bấm nút TẢI LẠI của trình duyệt (F5 / Ctrl+R / ⟳) => luôn về TRANG CHỦ.
   Sau khi app khởi động xong, nếu là lần tải lại thì: đóng mọi cửa sổ đang mở (Thư viện, Lớp học, Trộn đề, Kết quả...),
   bỏ đề đang mở và hiển thị lại trang chủ. Giữ nguyên đăng nhập. Nếu người dùng đã bắt đầu thao tác thì không can thiệp nữa. */
(function () {
    'use strict';
    if (!window.__RELOAD_HOME__) return;
    var touched = false, runs = 0;
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { touched = true; }, { capture: true, passive: true, once: true }); });
    function closeAll() {
        var sel = '#library-modal,#class-modal,#student-class-modal,#results-modal,#result-detail-modal,#folder-modal,#move-topic-modal,#assign-modal,#cm-form-modal,#mix-modal,#my-results-modal';
        var nodes = document.querySelectorAll(sel);
        for (var i = 0; i < nodes.length; i++) { nodes[i].classList.add('hidden', 'opacity-0'); }
    }
    function forceHome() {
        if (touched || runs >= 4) return;
        runs++;
        try {
            var qa = typeof questionsData !== 'undefined' ? questionsData : null;
            var inQuiz = false;
            try { inQuiz = isStudentMode && hasStartedQuiz && !isQuizSubmitted && qa && qa.length > 0; } catch (e) {}
            if (inQuiz) return;
            closeAll();
            if (typeof goHome === 'function') goHome();
            if (qa && qa.length && typeof clearToBlankState === 'function') clearToBlankState();
            window.scrollTo(0, 0);
        } catch (e) {}
    }
    if (document.readyState === 'complete') forceHome(); else window.addEventListener('load', forceHome);
    [600, 1800, 3500].forEach(function (ms) { setTimeout(forceHome, ms); });
})();

// === [code164-designer] ===
/* [CODE164] "Design: <tên>" trên trang chủ và màn hình đăng nhập = tên GIÁO VIÊN ĐĂNG NHẬP LẦN ĐẦU TIÊN.
   - Chưa có giáo viên nào đăng nhập: hiển thị mặc định "Design: ThS Nguyễn Phú Hoạt".
   - Lần đăng nhập giáo viên đầu tiên: lưu tên (localStorage) và đẩy 1 lần lên Firebase s/meta/designer (chỉ vài chục byte) để máy khác / máy học sinh cùng thấy.
   - Tiết kiệm Firebase: đã đồng bộ xong thì KHÔNG đọc/ghi thêm; máy chưa có tên chỉ kiểm tra tối đa 6 giờ/lần. Tên đã lưu không bị đổi khi giáo viên sửa họ tên sau này. */
(function () {
    'use strict';
    var LS = 'matrix_designer_v1', LSC = 'matrix_designer_chk_v1', DEFAULT = 'ThS Nguyễn Phú Hoạt', PATH = 'meta/designer', GAP = 6 * 3600e3, busy = false;
    function ls(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function clean(n) { return String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, 80); }
    function rec() { var r = ls(LS); return r && r.n ? r : null; }
    function name() { var r = rec(); return r ? r.n : DEFAULT; }
    function line() { return 'Design: ' + name(); }
    function api() { return window.CloudSync && window.CloudSync.api ? window.CloudSync.api : null; }
    function connected() { try { var a = api(); return !!(a && a.effStu()); } catch (e) { return false; } }
    function paint() {
        try { var p = document.getElementById('login-design-line'); if (p) p.textContent = 'QUẢN LÝ ĐỀ THI - ' + line(); } catch (e) {}
        try { if (window.CODE83Home) window.CODE83Home.refresh(); } catch (e) {}
    }
    function setLocal(n, t, pushed) { lss(LS, { n: n, t: t || Date.now(), p: pushed ? 1 : 0 }); paint(); }
    function sync(canPush) {
        var a = api(), r = rec();
        if (!a || busy || !connected()) return;
        if (r && r.p) return;   // đã đồng bộ xong: không đọc / ghi thêm
        if (!canPush && !r) { var c = ls(LSC); if (c && Date.now() - c < GAP) return; }
        busy = true;
        a.req('GET', 's', PATH).then(function (remote) {
            if (remote && remote.n) { setLocal(clean(remote.n), remote.t, true); return; }   // máy chủ đã có tên: dùng tên đó cho mọi máy
            if (canPush && r) return a.req('PUT', 's', PATH + '?print=silent', { n: r.n, t: r.t }).then(function () { setLocal(r.n, r.t, true); });
            lss(LSC, Date.now());
        }).catch(function () { lss(LSC, Date.now() - GAP + 600e3); }).then(function () { busy = false; });
    }
    function claim(fullName) {   // gọi khi giáo viên đăng nhập; chỉ lưu nếu CHƯA có tên
        var n = clean(fullName); if (!n) return;
        if (!rec()) setLocal(n, Date.now(), false);
        sync(true);
    }
    function init() {
        paint();
        setTimeout(function () { sync(false); }, 3000);
        window.addEventListener('online', function () { sync(false); });
    }
    window.CODE164Designer = { claim: claim, line: line, name: name, sync: sync, paint: paint };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
