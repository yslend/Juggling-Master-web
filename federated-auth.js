/* 공식 계정 버튼을 게임 위에 직접 표시한다. 자체 안내 탭·외부 문서 프레임을 열지 않는다. */
(function () {
 'use strict';
 let active=null,cancelled=false,ready=false,previous=null;
 const sdk=new Map();
 function close(){
  const old=active;active=null;
  if(old){old.abort.abort();old.root.remove();window.removeEventListener('keydown',old.keyboard,true);}
  ready=false;if(previous?.isConnected)previous.focus();previous=null;
 }
 function cancel(){cancelled=true;close();}
 function live(state){return active===state&&!state.abort.signal.aborted;}
 function load(url){
  if(!sdk.has(url))sdk.set(url,new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=()=>{sdk.delete(url);script.remove();reject(Error('공식 계정 선택 화면을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'));};document.head.append(script);
  }));
  return sdk.get(url);
 }
 async function request(state,path,body){
  const response=await fetch(state.origin+path,{method:body?'POST':'GET',credentials:'omit',signal:state.abort.signal,headers:{skip_zrok_interstitial:'1',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let result;try{result=await response.json();}catch{throw Error('로그인 서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도하세요.');}
  if(!response.ok)throw Error(result.Message||result.error||'로그인을 완료하지 못했습니다. 다시 시도해 주세요.');
  return result;
 }
 async function complete(state,fields){
  if(!live(state)||state.finishing)return;state.finishing=true;state.error.textContent='';state.status.textContent='계정을 확인하고 있습니다…';
  try{
   await request(state,'/api/self/account/federated/complete',{attempt:state.attempt,...fields});
   if(!live(state))return;
   state.button.replaceChildren();state.status.textContent='계정 확인 완료. 게임 로그인을 마무리하고 있습니다…';ready=true;
  }catch(e){if(live(state)){state.finishing=false;state.status.textContent='로그인을 완료하지 못했습니다.';state.error.textContent=e.message;}}
 }
 async function prepare(state){
  try{
   // 터널의 첫 방문 HTML을 넣지 않고 공개 인증 설정만 받아 공식 SDK를 게임 출처에서 실행한다.
   const data=await request(state,'/auth/game-data?attempt='+state.attempt);
   if(!live(state))return;
   if(data.attempt!==state.attempt||!['google','apple'].includes(data.provider)||!/^[A-Za-z0-9_-]{43}$/.test(data.nonce)||typeof data.clientId!=='string'||!data.clientId)throw Error('계정 인증 준비 정보를 확인해 주세요.');
   state.heading.textContent=(data.provider==='google'?'Google':'Apple')+' '+(data.intent==='link'?'계정 연결':data.intent==='reauth'?'계정 다시 인증':'로그인');
   if(data.provider==='google'){
    await load('https://accounts.google.com/gsi/client');if(!live(state))return;
    google.accounts.id.initialize({client_id:data.clientId,nonce:data.nonce,auto_select:false,button_auto_select:false,use_fedcm_for_button:true,callback:r=>complete(state,{credential:r.credential})});
    google.accounts.id.renderButton(state.button,{type:'standard',theme:'outline',size:'large',text:'signin_with',locale:'ko',width:Math.min(300,state.button.clientWidth)});
    state.status.textContent='Google 버튼을 눌러 계정을 선택하세요.';
   }else{
    const redirect=new URL(data.redirectUri);if(redirect.origin!==state.origin||redirect.pathname!=='/auth/apple-return'||redirect.search||redirect.hash)throw Error('Apple 반환 주소를 확인해 주세요.');
    await load('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js');if(!live(state))return;
    AppleID.auth.init({clientId:data.clientId,scope:'',redirectURI:data.redirectUri,state:state.attempt,nonce:data.nonce,usePopup:true});
    const button=document.createElement('button');button.type='button';button.textContent='Apple로 로그인';Object.assign(button.style,{padding:'14px 28px',font:'inherit',borderRadius:'8px',border:'0',background:'#111',color:'white'});
    button.onclick=async()=>{try{const result=await AppleID.auth.signIn();await complete(state,{authorizationCode:result.authorization.code});}catch{if(live(state))state.status.textContent='로그인을 취소했거나 창을 열지 못했습니다. 다시 눌러 주세요.';}};
    state.button.append(button);state.status.textContent='Apple 버튼을 눌러 계정을 선택하세요.';
   }
  }catch(e){if(live(state)){state.status.textContent='로그인 준비를 완료하지 못했습니다.';state.error.textContent=e.message;}}
 }
 window.JMFederated={
  open(address){
   const url=new URL(address);
   if(url.protocol!=='https:'||url.pathname!=='/auth/login'||!/^\?attempt=[A-Za-z0-9_-]{43}$/.test(url.search)||url.hash||url.username||url.password)throw Error('인증 주소 오류');
   close();cancelled=false;ready=false;previous=document.activeElement;
   const root=document.createElement('div');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','계정 로그인');
   Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'2147483000',background:'#102039b8',display:'grid',placeItems:'center',padding:'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',boxSizing:'border-box',fontFamily:'system-ui'});
   const card=document.createElement('section');Object.assign(card.style,{background:'#f6f2e3',color:'#20314c',borderRadius:'20px',width:'min(100%, 460px)',maxHeight:'92dvh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 18px 70px #0008'});
   const header=document.createElement('header');Object.assign(header.style,{background:'#20314c',color:'#fff',padding:'16px 18px',display:'flex',alignItems:'center',gap:'12px'});
   const title=document.createElement('strong');title.textContent='계정 로그인';title.style.flex='1';
   const back=document.createElement('button');back.type='button';back.textContent='취소';back.onclick=cancel;Object.assign(back.style,{padding:'10px 16px',minHeight:'44px',border:'1px solid #ffffff70',borderRadius:'10px',background:'transparent',color:'white',font:'inherit',cursor:'pointer'});
   const body=document.createElement('div');Object.assign(body.style,{padding:'24px',textAlign:'center',overflowY:'auto'});
   const heading=document.createElement('h2');heading.textContent='로그인 준비';Object.assign(heading.style,{fontSize:'24px',margin:'0 0 24px'});
   const button=document.createElement('div');Object.assign(button.style,{display:'grid',justifyContent:'center',minHeight:'44px'});
   const status=document.createElement('p');status.setAttribute('role','status');status.textContent='안전한 로그인 화면을 준비하고 있습니다…';Object.assign(status.style,{lineHeight:'1.7',fontSize:'16px',wordBreak:'keep-all'});
   const error=document.createElement('p');error.setAttribute('role','alert');Object.assign(error.style,{color:'#a22',lineHeight:'1.7',overflowWrap:'anywhere'});
   const help=document.createElement('p');help.textContent='계정 확인이 끝나면 게임에서 바로 이어집니다. 브라우저에 따라 Google·Apple의 공식 계정 선택 창이 표시될 수 있어요.';Object.assign(help.style,{fontSize:'13px',lineHeight:'1.7',color:'#627086',marginBottom:'0',wordBreak:'keep-all'});
   const state={root,button,status,error,heading,origin:url.origin,attempt:url.searchParams.get('attempt'),abort:new AbortController(),finishing:false};
   state.keyboard=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}};
   active=state;window.addEventListener('keydown',state.keyboard,true);header.append(title,back);body.append(heading,button,status,error,help);card.append(header,body);root.append(card);document.body.append(root);back.focus();
   prepare(state);
  },close,cancelled:()=>cancelled,
  // 완료 신호는 확인 요청만 앞당긴다. 자체 세션은 게임의 확인 비밀로 서버에서 검증한다.
  takeReady(){const value=ready;ready=false;return value;}
 };
})();
