// 구내식당 식단 안내 — 서버 없는 정적 웹앱 (GitHub Pages)
//
// 데이터: data/index.json  { weeks: { "2026-09-28": { image, width, height, layout, closed, uploaded_at, v } } }
//         data/2026-09-28.jpg  (원본 사진 1장. 요일 칸은 layout 비율로 화면에서 잘라 보여줌)
// 업로드: 담당자 브라우저가 GitHub API로 위 두 파일을 저장소에 커밋 → Pages가 1~2분 뒤 반영
(() => {
  'use strict';

  const APP_VERSION = '21722dde6b1f'; // scripts/stamp-version.py가 기록 (version.json과 같은 값)
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
  function crop(ws, i) {
    const w = index.weeks[ws];
    const { cols, top, bottom } = w.layout;
    const cw = cols[i + 1] - cols[i], ch = bottom - top;
    const px = cw >= 1 ? 0 : (cols[i] / (1 - cw)) * 100;
    const py = ch >= 1 ? 0 : (top / (1 - ch)) * 100;
    const url = imageUrl(ws, w);
    const ar = (cw * w.width) / (ch * w.height);
    const style = `--ar:${ar};aspect-ratio:${ar};background-image:url('${esc(url)}');background-size:${100 / cw}% ${100 / ch}%;background-position:${px}% ${py}%`;
    return `<a class="crop" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${fmt(addDays(ws, i))} 식단 원본 보기" style="${style}"></a>`;
  }

  function dayEntry(iso) {
    if (isWeekend(iso)) return null;
    const ws = mondayOf(iso);
    const w = index.weeks[ws];
    const i = (dow(iso) + 6) % 7;
    if (!w || (w.closed || []).includes(i)) return null;
    return { ws, i };
  }

  const longDate = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${m}월 ${d}일 ${WEEKDAYS[dow(iso)]}요일`; };

  const topbar = (actions = '') => `<header class="pf-header"><div class="pf-topbar"><span class="pf-brand"><span class="pf-wordmark">BITE</span><img class="pf-brand-icon" src="design/shared/icons/bite.svg" alt="" width="20" height="20"></span><nav class="pf-actions">${actions}</nav></div></header>`;

  const empty = () => `
    <div class="empty">
      <h2 class="empty-title">메뉴가 없습니다.</h2>
      <p class="empty-sub">다음 주 식단은 일요일 저녁에 올라옵니다</p>
    </div>`;

  // ── 화면: 오늘 고정 + 좌우 스와이프로 다른 날 보기 ─────────────
  const NEXT_WEEK_NOTE = '다음 주 식단은 일요일 저녁에 올라옵니다';
  const adminLink = '<p class="footnote"><a href="#/upload">담당자: 식단표 업로드</a></p>';

  // 올라와 있는 주의 평일들 + 오늘(주말이어도 포함)
  function pagerDays(t) {
    const days = new Set([t]);
    const thisWeek = mondayOf(t);
    for (const ws of Object.keys(index.weeks)) {
      if (ws < thisWeek) continue;
      for (let i = 0; i < 5; i++) days.add(addDays(ws, i));
    }
    return [...days].sort();
  }

  const dayLabel = (iso, t) => {
    const diff = Math.round((toUTC(iso) - toUTC(t)) / 86400000);
    return diff === 0 ? '오늘' : diff === -1 ? '어제' : diff === 1 ? '내일' : iso < addDays(mondayOf(t), 7) ? '이번 주' : '다음 주';
  };

  let pagerState = null; // 이번 렌더의 { days, t }

  function slide(iso) {
    const entry = dayEntry(iso);
    if (entry) return `<section class="slide" data-date="${iso}">${crop(entry.ws, entry.i)}</section>`;
    const w = index.weeks[mondayOf(iso)];
    const closed = !isWeekend(iso) && w;
    return `<section class="slide slide-empty" data-date="${iso}">
      <div class="empty"><h2 class="empty-title">메뉴가 없습니다.</h2><p class="empty-sub">${closed ? '휴무' : NEXT_WEEK_NOTE}</p></div>
    </section>`;
  }

  function viewHome() {
    const t = todayKst();
    const days = pagerDays(t);
    pagerState = { days, t };
    const tabs = days.map((d, i) => `<button type="button" role="tab" class="pf-tab ${d === t ? 'pf-now' : ''}" data-i="${i}" aria-selected="false" aria-label="${longDate(d)}">${WEEKDAYS[dow(d)]} ${Number(d.slice(8))}</button>`).join('');
    return `${topbar('<button type="button" class="pf-action" id="btn-today" aria-label="오늘로 돌아가기">오늘</button>')}
      <div class="pf-titleblock">
        <p class="pf-eyebrow" id="day-eyebrow"></p>
        <h1 class="pf-title day-title" id="day-title"></h1>
      </div>
      <div class="pf-tabs day-tabs" id="day-tabs" role="tablist" aria-label="날짜">${tabs}</div>
      <div class="pager" id="pager">${days.map(slide).join('')}</div>
      ${adminLink}`;
  }

  function bindHome() {
    const { days, t } = pagerState;
    const pager = document.getElementById('pager');
    const tabsEl = document.getElementById('day-tabs');
    const tabs = [...tabsEl.querySelectorAll('.pf-tab')];
    const $eyebrow = document.getElementById('day-eyebrow');
    const $title = document.getElementById('day-title');
    const $today = document.getElementById('btn-today');
    const todayIdx = days.indexOf(t);
    let cur = -1;
    const set = (i) => {
      if (i === cur || i < 0 || i >= days.length) return;
      cur = i;
      const d = days[i];
      tabs.forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
      tabsEl.scrollTo({ left: tabs[i].offsetLeft - (tabsEl.clientWidth - tabs[i].offsetWidth) / 2, behavior: 'smooth' });
      $eyebrow.textContent = dayLabel(d, t);
      $eyebrow.classList.toggle('pf-now', d === t);
      $title.textContent = longDate(d);
      $today.style.visibility = d === t ? 'hidden' : 'visible';
    };
    const go = (i, smooth = true) => pager.scrollTo({ left: i * pager.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
    tabs.forEach((b, i) => b.addEventListener('click', () => go(i)));
    $today.addEventListener('click', () => go(todayIdx));
    pager.addEventListener('scroll', () => set(Math.round(pager.scrollLeft / pager.clientWidth)), { passive: true });
    onResize = () => go(cur, false); // 회전·크기 변경 시 보던 날에 그대로 맞춤
    go(todayIdx, false); // 열 때는 항상 오늘에 맞춤
    set(todayIdx);
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
    deleteFile(path, sha, message) {
      return this.req(`/repos/${this.repo()}/contents/${path}`, {
        method: 'DELETE',
        body: JSON.stringify({ message, sha, branch: this.branch }),
      });
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
  const closeAction = '<a class="pf-action" href="#/">닫기</a>';

  function viewUpload() {
    if (!gh.repo()) {
      return `${topbar(closeAction)}
        <div class="pf-titleblock"><h1 class="pf-title">식단표 업로드</h1></div>
        <p class="alert alert-error">저장소를 알 수 없습니다. GitHub Pages 주소로 접속하거나 <code>config.js</code>의 <code>repo</code>를 채워 주세요.</p>`;
    }
    if (!gh.token) {
      return `${topbar(closeAction)}
      <div class="pf-titleblock"><h1 class="pf-title">담당자 확인</h1></div>
      <form id="token-form">
        <div class="pf-label">GitHub 토큰</div>
        <div class="pf-input"><input type="password" id="token" autocomplete="off" placeholder="github_pat_…" aria-label="GitHub 토큰" required></div>
        <p class="note"><b>${esc(gh.repo())}</b> 저장소에 쓸 수 있는 토큰이 필요해요. 이 브라우저에만 저장됩니다.
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">토큰 만들기</a> · 저장소 하나만 선택, Contents: Read and write</p>
        <p class="error" id="token-err"></p>
        <button class="pf-btn-primary btn-gap" id="token-btn">확인</button>
      </form>`;
    }
    const t = todayKst();
    const defWeek = addDays(mondayOf(t), dow(t) >= 4 || dow(t) === 0 ? 7 : 0); // 목~일에 올리면 다음 주
    return `${topbar(closeAction)}
      <div class="upload">
        <div class="pf-titleblock"><h1 class="pf-title">식단표 업로드</h1></div>
        <div id="dropzone" class="dropzone">
          <h2 class="empty-title">식단표 사진 추가</h2>
          <p class="empty-sub">여기로 끌어다 놓거나 복사한 이미지를 붙여넣을 수 있어요</p>
          <div class="row">
            <button type="button" class="pf-action link" id="btn-camera">사진 찍기</button>
            <button type="button" class="pf-action link" id="btn-gallery">사진 선택</button>
          </div>
        </div>
        <div id="editor" hidden>
          <div class="pf-label">칸 맞추기</div>
          <div class="stage-card">
            <div class="stage"><img id="preview" alt="선택한 식단표"><div id="overlay" class="overlay"></div></div>
          </div>
          <p class="note">선을 끌어 요일 칸 경계와 위·아래를 맞추세요. 요일 이름을 누르면 휴무가 됩니다. 맞춘 위치는 다음 주에도 그대로 쓰입니다.</p>
          <div class="pf-list">
            <div class="pf-row group-row"><span class="ellipsis muted" id="file-info"></span></div>
            <button type="button" class="pf-row group-row group-btn" id="btn-equal">균등 분할</button>
            <button type="button" class="pf-row group-row group-btn" id="btn-replace">다른 사진으로 교체</button>
            <button type="button" class="pf-row group-row group-btn" id="btn-remove"><span><pf-sym name="close"></pf-sym>사진 삭제</span></button>
          </div>
          <div class="pf-label">주</div>
          <div class="pf-list">
            <label class="pf-row group-row"><span>시작일 (월요일)</span><input class="group-date" type="date" id="week" value="${defWeek}"></label>
            <div class="pf-row group-row"><span class="muted" id="week-range"></span></div>
          </div>
        </div>
        <div id="error" class="alert alert-error" role="alert" hidden>
          <strong id="error-title"></strong><p id="error-msg"></p>
          <button type="button" class="pf-action link" id="btn-retry">다시 시도</button>
        </div>
        <button type="button" class="pf-btn-primary btn-gap" id="btn-save" disabled>저장</button>
        <p class="footnote"><button type="button" id="btn-logout"><pf-sym name="close"></pf-sym>토큰 지우기</button></p>
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
      btn.textContent = '저장 중…';
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
        // 지난 주 식단은 보관하지 않음: 이번 주보다 이전 항목을 목록에서 빼고 사진도 지운다
        const thisWeek = mondayOf(todayKst());
        const expired = Object.keys(idx.weeks).filter((k) => k < thisWeek);
        const expiredImages = expired.map((k) => idx.weeks[k].image).filter(Boolean);
        expired.forEach((k) => delete idx.weeks[k]);
        await gh.putFile('data/index.json', utf8ToB64(JSON.stringify(idx, null, 2) + '\n'), `식단 목록 갱신 ${ws}`, idxFile?.sha);
        for (const p of expiredImages) {
          try {
            const f = await gh.getFile(p);
            if (f) await gh.deleteFile(p, f.sha, `지난 식단 삭제 ${p}`);
          } catch {} // 정리는 실패해도 저장 결과에는 영향 없음
        }

        index = idx;
        localImages[ws] = img.dataUrl;
        flash = '저장했어요. 다른 사람 화면에는 1~2분 뒤에 반영됩니다.';
        location.hash = '#/';
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
  let onResize = null;
  window.addEventListener('resize', () => onResize?.());
  const pageHandlers = {};
  window.addEventListener('paste', (e) => pageHandlers.paste?.(e));
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => (pageHandlers.drop ? pageHandlers.drop(e) : e.preventDefault()));

  async function render() {
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const params = new URLSearchParams(qs);
    pageHandlers.paste = pageHandlers.drop = null;
    onResize = null;
    if (path === '/week') return void (location.hash = '#/'); // 이번 주 탭은 없어짐
    if (!index) await loadIndex();

    const views = { '/': viewHome, '/upload': viewUpload };
    const view = views[path] || viewHome;
    $main.classList.toggle('is-pager', view === viewHome);
    $main.innerHTML = view(params);
    if (flash) $main.querySelector('.pf-header')?.insertAdjacentHTML('afterend', `<p class="alert alert-ok">${esc(flash)}</p>`);
    flash = null;
    window.scrollTo(0, 0);
    if (view === viewHome) bindHome();
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

  // ── 새 버전 알림: /version.json이 이 코드의 APP_VERSION과 다르면 띠를 보임 ──
  const $update = document.getElementById('update');
  let dismissedVersion = null;
  async function checkVersion() {
    try {
      const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const { version } = await r.json();
      if (!version || version === APP_VERSION || version === dismissedVersion) return;
      $update.dataset.version = version;
      $update.hidden = false;
    } catch {} // 오프라인이거나 받지 못하면 아무것도 띄우지 않음
  }
  async function reloadForUpdate() {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.update();
        const w = reg.installing || reg.waiting;
        if (w && w.state !== 'activated') {
          await new Promise((done) => {
            w.addEventListener('statechange', () => w.state === 'activated' && done());
            setTimeout(done, 3000);
          });
        }
      }
    } catch {}
    location.reload();
  }
  $update.querySelector('.pf-update-later').onclick = () => {
    dismissedVersion = $update.dataset.version; // 이번 세션 동안 같은 버전은 다시 띄우지 않음
    $update.hidden = true;
  };
  $update.querySelector('.pf-update-reload').onclick = reloadForUpdate;
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkVersion());
  setInterval(checkVersion, 5 * 60 * 1000);
  checkVersion();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
