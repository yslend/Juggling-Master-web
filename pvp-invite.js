(function (root) {
  'use strict';
  var active = null;
  function el(tag, text) { var node = document.createElement(tag); if (text) node.textContent = text; return node; }
  function close() {
    if (!active || active.busy) return;
    var old = active; active = null; document.removeEventListener('keydown', old.key); old.overlay.remove();
    if (old.focus && old.focus.isConnected) old.focus.focus();
  }
  function open(value) {
    var url;
    try { url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password || !/^[A-F0-9]{6}$/.test(url.searchParams.get('pvpRoom') || '')) return; }
    catch (_) { return; }
    if (active && active.busy) return; close();
    var overlay = el('div'); overlay.id = 'jm-pvp-invite';
    var style = el('style');
    style.textContent = '#jm-pvp-invite{position:fixed;inset:0;z-index:2147483000;background:#081225dc;display:grid;place-items:center;padding:16px;box-sizing:border-box;font:16px system-ui,"Malgun Gothic",sans-serif;color:#21304a}#jm-pvp-invite section{width:min(420px,100%);max-height:90dvh;overflow:auto;background:#f6f2e2;border-radius:20px;padding:22px;box-sizing:border-box;text-align:center}#jm-pvp-invite h2{margin:0 0 16px}#jm-pvp-invite p{line-height:1.7}#jm-pvp-invite button{width:100%;min-height:48px;margin-top:12px;border:0;border-radius:12px;background:#1f2e4a;color:white;font:700 16px system-ui;padding:12px;cursor:pointer}#jm-pvp-invite button.primary{background:#ffc33d;color:#21304a}#jm-pvp-invite textarea{box-sizing:border-box;width:100%;min-height:90px;resize:vertical;font-size:14px;line-height:1.5;padding:10px;border:1px solid #b9bec6;border-radius:8px}#jm-pvp-invite button:focus-visible{outline:3px solid #1381d4;outline-offset:3px}';
    var dialog = el('section'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'jm-invite-title');
    var title = el('h2', '친구 초대'); title.id = 'jm-invite-title'; dialog.appendChild(title);
    dialog.appendChild(el('p', '친구가 링크를 열면 초대받은 방으로 입장해요. 처음 접속한 친구는 데이터 수집 동의가 필요해요.'));
    var address = el('textarea'); address.value = url.href; address.readOnly = true; address.setAttribute('aria-label', '친구 초대 링크'); dialog.appendChild(address);
    var status = el('p', '초대한 방이 열려 있는 동안 사용할 수 있어요.'); status.setAttribute('role', 'status'); dialog.appendChild(status);
    var share = el('button', '친구에게 공유'); share.className = 'primary'; share.type = 'button'; dialog.appendChild(share);
    var copy = el('button', '초대 링크 복사'); copy.type = 'button'; dialog.appendChild(copy);
    var dismiss = el('button', '닫기'); dismiss.type = 'button'; dismiss.onclick = close; dialog.appendChild(dismiss);
    var state = { overlay: overlay, focus: document.activeElement, busy: false }; active = state;
    function manual() { address.focus(); address.select(); status.textContent = '선택된 링크를 복사해서 친구에게 보내 주세요.'; }
    copy.onclick = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url.href).then(function () { status.textContent = '초대 링크를 복사했어요.'; }, manual);
      else manual();
    };
    share.onclick = function () {
      if (typeof navigator.share !== 'function') { manual(); return; }
      // 실제 HTML 버튼에서 호출해 모바일 브라우저의 사용자 동작 조건을 충족한다.
      state.busy = true; share.disabled = copy.disabled = dismiss.disabled = true;
      var operation; try { operation = navigator.share({ title: '저글링마스터 친구 초대', text: '함께 대결해요!', url: url.href }); } catch (error) { operation = Promise.reject(error); }
      Promise.resolve(operation).then(function () { status.textContent = '공유창 처리를 마쳤어요.'; }, function (error) {
        status.textContent = error && error.name === 'AbortError' ? '공유를 취소했어요.' : '공유할 수 없어요. 초대 링크 복사를 이용해 주세요.';
      }).finally(function () { state.busy = false; share.disabled = copy.disabled = dismiss.disabled = false; });
    };
    if (typeof navigator.share !== 'function') share.textContent = '초대 링크 선택';
    state.key = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      var controls = Array.from(dialog.querySelectorAll('textarea,button:not(:disabled)')), first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    overlay.appendChild(style); overlay.appendChild(dialog); document.body.appendChild(overlay); document.addEventListener('keydown', state.key); share.focus();
  }
  root.JugglingMasterInvites = { open: open, close: close };
})(window);
