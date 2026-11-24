/* ============================================================================
 * js/video-lecture.js — Mô-đun độc lập 🎥 Bài giảng YouTube & Bàn giao bảo mật (v8-4)
 * - Ẩn URL gốc (chỉ lưu videoId 11 ký tự), phát qua youtube-nocookie.com + iframe sandbox
 * - 3 chế độ mở: free | after_submit | locked
 * - Giao chỉ định học sinh thông minh (Gõ tìm không dấu + Cả lớp + Nhóm điểm < 5.0 + Dán)
 * - Đồng bộ tự động qua savedTopics (Firebase Pool & GAS) + Link/QR bàn giao (?lecture=...)
 * ============================================================================ */
(function (global) {
    'use strict';

    var U = global.LTDUtils || {
        esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
        normFold: function (s) { s = String(s || '').toLowerCase(); try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {} return s.replace(/đ/g, 'd'); }
    };

    function extractYoutubeId(url) {
        var raw = String(url || '').trim();
        if (!raw) return '';
        if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
        var m = raw.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([A-Za-z0-9_-]{11})/);
        return m ? m[1] : '';
    }

    function buildSafeEmbedUrl(videoId) {
        var id = extractYoutubeId(videoId);
        if (!id) return '';
        return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1&iv_load_policy=3';
    }

    function buildSafeIframeHtml(videoId, title) {
        var src = buildSafeEmbedUrl(videoId);
        if (!src) return '';
        return '<iframe src="' + src + '" title="' + U.esc(title || 'Bài giảng') + '" ' +
            'loading="lazy" style="width:100%;height:100%;border:0;display:block" ' +
            'allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" ' +
            'sandbox="allow-scripts allow-same-origin allow-presentation" ' +
            'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    }

    function canStudentWatch(topic, submitted, studentName) {
        if (!topic || !Array.isArray(topic.videoLectures) || !topic.videoLectures.length) {
            return { ok: false, reason: 'empty', message: 'Đề này chưa có video bài giảng.' };
        }
        var scope = topic.videoTargetScope === 'selected' ? 'selected' : 'all';
        if (scope === 'selected') {
            var list = Array.isArray(topic.videoTargetStudents) ? topic.videoTargetStudents : [];
            var me = U.normFold(String(studentName || '').trim()).replace(/\s+/g, ' ').trim();
            var matched = !!me && list.some(function (n) {
                return U.normFold(String(n || '').trim()).replace(/\s+/g, ' ').trim() === me;
            });
            if (!matched) {
                return { ok: false, reason: 'not_assigned', message: 'Video bài giảng này chỉ dành cho học sinh được giáo viên chỉ định.' };
            }
        }
        var mode = topic.videoMode || 'free';
        if (mode === 'locked') {
            return { ok: false, reason: 'locked', message: 'Bài giảng hiện đang tạm khóa bởi giáo viên.' };
        }
        if (mode === 'after_submit' && !submitted) {
            return { ok: false, reason: 'need_submit', message: 'Hãy hoàn thành và nộp bài thi để mở khóa video bài giảng.' };
        }
        return { ok: true, reason: 'ok', message: '' };
    }

    function b64UrlEncode(str) {
        var bytes = new TextEncoder().encode(str);
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function b64UrlDecode(b64) {
        var s = String(b64 || '').replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        var bin = atob(s);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    function encodeLectureLink(topic, baseUrl) {
        if (!topic) return '';
        var payload = {
            tid: topic.id,
            title: topic.subtitle || topic.title || 'Bài giảng',
            mode: topic.videoMode || 'free',
            scope: topic.videoTargetScope || 'all',
            students: Array.isArray(topic.videoTargetStudents) ? topic.videoTargetStudents : [],
            videos: Array.isArray(topic.videoLectures) ? topic.videoLectures : []
        };
        var base = baseUrl || (typeof global.getEffectiveBaseUrl === 'function' ? global.getEffectiveBaseUrl() : (global.location ? global.location.href.split('?')[0] : ''));
        return base + '?lecture=' + b64UrlEncode(JSON.stringify(payload));
    }

    function decodeLectureParam(param) {
        try {
            var obj = JSON.parse(b64UrlDecode(param));
            if (!obj || !Array.isArray(obj.videos)) return null;
            return {
                id: obj.tid || '',
                title: obj.title || 'Bài giảng',
                subtitle: obj.title || 'Bài giảng',
                videoMode: obj.mode || 'free',
                videoTargetScope: obj.scope || 'all',
                videoTargetStudents: Array.isArray(obj.students) ? obj.students : [],
                videoLectures: obj.videos
            };
        } catch (e) {
            return null;
        }
    }

    function getTopicsList() {
        try {
            if (global.LTDLibBridge && typeof global.LTDLibBridge.getTopics === 'function') return global.LTDLibBridge.getTopics() || [];
            return Array.isArray(global.savedTopics) ? global.savedTopics : [];
        } catch (e) { return []; }
    }

    function findTopicById(tid) {
        var list = getTopicsList();
        for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === tid) return list[i];
        return null;
    }

    function getAllRosterStudents() {
        var classes = [];
        try {
            if (global.LTDLibBridge && typeof global.LTDLibBridge.getClasses === 'function') classes = global.LTDLibBridge.getClasses() || [];
            else {
                if (typeof global.cmLoad === 'function') global.cmLoad();
                classes = Array.isArray(global.classesData) ? global.classesData : [];
            }
        } catch (e2) {}
        var seen = {}, out = [];
        classes.forEach(function (c) {
            var cname = c.name || c.title || 'Lớp';
            (c.students || []).forEach(function (st) {
                var nm = typeof st === 'string' ? st : (st && st.name ? st.name : '');
                nm = String(nm || '').trim();
                var k = U.normFold(nm);
                if (nm && !seen[k]) {
                    seen[k] = 1;
                    out.push({ name: nm, cls: cname });
                }
            });
        });
        return { classes: classes, students: out };
    }

    function getUnder5StudentsForTopic(topicId) {
        var resList = [];
        try {
            if (global.LTDLibBridge && typeof global.LTDLibBridge.getResultsByTopic === 'function') resList = global.LTDLibBridge.getResultsByTopic(topicId) || [];
            else resList = Array.isArray(global.studentResults) ? global.studentResults : [];
        } catch (e) {}
        var best = {};
        resList.forEach(function (r) {
            if (!r || r.topicId !== topicId || !r.studentName) return;
            var sc = r.score10 != null ? parseFloat(r.score10) : (r.scorePercent != null ? parseFloat(r.scorePercent) / 10 : null);
            if (!isFinite(sc)) return;
            var nm = String(r.studentName).trim();
            if (best[nm] == null || sc > best[nm]) best[nm] = sc;
        });
        return Object.keys(best).filter(function (nm) { return best[nm] < 5; });
    }

    function getCurrentStudentName() {
        try {
            var el = global.document.getElementById('main-fullname-input') || global.document.getElementById('login-name-input');
            if (el && el.value) return el.value.trim();
        } catch (e) {}
        try {
            if (global.LTDLibBridge && typeof global.LTDLibBridge.getStudentName === 'function') {
                var bName = global.LTDLibBridge.getStudentName();
                if (bName) return bName;
            }
            if (typeof global.getStudentIdentity === 'function') {
                var id = global.getStudentIdentity();
                if (id && id.name) return id.name;
            }
        } catch (e2) {}
        return '';
    }

    function isTopicSubmitted(topicId) {
        try {
            if (global.LTDLibBridge && typeof global.LTDLibBridge.isSubmittedTopic === 'function') return !!global.LTDLibBridge.isSubmittedTopic(topicId);
            if (global.currentTopic && global.currentTopic.id === topicId && global.isQuizSubmitted) return true;
            if (typeof global.hasAttemptFor === 'function' && global.hasAttemptFor(topicId)) return true;
        } catch (e) {}
        return false;
    }

    function openTeacherModal(topicId) {
        var topic = findTopicById(topicId);
        if (!topic) return;
        var mode = topic.videoMode || 'free';
        var scope = topic.videoTargetScope === 'selected' ? 'selected' : 'all';
        var picked = Array.isArray(topic.videoTargetStudents) ? topic.videoTargetStudents.slice() : [];
        var videos = Array.isArray(topic.videoLectures) ? topic.videoLectures.map(function (v) { return { id: v.id, title: v.title }; }) : [];
        var rosterInfo = getAllRosterStudents();

        var ov = global.document.createElement('div');
        ov.id = 'ltd-vl-teacher-modal';
        ov.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto';
        ov.innerHTML =
            '<div style="background:#fff;border-radius:16px;padding:18px;width:100%;max-width:700px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:Segoe UI,system-ui,-apple-system,Arial,sans-serif">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e2e8f0;margin-bottom:12px">' +
                '<div><div style="font-size:11.5px;color:#64748b;font-weight:700">BÀI GIẢNG YOUTUBE &amp; BÀN GIAO BẢO MẬT</div><b style="font-size:16px;color:#0f172a">🎥 ' + U.esc(topic.subtitle || topic.title || 'Đề thi') + '</b></div>' +
                '<button type="button" id="vl-close" style="font-size:18px;font-weight:800;padding:4px 9px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer">✕</button>' +
              '</div>' +
              '<div id="vl-mode-seg" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#f1f5f9;padding:5px;border-radius:12px;margin-bottom:12px">' +
                '<button type="button" data-m="free" style="border:none;padding:8px;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer">🟢 Mở tự do</button>' +
                '<button type="button" data-m="after_submit" style="border:none;padding:8px;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer">🟡 Sau nộp bài</button>' +
                '<button type="button" data-m="locked" style="border:none;padding:8px;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer">🔴 Tạm khóa</button>' +
              '</div>' +
              '<div style="border:1.5px solid #cbd5e1;border-radius:12px;padding:12px;margin-bottom:12px;background:#f8fafc">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
                  '<b style="font-size:13.5px">👥 Đối tượng được xem <span id="vl-sel-cnt" style="color:#2563eb"></span></b>' +
                  '<div id="vl-scope-seg" style="display:inline-flex;background:#e2e8f0;border-radius:9px;padding:3px;gap:3px">' +
                    '<button type="button" data-s="all" style="border:none;padding:5px 11px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer">Tất cả HS</button>' +
                    '<button type="button" data-s="selected" style="border:none;padding:5px 11px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer">🎯 Chỉ định riêng</button>' +
                  '</div>' +
                '</div>' +
                '<div id="vl-smart-picker" style="margin-top:8px">' +
                  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
                    (rosterInfo.classes.length ? '<select id="vl-cls-pick" style="border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:700"><option value="">🏫 + Chọn cả lớp...</option>' + rosterInfo.classes.map(function (c, ci) { return '<option value="' + ci + '">' + U.esc(c.name || c.title || ('Lớp ' + (ci + 1))) + '</option>'; }).join('') + '</select>' : '') +
                    '<button type="button" id="vl-under5" style="border:1px solid #fed7aa;background:#fff7ed;color:#c2410c;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📉 + Nhóm điểm &lt; 5.0</button>' +
                    '<button type="button" id="vl-paste" style="border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📋 Dán danh sách</button>' +
                    '<button type="button" id="vl-clear-stu" style="border:1px solid #cbd5e1;background:#fff;color:#475569;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🗑 Xóa hết</button>' +
                  '</div>' +
                  '<div style="position:relative;background:#fff;border:1.5px solid #cbd5e1;border-radius:10px;padding:6px 8px;display:flex;flex-wrap:wrap;gap:5px;align-items:center">' +
                    '<div id="vl-tokens" style="display:contents"></div>' +
                    '<input id="vl-stu-q" type="text" placeholder="Gõ tên HS (không dấu vẫn tìm ra)..." style="border:none;outline:none;flex:1;min-width:150px;font-size:13px;padding:4px">' +
                    '<div id="vl-suggest" style="position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1.5px solid #93c5fd;border-radius:10px;box-shadow:0 10px 25px rgba(15,23,42,.15);z-index:30;max-height:150px;overflow-y:auto;display:none"></div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;gap:8px;margin-bottom:10px">' +
                '<input id="vl-yt-inp" type="text" placeholder="Dán link YouTube (watch?v=, youtu.be/, shorts/)..." style="flex:1;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px">' +
                '<button type="button" id="vl-add-btn" class="px-4 py-2 rounded-xl font-black text-white bg-blue-600">+ Thêm video</button>' +
              '</div>' +
              '<div id="vl-vid-list" style="display:grid;gap:7px;margin-bottom:12px"></div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:#f0fdfa;border:1.5px solid #5eead4;border-radius:12px;padding:11px 14px;margin-bottom:12px">' +
                '<div style="font-size:12.5px;color:#0f766e;min-width:0;flex:1"><b>🔗 Link bàn giao bảo mật (ẩn link YouTube gốc):</b><div id="vl-share-txt" style="font-family:monospace;font-size:11.5px;word-break:break-all;margin-top:3px"></div></div>' +
                '<div style="display:flex;gap:6px">' +
                  '<button type="button" id="vl-copy-link" style="background:#0d9488;color:#fff;border:none;padding:7px 11px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer">📋 Chép Link</button>' +
                  '<button type="button" id="vl-show-qr" style="background:#fff;border:1px solid #0d9488;color:#0f766e;padding:7px 11px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer">📱 Xem QR</button>' +
                '</div>' +
              '</div>' +
              '<div id="vl-qr-box" style="display:none;text-align:center;margin-bottom:12px"></div>' +
              '<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:700;color:#0f172a;cursor:pointer"><input type="checkbox" id="vl-publish-chk"' + ((topic.isPublished !== false && mode !== 'locked') ? ' checked' : '') + '> 🚀 Xuất bản ra Thư viện học sinh</label>' +
              '<div style="display:flex;gap:8px;justify-content:flex-end">' +
                '<button type="button" id="vl-cancel" class="px-4 py-2 rounded-xl font-bold bg-slate-100">Đóng</button>' +
                '<button type="button" id="vl-save" class="px-4 py-2 rounded-xl font-black text-white bg-emerald-600">💾 Lưu &amp; Đồng bộ Cloud</button>' +
              '</div>' +
            '</div>';
        global.document.body.appendChild(ov);

        function paintSegs() {
            ov.querySelectorAll('#vl-mode-seg button').forEach(function (b) {
                var on = b.getAttribute('data-m') === mode;
                b.style.background = on ? '#fff' : 'transparent';
                b.style.color = on ? '#0f172a' : '#475569';
                b.style.boxShadow = on ? '0 1px 4px rgba(0,0,0,.12)' : 'none';
            });
            ov.querySelectorAll('#vl-scope-seg button').forEach(function (b) {
                var on = b.getAttribute('data-s') === scope;
                b.style.background = on ? '#fff' : 'transparent';
                b.style.color = on ? '#0f172a' : '#475569';
            });
            ov.querySelector('#vl-smart-picker').style.display = scope === 'selected' ? 'block' : 'none';
            ov.querySelector('#vl-sel-cnt').textContent = scope === 'selected' ? '(' + picked.length + ' HS)' : '';
        }

        function paintTokens() {
            if (scope !== 'selected') {
                ov.querySelector('#vl-smart-picker').style.display = 'none';
                ov.querySelector('#vl-sel-cnt').textContent = '(Cả lớp)';
                return;
            }
            paintSegs();
            var box = ov.querySelector('#vl-tokens');
            box.innerHTML = picked.map(function (n, i) {
                return '<span style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;color:#1e40af;padding:3px 8px;border-radius:7px;font-size:12.5px;font-weight:700">' + U.esc(n) +
                    '<button type="button" data-del-stu="' + i + '" style="border:none;background:transparent;color:#1e40af;cursor:pointer;font-weight:800">✕</button></span>';
            }).join('');
            box.querySelectorAll('[data-del-stu]').forEach(function (b) {
                b.onclick = function () { picked.splice(parseInt(b.getAttribute('data-del-stu'), 10), 1); paintTokens(); };
            });
        }

        function addStuName(nm) {
            nm = String(nm || '').trim();
            if (!nm) return;
            var k = U.normFold(nm);
            if (!picked.some(function (x) { return U.normFold(x) === k; })) picked.push(nm);
        }

        function paintVideos() {
            var box = ov.querySelector('#vl-vid-list');
            box.innerHTML = videos.map(function (v, i) {
                return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">' +
                    '<span style="width:22px;height:22px;border-radius:6px;background:#dbeafe;color:#1d4ed8;font-weight:800;font-size:12px;display:grid;place-items:center">' + (i + 1) + '</span>' +
                    '<input data-vtitle="' + i + '" value="' + U.esc(v.title) + '" style="flex:1;border:1px solid transparent;background:transparent;font-weight:600;font-size:13.5px;padding:3px 6px">' +
                    '<span style="font-size:11.5px;color:#64748b;background:#e2e8f0;padding:2px 6px;border-radius:6px;font-family:monospace">' + U.esc(v.id) + '</span>' +
                    '<button type="button" data-vdel="' + i + '" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-weight:800">✕</button></div>';
            }).join('') || '<div style="font-size:13px;color:#64748b;text-align:center;padding:8px">Chưa có video nào. Dán link YouTube ở trên để thêm.</div>';
            box.querySelectorAll('[data-vtitle]').forEach(function (inp) {
                inp.onchange = function () { videos[parseInt(inp.getAttribute('data-vtitle'), 10)].title = inp.value; updateShareUrl(); };
            });
            box.querySelectorAll('[data-vdel]').forEach(function (b) {
                b.onclick = function () { videos.splice(parseInt(b.getAttribute('data-vdel'), 10), 1); paintVideos(); };
            });
            updateShareUrl();
        }

        function tempTopic() {
            return Object.assign({}, topic, { videoMode: mode, videoTargetScope: scope, videoTargetStudents: picked, videoLectures: videos });
        }
        function updateShareUrl() {
            ov.querySelector('#vl-share-txt').textContent = encodeLectureLink(tempTopic());
        }

        ov.querySelectorAll('#vl-mode-seg button').forEach(function (b) {
            b.onclick = function () { mode = b.getAttribute('data-m'); paintSegs(); updateShareUrl(); };
        });
        ov.querySelectorAll('#vl-scope-seg button').forEach(function (b) {
            b.onclick = function () { scope = b.getAttribute('data-s'); paintTokens(); updateShareUrl(); };
        });
        var clsPick = ov.querySelector('#vl-cls-pick');
        if (clsPick) clsPick.onchange = function () {
            var idx = parseInt(clsPick.value, 10);
            if (!isNaN(idx) && rosterInfo.classes[idx]) {
                (rosterInfo.classes[idx].students || []).forEach(function (st) { addStuName(typeof st === 'string' ? st : st.name); });
                paintTokens(); updateShareUrl();
            }
            clsPick.value = '';
        };
        ov.querySelector('#vl-under5').onclick = function () {
            var weak = getUnder5StudentsForTopic(topic.id);
            if (!weak.length) { alert('Chưa có học sinh nào đạt dưới 5.0 ở đề này.'); return; }
            weak.forEach(addStuName); paintTokens(); updateShareUrl();
        };
        ov.querySelector('#vl-paste').onclick = function () {
            var s = global.prompt('Dán danh sách tên học sinh (mỗi dòng 1 em hoặc cách nhau bởi dấu phẩy):');
            if (!s) return;
            s.split(/[\n,;]+/).forEach(addStuName); paintTokens(); updateShareUrl();
        };
        ov.querySelector('#vl-clear-stu').onclick = function () { picked = []; paintTokens(); updateShareUrl(); };

        var qInp = ov.querySelector('#vl-stu-q'), sug = ov.querySelector('#vl-suggest');
        qInp.oninput = function () {
            var q = U.normFold(qInp.value.trim());
            if (!q) { sug.style.display = 'none'; return; }
            var hits = rosterInfo.students.filter(function (s) { return U.normFold(s.name).indexOf(q) >= 0; }).slice(0, 12);
            if (!hits.length) { sug.style.display = 'none'; return; }
            sug.style.display = 'block';
            sug.innerHTML = hits.map(function (s) {
                return '<div data-pick-stu="' + U.esc(s.name) + '" style="padding:7px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f5f9"><b>' + U.esc(s.name) + '</b> <span style="color:#64748b">(' + U.esc(s.cls) + ')</span></div>';
            }).join('');
            sug.querySelectorAll('[data-pick-stu]').forEach(function (row) {
                row.onclick = function () { addStuName(row.getAttribute('data-pick-stu')); qInp.value = ''; sug.style.display = 'none'; paintTokens(); updateShareUrl(); };
            });
        };

        ov.querySelector('#vl-add-btn').onclick = function () {
            var inp = ov.querySelector('#vl-yt-inp');
            var id = extractYoutubeId(inp.value);
            if (!id) { alert('Link YouTube chưa hợp lệ!'); return; }
            videos.push({ id: id, title: 'Video ' + (videos.length + 1) });
            inp.value = ''; paintVideos();
        };
        ov.querySelector('#vl-copy-link').onclick = function () {
            var url = encodeLectureLink(tempTopic());
            if (global.navigator && global.navigator.clipboard) global.navigator.clipboard.writeText(url).catch(function () {});
        };
        ov.querySelector('#vl-show-qr').onclick = function () {
            var qb = ov.querySelector('#vl-qr-box');
            qb.style.display = qb.style.display === 'none' ? 'block' : 'none';
            if (qb.style.display === 'block' && typeof global.qrcode === 'function') {
                var qr = global.qrcode(0, 'M');
                qr.addData(encodeLectureLink(tempTopic()), 'Byte');
                qr.make();
                qb.innerHTML = qr.createImgTag(4, 4);
            }
        };

        function closeM() { try { global.document.body.removeChild(ov); } catch (e) {} }
        ov.querySelector('#vl-close').onclick = closeM;
        ov.querySelector('#vl-cancel').onclick = closeM;
        ov.querySelector('#vl-save').onclick = function () {
            var pubChk = ov.querySelector('#vl-publish-chk');
            topic.isPublished = !!(pubChk && pubChk.checked && mode !== 'locked');
            topic.videoMode = mode;
            topic.videoTargetScope = scope;
            topic.videoTargetStudents = picked.slice();
            topic.videoLectures = videos.slice();
            topic.updatedAt = Date.now();
            if (global.LTDLibBridge && typeof global.LTDLibBridge.upsertTopic === 'function') {
                try { global.LTDLibBridge.upsertTopic(topic); } catch (e0) {}
            } else {
                try { if (typeof global.markTopicLocallyModified === 'function') global.markTopicLocallyModified(topic.id); } catch (e) {}
                try { if (typeof global.saveToStorage === 'function') global.saveToStorage(); } catch (e2) {}
                try { if (typeof global.renderLibraryList === 'function') global.renderLibraryList(); } catch (e3) {}
                try { if (global.CloudSync && global.CloudSync.schedule) global.CloudSync.schedule(true); } catch (e4) {}
            }
            closeM();
            try {
                if (global.LTDLibBridge && typeof global.LTDLibBridge.notify === 'function') global.LTDLibBridge.notify('Đã lưu bài giảng', 'Đã cập nhật ' + videos.length + ' video và đồng bộ Cloud.', 'success');
                else if (typeof global.showModal === 'function') global.showModal('Đã lưu bài giảng', 'Đã cập nhật ' + videos.length + ' video và đồng bộ Cloud.', 'success');
            } catch (e5) {}
        };

        paintTokens();
        paintVideos();
    }

    function openStudentPlayer(topicOrId) {
        var topic = typeof topicOrId === 'string' ? findTopicById(topicOrId) : topicOrId;
        if (!topic) return;
        var curEp = 0;
        var chk = canStudentWatch(topic, isTopicSubmitted(topic.id), getCurrentStudentName());

        var ov = global.document.createElement('div');
        ov.id = 'ltd-vl-student-modal';
        ov.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(2,6,23,.82);display:flex;align-items:center;justify-content:center;padding:12px';
        ov.innerHTML =
            '<div style="width:100%;max-width:560px;background:#0f172a;color:#fff;border-radius:16px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.5);border:1px solid rgba(148,163,184,.25);font-family:Segoe UI,system-ui,-apple-system,Arial,sans-serif">' +
              '<div style="padding:13px 16px;background:#1e293b;display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid rgba(148,163,184,.18)">' +
                '<b style="font-size:15px">🎥 ' + U.esc(topic.subtitle || topic.title || 'Bài giảng') + '</b>' +
                '<button type="button" id="vls-close" style="border:none;background:#334155;color:#fff;font-weight:800;padding:5px 10px;border-radius:8px;cursor:pointer">✕</button>' +
              '</div>' +
              '<div id="vls-stage" style="padding:16px;background:#0f172a;display:flex;flex-direction:column;gap:10px;max-height:70vh;overflow-y:auto"></div>' +
              '<div id="vls-eps" style="display:none"></div>' +
            '</div>';
        global.document.body.appendChild(ov);
        ov.querySelector('#vls-close').onclick = function () {
            try {
                var st = ov.querySelector('#vls-stage');
                if (st) {
                    var ifr = st.querySelector && st.querySelector('iframe');
                    if (ifr) ifr.src = '';
                    st.innerHTML = '';
                }
            } catch (e0) {}
            try { global.document.body.removeChild(ov); } catch (e) {}
        };

        function paintStage() {
            var st = ov.querySelector('#vls-stage');
            if (!chk.ok) {
                st.innerHTML = '<div style="text-align:center;padding:20px 12px"><div style="font-size:38px;margin-bottom:8px">' + (chk.reason === 'need_submit' ? '📝' : '🔒') + '</div><b style="font-size:14.5px;line-height:1.5;color:#e2e8f0">' + U.esc(chk.message) + '</b></div>';
                return;
            }
            st.innerHTML = topic.videoLectures.map(function (it, i) {
                var vid = extractYoutubeId(it.id);
                var watchUrl = 'https://www.youtube.com/watch?v=' + encodeURIComponent(vid);
                return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:12px;background:#1e293b;border:1px solid rgba(148,163,184,.22)">' +
                    '<div style="min-width:0;flex:1">' +
                      '<div style="font-size:12px;color:#94a3b8;font-weight:700">Video ' + (i + 1) + '</div>' +
                      '<div style="font-size:14.5px;font-weight:700;color:#f8fafc;word-break:break-word">' + U.esc(it.title || ('Bài giảng ' + (i + 1))) + '</div>' +
                    '</div>' +
                    '<a href="' + watchUrl + '" target="_blank" rel="noopener noreferrer" style="flex-shrink:0;text-decoration:none;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:9px 14px;border-radius:10px;font-weight:800;font-size:13px;white-space:nowrap">▶ Mở trên YouTube</a>' +
                  '</div>';
            }).join('');
        }
        paintStage();
    }

    function syncHeaderButton(topic) {
        var btn = global.document && global.document.getElementById('btn-header-lecture');
        if (!btn) return;
        btn.style.display = 'none';
        btn.onclick = null;
    }

    function checkBootLectureParam() {
        try {
            var params = new URLSearchParams(global.location.search || '');
            var raw = params.get('lecture');
            if (!raw) return;
            var obj = decodeLectureParam(raw);
            if (obj) openStudentPlayer(obj);
        } catch (e) {}
    }

    global.LTDVideoLecture = {
        extractYoutubeId: extractYoutubeId,
        buildSafeEmbedUrl: buildSafeEmbedUrl,
        buildSafeIframeHtml: buildSafeIframeHtml,
        canStudentWatch: canStudentWatch,
        encodeLectureLink: encodeLectureLink,
        decodeLectureParam: decodeLectureParam,
        openTeacherModal: openTeacherModal,
        openStudentPlayer: openStudentPlayer,
        syncHeaderButton: syncHeaderButton,
        checkBootLectureParam: checkBootLectureParam
    };

    if (global.document && global.document.addEventListener) {
        global.document.addEventListener('DOMContentLoaded', checkBootLectureParam);
    }
})(typeof window !== 'undefined' ? window : globalThis);
