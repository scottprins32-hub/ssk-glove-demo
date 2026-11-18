import {createClient} from './merchant-auth.bundle.js';
import {APP_ID} from './commerce-config.js';

const EMAIL='info@sskeurope.com';
const client=createClient({appId:APP_ID,appBaseUrl:location.origin,requiresAuth:false});
const get=id=>document.getElementById(id);
const form=get('account-form'),password=get('password'),code=get('code'),status=get('status');
let mode='register',busy=false,complete=false,resendAfter=0,timer;
function message(text){status.textContent=text;}
function render(){
 if(complete)return;
 const verifying=mode==='verify';
 get('password-fields').hidden=verifying;password.disabled=verifying;password.required=!verifying;
 get('code-fields').hidden=!verifying;code.disabled=!verifying;code.required=verifying;
 password.autocomplete=mode==='login'?'current-password':'new-password';
 password.minLength=mode==='login'?1:8;
 get('heading').textContent=verifying?'Bevestig je e-mailadres':mode==='login'?'Inloggen voor SSK':'Ontvanger bevestigen';
 get('intro').textContent=verifying?'Vul de code in die Base44 naar '+EMAIL+' heeft gestuurd.':mode==='login'?'Log in met het bestaande account van '+EMAIL+'.':'Maak eenmalig een account voor de SSK-mailbox. Kies zelf een wachtwoord en bevestig daarna de code uit de e-mail.';
 get('submit').textContent=busy?'Even wachten…':verifying?'E-mailadres bevestigen':mode==='login'?'Inloggen':'Account aanmaken';
 get('submit').disabled=busy;get('switch-mode').disabled=busy;get('verify-mode').disabled=busy;
 get('switch-mode').textContent=mode==='register'||verifying?'Ik heb al een account':'Terug naar account aanmaken';
 get('verify-mode').hidden=verifying;
 const wait=Math.max(0,Math.ceil((resendAfter-Date.now())/1000));
 get('resend').hidden=!verifying;get('resend').disabled=busy||wait>0;
 get('resend').textContent=wait?'Nieuwe code over '+wait+' s':'Nieuwe code versturen';
}
function show(modeValue){mode=modeValue;password.value='';code.value='';render();(mode==='verify'?code:password).focus();}
function confirmed(user){
 if(user?.email?.toLowerCase()!==EMAIL||user.is_verified!==true)return false;
 complete=true;
 password.value='';code.value='';form.hidden=true;get('complete').hidden=false;
 get('heading').textContent='SSK-mailadres bevestigd';get('intro').hidden=true;message('Bevestiging voltooid voor '+EMAIL+'.');clearInterval(timer);return true;
}
async function login(secret){
 // The bundled SDK redirects to the homepage on a rejected password. Keep the
 // error on this page instead, using the same first-party auth endpoint.
 const response=await fetch('https://base44.app/api/apps/'+APP_ID+'/auth/login',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:EMAIL,password:secret})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Object.assign(Error('login_failed'),{status:response.status});
 if(typeof data.access_token!=='string'||!data.access_token)throw Error('login_incomplete');
 client.auth.setToken(data.access_token);
 return client.auth.me();
}
function errorMessage(error){
 const value=error?.response?.data?.detail||error?.response?.data?.message||error?.message||'';
 if(/verif|otp|code/i.test(String(value)))return 'De code of e-mailbevestiging is nog niet geldig. Controleer de laatste code of vraag een nieuwe code aan.';
 if(Number(error?.status||error?.response?.status)===429)return 'Er zijn te veel pogingen gedaan. Wacht enkele minuten en probeer opnieuw.';
 return mode==='login'?'Inloggen is niet gelukt. Controleer het wachtwoord. Nog niet bevestigd? Kies “E-mail bevestigen”. Nog geen account? Kies account aanmaken.':mode==='verify'?'De code is niet geaccepteerd. Controleer de laatste code of vraag een nieuwe code aan.':'Account aanmaken is niet gelukt. Probeer opnieuw, of kies “Ik heb al een account”.';
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!form.reportValidity())return;
 busy=true;const secret=password.value;password.value='';render();message('');
 try{
  if(mode==='register'){
   await client.auth.register({email:EMAIL,password:secret});resendAfter=Date.now()+60000;show('verify');
   message('Controleer '+EMAIL+' voor de bevestigingscode. Had je al een account? Log dan in.');
  }else if(mode==='verify'){
   const result=await client.auth.verifyOtp({email:EMAIL,otpCode:code.value.trim()});
   if(result?.access_token){client.auth.setToken(result.access_token);if(confirmed(await client.auth.me()))return;}
   show('login');message('De code is geaccepteerd. Log nu in om de aanmelding af te ronden.');
  }else{
   if(!confirmed(await login(secret)))message('De aanmelding voor het bevestigde SSK-mailadres is nog niet voltooid.');
  }
 }catch(error){message(errorMessage(error));}
 finally{busy=false;render();}
});
get('switch-mode').addEventListener('click',()=>{if(!busy){show(mode==='login'?'register':'login');message('');}});
get('verify-mode').addEventListener('click',()=>{if(!busy){show('verify');message('Gebruik de laatste code uit je e-mail, of vraag hieronder een nieuwe code aan.');}});
get('resend').addEventListener('click',async()=>{
 if(busy||Date.now()<resendAfter)return;busy=true;resendAfter=Date.now()+60000;render();
 try{await client.auth.resendOtp(EMAIL);message('Een nieuwe code is aangevraagd. Gebruik alleen de meest recente code.');}
 catch(error){message(errorMessage(error));}
 finally{busy=false;render();}
});
timer=setInterval(render,1000);
client.auth.me().then(user=>{confirmed(user);}).catch(()=>{}).finally(render);
