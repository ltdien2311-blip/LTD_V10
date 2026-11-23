/* ============================================================================
 * js/core-utils.js — Tiện ích dùng chung chuẩn hóa cho Thi Online LTD (v8-1)
 * Gom các hàm trùng lặp từ CODE160_v8.html về một nguồn chuẩn duy nhất.
 * ============================================================================ */
(function (global) {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function normNfc(s) {
        return String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function normFold(s) {
        s = String(s || '').toLowerCase();
        try {
            s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (e) {}
        return s.replace(/đ/g, 'd');
    }

    function shuffle(a, rnd) {
        var r = typeof rnd === 'function' ? rnd : Math.random;
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function balancedTake(P, k, T) {
        var out = [], rem = k;
        while (rem > 0) {
            var bi = -1, bc = 0, bl = 0;
            for (var i = 0; i < P.length; i++) {
                var u = P[i];
                if (u.length > rem) continue;
                var c = T.c[u.c] || 0, l = T.l[u.l] || 0;
                if (bi < 0 || c < bc || (c === bc && l < bl)) {
                    bi = i;
                    bc = c;
                    bl = l;
                }
            }
            if (bi < 0) break;
            var u2 = P.splice(bi, 1)[0];
            T.c[u2.c] = (T.c[u2.c] || 0) + u2.length;
            T.l[u2.l] = (T.l[u2.l] || 0) + u2.length;
            for (var j = 0; j < u2.length; j++) out.push(u2[j]);
            rem -= u2.length;
        }
        return out;
    }

    function isStu() {
        try {
            if (typeof global.isStudentMode !== 'undefined' && global.isStudentMode === true) return true;
        } catch (e) {}
        try {
            return !!(global.document && global.document.body && global.document.body.classList.contains('is-student'));
        } catch (e2) {
            return false;
        }
    }

    function isStuDom() {
        try {
            return !!(global.document && global.document.body && global.document.body.classList.contains('is-student'));
        } catch (e) {
            return false;
        }
    }

    function toast(msgOrTitle, msg, type) {
        if (arguments.length >= 2 && typeof global.showModal === 'function') {
            try {
                global.showModal(msgOrTitle, msg, type || 'info');
                return;
            } catch (e) {}
        }
        try {
            if (global.console && typeof global.console.info === 'function') {
                global.console.info('[LTD Toast]', msg || msgOrTitle);
            }
        } catch (e2) {}
    }

    global.LTDUtils = {
        esc: esc,
        normNfc: normNfc,
        normFold: normFold,
        shuffle: shuffle,
        balancedTake: balancedTake,
        isStu: isStu,
        isStuDom: isStuDom,
        toast: toast
    };
})(typeof window !== 'undefined' ? window : globalThis);
