// 구내식당 식단 안내 — 서버 없는 정적 웹앱 (GitHub Pages)
//
// 데이터: data/index.json  { weeks: { "2026-09-28": { image, width, height, layout, closed, uploaded_at, v } } }
//         data/2026-09-28.jpg  (원본 사진 1장. 요일 칸은 layout 비율로 화면에서 잘라 보여줌)
// 업로드: 담당자 브라우저가 GitHub API로 위 두 파일을 저장소에 커밋 → Pages가 1~2분 뒤 반영
(() => {
  'use strict';

  const WEEKDAYS = '일월화수목금토';
  const DAY_NAMES = ['월', '화', '수', '목', '금'];
  const DEFAULT_LAYOUT = { cols: [0, 0.2, 0.4, 0.6, 0.8, 1], top: 0, bottom: 1 };
  const MAX_SIDE = 1600, QUALITY = 0.85, MAX_INPUT = 25 * 1024 * 1024;
  const $main = document.getElementById('main');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // ── 날짜 (한국 시간, 'YYYY-MM-DD' 문자열) ──────────────
  const todayKst = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const toUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const addDays = (iso, n) => { const t = toUTC(iso); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const dow = (iso) => toUTC(iso).getUTCDay();
  const isWeekend = (iso) => dow(iso) === 0 || dow(iso) === 6;
  const mondayOf = (iso) => addDays(iso, -((dow(iso) + 6) % 7));
  const nextWeekday = (iso) => { let d = addDays(iso, 1); while (isWeekend(d)) d = addDays(d, 1); return d; };
  const fmt = (iso, wd = true) => { const [, m, d] = iso.split('-').map(Number); return `${m}월 ${d}일${wd ? ` (${WEEKDAYS[dow(iso)]})` : ''}`; };
  const weekRange = (ws) => `${fmt(ws, false)} ~ ${fmt(addDays(ws, 4), false)}`;

  // ── 데이터 ───────────────────────────────────────────
  let index = null;
  const localImages = {}; // 방금 저장한 주: Pages 반영 전까지 브라우저에 있는 사진으로 표시

  async function loadIndex() {
    try {
      const r = await fetch(`data/index.json?t=${Date.now()}`, { cache: 'no-store' });
      index = r.ok ? await r.json() : { weeks: {} };
    } catch {
      index = index || { weeks: {} }; // 오프라인: 서비스워커 캐시도 없으면 빈 목록
    }
    index.weeks ||= {};
  }

  const imageUrl = (ws, w) => localImages[ws] || `${w.image}?v=${w.v}`;

  // 원본 사진의 i번째 칸만 보이도록 CSS 배경으로 잘라 표시
  function crop(ws, i, cls = '') {
    const w = index.weeks[ws];
    const { cols, top, bottom } = w.layout;
    const cw = cols[i + 1] - cols[i], ch = bottom - top;
    const px = cw >= 1 ? 0 : (cols[i] / (1 - cw)) * 100;
    const py = ch >= 1 ? 0 : (top / (1 - ch)) * 100;
    const url = imageUrl(ws, w);
    return `<a class="crop ${cls}" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${fmt(addDays(ws, i))} 식단 크게 보기"
      style="aspect-ratio:${(cw * w.width) / (ch * w.height)};background-image:url('${esc(url)}');background-size:${100 / cw}% ${100 / ch}%;background-position:${px}% ${py}%"></a>`;
  }

  function dayEntry(iso) {
    if (isWeekend(iso)) return null;
    const ws = mondayOf(iso);
    const w = index.weeks[ws];
    const i = (dow(iso) + 6) % 7;
    if (!w || (w.closed || []).includes(i)) return null;
    return { ws, i };
  }

  const notice = (weekend) => `
    <div class="notice"><div class="notice-icon">🍱</div>
      <p class="notice-title">${weekend ? '오늘은 식당이 쉬는 날이에요' : '아직 식단이 등록되지 않았어요'}</p>
      <p class="muted">다음 주 식단은 일요일 저녁에 올라옵니다</p></div>`;

  // ── 화면: 오늘 ─────────────────────────────────────────
  function viewHome() {
    const t = todayKst(), nxt = nextWeekday(t);
    const today = dayEntry(t), next = dayEntry(nxt);
    const label = nxt === addDays(t, 1) ? '내일' : '다음 영업일';
    return `
      <p class="home-date">${fmt(t)}</p>
      ${today ? `<section class="menu menu-lg"><h1>오늘의 메뉴</h1>${crop(today.ws, today.i)}</section>` : notice(isWeekend(t))}
      ${next ? `<section class="menu menu-sm"><h2>${label} · ${fmt(nxt)}</h2>${crop(next.ws, next.i, 'crop-sm')}</section>` : ''}`;
  }

  // ── 화면: 주간 ─────────────────────────────────────────
  function viewWeek(params) {
    const t = todayKst();
    const def = isWeekend(t) ? mondayOf(addDays(t, 2)) : mondayOf(t); // 주말엔 다음 주
    const ws = params.get('w') ? mondayOf(params.get('w')) : def;
    const w = index.weeks[ws];
    const nav = `
      <div class="week-nav">
        <a class="btn btn-icon" href="#/week?w=${addDays(ws, -7)}" aria-label="이전 주">‹</a>
        <div class="week-title"><strong>${weekRange(ws)}</strong>
          ${ws !== def ? `<a class="link small" href="#/week">${isWeekend(t) ? '다음 주로' : '이번 주로'}</a>` : ''}</div>
        <a class="btn btn-icon" href="#/week?w=${addDays(ws, 7)}" aria-label="다음 주">›</a>
      </div>`;
    if (!w) return nav + notice(false);
    const days = DAY_NAMES.map((_, i) => {
      const d = addDays(ws, i);
      const closed = (w.closed || []).includes(i);
      return `<section class="menu day ${d === t ? 'is-today' : ''}">
        <h2>${fmt(d)} ${d === t ? '<span class="chip">오늘</span>' : ''}</h2>
        ${closed ? '<p class="closed">휴무</p>' : crop(ws, i)}</section>`;
    }).join('');
    return `${nav}<div class="week-grid">${days}</div>
      <p class="center"><a class="link small" href="${esc(imageUrl(ws, w))}" target="_blank" rel="noopener">원본 식단표 보기</a></p>`;
  }

  // ── 화면: 이력 ─────────────────────────────────────────
  function viewHistory() {
    const thisWeek = mondayOf(todayKst());
    const weeks = Object.keys(index.weeks).sort().reverse();
    const list = weeks.length
      ? `<ul class="history">${weeks.map((ws) => `<li><a href="#/week?w=${ws}"><span>${weekRange(ws)}</span>
          ${ws === thisWeek ? '<span class="chip">이번 주</span>' : ws > thisWeek ? '<span class="chip chip-muted">예정</span>' : ''}</a></li>`).join('')}</ul>`
      : '<p class="muted">저장된 식단이 없습니다.</p>';
    return `<h1>식단 이력</h1>${list}<p class="center admin-link"><a class="link small" href="#/upload">담당자: 식단표 업로드</a></p>`;
  }

  // ── GitHub API (담당자 전용) ─────────────────────────────
  const TOKEN_KEY = 'menu.ghToken';
  const gh = {
    get token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set token(v) { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch {} },
    repo() {
      const cfg = window.MENU_CONFIG || {};
      if (cfg.repo) return cfg.repo;
      const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
      if (!m) return null;
      const seg = location.pathname.split('/').filter(Boolean)[0];
      return `${m[1]}/${seg || `${m[1]}.github.io`}`;
    },
    branch: null,
    async req(path, opts = {}) {
      let r;
      try {
        r = await fetch(`https://api.github.com${path}`, {
          ...opts,
          headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        });
      } catch {
        throw Object.assign(new Error('GitHub에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.'), { code: 'network' });
      }
      if (r.ok) return r.json();
      const status = r.status;
      const msg =
        status === 401 ? '토큰이 올바르지 않거나 만료되었습니다. 토큰을 다시 입력해 주세요.'
        : status === 403 || status === 404 ? '이 저장소에 쓸 권한이 없습니다. 토큰의 저장소 선택과 Contents 쓰기 권한을 확인해 주세요.'
        : status === 409 || status === 422 ? '다른 저장과 겹쳤습니다. 다시 시도해 주세요.'
        : `GitHub 오류가 발생했습니다 (${status}). 잠시 후 다시 시도해 주세요.`;
      throw Object.assign(new Error(msg), { code: status === 401 ? 'auth' : 'api', status });
    },
    async check() {
      const repo = await this.req(`/repos/${this.repo()}`);
      if (!repo.permissions?.push) throw Object.assign(new Error('이 토큰으로는 저장소에 쓸 수 없습니다. Contents 쓰기 권한을 주세요.'), { code: 'auth' });
      this.branch = (window.MENU_CONFIG || {}).branch || repo.default_branch;
    },
    async getFile(path) {
      try {
        return await this.req(`/repos/${this.repo()}/contents/${path}?ref=${encodeURIComponent(this.branch)}`);
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    },
    putFile(path, base64, message, sha) {
      return this.req(`/repos/${this.repo()}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({ message, content: base64, branch: this.branch, ...(sha ? { sha } : {}) }),
      });
    },
  };
  const utf8ToB64 = (s) => { const b = new TextEncoder().encode(s); let bin = ''; b.forEach((x) => (bin += String.fromCharCode(x))); return btoa(bin); };
  const b64ToUtf8 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

  // ── 화면: 업로드 ───────────────────────────────────────
  function viewUpload() {
    if (!gh.repo()) {
      return `<div class="upload"><h1>식단표 업로드</h1><p class="alert alert-error">저장소를 알 수 없습니다.
        GitHub Pages 주소로 접속하거나 <code>config.js</code>의 <code>repo</code>를 채워 주세요.</p></div>`;
    }
    if (!gh.token) {
      return `<form class="pin" id="token-form">
        <h1>담당자 확인</h1>
        <p class="muted small">식단표를 저장하려면 <b>${esc(gh.repo())}</b> 저장소에 쓸 수 있는 GitHub 토큰이 필요해요. 이 브라우저에만 저장됩니다.</p>
        <input class="pin-input token-input" type="password" id="token" autocomplete="off" placeholder="github_pat_…" required>
        <p class="error" id="token-err"></p>
        <button class="btn btn-primary btn-block" id="token-btn">확인</button>
        <p class="muted small"><a class="link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">토큰 만들기</a>
          · 저장소 하나만 선택, 권한은 Contents: Read and write</p>
      </form>`;
    }
    const t = todayKst();
    const defWeek = addDays(mondayOf(t), dow(t) >= 4 || dow(t) === 0 ? 7 : 0); // 목~일에 올리면 다음 주
    return `
      <div class="upload">
        <h1>식단표 업로드</h1>
        <div id="dropzone" class="dropzone">
          <p class="dropzone-title">식단표 사진을 올려 주세요</p>
          <p class="muted small">여기로 끌어다 놓거나, 복사한 이미지를 붙여넣기(Ctrl+V) 할 수 있어요</p>
          <div class="row center">
            <button type="button" class="btn btn-primary" id="btn-camera">📷 촬영</button>
            <button type="button" class="btn" id="btn-gallery">🖼 갤러리</button>
          </div>
        </div>
        <div id="editor" hidden>
          <p class="muted small">선을 끌어서 <b>요일 칸 경계</b>와 <b>위·아래</b>를 맞춰 주세요. 요일 이름을 누르면 휴무로 바뀝니다. 맞춘 위치는 다음 주에도 그대로 쓰입니다.</p>
          <div class="stage"><img id="preview" alt="선택한 식단표"><div id="overlay" class="overlay"></div></div>
          <div class="row wrap">
            <span class="muted small ellipsis" id="file-info"></span>
            <button type="button" class="btn btn-sm" id="btn-equal">균등 분할</button>
            <button type="button" class="btn btn-sm" id="btn-replace">교체</button>
            <button type="button" class="btn btn-sm btn-danger" id="btn-remove">삭제</button>
          </div>
          <label class="field"><span>어느 주 식단인가요?</span>
            <input class="input" type="date" id="week" value="${defWeek}"><strong id="week-range"></strong></label>
        </div>
        <div id="error" class="alert alert-error" role="alert" hidden>
          <strong id="error-title"></strong><p id="error-msg"></p>
          <button type="button" class="btn btn-sm" id="btn-retry">다시 시도</button>
        </div>
        <button type="button" class="btn btn-primary btn-block btn-lg" id="btn-save" disabled>저장</button>
        <p class="center"><button type="button" class="link small btn-plain" id="btn-logout">토큰 지우기</button></p>
        <input type="file" id="in-gallery" accept="image/*" hidden>
        <input type="file" id="in-camera" accept="image/*" capture="environment" hidden>
      </div>`;
  }

  function bindTokenForm() {
    const form = document.getElementById('token-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('token-btn');
      btn.disabled = true;
      btn.textContent = '확인 중…';
      gh.token = document.getElementById('token').value.trim();
      try {
        await gh.check();
        render();
      } catch (err) {
        gh.token = null;
        document.getElementById('token-err').textContent = err.message;
        btn.disabled = false;
        btn.textContent = '확인';
      }
    };
  }

  function bindUpload() {
    const $ = (id) => document.getElementById(id);
    let file = null, objectUrl = null;
    const latest = Object.keys(index.weeks).sort().pop();
    const layout = structuredClone(latest ? index.weeks[latest].layout : DEFAULT_LAYOUT);
    const closed = new Set();

    $('btn-logout').onclick = () => ((gh.token = null), render());

    function showError(code, msg, retry) {
      const titles = { format: '이미지 형식 오류', size: '용량 초과', network: '네트워크 오류', auth: '권한 오류', api: '저장 오류' };
      $('error').hidden = false;
      $('error-title').textContent = titles[code] || '오류';
      $('error-msg').textContent = msg;
      $('btn-retry').hidden = !retry;
    }
    const hideError = () => ($('error').hidden = true);

    function pick(f) {
      if (!f) return;
      hideError();
      if (f.type && !f.type.startsWith('image/')) return showError('format', `이미지 파일이 아닙니다 (${f.type}). JPG·PNG 사진을 선택해 주세요.`);
      if (f.size > MAX_INPUT) return showError('size', `파일이 너무 큽니다 (${(f.size / 1048576).toFixed(1)}MB). 25MB 이하 사진을 선택해 주세요.`);
      file = f;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(f);
      $('preview').onerror = () => (clear(), showError('format', '이미지를 열 수 없습니다. HEIC 등 브라우저가 지원하지 않는 형식일 수 있어요. 스크린샷이나 JPG로 다시 시도해 주세요.'));
      $('preview').onload = renderOverlay;
      $('preview').src = objectUrl;
      $('file-info').textContent = `${f.name || '붙여넣은 이미지'} · ${(f.size / 1048576).toFixed(1)}MB`;
      $('dropzone').hidden = true;
      $('editor').hidden = false;
      $('btn-save').disabled = false;
    }
    function clear() {
      file = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      $('preview').removeAttribute('src');
      $('dropzone').hidden = false;
      $('editor').hidden = true;
      $('btn-save').disabled = true;
    }

    $('btn-camera').onclick = () => $('in-camera').click();
    $('btn-gallery').onclick = $('btn-replace').onclick = () => $('in-gallery').click();
    $('btn-remove').onclick = () => (clear(), hideError());
    for (const id of ['in-camera', 'in-gallery']) $(id).onchange = (e) => (pick(e.target.files[0]), (e.target.value = ''));
    const dz = $('dropzone');
    dz.ondragover = (e) => (e.preventDefault(), dz.classList.add('is-drag'));
    dz.ondragleave = () => dz.classList.remove('is-drag');
    dz.ondrop = (e) => (e.preventDefault(), dz.classList.remove('is-drag'), pick(e.dataTransfer.files[0]));
    pageHandlers.drop = (e) => (e.preventDefault(), pick(e.dataTransfer?.files[0]));
    pageHandlers.paste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (item) (e.preventDefault(), pick(item.getAsFile()));
    };

    // 열 경계 편집: DOM은 한 번 만들고 위치만 갱신 (드래그 중 핸들이 사라지지 않게)
    const overlay = $('overlay');
    const pct = (v) => `${(v * 100).toFixed(3)}%`;
    const el = (tag, cls) => Object.assign(document.createElement(tag), { className: cls });
    const shadeTop = el('div', 'shade'), shadeBottom = el('div', 'shade');
    const cells = DAY_NAMES.map((_, i) => {
      const c = el('button', 'cell');
      c.type = 'button';
      c.onclick = () => (closed.has(i) ? closed.delete(i) : closed.add(i), renderOverlay());
      return c;
    });
    const vHandles = [0, 1, 2, 3, 4, 5].map((i) => makeHandle('v', i));
    const hTop = makeHandle('h', 'top'), hBottom = makeHandle('h', 'bottom');
    overlay.append(shadeTop, shadeBottom, ...cells, ...vHandles, hTop, hBottom);

    function renderOverlay() {
      const { cols, top, bottom } = layout;
      Object.assign(shadeTop.style, { top: 0, height: pct(top) });
      Object.assign(shadeBottom.style, { top: pct(bottom), bottom: 0 });
      cells.forEach((c, i) => {
        Object.assign(c.style, { left: pct(cols[i]), width: pct(cols[i + 1] - cols[i]), top: pct(top), height: pct(bottom - top) });
        c.classList.toggle('is-closed', closed.has(i));
        c.innerHTML = `<span>${DAY_NAMES[i]}${closed.has(i) ? ' · 휴무' : ''}</span>`;
      });
      vHandles.forEach((h, i) => (h.style.left = pct(cols[i])));
      hTop.style.top = pct(top);
      hBottom.style.top = pct(bottom);
    }
    function makeHandle(dir, key) {
      const h = el('div', `handle handle-${dir}`);
      h.onpointerdown = (e) => {
        e.preventDefault();
        h.setPointerCapture(e.pointerId);
        h.classList.add('is-active');
        const rect = overlay.getBoundingClientRect();
        const move = (ev) => {
          if (dir === 'v') {
            const c = layout.cols;
            const lo = key === 0 ? 0 : c[key - 1] + 0.02, hi = key === 5 ? 1 : c[key + 1] - 0.02;
            c[key] = Math.min(hi, Math.max(lo, (ev.clientX - rect.left) / rect.width));
          } else {
            const y = (ev.clientY - rect.top) / rect.height;
            if (key === 'top') layout.top = Math.min(layout.bottom - 0.05, Math.max(0, y));
            else layout.bottom = Math.max(layout.top + 0.05, Math.min(1, y));
          }
          renderOverlay();
        };
        const up = () => {
          h.classList.remove('is-active');
          ['pointermove', 'pointerup', 'pointercancel'].forEach((t, j) => h.removeEventListener(t, j ? up : move));
        };
        h.addEventListener('pointermove', move);
        h.addEventListener('pointerup', up);
        h.addEventListener('pointercancel', up);
      };
      return h;
    }
    $('btn-equal').onclick = () => {
      const [a, b] = [layout.cols[0], layout.cols[5]];
      layout.cols = [0, 1, 2, 3, 4, 5].map((i) => a + ((b - a) * i) / 5);
      renderOverlay();
    };

    // 주 선택: 항상 월요일로 맞춤
    const weekInput = $('week');
    const snapWeek = () => {
      if (!weekInput.value) return;
      weekInput.value = mondayOf(weekInput.value);
      $('week-range').textContent = `${fmt(weekInput.value)} ~ ${fmt(addDays(weekInput.value, 4))}`;
    };
    weekInput.onchange = snapWeek;
    snapWeek();

    async function resize() {
      let src;
      try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { src = $('preview'); }
      const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
      const s = Math.min(1, MAX_SIDE / Math.max(w0, h0));
      const c = document.createElement('canvas');
      c.width = Math.round(w0 * s);
      c.height = Math.round(h0 * s);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(src, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', QUALITY);
      if (!dataUrl.startsWith('data:image/jpeg')) throw Object.assign(new Error('이미지 변환에 실패했습니다.'), { code: 'format' });
      return { dataUrl, width: c.width, height: c.height };
    }

    const confirmOverwrite = (ws) => new Promise((resolve) => {
      const d = document.getElementById('confirm');
      document.getElementById('confirm-msg').textContent = `${weekRange(ws)} 식단이 이미 있습니다. 새 사진으로 덮어쓰면 이전 식단은 사라집니다.`;
      d.querySelectorAll('button').forEach((b) => (b.onclick = () => (d.close(), resolve(b.value === 'ok'))));
      d.oncancel = () => resolve(false);
      d.showModal();
    });

    async function save() {
      if (!file) return;
      hideError();
      const btn = $('btn-save');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> 저장 중…';
      const ws = weekInput.value;
      try {
        if (!gh.branch) await gh.check();
        const img = await resize();
        // 최신 index.json은 Pages(캐시)가 아니라 저장소에서 직접 읽는다
        const idxFile = await gh.getFile('data/index.json');
        const idx = idxFile ? JSON.parse(b64ToUtf8(idxFile.content)) : { weeks: {} };
        idx.weeks ||= {};
        if (idx.weeks[ws] && !(await confirmOverwrite(ws))) return;

        const path = `data/${ws}.jpg`;
        const old = await gh.getFile(path);
        await gh.putFile(path, img.dataUrl.split(',')[1], `식단표 ${ws}`, old?.sha);
        const now = new Date();
        idx.weeks[ws] = {
          image: path, width: img.width, height: img.height,
          layout: { cols: layout.cols.map((x) => +x.toFixed(4)), top: +layout.top.toFixed(4), bottom: +layout.bottom.toFixed(4) },
          closed: [...closed].sort(), uploaded_at: now.toISOString(), v: now.getTime(),
        };
        await gh.putFile('data/index.json', utf8ToB64(JSON.stringify(idx, null, 2) + '\n'), `식단 목록 갱신 ${ws}`, idxFile?.sha);

        index = idx;
        localImages[ws] = img.dataUrl;
        flash = '저장했어요. 다른 사람 화면에는 1~2분 뒤에 반영됩니다.';
        location.hash = `#/week?w=${ws}`;
      } catch (e) {
        if (e.code === 'auth') gh.token = null;
        showError(e.code || 'api', e.message, !['format', 'size', 'auth'].includes(e.code));
      } finally {
        btn.disabled = !file;
        btn.textContent = '저장';
      }
    }
    $('btn-save').onclick = save;
    $('btn-retry').onclick = save;
  }

  // ── 라우터 ────────────────────────────────────────────
  let flash = null;
  const pageHandlers = {};
  window.addEventListener('paste', (e) => pageHandlers.paste?.(e));
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => (pageHandlers.drop ? pageHandlers.drop(e) : e.preventDefault()));

  async function render() {
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const params = new URLSearchParams(qs);
    pageHandlers.paste = pageHandlers.drop = null;
    document.querySelectorAll('.tab').forEach((a) => a.classList.toggle('active', a.dataset.tab === ({ '/': 'home', '/week': 'week', '/history': 'history' })[path]));
    if (!index) await loadIndex();

    const views = { '/': viewHome, '/week': viewWeek, '/history': viewHistory, '/upload': viewUpload };
    const view = views[path] || viewHome;
    $main.innerHTML = (flash ? `<p class="alert alert-ok">${esc(flash)}</p>` : '') + view(params);
    flash = null;
    window.scrollTo(0, 0);
    if (path === '/upload') document.getElementById('token-form') ? bindTokenForm() : gh.repo() && bindUpload();
  }

  window.addEventListener('hashchange', render);
  // 앱을 켜 둔 채 다시 열면 최신 식단과 오늘 날짜로 갱신
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && !location.hash.startsWith('#/upload')) {
      await loadIndex();
      render();
    }
  });
  render();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
