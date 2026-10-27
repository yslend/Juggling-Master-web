(function (root) {
  'use strict';
  // 게임 종료 후에만 쓰는 공유 화면이다. 게임 데이터·저장소·외부 서버에 접근하지 않는다.
  var current = null;
  var prepared = null;
  var sharing = null;
  var font = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  var palette = { navy: '#1f2e4a', ink: '#21304a', gold: '#ffc33d', cream: '#f6f2e2', muted: '#667083' };

  function publicUrl(value) {
    try {
      var u = new URL(value);
      var host = u.hostname.toLowerCase();
      // 다른 사람에게 접속할 수 없는 개발용 주소를 보내지 않는다. 공개 HTTPS 도메인만 사용한다.
      if (u.protocol !== 'https:' || u.username || u.password || host.indexOf('.') < 0 ||
          /^[\d.]+$/.test(host) || /[:\[\]]/.test(host) ||
          host === 'localhost' || /\.(localhost|local|internal|test)$/.test(host)) return '';
      u.search = ''; u.hash = '';
      u.pathname = u.pathname.replace(/index\.html$/i, '');
      return u.href;
    } catch (_) { return ''; }
  }
  function resolveUrl(configured, pageUrl) {
    return publicUrl(String(configured || '').trim() || pageUrl);
  }
  function count(value) { return Math.max(0, Math.min(2147483647, Math.floor(Number(value) || 0))); }
  function snapshot(value, pageUrl) {
    value = value || {};
    var p = {
      title: String(value.title || '저글링마스터').slice(0, 40),
      difficulty: String(value.difficulty || '쉬움').slice(0, 20),
      invitation: String(value.invitation || '내 기록에 도전해 보세요!').slice(0, 80),
      gameUrl: resolveUrl(value.gameUrl, pageUrl),
      width: Math.max(600, Math.min(1440, count(value.width) || 900))
    };
    ['score', 'bestScore', 'normalSuccess', 'normalFailure', 'specialSuccess', 'specialFailure'].forEach(function (key) { p[key] = count(value[key]); });
    p.success = p.normalSuccess + p.specialSuccess; p.failure = p.normalFailure + p.specialFailure;
    return Object.freeze(p);
  }
  function shareData(p, file) {
    // 기록 상세는 이미지에만 담고, 메시지에는 도전 문구와 실제 접속 링크만 남긴다.
    return { title: p.title, text: p.invitation + (p.gameUrl ? '\n' + p.gameUrl : ''), files: [file] };
  }
  function canShareFile(nav, data) {
    try { return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare(data); }
    catch (_) { return false; }
  }
  function prepare(value) {
    var p = snapshot(value, root.location.href);
    var key = JSON.stringify(p);
    if (prepared && prepared.key === key && !prepared.failed) return prepared;
    var entry = { key: key, payload: p, blob: null, file: null, failed: false };
    prepared = entry;
    // 결과 화면에 들어갈 때 PNG를 미리 만든다. 이 과정에서는 공유창·복사·다운로드를 실행하지 않는다.
    entry.ready = Promise.resolve(document.fonts ? document.fonts.ready : null).then(function () {
      var canvas = drawCard(document.createElement('canvas'), p);
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('기록 이미지 생성 실패')); return; }
          entry.blob = blob;
          entry.file = typeof root.File === 'function' ? new File([blob], 'JugglingMaster-' + p.score + '.png', { type: 'image/png' }) : null;
          resolve(entry);
        }, 'image/png');
      });
    }).catch(function () { entry.failed = true; return entry; });
    return entry;
  }
  function clearPrepared() {
    prepared = null;
    if (current && current.busy) current.disposeWhenDone = true;
    else close();
  }
  function requestShare(value) {
    if (sharing || current && current.busy) return false;
    var entry = prepare(value);
    var data = shareData(entry.payload, entry.file);
    if (!entry.file || !canShareFile(root.navigator, data)) { open(value); return false; }
    close(); sharing = entry;
    var operation;
    // 결과창의 공유 버튼 동작에서 바로 시스템 공유창을 연다. 사용자가 복사/저장할 필요가 없다.
    try { operation = root.navigator.share(data); } catch (error) { operation = Promise.reject(error); }
    Promise.resolve(operation).catch(function (error) {
      // 취소하면 결과 화면에 그대로 남는다. 실패한 경우에만 대체 공유 화면을 제공한다.
      if ((!error || error.name !== 'AbortError') && prepared === entry) open(value);
    }).finally(function () { sharing = null; });
    return true;
  }
  function rounded(c, x, y, w, h, radius, color) {
    c.beginPath(); c.moveTo(x + radius, y);
    c.arcTo(x + w, y, x + w, y + h, radius); c.arcTo(x + w, y + h, x, y + h, radius);
    c.arcTo(x, y + h, x, y, radius); c.arcTo(x, y, x + w, y, radius); c.closePath();
    c.fillStyle = color; c.fill();
  }
  function label(c, value, x, y, size, color, maxWidth, weight) {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color;
    c.font = (weight || 700) + ' ' + size + 'px ' + font;
    while (maxWidth && c.measureText(String(value)).width > maxWidth && size > 15) {
      size--; c.font = (weight || 700) + ' ' + size + 'px ' + font;
    }
    c.fillText(String(value), x, y);
  }
  function drawCard(canvas, p) {
    canvas.width = p.width; canvas.height = Math.round(p.width * 4 / 3);
    var c = canvas.getContext('2d');
    if (!c) throw new Error('공유 이미지를 만들 수 없어요.');
    c.scale(canvas.width / 900, canvas.height / 1200);
    c.fillStyle = '#111c30'; c.fillRect(0, 0, 900, 1200);
    rounded(c, 45, 45, 810, 1110, 36, palette.cream);
    rounded(c, 78, 78, 744, 110, 22, palette.navy);
    label(c, p.title, 450, 135, 52, palette.gold, 680);
    rounded(c, 340, 217, 220, 50, 25, palette.navy);
    label(c, p.difficulty, 450, 243, 28, '#ffffff', 190);
    label(c, '이번 점수', 450, 322, 32, palette.muted);
    label(c, p.score.toLocaleString('ko-KR') + '점', 450, 421, 112, palette.ink, 690);
    label(c, '최고 점수  ' + p.bestScore.toLocaleString('ko-KR') + '점', 450, 515, 33, palette.muted, 680);
    rounded(c, 95, 567, 710, 154, 20, '#e8e5d8');
    label(c, '성공', 282, 605, 27, palette.muted); label(c, '실패', 618, 605, 27, palette.muted);
    label(c, p.success.toLocaleString('ko-KR'), 282, 664, 51, palette.ink, 285);
    label(c, p.failure.toLocaleString('ko-KR'), 618, 664, 51, palette.ink, 285);
    label(c, '일반공 성공  ' + p.normalSuccess.toLocaleString('ko-KR'), 450, 766, 31, palette.ink, 690);
    label(c, '특수공 성공  ' + p.specialSuccess.toLocaleString('ko-KR'), 450, 819, 31, palette.ink, 690);
    // PNG에는 누를 수 없는 주소/버튼을 넣지 않는다. 빈 공간은 초대 문구를 넓게 보여주는 데 쓴다.
    rounded(c, 95, 882, 710, 190, 20, palette.gold);
    label(c, p.invitation, 450, 977, 42, palette.ink, 655);
    label(c, 'JUGGLING MASTER', 450, 1121, 22, palette.muted);
    return canvas;
  }
  function element(tag, className, text) {
    var e = document.createElement(tag); if (className) e.className = className;
    if (text !== undefined) e.textContent = text; return e;
  }
  function close() {
    if (!current || current.busy) return;
    var old = current; current = null;
    document.removeEventListener('keydown', old.onKey);
    old.root.remove(); if (old.imageUrl) URL.revokeObjectURL(old.imageUrl);
    if (old.focus && old.focus.isConnected && old.focus.focus) old.focus.focus();
  }
  function open(value) {
    if (current && current.busy) return;
    close();
    var entry = prepare(value);
    var p = entry.payload;
    var overlay = element('div', 'jm-share-overlay');
    var style = element('style');
    style.textContent = '.jm-share-overlay{position:fixed;inset:0;z-index:2147483000;background:#081225dc;display:grid;place-items:center;padding:16px;box-sizing:border-box;font:15px system-ui,"Malgun Gothic",sans-serif;color:#21304a}.jm-share-dialog{width:min(420px,100%);max-height:94dvh;overflow:auto;background:#f6f2e2;border-radius:20px;padding:18px;box-sizing:border-box;text-align:center}.jm-share-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.jm-share-head h2{font-size:20px;margin:0}.jm-share-dialog button{border:0;border-radius:12px;background:#1f2e4a;color:white;font:700 15px system-ui,sans-serif;padding:13px 16px;min-height:44px;cursor:pointer}.jm-share-dialog button:disabled{opacity:.5;cursor:default}.jm-share-dialog button:focus-visible,.jm-share-dialog a:focus-visible{outline:3px solid #1381d4;outline-offset:3px}.jm-share-close{font-size:20px!important;min-width:44px}.jm-share-image{display:block;width:auto!important;height:auto!important;max-width:100%;max-height:48vh;object-fit:contain;margin:auto;border-radius:10px}.jm-share-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.jm-share-actions button{flex:1;white-space:nowrap}.jm-share-primary{background:#ffc33d!important;color:#21304a!important;width:100%;margin-top:10px}.jm-share-status{line-height:1.6;margin:12px 0 6px;font-size:14px;overflow-wrap:anywhere}.jm-share-link{display:block;overflow-wrap:anywhere;color:#165e9d;font-size:13px;margin:8px 0}.jm-share-copy{width:100%;box-sizing:border-box;min-height:70px;font-size:14px}';
    overlay.appendChild(style);
    var dialog = element('section', 'jm-share-dialog'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'jm-share-heading');
    var heading = element('header', 'jm-share-head'); var title = element('h2', '', '기록 공유'); title.id = 'jm-share-heading';
    var dismiss = element('button', 'jm-share-close', '×'); dismiss.type = 'button'; dismiss.setAttribute('aria-label', '공유 미리보기 닫기'); dismiss.onclick = close;
    heading.appendChild(title); heading.appendChild(dismiss); dialog.appendChild(heading);
    var img = element('img', 'jm-share-image'); img.alt = p.difficulty + ' 이번 점수 ' + p.score + '점 기록 카드'; dialog.appendChild(img);
    var status = element('p', 'jm-share-status', '공유 이미지를 준비하고 있어요.'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); dialog.appendChild(status);
    if (p.gameUrl) { var link = element('a', 'jm-share-link', p.gameUrl); link.href = p.gameUrl; link.target = '_blank'; link.rel = 'noopener'; dialog.appendChild(link); }
    var primary = element('button', 'jm-share-primary', '준비 중…'); primary.type = 'button'; primary.disabled = true; dialog.appendChild(primary);
    var actions = element('div', 'jm-share-actions');
    var save = element('button', '', '이미지 저장'); save.type = 'button'; save.disabled = true;
    var copy = element('button', '', '게임 링크 복사'); copy.type = 'button'; copy.disabled = !p.gameUrl;
    actions.appendChild(save); actions.appendChild(copy); dialog.appendChild(actions);
    var manual = element('textarea', 'jm-share-copy'); manual.hidden = true; manual.readOnly = true; manual.setAttribute('aria-label', '복사할 게임 주소'); dialog.appendChild(manual);
    overlay.appendChild(dialog);
    var state = { root: overlay, imageUrl: null, busy: false, focus: document.activeElement, file: null };
    current = state;
    state.onKey = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        var controls = Array.from(dialog.querySelectorAll('button:not(:disabled),a[href],textarea:not([hidden])'));
        var first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', state.onKey); document.body.appendChild(overlay); dismiss.focus();
    function download() {
      if (!state.imageUrl || state.busy) return;
      var anchor = element('a'); anchor.href = state.imageUrl; anchor.download = 'JugglingMaster-' + p.score + '.png';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      status.textContent = p.gameUrl ? '이미지 저장을 요청했어요. 게임 링크도 복사해서 함께 보내주세요.' : '이미지 저장을 요청했어요. 게임 공개 후에는 접속 링크도 함께 넣을 수 있어요.';
    }
    save.onclick = download;
    copy.onclick = function () {
      if (!p.gameUrl || state.busy) return;
      if (root.navigator.clipboard && root.isSecureContext) {
        root.navigator.clipboard.writeText(p.gameUrl).then(function () { if (current === state) status.textContent = '게임 링크를 복사했어요.'; })
          .catch(function () { if (current === state) { manual.hidden = false; manual.value = p.gameUrl; manual.focus(); manual.select(); status.textContent = '아래 주소를 길게 눌러 복사해 주세요.'; } });
      } else { manual.hidden = false; manual.value = p.gameUrl; manual.focus(); manual.select(); status.textContent = '아래 주소를 선택해 복사해 주세요.'; }
    };
    entry.ready.then(function () {
      if (current !== state) return;
        if (!entry.blob) { status.textContent = '이미지를 만들지 못했어요. 닫은 뒤 다시 시도해 주세요.'; return; }
        state.imageUrl = URL.createObjectURL(entry.blob); img.src = state.imageUrl;
        state.file = entry.file;
        var data = shareData(p, state.file);
        var supported = !!state.file && canShareFile(root.navigator, data);
        primary.disabled = false; save.disabled = false; save.hidden = !supported;
        primary.textContent = supported ? '이미지' + (p.gameUrl ? '와 링크' : '') + ' 공유하기' : '기록 이미지 저장';
        status.textContent = !p.gameUrl ? '공유할 공개 게임 주소가 아직 없어요. 공개 주소에서 실행하면 링크도 함께 들어가요.' :
          supported ? '이미지와 게임 링크를 함께 보내요. 앱에 따라 링크를 따로 복사해야 할 수 있어요.' : '이 브라우저에서는 이미지를 저장한 뒤 게임 링크와 함께 보내주세요.';
        primary.onclick = supported ? function () {
          if (state.busy || current !== state) return;
          state.busy = true; primary.disabled = save.disabled = copy.disabled = dismiss.disabled = true;
          var operation;
          // 비동기 준비를 모두 마친 뒤 이 버튼의 사용자 동작 안에서 곧바로 공유 API를 호출한다.
          try { operation = root.navigator.share(data); } catch (error) { operation = Promise.reject(error); }
          Promise.resolve(operation).then(function () { status.textContent = '공유창 처리를 마쳤어요.'; }, function (error) {
            status.textContent = error && error.name === 'AbortError' ? '공유를 취소했어요.' : '공유창을 열지 못했어요. 이미지 저장과 링크 복사를 이용해 주세요.';
          }).finally(function () {
            state.busy = false; primary.disabled = save.disabled = dismiss.disabled = false; copy.disabled = !p.gameUrl;
            if (state.disposeWhenDone) close();
          });
        } : download;
    }).catch(function () { if (current === state) status.textContent = '이미지를 준비하지 못했어요. 닫은 뒤 다시 시도해 주세요.'; });
  }
  var api = { prepare: prepare, clearPrepared: clearPrepared, requestShare: requestShare, open: open, close: close, publicUrl: publicUrl, resolveUrl: resolveUrl, snapshot: snapshot, shareData: shareData, canShareFile: canShareFile, drawCard: drawCard };
  root.JugglingMasterSharing = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
