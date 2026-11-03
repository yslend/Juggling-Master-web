/* 비밀 토큰은 받지 않는다. 팝업은 브라우저가 허용하는 실제 사용자 터치에서만 연다. */
(function(){'use strict';let root=null,cancelled=false;
 function close(){if(root)root.remove();root=null;}
 window.JMFederated={
  open(address){close();cancelled=false;const url=new URL(address);if(url.protocol!=='https:'||url.pathname!=='/auth/login'||!/^\?attempt=[A-Za-z0-9_-]{43}$/.test(url.search)||url.hash||url.username||url.password)throw Error('인증 주소 오류');
   root=document.createElement('div');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','계정 인증');Object.assign(root.style,{position:'fixed',inset:'0',zIndex:2147483000,background:'#14243dea',display:'grid',placeItems:'center',fontFamily:'system-ui',padding:'20px'});
   const card=document.createElement('div');Object.assign(card.style,{background:'#f6f2e3',color:'#20314c',borderRadius:'18px',padding:'28px',width:'min(88vw,380px)',boxSizing:'border-box',textAlign:'center'});
   const p=document.createElement('p');p.textContent='공식 인증 창에서 계정을 선택한 뒤 이 게임 탭으로 돌아와 주세요.';p.style.lineHeight='1.7';
   const open=document.createElement('button');open.textContent='로그인 창 열기';const cancel=document.createElement('button');cancel.textContent='취소';
   for(const b of [open,cancel])Object.assign(b.style,{display:'block',width:'100%',padding:'17px',marginTop:'16px',border:'0',borderRadius:'10px',font:'inherit',background:'#20314c',color:'white'});
   open.onclick=()=>{const popup=window.open(url.href,'_blank');if(popup)popup.opener=null;p.textContent=popup?'인증 후 이 게임 탭으로 돌아오세요.':'창을 열지 못했습니다. 브라우저의 팝업 허용 설정을 확인한 뒤 다시 눌러 주세요.';};
   cancel.onclick=()=>{cancelled=true;close();};card.append(p,open,cancel);root.append(card);document.body.append(root);open.focus();
  },close,cancelled:()=>cancelled
 };
})();
