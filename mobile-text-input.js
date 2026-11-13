// 게임 입력과 분리된 일회성 입력창. 클립보드를 직접 읽거나 입력값을 저장·전송하지 않는다.
(function (window) {
  'use strict';
  var host = null, field = null, result = '', detach = null;
  var editor = window.JMNativeTextEditor = { state: 0 };
  function element(tag, text, style) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    if (style) node.style.cssText = style;
    return node;
  }
  function cleanup() {
    if (detach) detach(); detach = null;
    if (field) { field.value = ''; field.blur(); } field = null;
    if (host) host.remove(); host = null;
    var canvas = document.getElementById('unity-canvas');
    if (canvas) canvas.focus({ preventScroll: true });
  }
  // 키보드·주소 표시줄·화면 확대 후 실제로 보이는 영역을 기준으로 배치한다.
  editor.visibleRect = function (viewport, width, height) {
    return { left: viewport ? viewport.offsetLeft : 0, top: viewport ? viewport.offsetTop : 0,
      width: viewport ? viewport.width : width, height: viewport ? viewport.height : height };
  };
  editor.open = function (value, hint, kind, limit) {
    cleanup(); result = ''; editor.state = 1;
    host = element('div', '', 'position:fixed;z-index:2147483000;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:12px;background:rgba(10,17,29,.82);font-family:system-ui,sans-serif;color:#20314f;');
    var form = element('form', '', 'box-sizing:border-box;width:100%;max-width:440px;max-height:100%;overflow:auto;overscroll-behavior:contain;border-radius:18px;padding:20px;background:#f7f2df;box-shadow:0 8px 35px #0006;');
    form.setAttribute('role', 'dialog'); form.setAttribute('aria-modal', 'true'); form.setAttribute('aria-labelledby', 'jm-text-editor-title'); form.noValidate = true;
    var title = element('label', hint || '텍스트 입력', 'display:block;font-size:20px;font-weight:750;margin-bottom:12px;');
    title.id = 'jm-text-editor-title'; title.htmlFor = 'jm-native-text-input'; form.appendChild(title);
    field = element(kind === 'multiline' ? 'textarea' : 'input', '', 'box-sizing:border-box;display:block;width:100%;height:50px;padding:10px 12px;border:2px solid #536987;border-radius:9px;background:white;color:#20314f;font:18px system-ui;user-select:text;-webkit-user-select:text;touch-action:manipulation;');
    if(kind === 'multiline'){field.style.height='min(40vh,260px)';field.style.resize='vertical';}
    field.id = 'jm-native-text-input'; field.type = kind === 'password' ? 'password' : kind === 'email' ? 'email' : 'text';
    field.inputMode = kind === 'email' ? 'email' : 'text'; field.autocomplete = kind === 'email' ? 'email' : 'off';
    field.autocapitalize = 'none'; field.spellcheck = false; field.enterKeyHint = 'done';
    field.maxLength = limit > 0 ? limit : 150; field.value = value || ''; form.appendChild(field);
    form.appendChild(element('p', '입력칸을 길게 눌러 붙여넣을 수 있어요.', 'font-size:13px;line-height:1.5;margin:10px 0 14px;'));
    var actions = element('div', '', 'display:flex;gap:10px;');
    var cancel = element('button', '취소', 'flex:1;min-height:46px;border:0;border-radius:9px;background:#20314f;color:white;font-size:16px;'); cancel.type = 'button';
    var done = element('button', '입력 완료', 'flex:2;min-height:46px;border:0;border-radius:9px;background:#ffca3f;color:#20314f;font-size:16px;font-weight:750;'); done.type = 'submit';
    actions.appendChild(cancel); actions.appendChild(done); form.appendChild(actions); host.appendChild(form);
    function finish(accept) {
      result = accept ? field.value : ''; editor.state = accept ? 2 : 3; cleanup();
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); finish(true); });
    cancel.addEventListener('click', function () { finish(false); });
    host.addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.preventDefault(); finish(false); } event.stopPropagation(); });
    function fit() {
      if (!host) return;
      var rect = editor.visibleRect(window.visualViewport, window.innerWidth, window.innerHeight);
      host.style.left = rect.left + 'px'; host.style.top = rect.top + 'px';
      host.style.width = rect.width + 'px'; host.style.height = rect.height + 'px';
    }
    var viewport = window.visualViewport;
    if (viewport) { viewport.addEventListener('resize', fit); viewport.addEventListener('scroll', fit); }
    window.addEventListener('resize', fit);
    detach = function () {
      if (viewport) { viewport.removeEventListener('resize', fit); viewport.removeEventListener('scroll', fit); }
      window.removeEventListener('resize', fit);
    };
    document.body.appendChild(host); fit(); field.focus({ preventScroll: true });
    // iOS에서 자동 포커스를 제한해도 실제 입력칸을 탭하면 기본 키보드와 붙여넣기 메뉴를 사용할 수 있다.
  };
  editor.take = function () { var value = result; result = ''; editor.state = 0; return value; };
  editor.cancel = function () { result = ''; editor.state = 0; cleanup(); };
})(window);
