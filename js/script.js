//DICHIARAZIONE VARIABILI
const SEGGI_TOTALI = 400;
const RIGHE = 5;
let partiti = JSON.parse(localStorage.getItem('partitiSalvati')) || [];
let presidente = JSON.parse(localStorage.getItem('presidenteSalvato')) || null;
let presidenteConsiglio = JSON.parse(localStorage.getItem('presidenteConsiglio')) || null;
let coalizioneMaggioranza = JSON.parse(localStorage.getItem('coalizioneMaggioranza')) || [];
let deputati = JSON.parse(localStorage.getItem("deputati")) || null;
let editingIndex = null;
let databaseNomi = null;
let legislatura = parseInt(localStorage.getItem('legislatura')) || 1;

//DICHIARAZIONE ELEMENTI HTML
const form = document.getElementById('partitoForm');
const parlamento = document.getElementById('parlamento');
const legenda = document.getElementById('legenda');
const btnVota = document.getElementById('btnVota');
const btnReset = document.getElementById('btnReset');
const btnPdC = document.getElementById('btnPdC');
const btnCoalizione = document.getElementById('btnCoalizione');
const presidenteDiv = document.getElementById('presidente');
const pdcDiv = document.getElementById('pdcDiv');
const percentualeDiv = document.getElementById('percentuale-riempimento');
const coalizioneContainer = document.getElementById('coalizioneContainer');
const coalizioneForm = document.getElementById('coalizioneForm');
const coalTot = document.getElementById('coalTot');
const confermaCoalizione = document.getElementById('confermaCoalizione');
const annullaCoalizione = document.getElementById('annullaCoalizione');
const btnDimissioni = document.getElementById("btnDimissioni");
const btnGestioneMaggioranza = document.getElementById("btnGestioneMaggioranza");

const editFormContainer = document.getElementById('editFormContainer');
const editForm = document.getElementById('editForm');
const editNome = document.getElementById('editNome');
const editColore = document.getElementById('editColore');
const editIdeologia = document.getElementById('editIdeologia');
const editPercentuale = document.getElementById('editPercentuale');
const editCancel = document.getElementById('editCancel');

const btnArchivioLeggi = document.getElementById("btnArchivioLeggi");
const archivioLeggiContainer = document.getElementById("archivioLeggi");
const listaLeggi = document.getElementById("listaLeggi");
const chiudiArchivio = document.getElementById("chiudiArchivio");

/*
const btnLegge = document.createElement("button");
btnLegge.id = "btnLegge";
btnLegge.textContent = "📜 Proponi Disegno di Legge";
document.getElementById("azioni").appendChild(btnLegge);
*/
const btnLegge = document.getElementById("btnLegge");
function toRoman(num){
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  let result = "";
  for (let [val, sym] of map) {
    while (num >= val) {
      result += sym;
      num -= val;
    }
  }
  return result;
}
const titoloParlamento = document.getElementById('titoloParlamento');
function updateTitle(){
  titoloParlamento.textContent = `Il Tuo Parlamento - Legislatura ${toRoman(legislatura)}`;
}
function getMessaggioPerBlocco(titolo) {
  if (titolo.includes("Parlamento")) return "⚖️ Nessuna azione parlamentare disponibile";
  if (titolo.includes("Coalizione")) return "🤝 Nessuna maggioranza attiva";
  if (titolo.includes("Legislativa")) return "📜 Nessuna proposta di legge";
  if (titolo.includes("Governo")) return "🏛️ Nessun governo in carica";

  return "😴 Nulla da fare...";
}
function controllaBlocchiAzioni() {
  const blocchi = document.querySelectorAll(".azione-blocco");

  blocchi.forEach(blocco => {
    const bottoni = blocco.querySelectorAll("button");
    const msgDiv = blocco.querySelector(".no-azioni-msg");

    let visibili = 0;

    bottoni.forEach(btn => {
      const style = window.getComputedStyle(btn);
      if (style.display !== "none") visibili++;
    });

    if (visibili === 0) {
      const titolo = blocco.querySelector("h4").textContent;
      msgDiv.textContent = getMessaggioPerBlocco(titolo);
      msgDiv.style.display = "block";
    } else {
      msgDiv.style.display = "none";
    }
  });
}
/*
function render(){
  aggiornaLegenda();
  aggiornaPresidente();
  aggiornaPdC();
  disegnaParlamento();
}
*/

aggiornaUI();
//disegnaParlamento();
aggiornaPresidente();
aggiornaPdC();
updateTitle();

//FETCH DEI NOMI 
fetch("data/names.json")
  .then(r => r.json())
  .then(data => {
    console.log(data);
    if (!deputati) {
      deputati = [];
      for (let i = 0; i < SEGGI_TOTALI; i++) {
        const genere = Math.random() < 0.5 ? "nomiMaschili" : "nomiFemminili";
        const nome = data[genere][Math.floor(Math.random() * data[genere].length)];
        const cognome = data.cognomi[Math.floor(Math.random() * data.cognomi.length)];
        deputati.push(`On. ${nome} ${cognome}`);
      }
      localStorage.setItem("deputati", JSON.stringify(deputati));
    }
    disegnaParlamento();
  })
  .catch(err => console.error(err));
  
function generaNomeCasuale(index){
  if (deputati && deputati[index]) return deputati[index];
  return "On. Deputato";
}


//FINE CARICAMENTO PARLAMENTI
form.addEventListener('submit', e=>{
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const colore = document.getElementById('colore').value;
  const ideologia = document.getElementById('ideologia').value;
  const percentuale = parseFloat(document.getElementById('percentuale').value);
  const totEsistente = partiti.reduce((s,p)=>s+p.percentuale,0);
  if(totEsistente+percentuale>100) return alert(`Non puoi inserire più di ${100-totEsistente}%`);
  partiti.push({nome,colore,ideologia,percentuale});
  salvaPartiti();
  form.reset();
});

function salvaPartiti(){
  localStorage.setItem('partitiSalvati', JSON.stringify(partiti));
  // aggiorno le referenze di presidente/pdc/coalizione se necessario:
  // - se il partito del presidente è stato rimosso, rimuovo il presidente
  if (presidente && !partiti.find(p => p.nome === presidente.nome)) presidente = null;
  // - se PdC è di partito rimosso -> azzera
  if (presidenteConsiglio && !partiti.find(p => p.nome === presidenteConsiglio.nome)) presidenteConsiglio = null;
  // - aggiorna i colori/nome nella coalizione se un partito è stato rinominato/aggiornato
  if (coalizioneMaggioranza.length) {
    coalizioneMaggioranza = coalizioneMaggioranza
      .map(c => { const found = partiti.find(p => p.nome === c.nome); return found ? {...found} : null; })
      .filter(Boolean);
  }
  localStorage.setItem('presidenteSalvato', JSON.stringify(presidente));
  localStorage.setItem('presidenteConsiglio', JSON.stringify(presidenteConsiglio));
  localStorage.setItem('coalizioneMaggioranza', JSON.stringify(coalizioneMaggioranza));
  aggiornaUI();
  disegnaParlamento();
  aggiornaPresidente();
  aggiornaPdC();
}

function assegnaSeggi(){ return partiti.map(p=>({...p, seggi: Math.round(p.percentuale/100*SEGGI_TOTALI)})); }

function haMaggioranza() {
  let seggi = 0;

  coalizioneMaggioranza.forEach(c => {
    const p = partiti.find(x => x.nome === c.nome);
    if (p) seggi += Math.round(p.percentuale / 100 * SEGGI_TOTALI);
  });

  return seggi >= (SEGGI_TOTALI / 2 + 1);
}
// Schiarisce un colore esadecimale di una percentuale
function schiarisciColore(hex, percent) {
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  
  r = Math.min(255, Math.round(r + (255-r)*percent));
  g = Math.min(255, Math.round(g + (255-g)*percent));
  b = Math.min(255, Math.round(b + (255-b)*percent));
  
  return `rgb(${r},${g},${b})`;
}

function aggiornaUI(){
  legenda.innerHTML='';
  const dati=assegnaSeggi();
  dati.forEach((p,i)=>{
    const box=document.createElement('div');
    box.className='partito-box';
    const info=document.createElement('div');
    info.className='partito-info';
    const colore=document.createElement('div');
    colore.className='colore-box';
    colore.style.background=p.colore;
    const testo=document.createElement('span');
    // se il partito è nella coalizione, aggiungo (Maggioranza) per chiarezza
    const inMaj = coalizioneMaggioranza.find(c=>c.nome===p.nome);
    testo.textContent=`${p.nome} (${p.percentuale}%) - ${p.ideologia} - ${p.seggi} seggi${inMaj ? ' - ✅' : ' - ❌'}`;
    info.appendChild(colore); info.appendChild(testo);

    const btns=document.createElement('div'); btns.className='partito-btns';
    const btnDel=document.createElement('button'); btnDel.textContent='❌';
    btnDel.onclick = () => { 
      partiti.splice(i, 1);
      // ogni volta che un partito viene rimosso, si azzera tutto
      presidente = null;
      presidenteConsiglio = null;
      coalizioneMaggioranza = [];
      salvaPartiti();
    };
    const btnEdit=document.createElement('button'); btnEdit.textContent='✏️';
    btnEdit.onclick=()=>{
      editingIndex=i; 
      editNome.value=p.nome; 
      editColore.value=p.colore; 
      editIdeologia.value=p.ideologia; 
      editPercentuale.value=p.percentuale; 
      editFormContainer.style.display='flex'; 
    };
    btns.appendChild(btnEdit); btns.appendChild(btnDel);

    box.appendChild(info); box.appendChild(btns);
    legenda.appendChild(box);
  });

  const totPerc = partiti.reduce((s,p)=>s+p.percentuale,0);
  percentualeDiv.textContent=`Riempimento parlamento: ${totPerc}%`;
  form.style.pointerEvents = (totPerc >= 100) ? "none" : "auto";
  form.style.opacity = (totPerc >= 100) ? "0.5" : "1";

  // OPZIONI VISIBILITA'

  // btnVota compare quando parlamento pieno e non è ancora stato eletto il presidente
  if(totPerc===100 && !presidente){ btnVota.style.display='block'; } else { btnVota.style.display='none'; }
  // btnCoalizione compare solo dopo elezione presidente e prima creazione coalizione
  if (presidente && coalizioneMaggioranza.length===0) { btnCoalizione.style.display='block'; } else { btnCoalizione.style.display='none'; }
  // btnPdC compare solo se coalizione creata e PdC non ancora nominato
  if (coalizioneMaggioranza.length>0 && !presidenteConsiglio) { btnPdC.style.display='block'; } else { btnPdC.style.display='none'; }
  // mostra dimissioni solo se esiste un governo
  if (presidenteConsiglio) { btnDimissioni.style.display = "block"; } else { btnDimissioni.style.display = "none"; }
  //proponi legge non viene mostrato 
  if (presidenteConsiglio && partiti.reduce((s,p)=>s+p.percentuale,0) === 100) { btnLegge.style.display = "inline-block"; } else {btnLegge.style.display = "none";}
  // reset button visibile quando parlamento pieno
  if(totPerc===100) btnReset.style.display='block'; else btnReset.style.display='none';
  // mostra il bottone solo se esiste una vera maggioranza
  if (coalizioneMaggioranza.length > 0 && haMaggioranza()) { btnGestioneMaggioranza.style.display = "block"; } else { btnGestioneMaggioranza.style.display = "none";}
  controllaBlocchiAzioni();
}

function disegnaParlamento(){
  parlamento.innerHTML=''; 
  const dati=assegnaSeggi();
  const cx=400,cy=400,raggioMax=300,step=30; 
  let startAngle=Math.PI;
  dati.forEach(p=>{
    let currentSeggi=0;
    const angleSpan=Math.PI*(p.seggi/SEGGI_TOTALI);
    for(let row=0;row<RIGHE;row++){
      const raggio=raggioMax-row*step;
      const seggiPerRiga = Math.max(1, Math.round(p.seggi/RIGHE));
      for(let i=0;i<seggiPerRiga;i++){
        const frazione = (seggiPerRiga===0)?0:(i/seggiPerRiga);
        const angolo = startAngle + angleSpan*frazione;
        const x = cx + raggio*Math.cos(angolo); 
        const y = cy + raggio*Math.sin(angolo);
        const cerchio = document.createElementNS('http://www.w3.org/2000/svg','circle');
        cerchio.nomeDeputato = generaNomeCasuale(currentSeggi);
        cerchio.setAttribute('cx',x); cerchio.setAttribute('cy',y); cerchio.setAttribute('r',5); 
        // Se il partito è in maggioranza, colore normale, altrimenti colore schiarito
        let coloreFinale = (coalizioneMaggioranza.some(c => c.nome === p.nome)) 
                   ? p.colore 
                   : schiarisciColore(p.colore, 0.55); // 55% più chiaro
        cerchio.setAttribute('fill', coloreFinale);
        // Bordo leggero per evidenziare maggioranza
        parlamento.appendChild(cerchio);
        //tooltip
        cerchio.setAttribute('data-partito', p.nome);
        cerchio.setAttribute('data-seggio', currentSeggi+1);
        const title = document.createElementNS('http://www.w3.org/2000/svg','title');
        title.textContent = `${cerchio.nomeDeputato} — ${p.nome}`;
        cerchio.appendChild(title);
        parlamento.appendChild(cerchio);
        currentSeggi++; if(currentSeggi>=p.seggi) break;
      }
    } startAngle+=angleSpan;
  });

  if(presidente){
    const presCircle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    presCircle.setAttribute('cx',400); presCircle.setAttribute('cy',430); presCircle.setAttribute('r',11);
    presCircle.setAttribute('fill',presidente.colore); presCircle.setAttribute('stroke','#333'); presCircle.setAttribute('stroke-width','2');
    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = `Presidente del Parlamento: ${presidente.nome} (${presidente.partito})`;
    presCircle.appendChild(title);
    parlamento.appendChild(presCircle);
  }

  if(presidenteConsiglio){
    const pdcc = presidenteConsiglio;
    const pdcCircle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    pdcCircle.setAttribute('cx',400); pdcCircle.setAttribute('cy',390); pdcCircle.setAttribute('r',10);
    pdcCircle.setAttribute('fill',pdcc.colore); pdcCircle.setAttribute('stroke','#333'); pdcCircle.setAttribute('stroke-width','2');
    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = `Presidente del Consiglio: ${pdcc.nome} (${pdcc.partito})`;
    pdcCircle.appendChild(title);
    parlamento.appendChild(pdcCircle);

    pdcc.ministri.forEach((m,i)=>{
      const dx = (i<3?-1:1)*(i%3+1)*25;
      const cerchio = document.createElementNS('http://www.w3.org/2000/svg','circle');
      cerchio.setAttribute('cx',400+dx); cerchio.setAttribute('cy',360); cerchio.setAttribute('r',8);
      cerchio.setAttribute('fill',m.colore); cerchio.setAttribute('stroke','#333'); cerchio.setAttribute('stroke-width','1');
      const titleM = document.createElementNS('http://www.w3.org/2000/svg','title');
      // assegno ruoli ministeriali in ordine
      const ruoli = [`Ministro dell'Interno`,`Ministro dell'Economia`,`Ministro della Difesa`,`Ministro degli Esteri`,`Ministro della Giustizia`,`Ministro della Salute`];
      titleM.textContent = `${ruoli[i]}: ${m.nome} (${m.partito})`;
      cerchio.appendChild(titleM);
      parlamento.appendChild(cerchio);
    });
  }
}
//FETCH PARLAMENTI PASSATI
let parlamentiDisponibili = [];

fetch("data/legislatures.json")
  .then(r => r.json())
  .then(data => {
    parlamentiDisponibili = data.parlamenti;
    console.log(parlamentiDisponibili)
  });

const btnCaricaParlamento = document.getElementById("btnCaricaParlamento");
const modalParlamenti = document.getElementById("modalParlamenti");
const listaParlamenti = document.getElementById("listaParlamenti");
const chiudiParlamenti = document.getElementById("chiudiParlamenti");

btnCaricaParlamento.onclick = () => {
  listaParlamenti.innerHTML = "";

  parlamentiDisponibili.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = `${p.nome} (Leg. ${p.legislatura})`;

    btn.onclick = () => caricaParlamento(p);

    listaParlamenti.appendChild(btn);
  });

  modalParlamenti.style.display = "block";
};

chiudiParlamenti.onclick = () => {
  modalParlamenti.style.display = "none";
};
function caricaParlamento(p) {

  // reset totale stato
  partiti = [...p.partiti];
  presidente = null;
  presidenteConsiglio = null;
  coalizioneMaggioranza = [];

  // aggiorna legislatura
  legislatura = p.legislatura || 1;
  localStorage.setItem('legislatura', legislatura);

  // salva partiti
  localStorage.setItem('partitiSalvati', JSON.stringify(partiti));
  localStorage.removeItem('presidenteSalvato');
  localStorage.removeItem('presidenteConsiglio');
  localStorage.removeItem('coalizioneMaggioranza');

  // UI update
  updateTitle();
  aggiornaUI();
  aggiornaPresidente();
  aggiornaPdC();
  disegnaParlamento();

  // chiudi modale
  modalParlamenti.style.display = "none";

  // feedback utente
  mostraRisultato(
    "📂 Parlamento caricato",
    `${p.nome} è stato caricato con successo`
  );
}

btnVota.addEventListener('click', simulaVotoPresidente);
btnCoalizione.addEventListener('click', mostraCoalizione);
btnPdC.addEventListener('click', nominaPdC);
btnReset.addEventListener('click', async ()=>{const conferma = await mostraConferma("⚠️ Scioglimento Parlamento", `Vuoi sciogliere il Parlamento? Verranno indette nuove elezioni.`); 
if(!conferma) return;  partiti=[]; presidente=null; presidenteConsiglio=null; coalizioneMaggioranza=[]; legislatura++; localStorage.setItem('legislatura', legislatura); updateTitle(); salvaPartiti(); });
btnDimissioni.addEventListener("click", dimissioniPremier);

function scegliPresidente(){
  const dati=assegnaSeggi();
  const total = dati.reduce((s,p)=>s+p.seggi,0);
  if(total===0) return null;
  let rand=Math.random()*total;
  for(const p of dati){ if(rand<p.seggi) return p; rand-=p.seggi; }
  return dati[dati.length-1];
}

async function simulaVotoPresidente(){
  btnVota.style.display='none';
  const cerchi=[...parlamento.querySelectorAll('circle')];
  presidenteDiv.textContent="Votazione in corso...";
  for(let i=0;i<cerchi.length;i+=10){
    const subset=cerchi.slice(i,i+10); subset.forEach(c=>c.classList.add('voto-attivo'));
    await new Promise(r=>setTimeout(r,25));
    subset.forEach(c=>c.classList.remove('voto-attivo'));
  }
  const scelto = scegliPresidente();
  if(!scelto){ alert("Errore: impossibile scegliere presidente (seggi=0)."); return; }
  const nomeDeputato = deputati[Math.floor(Math.random() * deputati.length)];
  presidente = { 
    nome: nomeDeputato,        // nome persona
    partito: scelto.nome,      // nome partito
    colore: scelto.colore 
  };
  localStorage.setItem('presidenteSalvato',JSON.stringify(presidente));
  aggiornaPresidente(); disegnaParlamento(); btnCoalizione.style.display='block';
}

function aggiornaPresidente(){ 
  if(presidente) presidenteDiv.innerHTML=`Presidente del Parlamento: <span style="color:${presidente.colore};font-weight:bold">${presidente.nome}</span> (${presidente.partito})`; 
  else presidenteDiv.textContent='';
}

/* --- COALIZIONE (GESTITA DALL'UTENTE) --- */
function mostraCoalizione(){
  coalizioneForm.innerHTML = '';
  coalioneCreateInputs();
  coalizioneContainer.style.display = 'block';
  aggiornaTotaleCoalizione();
}

function coalioneCreateInputs() {
  coalizioneForm.innerHTML = ''; // svuota prima
  partiti.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'partito-coalizione';

    const colorBox = document.createElement('div');
    colorBox.style.width = '16px';
    colorBox.style.height = '16px';
    colorBox.style.borderRadius = '50%';
    colorBox.style.border = '1px solid #999';
    colorBox.style.background = p.colore;

    const label = document.createElement('label');
    label.textContent = `${p.nome} (${p.ideologia})`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = p.nome;
    if (coalizioneMaggioranza.find(c => c.nome === p.nome)) cb.checked = true;
    cb.addEventListener('change', aggiornaTotaleCoalizione);

    div.appendChild(colorBox);
    div.appendChild(label);
    div.appendChild(cb);
    coalizioneForm.appendChild(div);
  });

  aggiornaTotaleCoalizione();
}

function aggiornaTotaleCoalizione() {
  const checkboxes = coalizioneForm.querySelectorAll('input[type="checkbox"]');
  let seggiTotali = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const p = partiti.find(x => x.nome === cb.value);
      if (p) seggiTotali += Math.round(p.percentuale / 100 * SEGGI_TOTALI);
    }
  });

  // messaggio dinamico
  if (seggiTotali >= SEGGI_TOTALI / 2 + 1) {
    coalTot.style.color = '#1f7a1f';
    coalTot.textContent = `✅ La coalizione ha la maggioranza (${seggiTotali} seggi su ${SEGGI_TOTALI})`;
  } else {
    coalTot.style.color = '#b30000';
    coalTot.textContent = `⚠️ Coalizione senza maggioranza (${seggiTotali} seggi su ${SEGGI_TOTALI})`;
  }
}

/* conferma/annulla coalizione */
confermaCoalizione.addEventListener('click', ()=>{
  const checked = [...coalizioneForm.querySelectorAll('input[type="checkbox"]:checked')].map(cb=>cb.value);
  coalizioneMaggioranza = partiti.filter(p => checked.includes(p.nome));
  if(coalizioneMaggioranza.length===0) return alert("Seleziona almeno un partito per la maggioranza.");
  // salvo
  localStorage.setItem('coalizioneMaggioranza', JSON.stringify(coalizioneMaggioranza));
  coalizioneContainer.style.display='none';
  // mostro il bottone PdC
  btnCoalizione.style.display='none';
  btnPdC.style.display='block';
  aggiornaUI();
});

annullaCoalizione.addEventListener('click', ()=>{
  coalizioneContainer.style.display='none';
});

/* nomina PdC basata sulla coalizione */
function nominaPdC() {
  let governoAttivo = false; //PER ALTRI VOTI FUTURI
  if (!coalizioneMaggioranza || coalizioneMaggioranza.length===0) return alert("Devi prima creare la coalizione!");
  const dati = assegnaSeggi();
  // cerco quale partito della coalizione ha più seggi
  let maxSeggi = -1;
  let pdcPartito = null;
  coalizioneMaggioranza.forEach(c => {
    const match = dati.find(d=>d.nome===c.nome);
    const s = match ? match.seggi : 0;
    if (s > maxSeggi){ maxSeggi = s; pdcPartito = c; }
  });
  if(!pdcPartito) return alert("Errore: nessun partito valido per PdC.");
  // scelgo 6 ministri casualmente tra i partiti della maggioranza (possono ripetersi o no: scegliamo senza ripetizione finché possibile)
  const ministri = [];
  const pool = [...coalizioneMaggioranza];
  while(ministri.length<6){
    if(pool.length===0){
      // riciclo dalla coalizione se partiti <6
      pool.push(...coalizioneMaggioranza);
    }
    const idx = Math.floor(Math.random()*pool.length);
    const scelto = pool.splice(idx,1)[0];
    const nomeMinistro = deputati[Math.floor(Math.random() * deputati.length)];

    ministri.push({
      nome: nomeMinistro,
      partito: scelto.nome,
      colore: scelto.colore
    });
  }
  const nomePdC = deputati[Math.floor(Math.random() * deputati.length)];
  presidenteConsiglio = { 
    nome: nomePdC,            // nome persona
    partito: pdcPartito.nome, // partito
    colore: pdcPartito.colore, 
    ministri 
};
  localStorage.setItem('presidenteConsiglio', JSON.stringify(presidenteConsiglio));
  pdcDiv.innerHTML = `Presidente del Consiglio: <span style="color:${pdcPartito.colore};font-weight:bold">${presidenteConsiglio.nome}</span> (${presidenteConsiglio.partito})`;
  btnPdC.style.display='none';
  btnLegge.style.display="inline-block";
  aggiornaUI();
  disegnaParlamento();
  setTimeout(() => {
    simulaVotazione({tipo: "fiducia"});
  }, 500);
}
async function dimissioniPremier() {

  if (!presidenteConsiglio) return;
  
  const nomePdC = presidenteConsiglio.nome;

  const conferma = await mostraConferma(
    "⚠️ Conferma dimissioni",
    `Il Presidente del Consiglio <strong>${nomePdC}</strong> vuole dimettersi. <p>Accogli le dimissioni?</p>`
  );
  if (!conferma) return;

  // ❌ rimuovo governo
  presidenteConsiglio = null;

  // ❌ sciolgo la maggioranza
  coalizioneMaggioranza = [];

  // 🔄 aggiorno storage
  localStorage.removeItem("presidenteConsiglio");
  localStorage.removeItem("coalizioneMaggioranza");

  // 🔄 UI
  aggiornaPdC();
  aggiornaUI();
  disegnaParlamento();

  // 🔁 torna alla fase coalizione
  btnCoalizione.style.display = "block";
  btnPdC.style.display = "none";
  btnLegge.style.display = "none";

  mostraRisultato(
    "❌ Dimissioni del Governo",
    `Il Presidente del Consiglio ${nomePdC} si è dimesso. È necessario formare una nuova maggioranza.`
  );
}
//PARTE LEGGI
const leggeContainer = document.getElementById("leggeContainer");

const partitoProponenteDiv = document.getElementById("partitoProponenteDiv"); // contenitore select
const partitoProponenteSelect = document.getElementById("partitoProponente");

btnLegge.onclick = () => {
  leggeContainer.style.display = "flex";

  // reset campi
  document.getElementById("titoloLegge").value = "";
  document.getElementById("tipoLegge").value = "";
  partitoProponenteDiv.style.display = "none";
  partitoProponenteSelect.innerHTML = "";
};

// mostra/nasconde select a seconda del tipo di legge
document.getElementById("tipoLegge").addEventListener("change", () => {
  const tipo = document.getElementById("tipoLegge").value;

  if (tipo === "parlamento") {
    partitoProponenteDiv.style.display = "block";
    partitoProponenteSelect.innerHTML = "";
    partiti.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.nome;
      opt.textContent = p.nome;
      partitoProponenteSelect.appendChild(opt);
    });
  } else {
    partitoProponenteDiv.style.display = "none";
    partitoProponenteSelect.innerHTML = "";
  }
});

document.getElementById("annullaLegge").onclick = () => {
  leggeContainer.style.display = "none";
};

document.getElementById("inviaLegge").onclick = () => {
  const titolo = document.getElementById("titoloLegge").value;
  const tipo = document.getElementById("tipoLegge").value;
  const proponente = partitoProponenteSelect.value || null;

  if (!titolo.trim()) return;
  if (!tipo) return alert("❌ Seleziona un tipo di legge prima di inviare.");

  leggeContainer.style.display = "none";

  simulaVotazione({
    tipo: "legge",
    titolo: titolo,
    proponente: proponente,
    tipoLegge: tipo,
    salva: true
  });
};

function salvaLegge(titolo, tipoLegge){

  let leggi = JSON.parse(localStorage.getItem("archivioLeggi")) || [];

  leggi.push({
    titolo: titolo,
    tipo: tipoLegge,
    data: new Date().toLocaleDateString(),
    legislatura: legislatura
  });

  localStorage.setItem("archivioLeggi", JSON.stringify(leggi));

}
document.getElementById("chiudiRisultato").onclick = ()=>{
  document.getElementById("risultatoLegge").style.display="none";
}
btnArchivioLeggi.onclick = () => {
  listaLeggi.innerHTML = '';
  const leggi = JSON.parse(localStorage.getItem("archivioLeggi")) || [];

  if (leggi.length === 0) {
    listaLeggi.innerHTML = '<p style="text-align:center; color:#555;">Nessuna legge approvata</p>';
  } else {

    const leggiPerLegislatura = {};

    leggi.forEach(l => {
      const legNum = l.legislatura || 1;
      if (!leggiPerLegislatura[legNum]) leggiPerLegislatura[legNum] = [];
      leggiPerLegislatura[legNum].push(l);
    });

    const legislatureOrdinate = Object.keys(leggiPerLegislatura).sort((a,b)=>b-a);

    legislatureOrdinate.forEach(legNum => {

      const blocco = document.createElement('div');
      blocco.className = 'blocco-legislatura';

      const titolo = document.createElement('h4');
      titolo.textContent = `Legislatura ${toRoman(parseInt(legNum))}`;
      blocco.appendChild(titolo);

      leggiPerLegislatura[legNum].forEach(l => {

        const item = document.createElement('div');
        item.className = 'legge-item';

        item.innerHTML = `
          <strong>${l.titolo}</strong>
          <small>${l.tipo === "governo" ? "Proposta del Governo" : "Proposta del Parlamento"}</small>
          <small>${l.data}</small>
        `;

        blocco.appendChild(item);
      });

      listaLeggi.appendChild(blocco);
    });
  }

  archivioLeggiContainer.style.display = "block";
};

chiudiArchivio.onclick = () => {
  archivioLeggiContainer.style.display = "none";
};
//fine parte leggi
document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});

/* EDIT PARTITO: qui correggo la logica che rompeva i riferimenti */
editForm.addEventListener('submit', e=>{
  e.preventDefault();
  if (editingIndex === null || editingIndex === undefined) { editFormContainer.style.display='none'; return; }
  const nomeNuovo = editNome.value.trim();
  const coloreNuovo = editColore.value;
  const ideologiaNuovo = editIdeologia.value;
  const percentualeNuovo = parseFloat(editPercentuale.value);

  // controllo percentuale: somma escludendo l'indice in modifica
  const totEsistente = partiti.reduce((s,p,i)=> i===editingIndex ? s : s + p.percentuale, 0);
  if (totEsistente + percentualeNuovo > 100) {
    return alert(`Non puoi inserire più di ${100 - totEsistente}%`);
  }


  // applico la modifica
  partiti[editingIndex] = {
    nome: nomeNuovo,
    colore: coloreNuovo,
    ideologia: ideologiaNuovo,
    percentuale: percentualeNuovo
};

// ogni modifica azzera governo, pdc e pdp
presidente = null;
presidenteConsiglio = null;
coalizioneMaggioranza = [];

editingIndex = null;
editFormContainer.style.display = 'none';
salvaPartiti();
});

editCancel.addEventListener('click', ()=>{ editingIndex=null; editFormContainer.style.display='none'; });

function aggiornaPdC(){ 
  if(presidenteConsiglio) pdcDiv.innerHTML=`Presidente del Consiglio: <span style="color:${presidenteConsiglio.colore}; font-weight:bold">${presidenteConsiglio.nome}</span> (${presidenteConsiglio.partito})`; 
  else pdcDiv.textContent='';
}

/* all'avvio: ricostruisco eventuali riferimenti coerenti (nel caso localStorage contenga dati) */
(function reconciliaAllOnLoad(){
  // se presidente salvato e partito esiste, aggiorniamo colore se necessario
  if(presidente){
    const found = partiti.find(p=>p.nome===presidente.partito);
    if(found) presidente.colore = found.colore;
    else presidente = null;
  }
  // coalizione: mantieni solo partiti ancora presenti
  if(coalizioneMaggioranza && coalizioneMaggioranza.length){
    coalizioneMaggioranza = coalizioneMaggioranza
      .map(c=> partiti.find(p=>p.nome===c.nome) || null).filter(Boolean);
  }
  // PdC: se salvato, ricostruisci ministri e colori se possibile
  if(presidenteConsiglio){
    const found = partiti.find(p=>p.nome===presidenteConsiglio.partito);
    if(found) presidenteConsiglio.colore = found.colore;
    if(presidenteConsiglio.ministri && presidenteConsiglio.ministri.length){
      presidenteConsiglio.ministri = presidenteConsiglio.ministri
        .map(m => partiti.find(p=>p.nome===m.nome) || m);
    }
    // se PdC non appartiene più ai partiti, lo lasciamo comunque se il nome è presente in coalizione
    const inPartiti = partiti.find(p=>p.nome===presidenteConsiglio.partito);
    if(!inPartiti && (!coalizioneMaggioranza.find(c=>c.nome===presidenteConsiglio.nome))) {
      // PdC non valido: rimuovi
      presidenteConsiglio = null;
    }
  }
  //salvaPartiti();
})();

//MODAL VOTAZIONI
const modal = document.getElementById("modalVoto");
const modalTitolo = document.getElementById("modalTitolo");
const modalTesto = document.getElementById("modalTesto");
const chiudiModal = document.getElementById("chiudiModal");

//MODAL CONFERMA
const modalConferma = document.getElementById("modalConferma");
const confermaTitolo = document.getElementById("confermaTitolo");
const confermaTesto = document.getElementById("confermaTesto");
const btnConfermaSi = document.getElementById("btnConfermaSi");
const btnConfermaNo = document.getElementById("btnConfermaNo");

function mostraRisultato(titolo, testo) {
  modalTitolo.textContent = titolo;
  modalTesto.textContent = testo;
  modal.style.display = "block";
}

chiudiModal.onclick = () => {
  modal.style.display = "none";
};

function mostraConferma(titolo, testo) {
  return new Promise(resolve => {
    confermaTitolo.textContent = titolo;
    confermaTesto.innerHTML = testo;
    modalConferma.style.display = "block";

    btnConfermaSi.onclick = () => {
      modalConferma.style.display = "none";
      resolve(true);
    };

    btnConfermaNo.onclick = () => {
      modalConferma.style.display = "none";
      resolve(false);
    };
  });
}


async function simulaVotazione({ tipo, titolo = "", salva = false, proponente = null, tipoLegge = null}) {

  const dati = assegnaSeggi();
  let favorevoli = 0;
  let contrari = 0;
  let astenuti = 0;

  const cerchi = [...parlamento.querySelectorAll('circle')]
    .filter(c => !c.classList.contains('pdc') && !c.classList.contains('presidente'));

  // reset colori iniziali
  const coloriOriginali = cerchi.map(c => {
    const partito = dati.find(p => p.nome === c.getAttribute('data-partito'));
    if (!partito) return "#ccc";
    return (coalizioneMaggioranza.some(c => c.nome === partito.nome)) 
      ? partito.colore 
      : schiarisciColore(partito.colore, 0.55);
  });

  // ANIMAZIONE VOTO
  for (let i = 0; i < cerchi.length; i++) {

    const cerchio = cerchi[i];
    const partito = dati.find(p => p.nome === cerchio.getAttribute('data-partito'));
    if (!partito) continue;

    let voto;
    const inMaggioranza = coalizioneMaggioranza.some(c => c.nome === partito.nome);
    const rand = Math.random();

    // LOGICA DIVERSA PER TIPO
    if (tipo === "fiducia") {

      if (inMaggioranza) {
        voto = rand < 0.9 ? "si" : "no";
      } else {
        if (rand < 0.85) voto = "no";
        else if (rand < 0.95) voto = "astenuto";
        else voto = "si";
      }

    } else if (tipo === "legge") {

      const èMaggioranza = coalizioneMaggioranza.some(c => c.nome === partito.nome);
      const èProponente = partito.nome === proponente;
      const proponenteInMaggioranza = coalizioneMaggioranza.some(c => c.nome === proponente);
      const partitoProponenteObj = partiti.find(p => p.nome === proponente);

      if (tipoLegge === "governo") {
        // simile alla fiducia
        if (èMaggioranza) voto = Math.random() < 0.95 ? "si" : "astenuto";
        else voto = Math.random() < 0.8 ? "no" : "astenuto";
      }
    
      else if (tipoLegge === "parlamento") {
      
        if (èProponente) {
          voto = "si"; // il partito proponente vota sempre sì
        }
      
        else if (proponenteInMaggioranza) {
          // proposta della maggioranza
          if (èMaggioranza) voto = Math.random() < 0.9 ? "si" : "astenuto";
          else voto = Math.random() < 0.7 ? "no" : "astenuto";
        }
      
        else {
          // 🔴 proposta opposizione → quasi sempre bocciata
          if (èMaggioranza) {
            voto = Math.random() < 0.85 ? "no" : "astenuto";
          } else {
            // opposizione
            if (!partitoProponenteObj) {
              voto = "astenuto";
            } 
            else if (partito.ideologia === partitoProponenteObj.ideologia) {
              // stessa ideologia → tende a votare sì
              voto = Math.random() < 0.7 ? "si" : "astenuto";
            } 
            else {
              // ideologia diversa → vota contro
              voto = Math.random() < 0.75 ? "no" : "astenuto";
            }
          }
        }
      }
    }

    // conteggio
    if (voto === "si") favorevoli++;
    else if (voto === "no") contrari++;
    else astenuti++;

    // colore
    cerchio.setAttribute('fill',
      voto === "si" ? "#00a900" :
      voto === "no" ? "#ff0000" :
      "#999999"
    );

    await new Promise(r => setTimeout(r, 2));
  }

  const soglia = Math.floor(SEGGI_TOTALI / 2) + 1;
  const approvato = favorevoli >= soglia;

  // LAMPEGGIO FINALE
  for (let j = 0; j < 2; j++) {
    cerchi.forEach(c => c.setAttribute('fill', approvato ? '#00a900' : '#ff0000'));
    await new Promise(r => setTimeout(r, 400));
    cerchi.forEach((c,i) => c.setAttribute('fill', coloriOriginali[i]));
    await new Promise(r => setTimeout(r, 400));
  }

  // RISULTATO
  mostraRisultato(
    approvato ? "✅ Approvato" : "❌ Respinto",
    `Favorevoli: ${favorevoli}
     Contrari: ${contrari}
     Astenuti: ${astenuti}`
  );

  // AZIONI POST
  if (tipo === "fiducia") {

    if (!approvato) {
      presidenteConsiglio = null;
      coalizioneMaggioranza = [];
      localStorage.removeItem("presidenteConsiglio");
      localStorage.removeItem("coalizioneMaggioranza");
      aggiornaPdC();
      aggiornaUI();
      btnLegge.style.display = "none";
      btnPdC.style.display = "none";
      btnCoalizione.style.display = "block";
    } else {
      btnLegge.style.display = "inline-block";
    }

  }

  if (tipo === "legge" && approvato && salva) {
    salvaLegge(titolo, tipoLegge);
  }

  disegnaParlamento();
}
function rimuoviDaMaggioranza(nomePartito) {

  // 1. rimuovi il partito
  coalizioneMaggioranza = coalizioneMaggioranza.filter(p => p.nome !== nomePartito);

  localStorage.setItem('coalizioneMaggioranza', JSON.stringify(coalizioneMaggioranza));

  // 2. rimuovi i ministri di quel partito
  if (presidenteConsiglio && presidenteConsiglio.ministri) {

    presidenteConsiglio.ministri = presidenteConsiglio.ministri.map(m => {

      if (m.partito === nomePartito) {

        // scegli nuovo partito dalla maggioranza
        const nuovo = coalizioneMaggioranza[Math.floor(Math.random() * coalizioneMaggioranza.length)];

        const nomeMinistro = deputati[Math.floor(Math.random() * deputati.length)];

        return {
          nome: nomeMinistro,
          partito: nuovo.nome,
          colore: nuovo.colore
        };
      }

      return m;
    });

    localStorage.setItem('presidenteConsiglio', JSON.stringify(presidenteConsiglio));
  }

  // 3. aggiornamento grafico
  aggiornaUI();
  disegnaParlamento();

  // 4. nuova fiducia
  setTimeout(() => {
    simulaVotazione({ tipo: "fiducia" });
  }, 500);
}

function aggiungiAMaggioranza(nomePartito) {

  const partito = partiti.find(p => p.nome === nomePartito);
  if (!partito) return;

  // evita duplicati
  if (coalizioneMaggioranza.some(p => p.nome === nomePartito)) return;

  coalizioneMaggioranza.push(partito);

  localStorage.setItem('coalizioneMaggioranza', JSON.stringify(coalizioneMaggioranza));

  aggiornaUI();
  disegnaParlamento();
}

