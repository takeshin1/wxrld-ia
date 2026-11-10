'use strict';
const DB_NAME='wxrld-ia-db', DB_VERSION=1, STORE='transactions';
const DEFAULT_ELEVEN_ENDPOINT='https://wxrld-ia-api.luanfelipeoliveira1.workers.dev/api/speech';
const DEFAULT_CATEGORIES=['Salário','Investimentos','Renda extra','Alimentação','Mercado','Transporte','Combustível','Moradia','Contas e boletos','Saúde','Academia e esportes','Lazer','Compras','Tecnologia','Educação','Assinaturas','Viagens','Outros'];
const ICONS={'Alimentação':'🍽️','Mercado':'🛒','Transporte':'🚗','Combustível':'⛽','Moradia':'🏠','Contas e boletos':'🧾','Saúde':'💊','Academia e esportes':'🏋️','Lazer':'🎟️','Compras':'🛍️','Tecnologia':'💻','Educação':'📚','Assinaturas':'🔁','Viagens':'✈️','Outros':'✳️','Salário':'💼','Investimentos':'📈','Renda extra':'✨'};
let db, transactions=[], customCategories=[], draft=null, toastTimer, activeRecognition=null, voiceTimeoutId=null;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const localISO=(d=new Date())=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
const monthISO=(d=new Date())=>localISO(d).slice(0,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});s.createIndex('date','date',{unique:false});}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function dbAll(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function dbPut(item){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');const r=t.objectStore(STORE).put(item);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function dbDelete(id){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');const r=t.objectStore(STORE).delete(Number(id));r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
async function refresh(){transactions=await dbAll();transactions.sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0));renderAll();}
function getCats(){return [...DEFAULT_CATEGORIES,...customCategories];}
function setCats(){const opts=getCats().map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('draftCategory').innerHTML=opts;$('editCategory').innerHTML=opts;$('historyCategory').innerHTML='<option value="all">Todas as categorias</option>'+opts;}
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function applyTheme(theme){const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#061F17':'#F3F0E6';const button=$('themeToggle');if(button){button.setAttribute('aria-checked',String(dark));button.setAttribute('aria-label',dark?'Ativar tema claro':'Ativar tema escuro');button.title=dark?'Ativar tema claro':'Ativar tema escuro';}}
function toggleTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('wxrldTheme',next);applyTheme(next);}
function isIOSDevice(){return /iPad|iPhone|iPod/i.test(navigator.userAgent)||(/MacIntel/.test(navigator.platform)&&navigator.maxTouchPoints>1);}
function showVoiceHelp(message){$('voiceHelp').innerHTML=message;$('voiceHelp').classList.remove('hidden');}
function resetVoiceButton(){clearTimeout(voiceTimeoutId);voiceTimeoutId=null;const b=$('voiceButton');if(b){b.classList.remove('recording');b.setAttribute('aria-label','Falar com a wxrld');b.title='Falar com a wxrld';}}
function focusEntryForDictation(){const field=$('entryText');field.focus();try{field.setSelectionRange(field.value.length,field.value.length);}catch(_){}}
function parseAmount(text){
  const re=/(?:r\$\s*)?((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:reais?|rs?\$)?/ig;
  const matches=[...text.matchAll(re)]; if(!matches.length)return null;
  // A number preceded by R$ or followed by reais is preferred; otherwise use the first numeric amount.
  let m=matches.find(x=>/r\s*\$/i.test(x[0])||/reais?/i.test(x[0]))||matches[0];
  let raw=m[1];
  if(raw.includes(',')&&raw.includes('.')) raw=raw.replace(/\./g,'').replace(',','.');
  else if(raw.includes(',')) raw=raw.replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(raw)) raw=raw.replace(/\./g,'');
  const n=Number(raw);return Number.isFinite(n)&&n>0?{value:n,index:m.index,length:m[0].length}:null;
}
function inferCategory(text,type){
  const t=text.toLocaleLowerCase('pt-BR');
  const rules=[
    ['Combustível',['gasolina','etanol','álcool','diesel','posto','abasteci']],['Mercado',['mercado','supermercado','hortifruti',' feira','açougue']],
    ['Alimentação',['almoço','jantar','café','lanche','restaurante','delivery','ifood','pizza','hambúrguer','comida','padaria']],
    ['Transporte',['uber','99','ônibus','onibus','metrô','metro','táxi','taxi','estacionamento','pedágio','pedagio']],
    ['Moradia',['aluguel','condomínio','condominio','reforma','móveis','moveis']],['Contas e boletos',['luz','energia','água','agua','internet','telefone','boleto','fatura','gás','gas']],
    ['Saúde',['farmácia','farmacia','médico','medico','consulta','exame','dentista','remédio','remedio']],['Academia e esportes',['academia','personal','esporte','natação','natacao','futebol']],
    ['Lazer',['cinema','show','bar','parque','jogo','ingresso','streaming']],['Compras',['roupa','tênis','tenis','sapato','presente','shopping']],
    ['Tecnologia',['celular','iphone','computador','notebook','teclado','mouse','eletrônico','eletronico']],['Educação',['curso','livro','escola','faculdade','mensalidade']],
    ['Assinaturas',['netflix','spotify','prime video','disney','assinatura','icloud']],['Viagens',['hotel','passagem','viagem','airbnb','hospedagem']]
  ];
  if(type==='income'){if(/salário|salario|pagamento/.test(t))return 'Salário';if(/investimento|dividendo|rendimento/.test(t))return 'Investimentos';if(/freel|extra|bico|vendi|venda/.test(t))return 'Renda extra';return 'Outros';}
  for(const [cat,words] of rules){if(words.some(w=>{const term=w.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(^|[^\\p{L}\\p{N}])'+term+'($|[^\\p{L}\\p{N}])','u').test(t);}))return cat;}return 'Outros';
}
function parseEntry(text){
  const amount=parseAmount(text);if(!amount)return {error:'Não consegui identificar o valor. Exemplo: “gastei R$ 35 no almoço”.'};
  const lower=text.toLocaleLowerCase('pt-BR');
  const isIncome=/\b(recebi|ganhei|entrou|entrada|salário|salario|renda|reembolso|vendi|venda|pagaram|depositaram)\b/.test(lower);
  const type=isIncome?'income':'expense';
  let date=localISO();if(/\banteontem\b/.test(lower))date=localISO(new Date(Date.now()-2*86400000));else if(/\bontem\b/.test(lower))date=localISO(new Date(Date.now()-86400000));else if(/\bsemana passada\b/.test(lower))date='';
  const dm=lower.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if(dm){let y=dm[3]?Number(dm[3]):new Date().getFullYear();if(y<100)y+=2000;const candidate=`${y}-${String(dm[2]).padStart(2,'0')}-${String(dm[1]).padStart(2,'0')}`;if(!Number.isNaN(Date.parse(candidate+'T12:00:00')))date=candidate;}
  let description=text.slice(0,amount.index)+text.slice(amount.index+amount.length);
  description=description.replace(/\b(gastei|gastamos|paguei|pagar|comprei|compra|foi|de|no valor de|por|recebi|ganhei|entrou|entrada|salário|salario|renda|reembolso|vendi|venda|hoje|ontem|anteontem)\b/ig,' ')
   .replace(/\b(hoje|ontem|anteontem|semana passada)\b/ig,' ').replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/g,' ').replace(/[.!?;]+/g,' ').replace(/\s+/g,' ').trim();
  description=description.replace(/^(no|na|em|com|para|de)\s+/i,'').trim();
  const category=inferCategory(text,type);if(!description)description=category!=='Outros'?category:(type==='income'?'Receita':'Despesa');
  description=description.charAt(0).toLocaleUpperCase('pt-BR')+description.slice(1);
  return {type,amount:amount.value,description:description.slice(0,90),category,date};
}
function monthData(month){return transactions.filter(t=>t.date.startsWith(month));}
function sum(items,type){return items.filter(t=>!type||t.type===type).reduce((s,t)=>s+Number(t.amount),0);}
function dateLabel(date){return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00')).replace('.','');}
function renderTx(t,includeActions=false){const icon=ICONS[t.category]||'✳️';const sign=t.type==='income'?'+':'−';return `<article class="transaction"><div class="category-icon">${icon}</div><div class="transaction-main"><strong>${esc(t.description)}</strong><small>${esc(t.category)} · ${dateLabel(t.date)}</small></div><div class="transaction-side"><strong class="${t.type}">${sign} ${money(t.amount)}</strong>${includeActions?`<small><button class="text-button edit-tx" data-id="${t.id}">Editar</button> · <button class="text-button delete-tx" data-id="${t.id}">Excluir</button></small>`:''}</div></article>`;}
function renderDashboard(){const month=$('monthSelect').value||monthISO();const list=monthData(month);const income=sum(list,'income'),expense=sum(list,'expense');const opening=Number(localStorage.getItem('wxrldStartingBalance')||0);const allNet=sum(transactions,'income')-sum(transactions,'expense');
 $('balanceValue').textContent=money(opening+allNet);$('incomeValue').textContent=money(income);$('expenseValue').textContent=money(expense);
 // Indicadores complementares ficam na aba Relatórios para manter o Início compacto.
}
function renderHistory(){const q=$('historySearch').value.trim().toLocaleLowerCase('pt-BR'),type=$('historyType').value,cat=$('historyCategory').value,month=$('historyMonth').value;const list=transactions.filter(t=>(!q||(t.description+' '+t.category).toLocaleLowerCase('pt-BR').includes(q))&&(type==='all'||t.type===type)&&(cat==='all'||t.category===cat)&&(!month||t.date.startsWith(month)));
 $('historySummary').textContent=`${list.length} registro(s) · ${money(sum(list,'income'))} em receitas · ${money(sum(list,'expense'))} em despesas`;
 $('historyList').innerHTML=list.length?list.map(t=>renderTx(t,true)).join(''):'<div class="empty-state">Nenhum registro encontrado com esses filtros.</div>';
}
function renderReports(){const month=$('reportMonth').value||monthISO(),list=monthData(month),expenses=list.filter(t=>t.type==='expense'),total=sum(expenses);$('reportTotal').textContent=money(total);const todayISO=localISO();$('todayExpense').textContent=money(sum(transactions.filter(t=>t.date===todayISO),'expense'));$('transactionCount').textContent=String(list.length);const d=new Date(month+'-15T12:00:00');d.setMonth(d.getMonth()-1);const prev=monthISO(d),prevTotal=sum(monthData(prev),'expense');let comp='Sem dados para comparação.';if(prevTotal===0&&total>0)comp='Você começou a registrar despesas neste período.';else if(prevTotal>0){const pct=((total-prevTotal)/prevTotal)*100;comp=`${Math.abs(pct).toFixed(0)}% ${pct>0?'a mais':pct<0?'a menos':'de variação'} que no mês anterior.`;}$('monthComparison').textContent=comp;
 const by={};expenses.forEach(t=>by[t.category]=(by[t.category]||0)+Number(t.amount));const sorted=Object.entries(by).sort((a,b)=>b[1]-a[1]);$('categoryReport').innerHTML=sorted.length?sorted.map(([cat,v])=>`<div class="category-row"><div class="category-row-head"><span>${ICONS[cat]||'✳️'} ${esc(cat)}</span><strong>${money(v)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${total?Math.max(2,v/total*100):0}%"></div></div></div>`).join(''):'<div class="empty-state">Ainda não há despesas neste mês.</div>';
 const today=new Date();const days=[];for(let i=6;i>=0;i--){const x=new Date(today);x.setDate(today.getDate()-i);const iso=localISO(x);days.push({iso,label:new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(x).replace('.',''),value:sum(transactions.filter(t=>t.date===iso),'expense')});}const max=Math.max(1,...days.map(x=>x.value));$('weekReport').innerHTML=days.map(x=>`<div class="day-column"><strong>${x.value?money(x.value).replace('R$','').trim():''}</strong><div class="day-bar-wrap"><div class="day-bar" style="height:${Math.max(3,x.value/max*75)}px;opacity:${x.value?1:.25}"></div></div><small>${x.label}</small></div>`).join('');
}
function renderSettings(){const b=Number(localStorage.getItem('wxrldStartingBalance')||0);$('settingsBalance').value=b?b.toFixed(2):'';$('customCategories').innerHTML=customCategories.map(c=>`<span class="category-pill">${esc(c)} <button data-category="${esc(c)}" aria-label="Excluir ${esc(c)}">×</button></span>`).join('');renderVoiceOptions();}
function renderAll(){renderDashboard();renderHistory();renderReports();renderSettings();}
function openPage(name){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${name}`));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===name));window.scrollTo({top:0,behavior:'smooth'});}
function showDraft(d,{spoken=false}={}){draft=d;$('draftType').value=d.type;$('draftAmount').value=d.amount.toFixed(2);$('draftDescription').value=d.description;$('draftCategory').value=d.category;$('draftDate').value=d.date;if(!d.date)showToast('Você mencionou “semana passada”. Escolha a data correta antes de salvar.');$('draftPanel').classList.remove('hidden');if(spoken){const kind=d.type==='income'?'receita':'despesa';speakWx(`Entendi assim: ${kind} de ${money(d.amount)} em ${d.description}, na categoria ${d.category}, em ${d.date?dateLabel(d.date):'data não definida'}. Está correto? Confira os dados na tela e toque em Salvar movimentação para confirmar, ou feche para cancelar.`);}}
async function saveCurrentDraft(){const item={...draft,type:$('draftType').value,amount:Number($('draftAmount').value),description:$('draftDescription').value.trim(),category:$('draftCategory').value,date:$('draftDate').value,createdAt:Date.now()};if(!Number.isFinite(item.amount)||item.amount<=0||!item.description||!item.date){showToast('Confira o valor, a descrição e a data.');return;}await dbPut(item);$('draftPanel').classList.add('hidden');$('entryText').value='';draft=null;await refresh();showToast('Movimentação salva com sucesso.');speakWx('Pronto. Registrei sua movimentação.');}
function openEdit(id){const t=transactions.find(x=>x.id===Number(id));if(!t)return;$('editId').value=t.id;$('editType').value=t.type;$('editAmount').value=t.amount;$('editDescription').value=t.description;$('editCategory').value=t.category;$('editDate').value=t.date;$('editDialog').showModal();}
async function updateEdit(e){e.preventDefault();const id=Number($('editId').value),item=transactions.find(t=>t.id===id);if(!item)return;const updated={...item,type:$('editType').value,amount:Number($('editAmount').value),description:$('editDescription').value.trim(),category:$('editCategory').value,date:$('editDate').value};if(updated.amount<=0||!updated.description||!updated.date){showToast('Preencha todos os campos corretamente.');return;}await dbPut(updated);$('editDialog').close();await refresh();showToast('Registro atualizado.');}
async function exportJSON(){const payload={app:'WXRLD.IA',version:1,exportedAt:new Date().toISOString(),startingBalance:Number(localStorage.getItem('wxrldStartingBalance')||0),customCategories,transactions};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`wxrld-backup-${localISO()}.json`);}
function exportCSV(){const rows=[['Data','Tipo','Descrição','Categoria','Valor'],...transactions.map(t=>[t.date,t.type==='income'?'Receita':'Despesa',t.description,t.category,Number(t.amount).toFixed(2).replace('.',',')])];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');download(new Blob([csv],{type:'text/csv;charset=utf-8'}),`wxrld-transacoes-${localISO()}.csv`);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importJSON(file){try{const data=JSON.parse(await file.text());if(data.app!=='WXRLD.IA'||!Array.isArray(data.transactions))throw new Error('Arquivo inválido.');if(!confirm(`Restaurar ${data.transactions.length} movimentações? Os registros atuais com o mesmo ID poderão ser substituídos.`))return;for(const t of data.transactions){if(!t||!['expense','income'].includes(t.type)||!Number.isFinite(Number(t.amount))||!t.date||!t.description)continue;await dbPut({id:Number.isInteger(t.id)?t.id:undefined,type:t.type,amount:Number(t.amount),description:String(t.description),category:String(t.category||'Outros'),date:String(t.date),createdAt:t.createdAt||Date.now()});}if(Number.isFinite(Number(data.startingBalance)))localStorage.setItem('wxrldStartingBalance',String(data.startingBalance));if(Array.isArray(data.customCategories)){customCategories=data.customCategories.filter(x=>typeof x==='string'&&!DEFAULT_CATEGORIES.includes(x));localStorage.setItem('wxrldCustomCategories',JSON.stringify(customCategories));}setCats();await refresh();showToast('Backup restaurado.');}catch(e){showToast('Não foi possível restaurar: '+e.message);}}
function removeCustomCategory(name){if(!confirm(`Excluir a categoria “${name}”? Lançamentos existentes não serão apagados.`))return;customCategories=customCategories.filter(c=>c!==name);localStorage.setItem('wxrldCustomCategories',JSON.stringify(customCategories));setCats();renderSettings();showToast('Categoria removida.');}
let speechUnlocked=false;
function availablePortugueseVoices(){
  if(!('speechSynthesis' in window))return [];
  return (window.speechSynthesis.getVoices()||[]).filter(v=>/^pt([-_]|$)/i.test(v.lang)).sort((a,b)=>{
    const aBR=/^pt[-_]BR$/i.test(a.lang)?0:1,bBR=/^pt[-_]BR$/i.test(b.lang)?0:1;return aBR-bBR||a.name.localeCompare(b.name,'pt-BR');
  });
}
function selectedVoice(){
  const voices=availablePortugueseVoices(),saved=localStorage.getItem('wxrldVoiceURI');
  return voices.find(v=>v.voiceURI===saved)||voices.find(v=>/^pt[-_]BR$/i.test(v.lang))||voices[0]||null;
}
function speakWithVoice(message,voice,rate=.94,pitch=1.04,onEnd){
  if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){if(typeof onEnd==='function')onEnd();showToast('A fala automática não está disponível neste navegador.');return false;}
  try{
    const synth=window.speechSynthesis;synth.cancel();
    const utterance=new SpeechSynthesisUtterance(String(message));utterance.lang=voice?.lang||'pt-BR';utterance.rate=rate;utterance.pitch=pitch;utterance.volume=1;if(voice)utterance.voice=voice;
    utterance.onend=()=>{if(typeof onEnd==='function')onEnd();};
    utterance.onerror=()=>{showToast('Não consegui reproduzir a voz. Confira o volume e tente novamente.');if(typeof onEnd==='function')onEnd();};
    synth.resume();synth.speak(utterance);speechUnlocked=true;return true;
  }catch(error){console.warn('Voz de resposta indisponível',error);showToast('A resposta por voz não pôde ser reproduzida.');if(typeof onEnd==='function')onEnd();return false;}
}
let wxrldAudio=null;
async function speakHumanVoice(message,onEnd){
  const endpoint=(localStorage.getItem('wxrldElevenEndpoint')||DEFAULT_ELEVEN_ENDPOINT).trim();
  if(!endpoint){showToast('Configure o endereço do serviço ElevenLabs em Ajustes → Voz humana da wxrld.');if(typeof onEnd==='function')onEnd();return false;}
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(message).slice(0,1800)})});
    if(!response.ok){let detail='';try{detail=(await response.json()).error||'';}catch(_){}throw new Error(detail||`Erro ${response.status} ao gerar áudio.`);}
    const blob=await response.blob();if(!blob.type.includes('audio'))throw new Error('O serviço não retornou um áudio válido.');
    if(wxrldAudio){wxrldAudio.pause();URL.revokeObjectURL(wxrldAudio.src);}
    wxrldAudio=new Audio(URL.createObjectURL(blob));wxrldAudio.onended=()=>{if(typeof onEnd==='function')onEnd();};wxrldAudio.onerror=()=>{showToast('Não consegui reproduzir o áudio da ElevenLabs.');if(typeof onEnd==='function')onEnd();};
    await wxrldAudio.play();return true;
  }catch(error){console.error('ElevenLabs TTS:',error);showToast(error.message||'Não foi possível conectar à voz humana.');if(typeof onEnd==='function')onEnd();return false;}
}
function speakWx(message,onEnd){
  if(localStorage.getItem('wxrldElevenEndpoint'))return speakHumanVoice(message,onEnd);
  const voice=selectedVoice();const rate=Number(localStorage.getItem('wxrldVoiceRate')||.94);const pitch=Number(localStorage.getItem('wxrldVoicePitch')||1.04);
  return speakWithVoice(message,voice,rate,pitch,onEnd);
}
function renderVoiceOptions(){
  const container=$('voiceOptions');if(!container)return;
  if(!('speechSynthesis' in window)){container.innerHTML='<p class="voice-loading">Este navegador não oferece reprodução de voz. Abra a WXRLD.IA no Safari atualizado.</p>';return;}
  const voices=availablePortugueseVoices();
  if(!voices.length){container.innerHTML='<p class="voice-loading">O Safari ainda não disponibilizou vozes em português. Toque em “Atualizar lista de vozes” ou confira em Ajustes do iPhone → Acessibilidade → Conteúdo Falado → Vozes.</p>';return;}
  const saved=localStorage.getItem('wxrldVoiceURI');
  container.innerHTML=voices.map((v,i)=>{const active=saved?v.voiceURI===saved:i===0;return `<article class="voice-option ${active?'selected':''}"><div class="voice-option-copy"><strong>${esc(v.name)}</strong><small>${/^pt[-_]BR$/i.test(v.lang)?'Português (Brasil)':'Português'}${v.localService?' · disponível no aparelho':' · voz do sistema'}</small></div><div class="voice-option-actions"><button type="button" class="voice-play" data-voice-play="${i}" aria-label="Ouvir voz ${esc(v.name)}">▶ Ouvir</button><button type="button" class="voice-choose" data-voice-choose="${i}" ${active?'disabled':''}>${active?'Selecionada':'Escolher'}</button></div></article>`;}).join('');
  container.querySelectorAll('[data-voice-play]').forEach(btn=>btn.addEventListener('click',()=>{const v=voices[Number(btn.dataset.voicePlay)];speakWithVoice('Oi! Eu sou a wxrld. Pode deixar que eu cuido dos seus registros. E prometo não julgar aquela comprinha por impulso… pelo menos não em voz alta!',v,.93,1.08); }));
  container.querySelectorAll('[data-voice-choose]').forEach(btn=>btn.addEventListener('click',()=>{const v=voices[Number(btn.dataset.voiceChoose)];localStorage.setItem('wxrldVoiceURI',v.voiceURI);localStorage.setItem('wxrldVoiceRate','0.93');localStorage.setItem('wxrldVoicePitch','1.08');renderVoiceOptions();showToast('Voz da wxrld atualizada!');}));
}
function refreshVoiceOptions(){if('speechSynthesis' in window){window.speechSynthesis.getVoices();setTimeout(renderVoiceOptions,250);setTimeout(renderVoiceOptions,900);}else renderVoiceOptions();}
if('speechSynthesis' in window){window.speechSynthesis.addEventListener?.('voiceschanged',renderVoiceOptions);}
function startVoice(){
  if(activeRecognition){
    try{activeRecognition.stop();}catch(_){}
    activeRecognition=null;
    clearTimeout(voiceTimeoutId);
    voiceTimeoutId=null;
    resetVoiceButton();
    return;
  }

  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){
    const msg='O reconhecimento de voz não está disponível neste navegador. No iPhone, use o microfone do teclado para ditar no campo de texto.';
    showVoiceHelp(msg);
    showToast('Reconhecimento de voz indisponível neste Safari.');
    return;
  }

  let receivedResult=false;
  let hadError=false;
  let rec;
  try{
    rec=new Speech();
    activeRecognition=rec;
    rec.lang='pt-BR';
    rec.interimResults=false;
    rec.maxAlternatives=1;
    rec.continuous=false;

    $('voiceButton').classList.add('recording');
    $('voiceButton').setAttribute('aria-label','Parar gravação');
    showVoiceHelp('Estou ouvindo. Fale sua movimentação agora.');

    rec.onstart=()=>{
      if(activeRecognition===rec){
        showVoiceHelp('Estou ouvindo. Fale sua movimentação agora.');
        showToast('Microfone ativo. Pode falar.');
      }
    };

    rec.onresult=e=>{
      const transcript=Array.from(e.results||[])
        .map(r=>r[0]?.transcript||'')
        .join(' ').trim();
      if(!transcript)return;
      receivedResult=true;
      $('entryText').value=transcript;
      clearTimeout(voiceTimeoutId);
      voiceTimeoutId=null;
      try{rec.stop();}catch(_){}
      if(activeRecognition===rec)activeRecognition=null;
      resetVoiceButton();
      $('voiceHelp').classList.add('hidden');
      const parsed=parseEntry(transcript);
      if(parsed.error){
        showVoiceHelp(parsed.error);
        showToast('Não identifiquei o valor. Tente falar novamente.');
        speakWx('Não consegui identificar o valor da movimentação. Pode repetir incluindo o valor?');
        return;
      }
      showDraft(parsed,{spoken:true});
    };

    rec.onnomatch=()=>{
      hadError=true;
      showVoiceHelp('Não consegui entender. Tente falar novamente, incluindo o valor.');
      showToast('Não entendi sua fala.');
    };

    rec.onerror=e=>{
      hadError=true;
      clearTimeout(voiceTimeoutId);
      voiceTimeoutId=null;
      let msg='O reconhecimento de voz falhou. Tente novamente.';
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){
        msg='O Safari ou o iPhone bloqueou o reconhecimento de voz. Confira a permissão do microfone e tente novamente.';
      }else if(e.error==='no-speech'){
        msg='Nenhuma fala foi detectada. Toque no microfone e comece a falar assim que aparecer “Estou ouvindo”.';
      }else if(e.error==='audio-capture'){
        msg='O navegador não conseguiu acessar o microfone. Feche outros apps que possam estar usando o áudio e tente novamente.';
      }else if(e.error==='network'){
        msg='O serviço de reconhecimento de voz está indisponível ou sem conexão. Tente novamente mais tarde.';
      }
      showVoiceHelp(msg);
      showToast(msg);
      if(activeRecognition===rec)activeRecognition=null;
      resetVoiceButton();
    };

    rec.onend=()=>{
      clearTimeout(voiceTimeoutId);
      voiceTimeoutId=null;
      if(activeRecognition===rec)activeRecognition=null;
      resetVoiceButton();
      if(!receivedResult&&!hadError){
        showVoiceHelp('A gravação terminou sem reconhecer palavras. Toque no microfone e fale uma frase curta, por exemplo: “gastei 35 reais no almoço”.');
      }
    };

    // Importante no iPhone: iniciar o reconhecimento diretamente no toque,
    // sem esperar uma fala sintetizada terminar.
    rec.start();

    // Proteção contra sessões que ficam abertas sem retornar resultado.
    voiceTimeoutId=setTimeout(()=>{
      if(activeRecognition!==rec)return;
      hadError=true;
      try{rec.abort();}catch(_){}
      activeRecognition=null;
      voiceTimeoutId=null;
      resetVoiceButton();
      showVoiceHelp('Não recebi sua fala a tempo. Toque no microfone e tente novamente.');
      showToast('Tempo de escuta encerrado.');
    },20000);
  }catch(error){
    if(voiceTimeoutId){clearTimeout(voiceTimeoutId);voiceTimeoutId=null;}
    activeRecognition=null;
    resetVoiceButton();
    const msg='Não foi possível iniciar o reconhecimento de voz neste navegador. Use o microfone do teclado do iPhone para ditar no campo de texto.';
    showVoiceHelp(msg);
    showToast(msg);
  }
}

function bind(){$('themeToggle').addEventListener('click',toggleTheme);document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>openPage(b.dataset.page)));$('settingsShortcut').addEventListener('click',()=>openPage('ajustes'));$('entryForm').addEventListener('submit',e=>{e.preventDefault();const txt=$('entryText').value.trim();if(!txt){showToast('Digite ou dite uma movimentação primeiro.');return;}const parsed=parseEntry(txt);if(parsed.error){showToast(parsed.error);speakWx(parsed.error);return;}showDraft(parsed,{spoken:true});});$('voiceButton').addEventListener('click',startVoice);$('saveDraft').addEventListener('click',saveCurrentDraft);$('discardDraft').addEventListener('click',()=>{$('draftPanel').classList.add('hidden');draft=null;});$('monthSelect').addEventListener('change',renderDashboard);$('historySearch').addEventListener('input',renderHistory);['historyType','historyCategory','historyMonth'].forEach(id=>$(id).addEventListener('change',renderHistory));$('reportMonth').addEventListener('change',renderReports);
 $('historyMonth').value=monthISO();$('monthSelect').value=monthISO();$('reportMonth').value=monthISO();
 document.addEventListener('click',async e=>{const edit=e.target.closest('.edit-tx');if(edit)openEdit(edit.dataset.id);const del=e.target.closest('.delete-tx');if(del&&confirm('Excluir esta movimentação?')){await dbDelete(del.dataset.id);await refresh();showToast('Movimentação excluída.');}const cat=e.target.closest('[data-category]');if(cat)removeCustomCategory(cat.dataset.category);});
 $('editForm').addEventListener('submit',updateEdit);$('editStartingBalance').addEventListener('click',()=>{openPage('ajustes');$('settingsBalance').focus();});$('saveSettingsBalance').addEventListener('click',()=>{const v=Number($('settingsBalance').value||0);if(!Number.isFinite(v)){showToast('Informe um saldo válido.');return;}localStorage.setItem('wxrldStartingBalance',String(v));renderDashboard();showToast('Saldo inicial atualizado.');});$('categoryForm').addEventListener('submit',e=>{e.preventDefault();const c=$('newCategory').value.trim();if(!c)return;if(getCats().some(x=>x.toLocaleLowerCase('pt-BR')===c.toLocaleLowerCase('pt-BR'))){showToast('Essa categoria já existe.');return;}customCategories.push(c);localStorage.setItem('wxrldCustomCategories',JSON.stringify(customCategories));$('newCategory').value='';setCats();renderSettings();showToast('Categoria adicionada.');});$('exportJson').addEventListener('click',exportJSON);$('exportCsv').addEventListener('click',exportCSV);$('refreshVoices').addEventListener('click',refreshVoiceOptions);$('voiceApiUrl').value=localStorage.getItem('wxrldElevenEndpoint')||DEFAULT_ELEVEN_ENDPOINT;$('saveVoiceApiUrl').addEventListener('click',()=>{const value=$('voiceApiUrl').value.trim().replace(/\/$/,'');if(value&&!/^https:\/\//i.test(value)){showToast('Use um endereço HTTPS válido.');return;}localStorage.setItem('wxrldElevenEndpoint',value);showToast(value?'Conexão da voz salva neste aparelho.':'Conexão removida.');});$('testHumanVoice').addEventListener('click',()=>{const value=$('voiceApiUrl').value.trim().replace(/\/$/,'');if(value)localStorage.setItem('wxrldElevenEndpoint',value);speakHumanVoice('Oii! Sou eu, a wxrld! Pode deixar que eu cuido dos seus registros. E prometo não julgar aquela comprinha por impulso... pelo menos não em voz alta!');});$('importBackup').addEventListener('change',e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value='';});$('clearData').addEventListener('click',async()=>{if(!confirm('Tem certeza? Isso apagará todas as movimentações e o saldo inicial deste aparelho. Exporte um backup antes, se precisar.'))return;const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).clear();await new Promise((res,rej)=>{t.oncomplete=res;t.onerror=()=>rej(t.error)});localStorage.removeItem('wxrldStartingBalance');await refresh();showToast('Dados apagados.');});}
(async function init(){try{applyTheme(localStorage.getItem('wxrldTheme')||'light');db=await openDB();customCategories=JSON.parse(localStorage.getItem('wxrldCustomCategories')||'[]').filter(x=>typeof x==='string');setCats();bind();await refresh();if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});$('todayLabel').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date()).toLocaleUpperCase('pt-BR');}catch(e){console.error(e);showToast('Não foi possível iniciar o armazenamento local.');}})();