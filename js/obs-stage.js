// === [v7-obs-script] ===
(function () {
    const LS_KEY = 'obs_v7_cfg';
    const LS_PRESENT_SC = 'obs_v9_present_shortcuts_v1';
    const LS_PRESENT_BAR = 'obs_v9_present_bar_v1';
    const LS_RAND = 'obs_v9_random_v1';
    const LS_HOOK = 'obs_v9_hook_text_v1';
    const DEFAULT_PRESENT_SC = {
        prevQ: 'ArrowLeft', nextQ: 'ArrowRight', toggleAns: 'Space',
        pen: 'b', laser: 'l', eraser: 'e', stampOk: '1', stampNo: '2',
        clearDraw: 'c', timer: 't', chroma: 'g', random: 'r', video: 'v', fx: 'x', board: 'n', exitPresent: 'Escape'
    };
    const PRESENT_SC_LABELS = {
        prevQ: 'Câu trước', nextQ: 'Câu sau', toggleAns: 'Hiện / Ẩn Đáp án',
        pen: 'Bút viết', laser: 'Tia Laser', eraser: 'Cục tẩy',
        stampOk: 'Con dấu (Đúng ✓)', stampNo: 'Con dấu (Sai ✗)',
        clearDraw: 'Xóa hết nét & dấu', timer: 'Đồng hồ đếm ngược',
        chroma: 'Nền xanh Chroma', random: 'Random gọi tên', video: 'Phát Video câu', fx: 'Hiệu ứng Hóa học', board: 'Bảng xanh kẻ ô', exitPresent: 'Thoát trình chiếu'
    };
    const HAND_CUR_URI = 'data:image/png;base64,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';
    const ERASER_CUR_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g transform="rotate(-32 24 24)"><rect x="10" y="14" width="28" height="18" rx="4" fill="#f472b6" stroke="#ffffff" stroke-width="2.5"/><rect x="24" y="14" width="14" height="18" rx="3" fill="#f8fafc" stroke="#ffffff" stroke-width="2"/><line x1="24" y1="14" x2="24" y2="32" stroke="#0f172a" stroke-width="2"/></g></svg>');
    const STAMP_CUR_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#6366f1" fill-opacity="0.92" stroke="#ffffff" stroke-width="2.2"/><path d="M13 33h22M15 28h18l-1.5-4.5H27V18a3.2 3.2 0 1 0-6 0v5.5h-4.5L15 28z" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>');

    const DEFAULT_CFG = {
        camWidth: 23,
        fontSize: 40,
        imgScale: 135,
        tblScale: 80,
        perQ: {},
        autoColor: true,
        customKw: '',
        manualColor: '#fff000',
        showAnswer: true,
        sloganOn: true,
        sloganTheme: 'theme-aurora',
        sloganText: '',
        sloganImg: ''
    };

    const TEAM_SLOGAN_HTML = `
        <span class="obs-sl-item">
            <svg class="obs-sl-ico" viewBox="0 0 24 24" fill="none">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.47c.72.64 1.2 1.48 1.35 2.43h5.3c.15-.95.63-1.79 1.35-2.43A6 6 0 0 0 12 3Z" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="rgba(254,240,138,0.18)"/>
            </svg>
            <span class="obs-sl-text">Hãy <span class="obs-sl-accent">HỎI, HỎI VÀ HỎI</span> thật nhiều</span>
        </span>
        <span class="obs-sl-sep">•</span>
        <span class="obs-sl-brand">
            <svg style="width:19px;height:19px;display:block" viewBox="0 0 24 24" fill="none">
                <path d="M9 3h6M10 3v5l-5 8.5A2 2 0 0 0 6.7 19.5h10.6a2 2 0 0 0 1.7-3L14 8V3" stroke="#0f172a" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7.5 14.5h9" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
            </svg>
            TEAM LTĐ
        </span>
        <span class="obs-sl-sep">•</span>
        <span class="obs-sl-item">
            <svg class="obs-sl-ico" viewBox="0 0 24 24" fill="none">
                <path d="M12 20.5s-7-4.35-9.2-8.4C1.2 9.1 3 5.5 6.5 5.5c2 0 3.5 1.1 4.5 2.5 1-1.4 2.5-2.5 4.5-2.5 3.5 0 5.3 3.6 3.7 6.6-2.2 4.05-9.2 8.4-9.2 8.4Z" fill="rgba(167,243,208,0.28)" stroke="#a7f3d0" stroke-width="2.1" stroke-linejoin="round"/>
            </svg>
            <span class="obs-sl-text">Luôn tin vào bản thân và LTĐ nhé</span>
        </span>
        <span class="obs-sl-sep">•</span>
        <span class="obs-sl-item">
            <svg class="obs-sl-ico" viewBox="0 0 24 24" fill="none">
                <circle cx="7.5" cy="14.5" r="4" stroke="#fef08a" stroke-width="2.2" fill="rgba(254,240,138,0.18)"/>
                <path d="M10.5 11.5 19 3m0 0h-3.5M19 3v3.5m-3 0 2 2" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="obs-sl-text"><span class="obs-sl-accent">BÍ MẬT</span> vì đó là <span class="obs-sl-accent">BÍ THUẬT</span></span>
        </span>`;

    const BASE_KW = 'không đúng|không phải|không xảy ra|không thu được|không có|phát biểu sai|nhận định sai|hoàn toàn|vừa đủ|kết tủa|thoát ra|phân tử khối|giá trị của|xác định|cô cạn|đốt cháy|thủy phân|xà phòng hóa|oxi hóa|dung dịch|hỗn hợp|thu được';
    const NUM_RE = /(\b\d+(?:[.,]\d+)?(?:\s*(?:gam|kg|mg|mol|mmol|mL|ml|lít|M|%|°C|K|atm|bar|kJ|J|phút|giây|giờ|cm|mm|nm))?\b)/g;

    const state = {
        topic: null,
        questions: [],
        idx: 0,
        layouts: {},
        history: {},
        presentMode: false,
        chromaOn: false,
        drawTool: 'off',
        penCol: '#FFF000',
        stampIsOk: true,
        perQStrokes: {},
        perQStamps: {},
        perQBoardStrokes: {},
        perQBoardStamps: {},
        perQVideos: {},
        boardOn: false,
        fxMol: false,
        fxCamSpot: false,
        chemSparks: [],
        laserStrokes: [],
        drawing: false,
        timerMax: 30,
        timerLeft: 30,
        timerIv: null,
        shortcuts: Object.assign({}, DEFAULT_PRESENT_SC),
        randUsed: [],
        randSpinning: false,
        dragId: null,
        editingRawBid: null,
        cfg: Object.assign({}, DEFAULT_CFG)
    };

    function getKeywordRegex() {
        const extra = String(state.cfg.customKw || '').split(',').map(s => s.trim()).filter(Boolean)
            .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const all = extra.length ? (extra.join('|') + '|' + BASE_KW) : BASE_KW;
        return new RegExp('(' + all + ')', 'gi');
    }

    function loadCfg() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) state.cfg = Object.assign({}, DEFAULT_CFG, JSON.parse(raw));
        } catch (e) {}
        const cw = Number(state.cfg.camWidth);
        state.cfg.camWidth = Number.isFinite(cw) ? Math.min(32, Math.max(16, cw)) : 23;
        const fs = Number(state.cfg.fontSize);
        state.cfg.fontSize = Number.isFinite(fs) ? Math.min(56, Math.max(24, fs)) : 40;
        const ims = Number(state.cfg.imgScale);
        state.cfg.imgScale = Number.isFinite(ims) ? Math.min(200, Math.max(50, ims)) : 135;
        const tbs = Number(state.cfg.tblScale);
        state.cfg.tblScale = Number.isFinite(tbs) ? Math.min(110, Math.max(65, tbs)) : 80;
        if (typeof state.cfg.sloganOn !== 'boolean') state.cfg.sloganOn = true;
        try {
            if (!localStorage.getItem('obs_v9_mt2_defaults_v1')) {
                state.cfg.autoColor = true;
                state.cfg.showAnswer = true;
                localStorage.setItem('obs_v9_mt2_defaults_v1', '1');
                localStorage.setItem(LS_KEY, JSON.stringify(state.cfg));
            }
        } catch (e) {}
        if (typeof state.cfg.autoColor !== 'boolean') state.cfg.autoColor = true;
        if (typeof state.cfg.showAnswer !== 'boolean') state.cfg.showAnswer = true;
        if (!state.cfg.perQ || typeof state.cfg.perQ !== 'object') state.cfg.perQ = {};
        try {
            const scRaw = localStorage.getItem(LS_PRESENT_SC);
            state.shortcuts = Object.assign({}, DEFAULT_PRESENT_SC, scRaw ? JSON.parse(scRaw) : {});
        } catch (e) { state.shortcuts = Object.assign({}, DEFAULT_PRESENT_SC); }
    }

    function saveCfg() {
        try { localStorage.setItem(LS_KEY, JSON.stringify(state.cfg)); } catch (e) {}
    }
    function getQKey(idx) {
        const i = typeof idx === 'number' ? idx : state.idx;
        const q = (state.qs || [])[i];
        return (q && q.id != null) ? String(q.id) : ('q_' + i);
    }
    function getActiveQCfg(idx) {
        const k = getQKey(idx);
        const pq = (state.cfg.perQ && state.cfg.perQ[k]) ? state.cfg.perQ[k] : null;
        return {
            fontSize: (pq && Number.isFinite(Number(pq.fontSize))) ? Number(pq.fontSize) : state.cfg.fontSize,
            imgScale: (pq && Number.isFinite(Number(pq.imgScale))) ? Number(pq.imgScale) : state.cfg.imgScale,
            tblScale: (pq && Number.isFinite(Number(pq.tblScale))) ? Number(pq.tblScale) : state.cfg.tblScale
        };
    }
    function ensureCurQCfg() {
        const k = getQKey(state.idx);
        if (!state.cfg.perQ || typeof state.cfg.perQ !== 'object') state.cfg.perQ = {};
        if (!state.cfg.perQ[k]) state.cfg.perQ[k] = getActiveQCfg(state.idx);
        return state.cfg.perQ[k];
    }

    function cloneLayout(lay) {
        return {
            left: lay.left.map(b => Object.assign({}, b)),
            right: lay.right.map(b => Object.assign({}, b))
        };
    }

    function pushHistory() {
        const lay = getLayout(state.idx);
        const st = state.history[state.idx] = state.history[state.idx] || [];
        st.push(cloneLayout(lay));
        if (st.length > 30) st.shift();
        updateUndoBtn();
    }

    function updateUndoBtn() {
        const btn = document.getElementById('obs-undo-btn');
        if (!btn) return;
        const st = state.history[state.idx] || [];
        btn.disabled = st.length === 0;
    }

    function fitStage() {
        const wrap = document.getElementById('obs-stage-wrap');
        const box = document.getElementById('obs-scale-box');
        const stage = document.getElementById('obs-stage-1080p');
        if (!wrap || !box || !stage) return;
        const availW = Math.max(200, (wrap.clientWidth || 1000) - 12);
        const availH = Math.max(120, (wrap.clientHeight || 600) - 12);
        const scale = Math.min(availW / 1920, availH / 1080);
        box.style.width = Math.floor(1920 * scale) + 'px';
        box.style.height = Math.floor(1080 * scale) + 'px';
        stage.style.transform = `scale(${scale})`;
    }

    function applyImgScaleToDOM() {
        const stage = document.getElementById('obs-stage-1080p');
        if (!stage || typeof stage.querySelectorAll !== 'function') return;
        const pct = getActiveQCfg(state.idx).imgScale / 100;
        stage.querySelectorAll('.obs-col img').forEach(img => {
            if (!img.dataset.baseW) {
                const attrW = parseFloat(img.style.width) || img.naturalWidth || img.width || 380;
                img.dataset.baseW = String(Math.max(160, attrW));
            }
            const targetW = Math.round(parseFloat(img.dataset.baseW) * pct);
            img.style.width = targetW + 'px';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
        });
    }

    function fitOverflowKatex() {
        ['obs-col-left', 'obs-col-right'].forEach(cid => {
            const col = document.getElementById(cid);
            if (!col || typeof col.querySelectorAll !== 'function' || !col.clientWidth) return;
            const maxW = Math.max(120, col.clientWidth - 28);
            col.querySelectorAll('.katex').forEach(kx => {
                kx.style.transform = '';
                kx.style.transformOrigin = '';
                kx.style.display = '';
                const kw = kx.scrollWidth || kx.offsetWidth || 0;
                if (kw > maxW) {
                    const ratio = Math.max(0.62, maxW / kw);
                    kx.style.display = 'inline-block';
                    kx.style.transformOrigin = 'left center';
                    kx.style.transform = `scale(${ratio.toFixed(3)})`;
                }
            });
        });
    }

    function applyCfgToUI() {
        const stage = document.getElementById('obs-stage-1080p');
        const bar = document.getElementById('obs-slogan-bar');
        const btn = document.getElementById('obs-slogan-btn');
        const cBtn = document.getElementById('obs-color-btn');
        const aBtn = document.getElementById('obs-ans-btn');
        const sel = document.getElementById('obs-slogan-theme');
        const inp = document.getElementById('obs-slogan-text');
        const kwInp = document.getElementById('obs-custom-kw');
        const clr = document.getElementById('obs-slogan-clear-img');
        const rng = document.getElementById('obs-cam-range');
        const cVal = document.getElementById('obs-cam-val');
        const fsRng = document.getElementById('obs-fs-range');
        const fsVal = document.getElementById('obs-fs-val');
        const imRng = document.getElementById('obs-img-range');
        const imVal = document.getElementById('obs-img-val');
        const tbRng = document.getElementById('obs-tbl-range');
        const tbVal = document.getElementById('obs-tbl-val');

        const qCfg = getActiveQCfg(state.idx);
        if (stage) {
            stage.style.setProperty('--obs-cam-w', state.cfg.camWidth + '%');
            stage.style.setProperty('--obs-body-fs', qCfg.fontSize + 'px');
            stage.style.setProperty('--obs-tbl-scale', (qCfg.tblScale / 100).toFixed(2));
        }
        if (rng) rng.value = String(state.cfg.camWidth);
        if (cVal) cVal.textContent = state.cfg.camWidth + '%';
        if (fsRng) fsRng.value = String(qCfg.fontSize);
        if (fsVal) fsVal.textContent = qCfg.fontSize + 'px';
        if (imRng) imRng.value = String(qCfg.imgScale);
        if (imVal) imVal.textContent = qCfg.imgScale + '%';
        if (tbRng) tbRng.value = String(qCfg.tblScale);
        if (tbVal) tbVal.textContent = qCfg.tblScale + '%';

        if (bar) {
            bar.classList.toggle('hidden', !state.cfg.sloganOn);
            bar.classList.remove('theme-aurora', 'theme-emerald', 'theme-pro', 'theme-royal');
            const th = ['theme-aurora', 'theme-emerald', 'theme-pro', 'theme-royal'].includes(state.cfg.sloganTheme)
                ? state.cfg.sloganTheme : 'theme-aurora';
            bar.classList.add(th);
            if (state.cfg.sloganImg) {
                bar.innerHTML = `<img class="obs-sl-img" src="${state.cfg.sloganImg}" alt="Slogan OBS" />`;
            } else if (state.cfg.sloganText && state.cfg.sloganText.trim()) {
                bar.innerHTML = `<span class="obs-sl-text">${_escHtml(state.cfg.sloganText.trim())}</span>`;
            } else {
                bar.innerHTML = TEAM_SLOGAN_HTML;
            }
        }
        if (btn) { btn.textContent = state.cfg.sloganOn ? 'Đang BẬT' : 'Đang TẮT'; btn.classList.toggle('on', state.cfg.sloganOn); }
        if (cBtn) { cBtn.textContent = state.cfg.autoColor ? 'Đang BẬT' : 'Đang TẮT'; cBtn.classList.toggle('on', state.cfg.autoColor); }
        if (aBtn) { aBtn.textContent = state.cfg.showAnswer ? 'Đang BẬT' : 'Đang TẮT'; aBtn.classList.toggle('on', state.cfg.showAnswer); }
        const pAns = document.getElementById('obs-p-ans');
        if (pAns) pAns.classList.toggle('on', state.cfg.showAnswer);
        if (sel) sel.value = state.cfg.sloganTheme || 'theme-aurora';
        if (inp && document.activeElement !== inp) inp.value = state.cfg.sloganText || '';
        if (kwInp && document.activeElement !== kwInp) kwInp.value = state.cfg.customKw || '';
        if (clr) clr.classList.toggle('hidden', !state.cfg.sloganImg);

        const swWrap = document.getElementById('obs-swatches');
        if (swWrap && typeof swWrap.querySelectorAll === 'function') {
            swWrap.querySelectorAll('.obs-swatch').forEach(sw => {
                sw.classList.toggle('active', sw.dataset.col === state.cfg.manualColor);
            });
        }
        applyImgScaleToDOM();
        fitOverflowKatex();
    }

    function fmt(txt) {
        if (typeof formatMathAndChemHTML === 'function') return formatMathAndChemHTML(txt || '');
        return _escHtml(String(txt || ''));
    }

    function highlightPlainText(str) {
        const esc = typeof _escHtml === 'function' ? _escHtml(str) : String(str);
        const kwRe = getKeywordRegex();
        const parts = esc.split(kwRe);
        return parts.map((p, i) => {
            if (!p) return '';
            if (i % 2 === 1) return `<span class="obs-hl-key">${p}</span>`;
            return p.replace(NUM_RE, '<span class="obs-hl-num">$1</span>');
        }).join('');
    }

    function applyObsHighlight(root) {
        if (!root || !state.cfg.autoColor) return;
        if (typeof document === 'undefined' || typeof document.createTreeWalker !== 'function' || typeof NodeFilter === 'undefined') return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        let cur;
        while ((cur = walker.nextNode())) {
            if (!cur.nodeValue || !cur.nodeValue.trim()) continue;
            let p = cur.parentNode;
            let skip = false;
            while (p && p !== root) {
                const cls = (p.className && typeof p.className === 'string') ? p.className : '';
                const tag = p.tagName ? p.tagName.toUpperCase() : '';
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TH' ||
                    cls.includes('katex') || cls.includes('obs-q-num') ||
                    cls.includes('obs-opt-lbl') || cls.includes('obs-opt-badge') ||
                    cls.includes('obs-tf-pill') || cls.includes('obs-hl-') ||
                    cls.includes('obs-manual-hl') || cls.includes('obs-sa-ans-line')) {
                    skip = true; break;
                }
                p = p.parentNode;
            }
            if (!skip) nodes.push(cur);
        }
        nodes.forEach(node => {
            const orig = node.nodeValue;
            const html = highlightPlainText(orig);
            if (html !== (typeof _escHtml === 'function' ? _escHtml(orig) : orig)) {
                const span = document.createElement('span');
                span.innerHTML = html;
                if (node.parentNode) node.parentNode.replaceChild(span, node);
            }
        });
    }

    function buildBlockHtml(b) {
        if (b.kind === 'stem') {
            const prefix = b.prefixLabel ? `<span class="obs-q-num">${_escHtml(b.prefixLabel)}</span>` : '';
            return `<div class="obs-q-stem">${prefix}${fmt(b.raw)}</div>`;
        }
        if (b.kind === 'opt') {
            return `<div class="obs-opt"><span class="obs-opt-badge obs-opt-badge--def">${_escHtml(b.optLetter)}</span><span class="obs-opt-txt">${fmt(b.raw)}</span></div>`;
        }
        return fmt(b.raw);
    }

    function buildRawBlocks(q, localNum) {
        const blocks = [];
        const t = (q && q.type) || 'mc';
        const label = `${q && q.gm ? 'Question' : 'Câu'} ${localNum}.`;
        const raw = String((q && q.text) || '');

        const tokenRe = /(@@TBL_[A-Za-z0-9+/=_-]+@@|(?:^|\n)[ \t\u00A0]*(?:@@IMG_[A-Za-z0-9+/=_-]+(?:~\d+x\d+)?@@[ \t\u00A0]*)+(?=\n|$))/g;
        const segs = raw.split(tokenRe).filter(s => s && s.trim());

        let usedLabel = false;
        segs.forEach((seg, si) => {
            const tr = seg.trim();
            if (/^@@TBL_/.test(tr)) {
                blocks.push({ id: `b_tbl_${si}`, kind: 'tbl', raw: tr, html: fmt(tr), weight: 280, mathScale: 100 });
            } else if (/^(?:@@IMG_[A-Za-z0-9+/=_-]+(?:~\d+x\d+)?@@\s*)+$/.test(tr)) {
                blocks.push({ id: `b_img_${si}`, kind: 'img', raw: tr, html: fmt(tr), weight: 260, mathScale: 100 });
            } else {
                if (t === 'sa' && segs.length === 1 && tr.length > 120) {
                    const sentences = tr.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [tr];
                    if (sentences.length >= 2) {
                        const mid = Math.ceil(sentences.length / 2);
                        const p1 = sentences.slice(0, mid).join('').trim();
                        const p2 = sentences.slice(mid).join('').trim();
                        const b1 = { id: `b_stem_${si}_0`, kind: 'stem', raw: p1, prefixLabel: label, weight: p1.length, mathScale: 100 };
                        b1.html = buildBlockHtml(b1);
                        blocks.push(b1);
                        usedLabel = true;
                        if (p2) {
                            const b2 = { id: `b_stem_${si}_1`, kind: 'stem', raw: p2, prefixLabel: '', weight: p2.length, mathScale: 100 };
                            b2.html = buildBlockHtml(b2);
                            blocks.push(b2);
                        }
                        return;
                    }
                }
                const prefixLabel = !usedLabel ? label : '';
                usedLabel = true;
                const b = { id: `b_stem_${si}`, kind: 'stem', raw: tr, prefixLabel, weight: tr.length, mathScale: 100 };
                b.html = buildBlockHtml(b);
                blocks.push(b);
            }
        });

        if (!blocks.length) {
            const b0 = { id: 'b_stem_0', kind: 'stem', raw: '', prefixLabel: label, weight: 20, mathScale: 100 };
            b0.html = buildBlockHtml(b0);
            blocks.push(b0);
        }

        if (t === 'mc') {
            const opts = Array.isArray(q.options) ? q.options : [];
            opts.forEach((o, j) => {
                const lt = (o && o.letter) ? o.letter : String.fromCharCode(65 + j);
                const b = { id: `b_opt_${j}`, kind: 'opt', qType: 'mc', optIndex: j, optLetter: lt, raw: String((o && o.text) || ''), weight: String((o && o.text) || '').length + 45, mathScale: 100 };
                b.html = buildBlockHtml(b);
                blocks.push(b);
            });
        } else if (t === 'tf') {
            const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
            opts.forEach((o, j) => {
                const b = { id: `b_opt_${j}`, kind: 'opt', qType: 'tf', optIndex: j, optLetter: 'abcd'[j], raw: String((o && o.text) || ''), weight: String((o && o.text) || '').length + 50, mathScale: 100 };
                b.html = buildBlockHtml(b);
                blocks.push(b);
            });
        }
        return blocks;
    }

    function autoBalanceBlocks(blocks, qType) {
        const left = [], right = [];
        let wl = 0, wr = 0;
        if (qType === 'mc' || qType === 'tf') {
            const optBlks = blocks.filter(b => b.kind === 'opt');
            const others = blocks.filter(b => b.kind !== 'opt');
            optBlks.forEach(b => { right.push(b); wr += b.weight; });
            others.forEach((b, i) => {
                if (i === 0 || wl <= wr + 80) { left.push(b); wl += b.weight; }
                else { right.unshift(b); wr += b.weight; }
            });
        } else {
            blocks.forEach((b, i) => {
                if (i === 0 || wl <= wr) { left.push(b); wl += b.weight; }
                else { right.push(b); wr += b.weight; }
            });
        }
        return { left, right };
    }

    function getLayout(idx) {
        if (state.layouts[idx]) return state.layouts[idx];
        const q = state.questions[idx];
        const t = (q && q.type) || 'mc';
        let localNum = 0;
        for (let i = 0; i <= idx; i++) {
            if (((state.questions[i] && state.questions[i].type) || 'mc') === t) localNum++;
        }
        const blocks = buildRawBlocks(q, localNum);
        state.layouts[idx] = autoBalanceBlocks(blocks, t);
        return state.layouts[idx];
    }

    function renderPills() {
        const host = document.getElementById('obs-q-pills');
        if (!host) return;
        const groups = { mc: [], tf: [], sa: [] };
        state.questions.forEach((q, i) => {
            const t = (q && q.type) || 'mc';
            (groups[t] || groups.mc).push({ idx: i, num: (groups[t] || groups.mc).length + 1 });
        });
        const labels = { mc: 'Phần I · TNKQ', tf: 'Phần II · Đúng/Sai', sa: 'Phần III · Trả lời ngắn' };
        host.innerHTML = ['mc', 'tf', 'sa'].filter(t => groups[t].length).map(t => {
            const btns = groups[t].map(it =>
                `<button type="button" class="obs-q-pill ${it.idx === state.idx ? 'active' : ''}" onclick="OBS_V7.go(${it.idx})">${it.num}</button>`
            ).join('');
            return `<div><div class="obs-q-grp-lbl">${labels[t]}</div><div class="obs-q-grid">${btns}</div></div>`;
        }).join('');
    }

    function applyAnswerStyle(b, bodyHtml, q) {
        if (!state.cfg.showAnswer || !q || b.kind !== 'opt') return bodyHtml;
        const t = q.type || 'mc';
        const isHit = (t === 'mc' && q.correct && b.optLetter === q.correct) ||
                      (t === 'tf' && Array.isArray(q.tfAnswers) && q.tfAnswers[b.optIndex] === true);
        if (isHit) {
            return bodyHtml
                .replace('class="obs-opt"', 'class="obs-opt obs-opt-mc-key"')
                .replace('obs-opt-badge--def', 'obs-opt-badge--key');
        }
        return bodyHtml;
    }

    function renderCol(el, list, colName, q) {
        if (!el) return;
        const isLeftCol = (colName === 'left');
        let htmlStr = list.map((b, pos) => {
            const dragH = `<span class="obs-blk-drag" draggable="true" title="Kéo thả khối này" ondragstart="OBS_V7.onDragStart(event,'${b.id}')">⋮⋮</span>`;
            const swapBtn = colName === 'left'
                ? `<button type="button" class="obs-blk-btn" title="Chuyển sang Phải" onclick="OBS_V7.moveBlock('${b.id}','right')">▶</button>`
                : `<button type="button" class="obs-blk-btn" title="Chuyển sang Trái" onclick="OBS_V7.moveBlock('${b.id}','left')">◀</button>`;
            const upBtn = pos > 0 ? `<button type="button" class="obs-blk-btn" title="Đẩy lên" onclick="OBS_V7.reorderBlock('${b.id}',-1)">▲</button>` : '';
            const dnBtn = pos < list.length - 1 ? `<button type="button" class="obs-blk-btn" title="Đẩy xuống" onclick="OBS_V7.reorderBlock('${b.id}',1)">▼</button>` : '';
            const rawBtn = `<button type="button" class="obs-blk-btn" title="Sửa mã gốc / LaTeX" onclick="OBS_V7.openRawEditor('${b.id}')">∑</button>`;
            const bodyHtml = applyAnswerStyle(b, b.html, q);
            const msStyle = (b.mathScale && b.mathScale !== 100) ? ` style="font-size:${b.mathScale}%;"` : '';
            return `<div class="obs-block" data-bid="${b.id}" data-col="${colName}">
                <div class="obs-blk-tools">${dragH}${swapBtn}${upBtn}${dnBtn}${rawBtn}</div>
                <div class="obs-blk-content"${msStyle} ondblclick="OBS_V7.enterEdit(this,'${b.id}')" onblur="OBS_V7.exitEdit(this,'${b.id}')">${bodyHtml}</div>
            </div>`;
        }).join('');

        if (isLeftCol && state.cfg.showAnswer && q && q.type === 'sa' && q.shortAnswer !== undefined && String(q.shortAnswer).trim() !== '') {
            htmlStr += `<div class="obs-sa-ans-line">Đáp án:<span class="obs-sa-ans-val">${_escHtml(String(q.shortAnswer).trim())}</span></div>`;
        }
        el.innerHTML = htmlStr;
        applyObsHighlight(el);
        applyImgScaleToDOM();
        fitOverflowKatex();
    }

    function renderQuestion() {
        applyCfgToUI();
        const left = document.getElementById('obs-col-left');
        const right = document.getElementById('obs-col-right');
        const cnt = document.getElementById('obs-q-counter');
        if (!left || !right) return;

        const total = state.questions.length;
        if (!total) {
            left.innerHTML = '<div class="obs-q-stem">Đề thi này chưa có câu hỏi nào.</div>';
            right.innerHTML = '';
            if (cnt) cnt.textContent = '0/0';
            return;
        }
        if (cnt) cnt.textContent = `Câu ${state.idx + 1}/${total}`;
        const q = state.questions[state.idx];
        const slideImg = document.getElementById('obs-slide-img-layer');
        const gridEl = document.querySelector('#obs-stage-1080p .obs-grid');
        if (q && (q.obsSlideKey || q.obsSlideData)) {
            if (gridEl && gridEl.classList) gridEl.classList.add('hidden');
            if (slideImg && slideImg.classList) {
                slideImg.classList.remove('hidden');
                if (q.obsSlideKey && window.LTDMinMapObsStore && typeof window.LTDMinMapObsStore.getSlideDataUrl === 'function') {
                    if (q.obsSlideData) slideImg.src = q.obsSlideData;
                    else slideImg.removeAttribute('src');
                    window.LTDMinMapObsStore.getSlideDataUrl(q.obsSlideKey).then(function (url) {
                        if (state.questions[state.idx] !== q) return;
                        if (url) slideImg.src = url;
                        else if (q.obsSlideData) slideImg.src = q.obsSlideData;
                    }).catch(function () {
                        if (q.obsSlideData && state.questions[state.idx] === q) slideImg.src = q.obsSlideData;
                    });
                } else if (q.obsSlideData) {
                    slideImg.src = q.obsSlideData;
                }
            }
        } else {
            if (slideImg && slideImg.classList) { slideImg.classList.add('hidden'); slideImg.removeAttribute('src'); }
            if (gridEl && gridEl.classList) gridEl.classList.remove('hidden');
            const lay = getLayout(state.idx);
            renderCol(left, lay.left, 'left', q);
            renderCol(right, lay.right, 'right', q);
        }
        renderPills();
        updateUndoBtn();
        syncVideoBadge();
    }

    function findBlockById(bid) {
        const lay = getLayout(state.idx);
        return lay.left.find(b => b.id === bid) || lay.right.find(b => b.id === bid) || null;
    }

    function highlightSelection(color) {
        if (typeof window.getSelection !== 'function') return false;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
        const range = sel.getRangeAt(0);
        const stage = document.getElementById('obs-stage-1080p');
        if (!stage || !stage.contains(range.commonAncestorContainer)) return false;

        pushHistory();
        let node = range.commonAncestorContainer;
        while (node && node !== stage && !(node.classList && node.classList.contains('obs-block'))) {
            node = node.parentNode;
        }
        const bid = node && node.dataset ? node.dataset.bid : null;
        const span = document.createElement('span');
        span.className = 'obs-manual-hl';
        span.style.color = color || state.cfg.manualColor || '#fff000';
        span.style.fontWeight = '800';
        try {
            range.surroundContents(span);
        } catch (e) {
            const frag = range.extractContents();
            span.appendChild(frag);
            range.insertNode(span);
        }
        sel.removeAllRanges();

        if (bid && node) {
            const contentEl = node.querySelector('.obs-blk-content');
            const blk = findBlockById(bid);
            if (blk && contentEl) blk.html = contentEl.innerHTML;
        }
        return true;
    }

    /* ==================== [v7-3] BỘ XUẤT PNG 1920x1080 & ĐÓNG GÓI .ZIP (CHỤP 1:1 GIỐNG WEB) ==================== */
    function collectExportCss() {
        let css = '@font-face{font-family:\x27UTM HelvetIns\x27;font-style:normal;font-weight:400;src:local(\x27UTM HelvetIns\x27),local(\x27UTMHelvetIns\x27);}@font-face{font-family:\x27UTM HelvetIns\x27;font-style:normal;font-weight:700;src:local(\x27UTM HelvetIns Bold\x27),local(\x27UTMHelvetIns-Bold\x27),local(\x27UTM HelvetIns\x27);}.katex-mathml{display:none!important;}.hidden{display:none!important;}\n';
        const stEl = document.getElementById('v7-obs-style');
        if (stEl) css += stEl.textContent + '\n';
        try {
            Array.from(document.styleSheets || []).forEach(ss => {
                try {
                    const rules = ss.cssRules || [];
                    for (let i = 0; i < rules.length; i++) {
                        const t = rules[i].cssText || '';
                        if ((t.includes('katex') || t.includes('.obs-') || t.includes('#obs-')) && !/^@font-face/i.test(t.trim())) css += t + '\n';
                    }
                } catch (e) {}
            });
        } catch (e) {}
        const upEl = document.getElementById('v8-katex-upright');
        if (upEl) css += upEl.textContent + '\n';
        css += '.katex,.katex .mathnormal,.katex .mathit,.katex .mathrm,.katex .mathbf,.katex .textrm,.katex .textit,.katex .mord{font-style:normal!important;}\n';
        return css.replace(/@font-face\s*\{(?![^}]*local\()[^}]*\}/gi, '').replace(/\]\]>/g, '');
    }

    function buildExportSvgString(xhtml, cssText) {
        const safeXhtml = String(xhtml || '').replace(/&nbsp;/g, '&#160;').replace(/<span[^>]*class="[^"]*katex-mathml[^"]*"[^>]*>[\s\S]*?<\/span>(?=<span[^>]*class="[^"]*katex-html)/gi, '');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style><![CDATA[${cssText}]]></style>${safeXhtml}</div></foreignObject></svg>`;
    }

    async function inlineExternalImages(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        const imgs = Array.from(root.querySelectorAll('img'));
        await Promise.all(imgs.map(async (im) => {
            const src = im.getAttribute('src') || '';
            if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
            try {
                const ac = typeof AbortController === 'function' ? new AbortController() : null;
                const tm = ac ? setTimeout(() => ac.abort(), 3000) : null;
                const resp = await fetch(src, ac ? { mode: 'cors', signal: ac.signal } : { mode: 'cors' });
                if (tm) clearTimeout(tm);
                if (!resp.ok) return;
                const b = await resp.blob();
                const dataUrl = await new Promise((res) => {
                    const fr = new FileReader();
                    fr.onload = () => res(fr.result);
                    fr.onerror = () => res('');
                    fr.readAsDataURL(b);
                });
                if (dataUrl) im.setAttribute('src', dataUrl);
            } catch (e) {}
        }));
    }

    function prepareStageClone1080(node) {
        const clone = node.cloneNode(true);
        if (typeof clone.querySelectorAll === 'function') {
            clone.querySelectorAll('.katex-mathml, .obs-blk-tools, #obs-hand-cursor, #obs-timer-box, #obs-draw-canvas, #obs-green-board, #obs-fx-canvas, #obs-hook-overlay, #obs-q-video-box, #obs-cine-top, #obs-cine-bot, #obs-anamorphic-flare').forEach(el => el.remove());
        }
        clone.classList.add('obs-exporting');
        clone.style.transform = 'none';
        clone.style.position = 'static';
        clone.style.width = '1920px';
        clone.style.height = '1080px';
        clone.style.background = '#000000';
        clone.style.fontFamily = "\x27UTM HelvetIns\x27, \x27Helvetica Neue\x27, Helvetica, Arial, sans-serif";
        const qCfg = getActiveQCfg(state.idx);
        clone.style.setProperty('--obs-cam-w', state.cfg.camWidth + '%');
        clone.style.setProperty('--obs-body-fs', qCfg.fontSize + 'px');
        clone.style.setProperty('--obs-img-scale', String(qCfg.imgScale || 100) + '%');
        clone.style.setProperty('--obs-tbl-scale', (qCfg.tblScale / 100).toFixed(2));
        return clone;
    }

    async function blobToDataUrl(blob) {
        return await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = () => rej(new Error('BLOB_DATAURL_ERR'));
            fr.readAsDataURL(blob);
        });
    }

    async function renderStageToPngBytes(node) {
        if (window.modernScreenshot && typeof window.modernScreenshot.domToBlob === 'function') {
            if (document.fonts && document.fonts.ready) {
                try {
                    await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
                } catch (e) {}
            }
            const host = document.createElement('div');
            host.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;z-index:-1;opacity:0;pointer-events:none;overflow:hidden;';
            const clone = prepareStageClone1080(node);
            clone.style.position = 'relative';
            clone.style.left = '0';
            clone.style.top = '0';
            clone.style.margin = '0';
            clone.style.transform = 'none';
            clone.style.opacity = '1';
            host.appendChild(clone);
            if (document.body) document.body.appendChild(host);
            try {
                if (typeof clone.querySelectorAll === 'function') {
                    const imgs = Array.from(clone.querySelectorAll('img'));
                    await Promise.all(imgs.map(im => (im && typeof im.decode === 'function' ? im.decode().catch(() => {}) : Promise.resolve())));
                }
                if (typeof requestAnimationFrame === 'function') {
                    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                }
                const msPromise = window.modernScreenshot.domToBlob(clone, {
                    width: 1920,
                    height: 1080,
                    scale: 1,
                    backgroundColor: '#000000',
                    font: { cssText: '@font-face{font-family:\x27UTM HelvetIns\x27;font-style:normal;font-weight:400;src:local(\x27UTM HelvetIns\x27),local(\x27UTMHelvetIns\x27);}@font-face{font-family:\x27UTM HelvetIns\x27;font-style:normal;font-weight:700;src:local(\x27UTM HelvetIns Bold\x27),local(\x27UTMHelvetIns-Bold\x27),local(\x27UTM HelvetIns\x27);}' },
                    filter: (el) => {
                        if (!el || !el.classList) return true;
                        if (el.id === 'obs-hand-cursor' || el.id === 'obs-timer-box' || el.id === 'obs-draw-canvas' || el.id === 'obs-green-board' || el.id === 'obs-fx-canvas' || el.id === 'obs-hook-overlay' || el.id === 'obs-q-video-box' || el.id === 'obs-cine-top' || el.id === 'obs-cine-bot' || el.id === 'obs-anamorphic-flare') return false;
                        return !el.classList.contains('obs-blk-tools') && !el.classList.contains('katex-mathml');
                    }
                });
                let msTimer = null;
                const timeoutPromise = new Promise((_, rej) => {
                    msTimer = setTimeout(() => rej(new Error('MODERN_SCREENSHOT_TIMEOUT')), 8000);
                });
                const blob = await Promise.race([msPromise, timeoutPromise]).finally(() => {
                    if (msTimer) clearTimeout(msTimer);
                });
                if (!blob) throw new Error('MODERN_SCREENSHOT_BLOB_ERR');
                const buf = await blob.arrayBuffer();
                const dataUrl = await blobToDataUrl(blob);
                return { blob, bytes: new Uint8Array(buf), dataUrl };
            } catch (msErr) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('[OBS] modernScreenshot fallback:', msErr && msErr.message ? msErr.message : msErr);
                }
            } finally {
                try { if (host.parentNode) host.parentNode.removeChild(host); } catch (e) {}
            }
        }

        const clone = prepareStageClone1080(node);
        await inlineExternalImages(clone);
        const cssText = collectExportCss();
        const ser = new XMLSerializer();
        const xhtml = ser.serializeToString(clone);
        const svgStr = buildExportSvgString(xhtml, cssText);
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
        const img = new Image();
        img.width = 1920; img.height = 1080;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('SVG_LOAD_ERR'));
            img.src = svgUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 1920; canvas.height = 1080;
        const ctx2d = canvas.getContext('2d');
        ctx2d.fillStyle = '#000000';
        ctx2d.fillRect(0, 0, 1920, 1080);
        ctx2d.drawImage(img, 0, 0, 1920, 1080);
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        if (!blob) throw new Error('CANVAS_BLOB_ERR');
        const buf = await blob.arrayBuffer();
        return { blob, bytes: new Uint8Array(buf), dataUrl: canvas.toDataURL('image/png') };
    }

    if (!window.htmlToImage) {
        window.htmlToImage = {
            toPng: async function (node) {
                const res = await renderStageToPngBytes(node);
                return res.dataUrl;
            },
            toBlob: async function (node) {
                const res = await renderStageToPngBytes(node);
                return res.blob;
            }
        };
    }

    /* Bộ đóng gói ZIP Store (CRC32) thuần JS dự phòng khi mất mạng không tải được JSZip */
    const CRC_TABLE = (() => {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[i] = c >>> 0;
        }
        return t;
    })();

    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function makeZipStoreBytes(entries) {
        const enc = new TextEncoder();
        const locals = [], centrals = [];
        let offset = 0;
        entries.forEach(ent => {
            const nameBytes = enc.encode(ent.name);
            const data = ent.bytes;
            const crc = crc32(data);

            const lh = new Uint8Array(30 + nameBytes.length);
            const lv = new DataView(lh.buffer);
            lv.setUint32(0, 0x04034b50, true);
            lv.setUint16(4, 20, true);
            lv.setUint16(8, 0, true);
            lv.setUint32(14, crc, true);
            lv.setUint32(18, data.length, true);
            lv.setUint32(22, data.length, true);
            lv.setUint16(26, nameBytes.length, true);
            lh.set(nameBytes, 30);
            locals.push(lh, data);

            const cd = new Uint8Array(46 + nameBytes.length);
            const cv = new DataView(cd.buffer);
            cv.setUint32(0, 0x02014b50, true);
            cv.setUint16(4, 20, true);
            cv.setUint16(6, 20, true);
            cv.setUint32(16, crc, true);
            cv.setUint32(20, data.length, true);
            cv.setUint32(24, data.length, true);
            cv.setUint16(28, nameBytes.length, true);
            cv.setUint32(42, offset, true);
            cd.set(nameBytes, 46);
            centrals.push(cd);

            offset += lh.length + data.length;
        });
        const cdSize = centrals.reduce((s, a) => s + a.length, 0);
        const eocd = new Uint8Array(22);
        const ev = new DataView(eocd.buffer);
        ev.setUint32(0, 0x06054b50, true);
        ev.setUint16(8, entries.length, true);
        ev.setUint16(10, entries.length, true);
        ev.setUint32(12, cdSize, true);
        ev.setUint32(16, offset, true);

        const out = new Uint8Array(offset + cdSize + 22);
        let pos = 0;
        locals.forEach(a => { out.set(a, pos); pos += a.length; });
        centrals.forEach(a => { out.set(a, pos); pos += a.length; });
        out.set(eocd, pos);
        return out;
    }

    function triggerDownloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 1000);
    }

    function setExpStatus(msg, show) {
        const el = document.getElementById('obs-export-status');
        if (!el) return;
        el.textContent = msg || '';
        el.style.display = show ? 'block' : 'none';
    }

    function safeSlug(s) {
        return String(s || 'De_Thi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'De_Thi';
    }

    function buildPngFilename(idx) {
        const num = String(idx + 1).padStart(2, '0');
        return `${num}_Cau_${num}.png`;
    }

    async function exportCurrentPng() {
        const stage = document.getElementById('obs-stage-1080p');
        if (!stage) return;
        try {
            setExpStatus('Đang xuất ảnh PNG 1920×1080...', true);
            const res = await renderStageToPngBytes(stage);
            triggerDownloadBlob(res.blob, buildPngFilename(state.idx));
            setExpStatus('✔ Đã xuất ' + buildPngFilename(state.idx), true);
            setTimeout(() => setExpStatus('', false), 2500);
        } catch (err) {
            setExpStatus('✖ Lỗi xuất ảnh: ' + (err && err.message ? err.message : err), true);
        }
    }

    async function exportAllZip() {
        const stage = document.getElementById('obs-stage-1080p');
        if (!stage || !state.questions.length) return;
        const origIdx = state.idx;
        const entries = [];
        try {
            for (let i = 0; i < state.questions.length; i++) {
                setExpStatus(`Đang xuất câu ${i + 1}/${state.questions.length}...`, true);
                state.idx = i;
                renderQuestion();
                await new Promise(r => setTimeout(r, 40));
                const res = await renderStageToPngBytes(stage);
                entries.push({ name: buildPngFilename(i), bytes: res.bytes });
            }
            setExpStatus('Đang đóng gói tệp .zip...', true);
            let zipBlob;
            if (typeof window.JSZip === 'function') {
                const zip = new window.JSZip();
                entries.forEach(e => zip.file(e.name, e.bytes));
                zipBlob = await zip.generateAsync({ type: 'blob' });
            } else {
                const zipBytes = makeZipStoreBytes(entries);
                zipBlob = new Blob([zipBytes], { type: 'application/zip' });
            }
            const zipName = safeSlug(state.topic && (state.topic.subtitle || state.topic.title)) + '_OBS_1920x1080.zip';
            triggerDownloadBlob(zipBlob, zipName);
            setExpStatus(`✔ Đã xuất ${entries.length} ảnh (.zip)`, true);
            setTimeout(() => setExpStatus('', false), 3000);
        } catch (err) {
            setExpStatus('✖ Lỗi xuất ZIP: ' + (err && err.message ? err.message : err), true);
        } finally {
            state.idx = origIdx;
            renderQuestion();
        }
    }

    function findTopic(tid) {
        if (window.LTDLibBridge && typeof window.LTDLibBridge.getTopics === 'function') {
            const bt = window.LTDLibBridge.getTopics().find(t => t && t.id === tid);
            if (bt) return bt;
        }
        if (typeof savedTopics !== 'undefined' && Array.isArray(savedTopics)) {
            const found = savedTopics.find(t => t && t.id === tid);
            if (found) return found;
        }
        try {
            const raw = JSON.parse(localStorage.getItem('matrix_quiz_topics_v2') || '[]');
            if (Array.isArray(raw)) return raw.find(t => t && t.id === tid) || null;
        } catch (e) {}
        return null;
    }


    function getDrawCanvas() { return document.getElementById('obs-draw-canvas'); }
    function distToSeg(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
        if (!len2) return Math.hypot(px - x1, py - y1);
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }
    function eraseWholeAt(x, y) {
        const qk = getQKey(state.idx);
        let removed = false;
        const sMap = state.boardOn ? state.perQBoardStrokes : state.perQStrokes;
        const arr = sMap[qk] || [];
        for (let i = arr.length - 1; i >= 0; i--) {
            const pts = arr[i].pts;
            for (let j = 0; j < pts.length; j++) {
                const p1 = pts[j], p2 = pts[Math.min(j + 1, pts.length - 1)];
                if (distToSeg(x, y, p1.x, p1.y, p2.x, p2.y) <= 22) { arr.splice(i, 1); removed = true; break; }
            }
        }
        const mMap = state.boardOn ? state.perQBoardStamps : state.perQStamps;
        const st = mMap[qk] || [];
        for (let i = st.length - 1; i >= 0; i--) {
            if (Math.hypot(x - st[i].x, y - st[i].y) <= 38) { st.splice(i, 1); removed = true; }
        }
        return removed;
    }
    function redrawDrawCanvas() {
        const cv = getDrawCanvas();
        if (!cv || typeof cv.getContext !== 'function') return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, cv.width, cv.height);
        const qk = getQKey(state.idx);
        ((state.boardOn ? state.perQBoardStrokes[qk] : state.perQStrokes[qk]) || []).forEach(st => {
            if (!st.pts || !st.pts.length) return;
            ctx.save();
            ctx.strokeStyle = st.col || '#FFF000';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath();
            st.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        });
        ((state.boardOn ? state.perQBoardStamps[qk] : state.perQStamps[qk]) || []).forEach(sm => {
            ctx.save();
            ctx.translate(sm.x, sm.y);
            ctx.beginPath();
            ctx.arc(0, 0, 34, 0, Math.PI * 2);
            ctx.fillStyle = sm.ok ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)';
            ctx.fill();
            if (typeof ctx.setLineDash === 'function') ctx.setLineDash([7, 4]);
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = sm.ok ? '#a7f3d0' : '#fecaca';
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sm.ok ? '✓' : '✗', 0, 2);
            ctx.restore();
        });
        const now = Date.now();
        for (let i = state.laserStrokes.length - 1; i >= 0; i--) {
            const ls = state.laserStrokes[i];
            const age = ls.endedAt ? (now - ls.endedAt) : 0;
            if (age > 2000) { state.laserStrokes.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - age / 2000);
            ctx.strokeStyle = ls.col || state.penCol;
            ctx.shadowColor = ls.col || state.penCol;
            ctx.shadowBlur = 16;
            ctx.lineWidth = 7;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath();
            ls.pts.forEach((p, idx) => idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        }
        if (state.laserStrokes.length && typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(redrawDrawCanvas);
        }
    }
    function playTimerBeep() {
        try {
            const ac = getObsAudioCtx(); if (!ac) return;
            [880, 1174.66].forEach((freq, i) => {
                const osc = ac.createOscillator(), g = ac.createGain();
                osc.type = 'sine'; osc.frequency.value = freq;
                g.gain.setValueAtTime(0.18, ac.currentTime + i * 0.16);
                g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.16 + 0.35);
                osc.connect(g); g.connect(ac.destination);
                osc.start(ac.currentTime + i * 0.16);
                osc.stop(ac.currentTime + i * 0.16 + 0.36);
            });
        } catch (e) {}
    }
    function renderTimerUi() {
        const num = document.getElementById('obs-timer-num');
        const arc = document.getElementById('obs-timer-arc');
        const pBtn = document.getElementById('obs-timer-play');
        if (num) num.textContent = String(state.timerLeft);
        if (arc && typeof arc.setAttribute === 'function') {
            const circ = 2 * Math.PI * 32;
            arc.setAttribute('stroke-dashoffset', String(circ * (1 - state.timerLeft / (state.timerMax || 30))));
            arc.setAttribute('stroke', state.timerLeft <= 5 ? '#fb7185' : (state.timerLeft <= 10 ? '#fbbf24' : '#22d3ee'));
        }
        if (pBtn) pBtn.textContent = state.timerIv ? '⏸ Tạm dừng' : '▶ Chạy';
    }

    function savePresentBarCfg() {
        const bar = document.getElementById('obs-present-bar');
        if (!bar) return;
        try {
            localStorage.setItem(LS_PRESENT_BAR, JSON.stringify({
                left: bar.style.left || '12px',
                top: bar.style.top || '52px',
                width: bar.style.width || '46px',
                dim: !!(bar.classList && bar.classList.contains('dim')),
                collapsed: !!(bar.classList && bar.classList.contains('collapsed'))
            }));
        } catch (e) {}
    }
    function initPresentBarEvents() {
        const bar = document.getElementById('obs-present-bar');
        if (!bar || bar._obsBarBound) return;
        bar._obsBarBound = true;
        try {
            const raw = localStorage.getItem(LS_PRESENT_BAR);
            if (raw) {
                const c = JSON.parse(raw);
                if (c.left) bar.style.left = c.left;
                if (c.top) bar.style.top = c.top;
                if (c.width) bar.style.width = c.width;
                if (bar.classList) {
                    bar.classList.toggle('dim', !!c.dim);
                    bar.classList.toggle('collapsed', !!c.collapsed);
                }
            }
        } catch (e) {}
        const head = document.getElementById('obs-bar-head');
        const grip = document.getElementById('obs-bar-resize');
        let drag = false, resz = false, ox = 0, oy = 0, sw = 0, sx = 0;
        if (head) {
            head.addEventListener('pointerdown', (e) => {
                if (e.target && e.target.tagName === 'BUTTON') return;
                drag = true;
                const r = bar.getBoundingClientRect();
                ox = e.clientX - r.left; oy = e.clientY - r.top;
            });
        }
        if (grip) {
            grip.addEventListener('pointerdown', (e) => {
                if (e.stopPropagation) e.stopPropagation();
                resz = true; sw = bar.offsetWidth || 46; sx = e.clientX;
            });
        }
        window.addEventListener('pointermove', (e) => {
            if (drag) {
                const vw = window.innerWidth || 1920, vh = window.innerHeight || 1080;
                bar.style.left = Math.max(4, Math.min(vw - 54, e.clientX - ox)) + 'px';
                bar.style.top = Math.max(4, Math.min(vh - 54, e.clientY - oy)) + 'px';
            } else if (resz) {
                bar.style.width = Math.max(44, Math.min(340, sw + (e.clientX - sx))) + 'px';
            }
        });
        window.addEventListener('pointerup', () => {
            if (drag || resz) savePresentBarCfg();
            drag = false; resz = false;
        });
    }


    function getRandNames() {
        const ta = document.getElementById('obs-rand-ta');
        return ta ? String(ta.value || '').split(/\n+/).map(x => x.trim()).filter(Boolean) : [];
    }
    function saveRandCfg() {
        const ta = document.getElementById('obs-rand-ta');
        const nd = document.getElementById('obs-rand-nodup');
        const pc = document.getElementById('obs-rand-pick-cnt');
        try {
            localStorage.setItem(LS_RAND, JSON.stringify({
                namesText: ta ? ta.value : '',
                noDup: nd ? !!nd.checked : true,
                pickCnt: pc ? Number(pc.value || 1) : 1,
                used: state.randUsed || []
            }));
        } catch (e) {}
    }
    function loadRandCfg() {
        try {
            const raw = localStorage.getItem(LS_RAND);
            if (!raw) return;
            const c = JSON.parse(raw);
            const ta = document.getElementById('obs-rand-ta');
            const nd = document.getElementById('obs-rand-nodup');
            const pc = document.getElementById('obs-rand-pick-cnt');
            if (ta && typeof c.namesText === 'string') ta.value = c.namesText;
            if (nd && typeof c.noDup === 'boolean') nd.checked = c.noDup;
            if (pc && c.pickCnt) pc.value = String(c.pickCnt);
            if (Array.isArray(c.used)) state.randUsed = c.used;
        } catch (e) {}
    }
    function updateRandCount() {
        const all = getRandNames();
        const nd = document.getElementById('obs-rand-nodup');
        const noDup = nd ? !!nd.checked : true;
        const usedSet = new Set(state.randUsed || []);
        const avail = noDup ? all.filter(n => !usedSet.has(n)) : all;
        const el = document.getElementById('obs-rand-left');
        if (el) el.textContent = avail.length + '/' + all.length;
    }
    function populateRandClasses() {
        const sel = document.getElementById('obs-rand-class-sel');
        if (!sel) return;
        const list = (typeof classesData !== 'undefined' && Array.isArray(classesData)) ? classesData : [];
        let h = '<option value="">-- Nạp nhanh từ Lớp học --</option>';
        list.forEach((c, idx) => {
            const cnt = Array.isArray(c.students) ? c.students.length : 0;
            h += '<option value="' + idx + '">' + _escHtml((c.name || 'Lớp') + ' (' + cnt + ' em)') + '</option>';
        });
        sel.innerHTML = h;
    }
    let _obsAc = null;
    function getObsAudioCtx() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            if (!_obsAc || _obsAc.state === 'closed') _obsAc = new AC();
            if (_obsAc.state === 'suspended' && typeof _obsAc.resume === 'function') _obsAc.resume().catch(() => {});
            return _obsAc;
        } catch (e) { return null; }
    }
    function playRandTick(pitch) {
        try {
            const ac = getObsAudioCtx(); if (!ac) return; const o = ac.createOscillator(), g = ac.createGain();
            o.type = 'triangle'; o.frequency.value = pitch;
            g.gain.setValueAtTime(0.14, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
            o.connect(g); g.connect(ac.destination);
            o.start(); o.stop(ac.currentTime + 0.065);
        } catch (e) {}
    }
    function playRandFanfare() {
        try {
            const ac = getObsAudioCtx(); if (!ac) return;
            [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.38], [1318.5, 0.52]].forEach(([f, d]) => {
                const o = ac.createOscillator(), g = ac.createGain();
                o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0.001, ac.currentTime + d);
                g.gain.linearRampToValueAtTime(0.18, ac.currentTime + d + 0.04);
                g.gain.exponentialRampToValueAtTime(0.0008, ac.currentTime + d + 1.8);
                o.connect(g); g.connect(ac.destination);
                o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 1.85);
            });
        } catch (e) {}
    }
    function fireRandSparkles() {
        const c = document.getElementById('obs-rand-fx');
        if (!c || typeof c.getContext !== 'function') return;
        const x = c.getContext('2d');
        if (!x) return;
        const pts = Array.from({ length: 42 }, () => ({
            x: c.width / 2, y: c.height / 2,
            vx: (Math.random() - 0.5) * 11, vy: (Math.random() - 0.65) * 9,
            col: ['#fde047', '#38bdf8', '#c084fc', '#4ade80', '#fb7185'][Math.floor(Math.random() * 5)], a: 1
        }));
        function step() {
            const vb = document.getElementById('obs-q-video-box');
            if (vb && vb.classList && vb.classList.contains('open')) { _fxLoopRunning = false; return; }
            x.clearRect(0, 0, c.width, c.height);
            let alive = false;
            pts.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.a -= 0.018;
                if (p.a > 0) { alive = true; x.globalAlpha = p.a; x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, 4, 0, Math.PI * 2); x.fill(); }
            });
            if (alive && typeof requestAnimationFrame === 'function') requestAnimationFrame(step);
            else x.clearRect(0, 0, c.width, c.height);
        }
        step();
    }


    function toEmbedVideoUrl(url) {
        const u = String(url || '').trim();
        if (!u) return { kind: 'none', src: '' };
        let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
        if (m) return { kind: 'yt', src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&rel=0' };
        return { kind: 'mp4', src: u };
    }
    function syncVideoBadge() {
        const qk = getQKey(state.idx);
        const v = state.perQVideos[qk];
        const b = document.getElementById('obs-vid-badge');
        const inp = document.getElementById('obs-vid-url-input');
        if (inp) inp.value = (v && v.kind !== 'file') ? (v.raw || '') : '';
        if (b) {
            b.style.display = v ? 'block' : 'none';
            b.textContent = v ? ('✓ Đã gắn: ' + (v.label || 'Video')) : '';
        }
        const pBtn = document.getElementById('obs-p-video');
        if (pBtn && pBtn.classList) pBtn.classList.toggle('hidden', !(v && v.src));
        const hInp = document.getElementById('obs-hook-input');
        if (hInp && !hInp._obsSynced) {
            hInp._obsSynced = true;
            try { const h = localStorage.getItem(LS_HOOK); if (h) hInp.value = h; } catch (e) {}
        }
    }
    function closeVidBox() {
        const modal = document.getElementById('obs-modal');
        if (modal && modal.classList) modal.classList.remove('obs-vid-playing');
        const extBtn = document.getElementById('obs-q-video-ext');
        if (extBtn && extBtn.classList) extBtn.classList.add('hidden');
        const box = document.getElementById('obs-q-video-box');
        const body = document.getElementById('obs-q-video-body');
        if (box && box.classList) box.classList.remove('open', 'fading');
        if (body) body.innerHTML = '';
        const btn = document.getElementById('obs-p-video');
        if (btn && btn.classList) btn.classList.remove('on');
    }
    let _fxLoopRunning = false;
    const _molNodes = Array.from({ length: 18 }, (_, i) => ({
        x: Math.random() * 1920, y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
        lbl: ['C', 'H', 'O', 'N'][i % 4]
    }));
    function runFxCanvasLoop() {
        if (_fxLoopRunning) return;
        const cv = document.getElementById('obs-fx-canvas');
        if (!cv || typeof cv.getContext !== 'function') return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        _fxLoopRunning = true;
        function step() {
            ctx.clearRect(0, 0, 1920, 1080);
            if (state.fxMol) {
                ctx.save();
                _molNodes.forEach((n, i) => {
                    n.x = (n.x + n.vx + 1920) % 1920; n.y = (n.y + n.vy + 1080) % 1080;
                    for (let j = i + 1; j < _molNodes.length; j++) {
                        const m = _molNodes[j], dist = Math.hypot(n.x - m.x, n.y - m.y);
                        if (dist < 240) {
                            ctx.strokeStyle = 'rgba(56,189,248,' + (0.25 * (1 - dist / 240)).toFixed(3) + ')';
                            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
                        }
                    }
                    ctx.fillStyle = 'rgba(34,211,238,0.45)';
                    ctx.beginPath(); ctx.arc(n.x, n.y, 13, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.font = 'bold 13px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(n.lbl, n.x, n.y);
                });
                ctx.restore();
            }
            if (state.fxCamSpot && typeof ctx.createRadialGradient === 'function') {
                ctx.save();
                const g = ctx.createRadialGradient(960, 840, 180, 960, 840, 720);
                g.addColorStop(0, 'rgba(0,0,0,0)');
                g.addColorStop(1, 'rgba(2,6,23,0.82)');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, 1920, 1080);
                ctx.restore();
            }
            for (let i = state.chemSparks.length - 1; i >= 0; i--) {
                const p = state.chemSparks[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.a -= 0.015;
                if (p.a <= 0) { state.chemSparks.splice(i, 1); continue; }
                ctx.save(); ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
                ctx.shadowColor = p.col; ctx.shadowBlur = 12;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
            if ((state.fxMol || state.fxCamSpot || state.chemSparks.length) && typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(step);
            } else {
                ctx.clearRect(0, 0, 1920, 1080);
                _fxLoopRunning = false;
            }
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(step);
        else _fxLoopRunning = false;
    }

    function initDrawEvents() {
        loadRandCfg();
        populateRandClasses();
        updateRandCount();
        initPresentBarEvents();
        const cv = getDrawCanvas();
        if (!cv || cv._obsBound) return;
        cv._obsBound = true;
        const cur = document.getElementById('obs-hand-cursor');
        const getPos = (e) => {
            const r = cv.getBoundingClientRect();
            const scaleX = r.width ? (1920 / r.width) : 1;
            const scaleY = r.height ? (1080 / r.height) : 1;
            return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
        };
        cv.addEventListener('pointermove', (e) => {
            if (state.drawTool === 'off') return;
            const p = getPos(e);
            if (cur) { cur.style.display = 'block'; cur.style.left = p.x + 'px'; cur.style.top = p.y + 'px'; }
            if (!state.drawing) return;
            if (state.drawTool === 'er') { if (eraseWholeAt(p.x, p.y)) redrawDrawCanvas(); return; }
            if (state.drawTool === 'laser') {
                const ls = state.laserStrokes[state.laserStrokes.length - 1];
                if (ls) ls.pts.push({ x: p.x, y: p.y });
                redrawDrawCanvas(); return;
            }
            const qk = getQKey(state.idx);
            const sMap = state.boardOn ? state.perQBoardStrokes : state.perQStrokes;
            const arr = sMap[qk] || [];
            if (arr.length) arr[arr.length - 1].pts.push({ x: p.x, y: p.y });
            redrawDrawCanvas();
        });
        cv.addEventListener('pointerdown', (e) => {
            if (state.drawTool === 'off') return;
            const p = getPos(e);
            const qk = getQKey(state.idx);
            if (state.drawTool === 'stamp') {
                const mMap = state.boardOn ? state.perQBoardStamps : state.perQStamps;
                if (!mMap[qk]) mMap[qk] = [];
                mMap[qk].push({ x: p.x, y: p.y, ok: state.stampIsOk });
                redrawDrawCanvas(); return;
            }
            state.drawing = true;
            if (state.drawTool === 'er') { if (eraseWholeAt(p.x, p.y)) redrawDrawCanvas(); return; }
            if (state.drawTool === 'laser') {
                state.laserStrokes.push({ col: state.penCol, pts: [{ x: p.x, y: p.y }], endedAt: 0 });
                redrawDrawCanvas(); return;
            }
            const sMap = state.boardOn ? state.perQBoardStrokes : state.perQStrokes;
            if (!sMap[qk]) sMap[qk] = [];
            sMap[qk].push({ col: state.penCol, pts: [{ x: p.x, y: p.y }] });
            redrawDrawCanvas();
        });
        window.addEventListener('pointerup', () => {
            if (state.drawing && state.drawTool === 'laser' && state.laserStrokes.length) {
                state.laserStrokes[state.laserStrokes.length - 1].endedAt = Date.now();
            }
            state.drawing = false;
        });
        cv.addEventListener('pointerleave', () => { if (cur) cur.style.display = 'none'; state.drawing = false; });

        const tBox = document.getElementById('obs-timer-box');
        if (tBox && !tBox._obsDrag) {
            tBox._obsDrag = true;
            let tDrag = false, ox = 0, oy = 0;
            tBox.addEventListener('pointerdown', (e) => {
                if (e.target && e.target.tagName === 'BUTTON') return;
                tDrag = true;
                const st = document.getElementById('obs-stage-1080p');
                const br = tBox.getBoundingClientRect();
                const sr = st ? st.getBoundingClientRect() : { left: 0, top: 0, width: 1920, height: 1080 };
                const scaleX = sr.width ? (1920 / sr.width) : 1;
                const scaleY = sr.height ? (1080 / sr.height) : 1;
                ox = (e.clientX - br.left) * scaleX; oy = (e.clientY - br.top) * scaleY;
            });
            window.addEventListener('pointermove', (e) => {
                if (!tDrag) return;
                const st = document.getElementById('obs-stage-1080p');
                if (!st) return;
                const sr = st.getBoundingClientRect();
                const scaleX = sr.width ? (1920 / sr.width) : 1;
                const scaleY = sr.height ? (1080 / sr.height) : 1;
                tBox.style.right = 'auto';
                tBox.style.left = Math.max(10, Math.min(1920 - 150, (e.clientX - sr.left) * scaleX - ox)) + 'px';
                tBox.style.top = Math.max(10, Math.min(1080 - 150, (e.clientY - sr.top) * scaleY - oy)) + 'px';
            });
            window.addEventListener('pointerup', () => { tDrag = false; });
        }
    }

    window.openObsModal = function (tid) {
        const topic = findTopic(tid);
        if (!topic) return;
        loadCfg();
        state.topic = topic;
        const rawQs = Array.isArray(topic.questions) ? topic.questions.slice() : [];
        const order = { mc: 0, tf: 1, sa: 2 };
        state.questions = topic.isMinMapDeck ? rawQs : rawQs.sort((a, b) => (order[a.type] ?? 0) - (order[b.type] ?? 0));
        state.idx = 0;
        state.layouts = {};
        state.history = {};

        const titleEl = document.getElementById('obs-topic-title');
        if (titleEl) titleEl.textContent = topic.subtitle || topic.title || 'Studio Xuất OBS • v8';

        const modal = document.getElementById('obs-modal');
        if (modal) modal.classList.remove('hidden');
        applyCfgToUI();
        initDrawEvents();
        renderTimerUi();
        renderQuestion();
        setTimeout(fitStage, 10);
    };

    window.closeObsModal = function () {
        const modal = document.getElementById('obs-modal');
        if (modal) modal.classList.remove('obs-present-mode');
        state.presentMode = false;
        if (modal) modal.classList.add('hidden');
        window.OBS_V7.closeRawEditor();
    };

    window.OBS_V7 = {
        go: function (i) {
            if (!state.questions.length) return;
            closeVidBox();
            this.closeRawEditor();
            state.idx = Math.max(0, Math.min(state.questions.length - 1, i));
            const st = document.getElementById('obs-stage-1080p');
            if (state.presentMode && st && st.classList && typeof requestAnimationFrame === 'function') {
                st.classList.add('obs-q-anim');
                renderQuestion();
                requestAnimationFrame(() => st.classList.remove('obs-q-anim'));
            } else {
                renderQuestion();
            }
        },
        prev: function () { this.go(state.idx - 1); },
        next: function () { this.go(state.idx + 1); },
        undo: function () {
            const st = state.history[state.idx];
            if (!st || !st.length) return false;
            state.layouts[state.idx] = st.pop();
            renderQuestion();
            return true;
        },
        setCam: function (v) {
            const n = Math.min(32, Math.max(16, Number(v) || 23));
            state.cfg.camWidth = n;
            saveCfg(); applyCfgToUI();
        },
        setFontSize: function (v) {
            const n = Math.min(56, Math.max(24, Number(v) || 40));
            ensureCurQCfg().fontSize = n;
            saveCfg(); applyCfgToUI();
        },
        stepFontSize: function (d) { this.setFontSize(getActiveQCfg(state.idx).fontSize + d); },
        setImgScale: function (v) {
            const n = Math.min(200, Math.max(50, Number(v) || 135));
            ensureCurQCfg().imgScale = n;
            saveCfg(); applyCfgToUI();
        },
        stepImgScale: function (d) { this.setImgScale(getActiveQCfg(state.idx).imgScale + d); },
        setTblScale: function (v) {
            const n = Math.min(110, Math.max(65, Number(v) || 80));
            ensureCurQCfg().tblScale = n;
            saveCfg(); applyCfgToUI();
        },
        stepTblScale: function (d) { this.setTblScale(getActiveQCfg(state.idx).tblScale + d); },
        applyQCfgToAll: function () {
            const qCfg = getActiveQCfg(state.idx);
            state.cfg.fontSize = qCfg.fontSize;
            state.cfg.imgScale = qCfg.imgScale;
            state.cfg.tblScale = qCfg.tblScale;
            state.cfg.perQ = {};
            saveCfg(); applyCfgToUI();
        },
        resetCurrentQCfg: function () {
            const k = getQKey(state.idx);
            if (state.cfg.perQ && state.cfg.perQ[k]) delete state.cfg.perQ[k];
            if (!state.cfg.perQ) state.cfg.perQ = {};
            state.cfg.perQ[k] = { fontSize: DEFAULT_CFG.fontSize, imgScale: DEFAULT_CFG.imgScale, tblScale: DEFAULT_CFG.tblScale };
            saveCfg(); applyCfgToUI();
        },
        resetDefaults: function () {
            state.cfg = Object.assign({}, DEFAULT_CFG, { perQ: {} });
            saveCfg(); applyCfgToUI(); renderQuestion();
        },
        autoFitFont: function () {
            const left = document.getElementById('obs-col-left');
            const right = document.getElementById('obs-col-right');
            if (!left || !right) return;
            let fs = getActiveQCfg(state.idx).fontSize;
            while (fs > 24 && (left.scrollHeight > left.clientHeight + 2 || right.scrollHeight > right.clientHeight + 2)) {
                fs -= 2;
                this.setFontSize(fs);
            }
        },
        toggleAutoColor: function () {
            state.cfg.autoColor = !state.cfg.autoColor;
            saveCfg(); applyCfgToUI(); renderQuestion();
        },
        setCustomKw: function (v) {
            state.cfg.customKw = String(v || '');
            saveCfg(); renderQuestion();
        },
        pickManualColor: function (c) {
            state.cfg.manualColor = c || '#fff000';
            saveCfg(); applyCfgToUI();
            highlightSelection(state.cfg.manualColor);
        },
        highlightSelection: highlightSelection,
        toggleShowAnswer: function () {
            state.cfg.showAnswer = !state.cfg.showAnswer;
            saveCfg(); applyCfgToUI(); renderQuestion();
        },
        enterEdit: function (el, bid) {
            if (!el) return;
            el.dataset.beforeEdit = el.innerHTML;
            el.contentEditable = 'true';
            if (el.parentNode && el.parentNode.classList) el.parentNode.classList.add('obs-editing');
            if (typeof el.focus === 'function') el.focus();
        },
        exitEdit: function (el, bid) {
            if (!el) return;
            el.contentEditable = 'false';
            if (el.parentNode && el.parentNode.classList) el.parentNode.classList.remove('obs-editing');
            const blk = findBlockById(bid);
            if (blk && el.innerHTML !== el.dataset.beforeEdit) {
                pushHistory();
                blk.html = el.innerHTML;
            }
        },
        openRawEditor: function (bid) {
            const blk = findBlockById(bid);
            const pop = document.getElementById('obs-latex-pop');
            const ta = document.getElementById('obs-latex-ta');
            const rng = document.getElementById('obs-mscale-range');
            const val = document.getElementById('obs-mscale-val');
            if (!blk || !pop || !ta) return;
            state.editingRawBid = bid;
            ta.value = blk.raw || '';
            const ms = blk.mathScale || 100;
            if (rng) rng.value = String(ms);
            if (val) val.textContent = ms + '%';
            pop.classList.remove('hidden');
            if (typeof ta.focus === 'function') ta.focus();
        },
        closeRawEditor: function () {
            state.editingRawBid = null;
            const pop = document.getElementById('obs-latex-pop');
            if (pop) pop.classList.add('hidden');
        },
        saveRawEditor: function () {
            const blk = findBlockById(state.editingRawBid);
            const ta = document.getElementById('obs-latex-ta');
            const rng = document.getElementById('obs-mscale-range');
            if (blk && ta) {
                pushHistory();
                blk.raw = ta.value;
                blk.mathScale = rng ? (Number(rng.value) || 100) : 100;
                blk.html = buildBlockHtml(blk);
            }
            this.closeRawEditor();
            renderQuestion();
        },
        rebalance: function () {
            pushHistory();
            delete state.layouts[state.idx];
            renderQuestion();
        },
        moveBlock: function (bid, targetCol) {
            const lay = getLayout(state.idx);
            const fromList = lay.left.some(b => b.id === bid) ? lay.left : lay.right;
            const toList = targetCol === 'left' ? lay.left : lay.right;
            if (fromList === toList) return;
            const i = fromList.findIndex(b => b.id === bid);
            if (i < 0) return;
            pushHistory();
            const [item] = fromList.splice(i, 1);
            toList.push(item);
            renderQuestion();
        },
        reorderBlock: function (bid, delta) {
            const lay = getLayout(state.idx);
            const list = lay.left.some(b => b.id === bid) ? lay.left : lay.right;
            const i = list.findIndex(b => b.id === bid);
            const j = i + delta;
            if (i < 0 || j < 0 || j >= list.length) return;
            pushHistory();
            const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
            renderQuestion();
        },
        onDragStart: function (ev, bid) {
            state.dragId = bid;
            if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', bid); }
        },
        onDragOver: function (ev) {
            ev.preventDefault();
            if (ev.currentTarget && ev.currentTarget.classList) ev.currentTarget.classList.add('drag-over');
        },
        onDragLeave: function (ev) {
            if (ev.currentTarget && ev.currentTarget.classList) ev.currentTarget.classList.remove('drag-over');
        },
        onDrop: function (ev, targetCol) {
            ev.preventDefault();
            if (ev.currentTarget && ev.currentTarget.classList) ev.currentTarget.classList.remove('drag-over');
            const bid = state.dragId || (ev.dataTransfer && ev.dataTransfer.getData('text/plain'));
            state.dragId = null;
            if (bid) this.moveBlock(bid, targetCol);
        },
        toggleSlogan: function () {
            state.cfg.sloganOn = !state.cfg.sloganOn;
            saveCfg(); applyCfgToUI();
        },
        setTheme: function (v) {
            const ok = ['theme-aurora', 'theme-emerald', 'theme-pro', 'theme-royal'];
            state.cfg.sloganTheme = ok.includes(v) ? v : 'theme-aurora';
            saveCfg(); applyCfgToUI();
        },
        setText: function (v) {
            state.cfg.sloganText = String(v || '');
            saveCfg(); applyCfgToUI();
        },
        uploadImg: function (input) {
            const f = input && input.files && input.files[0];
            if (!f) return;
            const rd = new FileReader();
            rd.onload = function (ev) {
                state.cfg.sloganImg = String(ev.target.result || '');
                saveCfg(); applyCfgToUI();
            };
            rd.readAsDataURL(f);
        },
        clearImg: function () {
            state.cfg.sloganImg = '';
            const f = document.getElementById('obs-slogan-file');
            if (f) f.value = '';
            saveCfg(); applyCfgToUI();
        },
        highlightPlainText: highlightPlainText,
        fitOverflowKatex: fitOverflowKatex,
        fitStage: fitStage,
        collectExportCss: collectExportCss,
        buildExportSvgString: buildExportSvgString,
        prepareStageClone1080: prepareStageClone1080,
        renderStageToPngBytes: renderStageToPngBytes,
        togglePresentBarDim: function () {
            const bar = document.getElementById('obs-present-bar');
            if (bar && bar.classList) bar.classList.toggle('dim');
            savePresentBarCfg();
        },
        togglePresentBarCollapse: function () {
            const bar = document.getElementById('obs-present-bar');
            if (bar && bar.classList) bar.classList.toggle('collapsed');
            savePresentBarCfg();
        },
        toggleRandomModal: function () {
            const ov = document.getElementById('obs-rand-overlay');
            if (!ov || !ov.classList) return;
            const open = ov.classList.toggle('open');
            const btn = document.getElementById('obs-p-rand');
            if (btn && btn.classList) btn.classList.toggle('on', open);
            if (open) {
                populateRandClasses();
                updateRandCount();
                this.openRandStage(getRandNames().length > 0);
            }
        },
        openRandStage: function (toStage) {
            const st = document.getElementById('obs-rand-setup');
            const sg = document.getElementById('obs-rand-stage');
            if (st) st.style.display = toStage ? 'none' : 'flex';
            if (sg) sg.style.display = toStage ? 'flex' : 'none';
            if (toStage) {
                updateRandCount();
                const nm = document.getElementById('obs-rand-name');
                if (nm && nm.classList) nm.classList.remove('win');
            }
        },
        loadRandFromClass: function () {
            const sel = document.getElementById('obs-rand-class-sel');
            const ta = document.getElementById('obs-rand-ta');
            const list = (typeof classesData !== 'undefined' && Array.isArray(classesData)) ? classesData : [];
            if (!sel || !ta || sel.value === '') return;
            const cls = list[Number(sel.value)];
            if (cls && Array.isArray(cls.students)) {
                ta.value = cls.students.map(s => s && s.name ? String(s.name).trim() : '').filter(Boolean).join('\n');
                state.randUsed = [];
                updateRandCount();
                saveRandCfg();
            }
        },
        onRandListInput: function () { updateRandCount(); saveRandCfg(); },
        resetRandPool: function () { state.randUsed = []; updateRandCount(); saveRandCfg(); },
        spinRandom: function (instantTest) {
            if (state.randSpinning) return;
            const all = getRandNames();
            if (!all.length) { this.openRandStage(false); return; }
            const nd = document.getElementById('obs-rand-nodup');
            const noDup = nd ? !!nd.checked : true;
            const usedSet = new Set(state.randUsed || []);
            let pool = noDup ? all.filter(n => !usedSet.has(n)) : all;
            if (!pool.length) { state.randUsed = []; pool = all; }
            const pc = document.getElementById('obs-rand-pick-cnt');
            const want = Math.min(pool.length, Number((pc && pc.value) || 1));
            const winners = pool.slice().sort(() => Math.random() - 0.5).slice(0, want);
            const el = document.getElementById('obs-rand-name');
            const finish = () => {
                if (el) { el.textContent = winners.join('  •  '); if (el.classList) el.classList.add('win'); }
                if (noDup) state.randUsed = (state.randUsed || []).concat(winners);
                updateRandCount(); saveRandCfg();
                playRandFanfare(); fireRandSparkles();
                state.randSpinning = false;
                return winners;
            };
            if (instantTest) return finish();
            state.randSpinning = true;
            if (el && el.classList) el.classList.remove('win');
            const dur = 4500, t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            let lastSwap = 0, idx = 0;
            function frame(now) {
                const p = Math.min(1, (now - t0) / dur);
                const interval = 42 + Math.pow(p, 2.8) * 360;
                if (now - lastSwap >= interval) {
                    lastSwap = now;
                    idx = (idx + 1) % all.length;
                    if (el) el.textContent = all[idx];
                    playRandTick(520 + (1 - p) * 380);
                }
                if (p < 1 && typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
                else finish();
            }
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
            else finish();
        },
        setHookText: function (txt) {
            try { localStorage.setItem(LS_HOOK, String(txt || '')); } catch (e) {}
        },
        attachVideoUrl: function () {
            const inp = document.getElementById('obs-vid-url-input');
            const raw = inp ? String(inp.value || '').trim() : '';
            if (!raw) return;
            const parsed = toEmbedVideoUrl(raw);
            state.perQVideos[getQKey(state.idx)] = { kind: parsed.kind, src: parsed.src, raw: raw, label: parsed.kind === 'yt' ? 'YouTube' : 'Video URL' };
            syncVideoBadge();
        },
        attachVideoFile: function (inp) {
            if (!inp || !inp.files || !inp.files[0]) return;
            const qk = getQKey(state.idx);
            const prev = state.perQVideos[qk];
            if (prev && prev.kind === 'file' && prev.src) { try { URL.revokeObjectURL(prev.src); } catch (e) {} }
            const f = inp.files[0];
            const url = URL.createObjectURL(f);
            state.perQVideos[qk] = { kind: 'file', src: url, raw: f.name, label: f.name };
            syncVideoBadge();
        },
        clearQuestionVideo: function () {
            const qk = getQKey(state.idx);
            const prev = state.perQVideos[qk];
            if (prev && prev.kind === 'file' && prev.src) { try { URL.revokeObjectURL(prev.src); } catch (e) {} }
            delete state.perQVideos[qk];
            closeVidBox();
            syncVideoBadge();
        },
        playAttachedVideo: function () {
            const box = document.getElementById('obs-q-video-box');
            const body = document.getElementById('obs-q-video-body');
            if (!box || !body) return;
            if (box.classList && box.classList.contains('open')) { this.fadeOutVidReveal(); return; }
            const v = state.perQVideos[getQKey(state.idx)];
            if (!v || !v.src) return;
            if (box.classList) box.classList.remove('fading');
            const extBtn = document.getElementById('obs-q-video-ext');
            if (v.kind === 'yt') {
                body.innerHTML = '<iframe src="' + _escHtml(v.src) + '" referrerpolicy="strict-origin-when-cross-origin" style="width:100%;height:100%;border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>';
                if (extBtn && extBtn.classList) {
                    const isFile = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
                    extBtn.href = v.raw || v.src;
                    extBtn.classList.toggle('hidden', !isFile);
                }
            } else {
                if (extBtn && extBtn.classList) extBtn.classList.add('hidden');
                body.innerHTML = '<video src="' + _escHtml(v.src) + '" controls autoplay playsinline preload="auto" onended="OBS_V7.fadeOutVidReveal()" style="width:100%;height:100%;object-fit:contain;transform:translateZ(0);will-change:transform;"></video>';
            }
            if (box.classList) box.classList.add('open');
            const modal = document.getElementById('obs-modal');
            if (modal && modal.classList) modal.classList.add('obs-vid-playing');
            const btn = document.getElementById('obs-p-video');
            if (btn && btn.classList) btn.classList.add('on');
        },
        fadeOutVidReveal: function () {
            const box = document.getElementById('obs-q-video-box');
            if (!box || !box.classList || !box.classList.contains('open')) return;
            box.classList.add('fading');
            setTimeout(closeVidBox, 1000);
        },
        toggleGreenBoard: function () {
            state.boardOn = !state.boardOn;
            const gb = document.getElementById('obs-green-board');
            if (gb && gb.classList) gb.classList.toggle('open', state.boardOn);
            const btn = document.getElementById('obs-p-board');
            if (btn && btn.classList) btn.classList.toggle('on', state.boardOn);
            redrawDrawCanvas();
        },
        toggleFxPop: function () {
            const p = document.getElementById('obs-fx-pop');
            if (p && p.classList) p.classList.toggle('hidden');
        },
        playHookReveal: function () {
            const p = document.getElementById('obs-fx-pop');
            if (p && p.classList) p.classList.add('hidden');
            const st = document.getElementById('obs-stage-1080p');
            const ov = document.getElementById('obs-hook-overlay');
            const txt = document.getElementById('obs-hook-txt');
            const inp = document.getElementById('obs-hook-input');
            if (txt) txt.textContent = (inp && inp.value.trim()) ? inp.value.trim() : '90% học sinh mất điểm câu này chỉ vì quên 1 quy tắc!';
            if (st && st.classList) st.classList.add('cine-on');
            if (ov && ov.classList) { ov.classList.remove('fade'); ov.classList.add('open'); }
            setTimeout(() => {
                if (ov && ov.classList) ov.classList.add('fade');
                setTimeout(() => {
                    if (ov && ov.classList) ov.classList.remove('open', 'fade');
                    if (st && st.classList) st.classList.remove('cine-on');
                }, 950);
            }, 2000);
        },
        triggerChemBurst: function () {
            const flameCols = ['#fde047', '#22d3ee', '#c084fc', '#fb923c'];
            for (let i = 0; i < 75; i++) {
                state.chemSparks.push({ x: 960, y: 540, vx: (Math.random() - 0.5) * 24, vy: (Math.random() - 0.65) * 20, col: flameCols[i % 4], a: 1, r: 4 + Math.random() * 4 });
            }
            runFxCanvasLoop();
        },
        toggleMolLattice: function () {
            state.fxMol = !state.fxMol;
            const b = document.getElementById('obs-fx-mol-btn');
            if (b && b.classList) b.classList.toggle('on', state.fxMol);
            runFxCanvasLoop();
        },
        triggerAnamorphic: function () {
            const f = document.getElementById('obs-anamorphic-flare'), st = document.getElementById('obs-stage-1080p');
            if (f && f.classList) { f.classList.remove('fire'); void f.offsetWidth; f.classList.add('fire'); }
            if (st && st.classList) { st.classList.remove('obs-shake'); void st.offsetWidth; st.classList.add('obs-shake'); }
        },
        toggleCamSpotlight: function () {
            state.fxCamSpot = !state.fxCamSpot;
            const b = document.getElementById('obs-fx-spot-btn');
            if (b && b.classList) b.classList.toggle('on', state.fxCamSpot);
            runFxCanvasLoop();
        },
        enterPresentMode: function () {
            initDrawEvents();
            renderTimerUi();
            const modal = document.getElementById('obs-modal');
            if (!modal) return;
            state.presentMode = true;
            modal.classList.add('obs-present-mode');
            if (typeof modal.requestFullscreen === 'function') {
                try { modal.requestFullscreen().catch(() => {}); } catch (e) {}
            }
            fitStage();
            setTimeout(fitStage, 120);
        },
        exitPresentMode: function () {
            const modal = document.getElementById('obs-modal');
            state.presentMode = false;
            if (modal) modal.classList.remove('obs-present-mode');
            this.setDrawTool('off');
            const pop = document.getElementById('obs-shortcut-pop');
            if (pop) pop.classList.add('hidden');
            if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
                try { document.exitFullscreen().catch(() => {}); } catch (e) {}
            }
            fitStage();
            setTimeout(fitStage, 120);
        },
        toggleChroma: function () {
            const modal = document.getElementById('obs-modal');
            state.chromaOn = !state.chromaOn;
            if (modal) modal.classList.toggle('obs-chroma-on', state.chromaOn);
            const btn = document.getElementById('obs-p-chroma');
            if (btn) btn.classList.toggle('chroma-on', state.chromaOn);
        },
        setDrawTool: function (t) {
            state.drawTool = (state.drawTool === t && t !== 'off') ? 'off' : t;
            const cv = getDrawCanvas();
            if (cv && cv.classList) cv.classList.toggle('active', state.drawTool !== 'off');
            const map = { pen: 'obs-p-pen', laser: 'obs-p-laser', er: 'obs-p-er', stamp: 'obs-p-stamp' };
            Object.keys(map).forEach(k => {
                const b = document.getElementById(map[k]);
                if (b && b.classList) b.classList.toggle('on', state.drawTool === k);
            });
            const smWrap = document.getElementById('obs-stamp-mode-wrap');
            if (smWrap) smWrap.style.display = state.drawTool === 'stamp' ? 'inline-flex' : 'none';
            const cur = document.getElementById('obs-hand-cursor');
            if (cur) {
                cur.src = state.drawTool === 'er' ? ERASER_CUR_URI : (state.drawTool === 'stamp' ? STAMP_CUR_URI : HAND_CUR_URI);
                if (cur.classList) {
                    cur.classList.toggle('eraser', state.drawTool === 'er');
                    cur.classList.toggle('stamp', state.drawTool === 'stamp');
                }
                if (state.drawTool === 'off') cur.style.display = 'none';
            }
        },
        setStampMode: function (isOk) {
            state.stampIsOk = !!isOk;
            const bOk = document.getElementById('obs-sm-ok'), bNo = document.getElementById('obs-sm-no');
            if (bOk && bOk.classList) bOk.classList.toggle('ok-on', state.stampIsOk);
            if (bNo && bNo.classList) bNo.classList.toggle('no-on', !state.stampIsOk);
        },
        pickDrawColor: function (col, el) {
            state.penCol = col || '#FFF000';
            if (typeof document.querySelectorAll === 'function') {
                document.querySelectorAll('.obs-pcol').forEach(d => d.classList && d.classList.toggle('on', d === el || (d.dataset && d.dataset.pcol === state.penCol)));
            }
            if (state.drawTool !== 'pen' && state.drawTool !== 'laser') this.setDrawTool('pen');
        },
        clearDraw: function () {
            const qk = getQKey(state.idx);
            if (state.boardOn) { state.perQBoardStrokes[qk] = []; state.perQBoardStamps[qk] = []; }
            else { state.perQStrokes[qk] = []; state.perQStamps[qk] = []; }
            redrawDrawCanvas();
        },
        toggleTimerBox: function () {
            const box = document.getElementById('obs-timer-box');
            if (!box || !box.classList) return;
            const on = box.classList.toggle('open');
            const btn = document.getElementById('obs-p-timer');
            if (btn && btn.classList) btn.classList.toggle('on', on);
        },
        setTimerSec: function (sec, btn) {
            if (state.timerHideTm) { clearTimeout(state.timerHideTm); state.timerHideTm = null; }
            if (state.timerIv) { clearInterval(state.timerIv); state.timerIv = null; }
            state.timerMax = Number(sec) || 30;
            state.timerLeft = state.timerMax;
            if (typeof document.querySelectorAll === 'function') {
                document.querySelectorAll('.obs-tp-btn').forEach(b => b.classList && b.classList.toggle('on', b === btn));
            }
            renderTimerUi();
        },
        toggleTimerRun: function () {
            if (state.timerHideTm) { clearTimeout(state.timerHideTm); state.timerHideTm = null; }
            if (state.timerIv) { clearInterval(state.timerIv); state.timerIv = null; renderTimerUi(); return; }
            if (state.timerLeft <= 0) state.timerLeft = state.timerMax;
            state.timerIv = setInterval(() => {
                state.timerLeft = Math.max(0, state.timerLeft - 1);
                renderTimerUi();
                if (state.timerLeft <= 0) {
                    clearInterval(state.timerIv); state.timerIv = null; renderTimerUi(); playTimerBeep();
                    if (state.timerHideTm) clearTimeout(state.timerHideTm);
                    state.timerHideTm = setTimeout(() => {
                        const box = document.getElementById('obs-timer-box');
                        if (box && box.classList) box.classList.remove('open');
                        const btn = document.getElementById('obs-p-timer');
                        if (btn && btn.classList) btn.classList.remove('on');
                        state.timerLeft = state.timerMax;
                        renderTimerUi();
                    }, 1500);
                }
            }, 1000);
            renderTimerUi();
        },
        resetTimer: function () {
            if (state.timerIv) { clearInterval(state.timerIv); state.timerIv = null; }
            state.timerLeft = state.timerMax;
            renderTimerUi();
        },
        setPresentShortcut: function (act, val) {
            const v = String(val || '').trim();
            if (!v || !(act in DEFAULT_PRESENT_SC)) return;
            state.shortcuts[act] = v.length === 1 ? v.toLowerCase() : v;
            try { localStorage.setItem(LS_PRESENT_SC, JSON.stringify(state.shortcuts)); } catch (e) {}
            this.renderShortcutPop();
        },
        resetPresentShortcuts: function () {
            state.shortcuts = Object.assign({}, DEFAULT_PRESENT_SC);
            try { localStorage.setItem(LS_PRESENT_SC, JSON.stringify(state.shortcuts)); } catch (e) {}
            this.renderShortcutPop();
        },
        toggleShortcutPop: function () {
            const p = document.getElementById('obs-shortcut-pop');
            if (!p || !p.classList) return;
            const hidden = p.classList.toggle('hidden');
            if (!hidden) this.renderShortcutPop();
        },
        renderShortcutPop: function () {
            const p = document.getElementById('obs-shortcut-pop');
            if (!p) return;
            let h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:12px;font-weight:800;color:#38bdf8;"><span>⚙️ Phím tắt Trình chiếu</span><button type="button" class="obs-btn-mini" onclick="OBS_V7.toggleShortcutPop()">✕</button></div>';
            Object.keys(DEFAULT_PRESENT_SC).forEach(act => {
                h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;font-size:11.5px;"><span>' + PRESENT_SC_LABELS[act] + '</span><input type="text" data-sc="' + act + '" value="' + _escHtml(state.shortcuts[act] || '') + '" style="width:74px;text-align:center;background:#020617;color:#38bdf8;border:1px solid #334155;border-radius:4px;padding:2px 4px;font-weight:800;" onchange="OBS_V7.setPresentShortcut(this.dataset.sc, this.value)"></div>';
            });
            h += '<button type="button" class="obs-btn" style="width:100%;margin-top:6px;font-size:11.5px;" onclick="OBS_V7.resetPresentShortcuts()">Khôi phục phím mặc định</button>';
            p.innerHTML = h;
        },
        exportCurrentPng: exportCurrentPng,
        buildExportSvgString: buildExportSvgString,
        exportAllZip: exportAllZip,
        makeZipStoreBytes: makeZipStoreBytes,
        getState: function () { return state; }
    };

    window.addEventListener('resize', fitStage);
    document.addEventListener('fullscreenchange', fitStage);
    document.addEventListener('keydown', function (e) {
        const modal = document.getElementById('obs-modal');
        if (!modal || modal.classList.contains('hidden')) return;
        if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'h' || e.key === 'H')) {
            e.preventDefault();
            highlightSelection(state.cfg.manualColor);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') &&
            !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable))) {
            e.preventDefault();
            window.OBS_V7.undo();
            return;
        }
        if (e.key === 'Escape' && document.activeElement && document.activeElement.isContentEditable) {
            document.activeElement.blur();
            return;
        }
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
        if (state.presentMode) {
            const k = e.code === 'Space' ? 'Space' : (e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key);
            const sc = state.shortcuts || DEFAULT_PRESENT_SC;
            const norm = s => (s && s.length === 1 ? s.toLowerCase() : s);
            if (k === norm(sc.exitPresent)) window.OBS_V7.exitPresentMode();
            else if (k === norm(sc.prevQ)) window.OBS_V7.prev();
            else if (k === norm(sc.nextQ)) window.OBS_V7.next();
            else if (k === norm(sc.toggleAns)) { if (e.preventDefault) e.preventDefault(); window.OBS_V7.toggleShowAnswer(); }
            else if (k === norm(sc.pen)) window.OBS_V7.setDrawTool('pen');
            else if (k === norm(sc.laser)) window.OBS_V7.setDrawTool('laser');
            else if (k === norm(sc.eraser)) window.OBS_V7.setDrawTool('er');
            else if (k === norm(sc.stampOk)) { window.OBS_V7.setStampMode(true); if (state.drawTool !== 'stamp') window.OBS_V7.setDrawTool('stamp'); }
            else if (k === norm(sc.stampNo)) { window.OBS_V7.setStampMode(false); if (state.drawTool !== 'stamp') window.OBS_V7.setDrawTool('stamp'); }
            else if (k === norm(sc.clearDraw)) window.OBS_V7.clearDraw();
            else if (k === norm(sc.timer)) window.OBS_V7.toggleTimerBox();
            else if (k === norm(sc.chroma)) window.OBS_V7.toggleChroma();
            else if (k === norm(sc.random)) window.OBS_V7.toggleRandomModal();
            else if (k === norm(sc.video)) window.OBS_V7.playAttachedVideo();
            else if (k === norm(sc.fx)) window.OBS_V7.toggleFxPop();
            else if (k === norm(sc.board)) window.OBS_V7.toggleGreenBoard();
            return;
        }
        if (e.key === 'Escape') closeObsModal();
        else if (e.key === 'ArrowLeft') window.OBS_V7.prev();
        else if (e.key === 'ArrowRight') window.OBS_V7.next();
    });
})();
