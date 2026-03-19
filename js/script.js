/*
TODO: aggiungere il salvataggio del fetch in localstorage
*/

const SEGGI_TOTALI = 400;
const RIGHE = 5;
let partiti = JSON.parse(localStorage.getItem('partitiSalvati')) || [];
let presidente = JSON.parse(localStorage.getItem('presidenteSalvato')) || null;
let presidenteConsiglio = JSON.parse(localStorage.getItem('presidenteConsiglio')) || null;
let coalizioneMaggioranza = JSON.parse(localStorage.getItem('coalizioneMaggioranza')) || [];
let editingIndex = null;
let databaseNomi = null;

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

const editFormContainer = document.getElementById('editFormContainer');
const editForm = document.getElementById('editForm');
const editNome = document.getElementById('editNome');
const editColore = document.getElementById('editColore');
const editIdeologia = document.getElementById('editIdeologia');
const editPercentuale = document.getElementById('editPercentuale');
const editCancel = document.getElementById('editCancel');

const btnArchivioLeggi = document.getElementById("btnArchivioLeggi");
const archivioLeggiContainer = document.getElementById("archivioLeggiContainer");
const listaLeggi = document.getElementById("listaLeggi");
const chiudiArchivio = document.getElementById("chiudiArchivio");


const btnLegge = document.createElement("button");
btnLegge.id = "btnLegge";
btnLegge.textContent = "📜 Proponi Disegno di Legge";
document.getElementById("main").appendChild(btnLegge);

document.getElementById("main").appendChild(btnLegge);

aggiornaLegenda();
disegnaParlamento();
aggiornaPresidente();
aggiornaPdC();

fetch("data/names.json")
  .then(r => r.json())
  .then(data => {
    console.log(data);
    databaseNomi = data;
  })
  .catch(err => console.error(err));
  
function generaNomeCasuale(){
  if(!databaseNomi) return "On. Deputato";
  const genere = Math.random() < 0.5 ? "nomiMaschili" : "nomiFemminili";
  const nome = databaseNomi[genere][Math.floor(Math.random()*databaseNomi[genere].length)];
  const cognome = databaseNomi.cognomi[Math.floor(Math.random()*databaseNomi.cognomi.length)];
  return "On. " + nome + " " + cognome;
}

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
  aggiornaLegenda();
  disegnaParlamento();
  aggiornaPresidente();
  aggiornaPdC();
}

function assegnaSeggi(){ return partiti.map(p=>({...p, seggi: Math.round(p.percentuale/100*SEGGI_TOTALI)})); }
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

function aggiornaLegenda(){
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
    testo.textContent=`${p.nome} (${p.percentuale}%) - ${p.ideologia} - ${p.seggi} seggi${inMaj ? ' • maggioranza' : ''}`;
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
      editFormContainer.style.display='block'; 
    };
    btns.appendChild(btnEdit); btns.appendChild(btnDel);

    box.appendChild(info); box.appendChild(btns);
    legenda.appendChild(box);
  });

  const totPerc = partiti.reduce((s,p)=>s+p.percentuale,0);
  percentualeDiv.textContent=`Riempimento parlamento: ${totPerc}%`;

  // btnVota compare quando parlamento pieno e non è ancora stato eletto il presidente
  if(totPerc===100 && !presidente){ btnVota.style.display='block'; } else { btnVota.style.display='none'; }
  // btnCoalizione compare solo dopo elezione presidente e prima creazione coalizione
  if (presidente && coalizioneMaggioranza.length===0) { btnCoalizione.style.display='block'; } else { btnCoalizione.style.display='none'; }
  // btnPdC compare solo se coalizione creata e PdC non ancora nominato
  if (coalizioneMaggioranza.length>0 && !presidenteConsiglio) { btnPdC.style.display='block'; } else { btnPdC.style.display='none'; }
  //proponi legge non viene mostrato 
  if (presidenteConsiglio && partiti.reduce((s,p)=>s+p.percentuale,0) === 100) { btnLegge.style.display = "inline-block"; } else {btnLegge.style.display = "none";}
  // reset button visibile quando parlamento pieno
  if(totPerc===100) btnReset.style.display='block'; else btnReset.style.display='none';
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
        cerchio.nomeDeputato = generaNomeCasuale();
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
    presCircle.setAttribute('cx',400); presCircle.setAttribute('cy',430); presCircle.setAttribute('r',12);
    presCircle.setAttribute('fill',presidente.colore); presCircle.setAttribute('stroke','#333'); presCircle.setAttribute('stroke-width','2');
    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = `Presidente del Parlamento: ${presidente.nome}`;
    presCircle.appendChild(title);
    parlamento.appendChild(presCircle);
  }

  if(presidenteConsiglio){
    const pdcc = presidenteConsiglio;
    const pdcCircle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    pdcCircle.setAttribute('cx',400); pdcCircle.setAttribute('cy',390); pdcCircle.setAttribute('r',12);
    pdcCircle.setAttribute('fill',pdcc.colore); pdcCircle.setAttribute('stroke','#333'); pdcCircle.setAttribute('stroke-width','2');
    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = `Presidente del Consiglio: ${pdcc.nome}`;
    pdcCircle.appendChild(title);
    parlamento.appendChild(pdcCircle);

    pdcc.ministri.forEach((m,i)=>{
      const dx = (i<3?-1:1)*(i%3+1)*25;
      const cerchio = document.createElementNS('http://www.w3.org/2000/svg','circle');
      cerchio.setAttribute('cx',400+dx); cerchio.setAttribute('cy',360); cerchio.setAttribute('r',8);
      cerchio.setAttribute('fill',m.colore); cerchio.setAttribute('stroke','#333'); cerchio.setAttribute('stroke-width','1');
      const titleM = document.createElementNS('http://www.w3.org/2000/svg','title');
      // assegno ruoli ministeriali in ordine
      const ruoli = ['Interno','Economia','Difesa','Esteri','Giustizia','Salute'];
      titleM.textContent = `${ruoli[i]}: ${m.nome}`;
      cerchio.appendChild(titleM);
      parlamento.appendChild(cerchio);
    });
  }
}

btnVota.addEventListener('click', simulaVotoPresidente);
btnCoalizione.addEventListener('click', mostraCoalizione);
btnPdC.addEventListener('click', nominaPdC);
btnReset.addEventListener('click', ()=>{ partiti=[]; presidente=null; presidenteConsiglio=null; coalizioneMaggioranza=[]; salvaPartiti(); });

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
  presidente = { nome: scelto.nome, colore: scelto.colore };
  localStorage.setItem('presidenteSalvato',JSON.stringify(presidente));
  aggiornaPresidente(); disegnaParlamento(); btnCoalizione.style.display='block';
}

function aggiornaPresidente(){ 
  if(presidente) presidenteDiv.innerHTML=`Presidente del Parlamento: <span style="color:${presidente.colore};font-weight:bold">${presidente.nome}</span>`; 
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
  aggiornaLegenda();
});

annullaCoalizione.addEventListener('click', ()=>{
  coalizioneContainer.style.display='none';
});

/* nomina PdC basata sulla coalizione */
function nominaPdC() {
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
    ministri.push({...scelto});
  }
  presidenteConsiglio = { nome: pdcPartito.nome, colore: pdcPartito.colore, ministri };
  localStorage.setItem('presidenteConsiglio', JSON.stringify(presidenteConsiglio));
  pdcDiv.innerHTML = `Presidente del Consiglio: <span style="color:${pdcPartito.colore};font-weight:bold">${pdcPartito.nome}</span>`;
  btnPdC.style.display='none';
  btnLegge.style.display="inline-block";
  disegnaParlamento();
  
}
//PARTE LEGGI
const leggeContainer = document.getElementById("leggeContainer");

btnLegge.onclick = () =>{
  leggeContainer.style.display="block";
}
document.getElementById("annullaLegge").onclick = ()=>{
  leggeContainer.style.display="none";
}
document.getElementById("inviaLegge").onclick = ()=>{

  const titolo = document.getElementById("titoloLegge").value;

  // CALCOLO VOTAZIONE PARLAMENTO
  let favorevoli = 0;
  let contrari = 0;

  const datiSeggi = assegnaSeggi();

  datiSeggi.forEach(p=>{

    if(coalizioneMaggioranza.some(c=>c.nome===p.nome)){

      favorevoli += p.seggi;

    }else{

      contrari += p.seggi;

    }

  });

  // RISULTATO VOTAZIONE
  let testo="";

  if(favorevoli>contrari){

    testo = `${titolo}

Favorevoli: ${favorevoli}
Contrari: ${contrari}

✔ La legge è APPROVATA`;

    salvaLegge(titolo);

  }else{

    testo = `${titolo}

Favorevoli: ${favorevoli}
Contrari: ${contrari}

✖ La legge è RESPINTA`;

  }

  document.getElementById("testoRisultato").textContent = testo;
  document.getElementById("risultatoLegge").style.display="flex";
  leggeContainer.style.display="none"; 

}
function salvaLegge(titolo){

  let leggi = JSON.parse(localStorage.getItem("archivioLeggi")) || [];

  leggi.push({
    titolo: titolo,
    data: new Date().toLocaleDateString()
  });

  localStorage.setItem("archivioLeggi", JSON.stringify(leggi));

}
document.getElementById("chiudiRisultato").onclick = ()=>{
  document.getElementById("risultatoLegge").style.display="none";
}
btnArchivioLeggi.onclick = () => {
  // svuota lista
  listaLeggi.innerHTML = '';
  // prendi le leggi salvate
  const leggi = JSON.parse(localStorage.getItem("archivioLeggi")) || [];
  if(leggi.length === 0){
    listaLeggi.innerHTML = '<p style="text-align:center; color:#555;">Nessuna legge approvata</p>';
  } else {
    leggi.forEach(l => {
      const div = document.createElement('div');
      div.style.padding='6px 4px';
      div.style.borderBottom='1px solid #ddd';
      div.innerHTML = `<strong>${l.titolo}</strong><br><small>${l.data}</small>`;
      listaLeggi.appendChild(div);
    });
  }
  archivioLeggiContainer.style.display = 'block';
}

chiudiArchivio.onclick = () => {
  archivioLeggiContainer.style.display = 'none';
}
//fine parte leggi


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
  if(presidenteConsiglio) pdcDiv.innerHTML=`Presidente del Consiglio: <span style="color:${presidenteConsiglio.colore}; font-weight:bold">${presidenteConsiglio.nome}</span>`; 
  else pdcDiv.textContent='';
}

/* all'avvio: ricostruisco eventuali riferimenti coerenti (nel caso localStorage contenga dati) */
(function reconciliaAllOnLoad(){
  // se presidente salvato e partito esiste, aggiorniamo colore se necessario
  if(presidente){
    const found = partiti.find(p=>p.nome===presidente.nome);
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
    const found = partiti.find(p=>p.nome===presidenteConsiglio.nome);
    if(found) presidenteConsiglio.colore = found.colore;
    if(presidenteConsiglio.ministri && presidenteConsiglio.ministri.length){
      presidenteConsiglio.ministri = presidenteConsiglio.ministri
        .map(m => partiti.find(p=>p.nome===m.nome) || m);
    }
    // se PdC non appartiene più ai partiti, lo lasciamo comunque se il nome è presente in coalizione
    const inPartiti = partiti.find(p=>p.nome===presidenteConsiglio.nome);
    if(!inPartiti && (!coalizioneMaggioranza.find(c=>c.nome===presidenteConsiglio.nome))) {
      // PdC non valido: rimuovi
      presidenteConsiglio = null;
    }
  }
  salvaPartiti();
})();
