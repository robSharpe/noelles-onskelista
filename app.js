import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const $=id=>document.getElementById(id);
const configured=SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>30;
const db=configured?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
const defaults=[['🚵‍♀️','Mountainbike'],['✏️','Pennfodral'],['💎','Örhängen'],['⚽','Fotbollsskor'],['⚽','Fotboll'],['🚴','Hjälm'],['💧','Vattenflaska till skolan'],['📚','Spännande böcker (inte läskiga)'],['🪴','Fler växter'],['🛍️','Shopping med farmor'],['🎨','Pyssel / smycken']];
let wishes=[],selected=null,admin=false;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=s=>$('notice').textContent=s;
function render(){
 $('list').innerHTML=wishes.map(w=>`<article class="card ${w.reserved_by?'reserved':''}"><div class="emoji">${escape(w.emoji)}</div><h2>${escape(w.name)}</h2><p>${w.reserved_by?'🔒 Reserverad av '+escape(w.reserved_by):'✨ Ledig önskning'}</p>${w.reserved_by?'':`<button data-reserve="${w.id}">Jag köper den</button>`}${admin?` <button class="secondary" data-delete="${w.id}">Ta bort</button> ${w.reserved_by?`<button class="secondary" data-release="${w.id}">Frigör</button>`:''}`:''}</article>`).join('');
 document.querySelectorAll('[data-reserve]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.reserve);$('dialogTitle').textContent='Reservera: '+wishes.find(w=>w.id===selected).name;$('reserveDialog').showModal()});
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Ta bort önskningen?'))return;const {error}=await db.from('wishes').delete().eq('id',b.dataset.delete);if(error)notice(error.message);else load()});
 document.querySelectorAll('[data-release]').forEach(b=>b.onclick=async()=>{if(!confirm('Frigöra reservationen?'))return;const {error}=await db.from('wishes').update({reserved_by:null}).eq('id',b.dataset.release);if(error)notice(error.message);else load()});
}
async function load(){
 if(!db){wishes=defaults.map(([emoji,name],i)=>({id:i+1,emoji,name,reserved_by:null}));render();notice('Förhandsvisning: Supabase behöver anslutas innan reservationer fungerar.');return}
 const {data,error}=await db.from('wishes').select('id,name,emoji,reserved_by').order('sort_order');
 if(error){notice('Kunde inte läsa önskningarna: '+error.message);return}wishes=data||[];render();
}
$('refresh').onclick=load;
$('cancel').onclick=()=>$('reserveDialog').close();
$('reserveForm').onsubmit=async e=>{
 e.preventDefault();if(!db){notice('Reservationer kräver Supabase.');$('reserveDialog').close();return}
 const name=$('buyer').value.trim();if(!name)return;
 const button=$('reserveForm').querySelector('[type=submit]');button.disabled=true;
 try{const {data,error}=await db.rpc('reserve_wish',{wish_id:selected,buyer_name:name});if(error)throw error;
 $('reserveDialog').close();$('buyer').value='';await load();notice(data?'Tack! Presenten är reserverad av '+name+'.':'Någon annan hann reservera presenten.');}
 catch(err){notice('Kunde inte reservera: '+err.message)}finally{button.disabled=false}
};
$('adminToggle').onclick=()=>$('adminPanel').classList.toggle('hidden');
async function authState(){if(!db)return;const {data:{session}}=await db.auth.getSession();admin=!!session;$('login').classList.toggle('hidden',admin);$('adminTools').classList.toggle('hidden',!admin);render()}
$('signIn').onclick=async()=>{if(!db)return notice('Anslut Supabase först.');const {error}=await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error)notice(error.message);else{notice('Inloggad');await authState()}};
$('signOut').onclick=async()=>{await db.auth.signOut();await authState()};
$('addWish').onclick=async()=>{const name=$('newName').value.trim();if(!name)return;const {error}=await db.from('wishes').insert({name,emoji:$('newEmoji').value.trim()||'🎁',sort_order:wishes.length+1});if(error)notice(error.message);else{$('newName').value='';$('newEmoji').value='';await load()}};
if(db){db.channel('wishes-live').on('postgres_changes',{event:'*',schema:'public',table:'wishes'},load).subscribe();db.auth.onAuthStateChange(()=>setTimeout(authState,0))}
await load();await authState();
