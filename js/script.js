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
const btnDimissioni = document.getElementById("btnDimissioni");
const btnGestioneMaggioranza = document.getElementById("btnGestioneMaggioranza");
const btnSfiducia = document.getElementById("btnSfiducia");

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
//PAGINA INIZIALE
const landingScreen = document.getElementById('landingScreen');
const btnSimulaElezioni = document.getElementById('btnSimulaElezioni');
const btnCostruisciParlamento = document.getElementById('btnCostruisciParlamento');
const btnHome = document.getElementById('btnHome');
//PAUSA
const btnPausa = document.getElementById('btnPausa');
const modalPausa = document.getElementById('modalPausa');
const pausaRiepilogo = document.getElementById('pausaRiepilogo');
const btnRiprendi = document.getElementById('btnRiprendi');
const btnNuovaPartita = document.getElementById('btnNuovaPartita');

// =========================================================
// UTILITY
// =========================================================

// Evita che nomi di partito con caratteri speciali (", <, >, &) rompano l'HTML generato
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =========================================================
// GESTIONE SCHERMATA INIZIALE
// =========================================================

function entraNelParlamento() {
  document.body.classList.remove('landing-active');
  localStorage.setItem('schermataAttiva', 'parlamento');

  if (landingScreen) {
    landingScreen.style.display = 'none';
  }
}

// MODALITÀ MANUALE

btnCostruisciParlamento.addEventListener('click', () => {
  entraNelParlamento();
});

// MODALITÀ SIMULAZIONE ELETTORALE

btnSimulaElezioni.addEventListener('click', () => {
  alert("I nostri dev sottopagati stanno lavorando giorno e notte per farla funzionare 😁");
});
// Ripristina la schermata visualizzata prima del refresh
if (localStorage.getItem('schermataAttiva') === 'parlamento') {
  entraNelParlamento();
}

//TORNA ALLA HOME

btnHome.addEventListener('click', () => {
  modalPausa.style.display = 'none';
  document.body.classList.add('landing-active');
  localStorage.setItem('schermataAttiva','iniziale');

  if (landingScreen) {
    landingScreen.style.display = 'flex';
  }
});

// =========================================================
// PAUSA
// =========================================================

function rigaPausa(etichetta, valore) {
  const riga = document.createElement('div');
  riga.className = 'pausa-riga';
  const e = document.createElement('span');
  e.textContent = etichetta;
  const v = document.createElement('strong');
  v.textContent = valore;
  riga.appendChild(e);
  riga.appendChild(v);
  return riga;
}

function apriPausa() {
  const dati = assegnaSeggi();
  const totPerc = partiti.reduce((s, p) => s + p.percentuale, 0);
  const seggiMagg = dati
    .filter(p => coalizioneMaggioranza.some(c => c.nome === p.nome))
    .reduce((s, p) => s + p.seggi, 0);
  const leggi = (JSON.parse(localStorage.getItem('archivioLeggi')) || [])
    .filter(l => (l.legislatura || 1) === legislatura);

  pausaRiepilogo.innerHTML = '';
  pausaRiepilogo.appendChild(rigaPausa('Legislatura', toRoman(legislatura)));
  pausaRiepilogo.appendChild(rigaPausa('Partiti', `${partiti.length} (${totPerc}% dei seggi)`));
  pausaRiepilogo.appendChild(rigaPausa('Maggioranza', coalizioneMaggioranza.length ? `${seggiMagg} seggi` : 'Nessuna'));
  pausaRiepilogo.appendChild(rigaPausa('Governo', presidenteConsiglio ? `${presidenteConsiglio.nome} (${presidenteConsiglio.partito})` : 'Nessuno'));
  pausaRiepilogo.appendChild(rigaPausa('Leggi approvate', String(leggi.length)));

  modalPausa.style.display = 'block';
}

function chiudiPausa() {
  modalPausa.style.display = 'none';
}

btnPausa.addEventListener('click', apriPausa);
btnRiprendi.addEventListener('click', chiudiPausa);

btnNuovaPartita.addEventListener('click', async () => {
  const conferma = await mostraConferma(
    "⚠️ Nuova partita",
    "Verranno cancellati partiti, governo, leggi approvate e legislature. Vuoi continuare?"
  );
  if (!conferma) return;

  partiti = [];
  presidente = null;
  presidenteConsiglio = null;
  coalizioneMaggioranza = [];
  legislatura = 1;
  localStorage.setItem('legislatura', legislatura);
  localStorage.removeItem('archivioLeggi');

  chiudiPausa();
  updateTitle();
  salvaPartiti();
});

// Esc apre/chiude la pausa (se non c'è già un'altra finestra aperta)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.body.classList.contains('landing-active')) return;

  if (modalPausa.style.display === 'block') {
    chiudiPausa();
    return;
  }

  const altraFinestra = [...document.querySelectorAll('.modal')].some(m => m.style.display === 'block')
    || editFormContainer.style.display === 'flex'
    || leggeContainer.style.display === 'flex';
  if (!altraFinestra) apriPausa();
});

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

aggiornaUI();
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

// index = indice GLOBALE del seggio (0..399): ogni seggio ha un nome diverso
function generaNomeCasuale(index){
  if (deputati && deputati.length) return deputati[index % deputati.length];
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

// Assegnazione seggi con metodo dei resti più alti:
// a parlamento pieno (100%) la somma dei seggi è sempre esattamente SEGGI_TOTALI.
function assegnaSeggi(){
  const totPerc = partiti.reduce((s,p)=>s+p.percentuale,0);
  const target = Math.round(totPerc / 100 * SEGGI_TOTALI);

  const quote = partiti.map((p, i) => {
    const esatto = p.percentuale / 100 * SEGGI_TOTALI;
    return { i, base: Math.floor(esatto), resto: esatto - Math.floor(esatto) };
  });

  let assegnati = quote.reduce((s,q)=>s+q.base,0);
  let mancanti = target - assegnati;

  // distribuisco i seggi rimanenti ai partiti con il resto più alto
  [...quote].sort((a,b)=>b.resto - a.resto).forEach(q => {
    if (mancanti > 0) { q.base++; mancanti--; }
  });

  return partiti.map((p,i)=>({...p, seggi: quote[i].base}));
}

function seggiPartito(nome){
  const p = assegnaSeggi().find(x => x.nome === nome);
  return p ? p.seggi : 0;
}

function haMaggioranza() {
  const dati = assegnaSeggi();
  let seggi = 0;

  coalizioneMaggioranza.forEach(c => {
    const p = dati.find(x => x.nome === c.nome);
    if (p) seggi += p.seggi;
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
  if (presidenteConsiglio) { btnSfiducia.style.display = "block"; } else { btnSfiducia.style.display = "none"; }
  controllaBlocchiAzioni();
}

function disegnaParlamento(){
  parlamento.innerHTML=''; 
  const dati=assegnaSeggi();
  const cx=400,cy=400,raggioMax=300,step=30; 
  let startAngle=Math.PI;
  let indiceGlobale = 0; // indice progressivo del seggio in tutto il parlamento (nomi univoci)

  dati.forEach(p=>{
    const angleSpan=Math.PI*(p.seggi/SEGGI_TOTALI);
    const coloreFinale = (coalizioneMaggioranza.some(c => c.nome === p.nome)) 
                   ? p.colore 
                   : schiarisciColore(p.colore, 0.55); // 55% più chiaro
    let currentSeggi=0;

    if (p.seggi > 0) {
      for(let row=0;row<RIGHE;row++){
        const raggio=raggioMax-row*step;
        // distribuisco esattamente p.seggi sulle righe (nessun seggio in più o in meno)
        const seggiPerRiga = Math.floor(p.seggi/RIGHE) + (row < p.seggi % RIGHE ? 1 : 0);
        for(let i=0;i<seggiPerRiga;i++){
          const frazione = i/seggiPerRiga;
          const angolo = startAngle + angleSpan*frazione;
          const x = cx + raggio*Math.cos(angolo); 
          const y = cy + raggio*Math.sin(angolo);
          const cerchio = document.createElementNS('http://www.w3.org/2000/svg','circle');
          cerchio.nomeDeputato = generaNomeCasuale(indiceGlobale);
          cerchio.setAttribute('cx',x); cerchio.setAttribute('cy',y); cerchio.setAttribute('r',5); 
          cerchio.setAttribute('fill', coloreFinale);
          //tooltip
          cerchio.setAttribute('data-partito', p.nome);
          cerchio.setAttribute('data-seggio', currentSeggi+1);
          const title = document.createElementNS('http://www.w3.org/2000/svg','title');
          title.textContent = `${cerchio.nomeDeputato} — ${p.nome}`;
          cerchio.appendChild(title);
          parlamento.appendChild(cerchio);
          currentSeggi++;
          indiceGlobale++;
        }
      }
    }
    startAngle+=angleSpan;
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
    `${escapeHtml(p.nome)} è stato caricato con successo`
  );
}
//Aggiunta eventi a modali
btnVota.addEventListener('click', simulaVotoPresidente);
btnCoalizione.addEventListener('click', mostraCoalizione);
btnPdC.addEventListener('click', nominaPdC);
btnReset.addEventListener('click', async ()=>{const conferma = await mostraConferma("⚠️ Scioglimento Parlamento", `Vuoi sciogliere il Parlamento? Verranno indette nuove elezioni.`); 
if(!conferma) return;  partiti=[]; presidente=null; presidenteConsiglio=null; coalizioneMaggioranza=[]; legislatura++; localStorage.setItem('legislatura', legislatura); updateTitle(); salvaPartiti(); });
btnDimissioni.addEventListener("click", dimissioniPremier);
btnGestioneMaggioranza.addEventListener("click", mostraGestioneMaggioranza);
btnSfiducia.addEventListener("click", async () => {
  // lista partiti (meglio se opposizione)
  let html = `<h4>Chi propone la sfiducia?</h4>`;
  partiti.forEach((p, i) => {
    html += `
      <div style="display:flex; align-items:center; gap:8px; margin:5px 0;">
        <div style="width:14px;height:14px;border-radius:50%;background:${p.colore};border:1px solid #999;"></div>
        <label style="flex:1;">${escapeHtml(p.nome)}</label>
        <input type="radio" name="sfiducia" value="${i}">
      </div>
    `;
  });
  confermaTitolo.textContent = "🗳️ Mozione di Sfiducia";
  confermaTesto.innerHTML = html;
  modalConferma.style.display = "block";
  btnConfermaSi.onclick = () => {
    const scelta = document.querySelector('input[name="sfiducia"]:checked');
    if (!scelta) return alert("Seleziona un partito");
    const partitoScelto = partiti[parseInt(scelta.value)];
    modalConferma.style.display = "none";
    simulaVotazione({
      tipo: "sfiducia",
      proponente: partitoScelto.nome
    });
  };
  btnConfermaNo.onclick = () => {
    modalConferma.style.display = "none";
  };
});

function scegliPresidente(){
  const dati=assegnaSeggi();
  const total = dati.reduce((s,p)=>s+p.seggi,0);
  if(total===0) return null;
  let rand=Math.random()*total;
  for(const p of dati){ if(rand<p.seggi) return p; rand-=p.seggi; }
  return dati[dati.length-1];
}
function mostraGestioneMaggioranza() {
  return new Promise(resolve => {

    confermaTitolo.textContent = "⚙️ Gestione Maggioranza";

    // PARTITI IN MAGGIORANZA
    // I radio usano l'indice nell'array partiti come value (sicuro anche con trattini/virgolette nel nome)
    let html = `<h4>➖ Rimuovi dalla maggioranza</h4>`;
    html += `<div style="margin-bottom:10px;">`;

    if (coalizioneMaggioranza.length === 0) {
      html += `<p>Nessun partito in maggioranza</p>`;
    } else {
      coalizioneMaggioranza.forEach(c => {
        const idx = partiti.findIndex(p => p.nome === c.nome);
        html += `
          <div style="display:flex; align-items:center; gap:8px; margin:5px 0;">
            <div style="width:14px;height:14px;border-radius:50%;background:${c.colore};border:1px solid #999;"></div>
            <label style="flex:1;">${escapeHtml(c.nome)}</label>
            <input type="radio" name="azioneCoalizione" value="remove:${idx}">
          </div>
        `;
      });
    }

    html += `</div>`;

    // PARTITI FUORI MAGGIORANZA
    html += `<h4>➕ Aggiungi alla maggioranza</h4>`;
    html += `<div>`;

    const fuori = partiti.filter(p => !coalizioneMaggioranza.some(c => c.nome === p.nome));

    if (fuori.length === 0) {
      html += `<p>Tutti i partiti sono già nella maggioranza</p>`;
    } else {
      fuori.forEach(p => {
        const idx = partiti.findIndex(x => x.nome === p.nome);
        html += `
          <div style="display:flex; align-items:center; gap:8px; margin:5px 0;">
            <div style="width:14px;height:14px;border-radius:50%;background:${p.colore};border:1px solid #999;"></div>
            <label style="flex:1;">${escapeHtml(p.nome)}</label>
            <input type="radio" name="azioneCoalizione" value="add:${idx}">
          </div>
        `;
      });
    }

    html += `</div>`;

    confermaTesto.innerHTML = html;
    modalConferma.style.display = "block";

    // CONFERMA
    btnConfermaSi.onclick = () => {
      const scelta = document.querySelector('input[name="azioneCoalizione"]:checked');

      if (!scelta) {
        alert("Seleziona un'azione.");
        return;
      }

      const [azione, idxStr] = scelta.value.split(":");
      const partitoScelto = partiti[parseInt(idxStr)];
      if (!partitoScelto) return;
      const nomePartito = partitoScelto.nome;

      if (azione === "remove") {
        rimuoviDaMaggioranza(nomePartito);

        mostraRisultato(
          "➖ Partito rimosso",
          `${escapeHtml(nomePartito)} è uscito dalla maggioranza`
        );

      } else if (azione === "add") {
        aggiungiAMaggioranza(nomePartito);

        mostraRisultato(
          "➕ Partito aggiunto",
          `${escapeHtml(nomePartito)} è entrato nella maggioranza`
        );

        // 👉 aggiorno fiducia anche quando entra
        setTimeout(() => {
          simulaVotazione({ tipo: "fiducia" });
        }, 500);
      }

      modalConferma.style.display = "none";
      resolve(true);
    };

    btnConfermaNo.onclick = () => {
      modalConferma.style.display = "none";
      resolve(false);
    };
  });
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
  if(presidente) presidenteDiv.innerHTML=`Presidente del Parlamento: <span style="color:${presidente.colore};font-weight:bold">${escapeHtml(presidente.nome)}</span> (${escapeHtml(presidente.partito)})`; 
  else presidenteDiv.textContent='';
}

/* --- COALIZIONE (GESTITA DALL'UTENTE) --- */
function mostraCoalizione() {
  return new Promise(resolve => {

    confermaTitolo.textContent = "🤝 Seleziona Coalizione";

    // costruisco HTML dinamico
    let html = `<div style="max-height:300px; overflow-y:auto;">`;

    partiti.forEach((p, i) => {
      const checked = coalizioneMaggioranza.some(c => c.nome === p.nome) ? "checked" : "";

      html += `
        <div style="display:flex; align-items:center; gap:8px; margin:5px 0;">
          <div style="width:14px;height:14px;border-radius:50%;background:${p.colore};border:1px solid #999;"></div>
          <label style="flex:1;">${escapeHtml(p.nome)} (${escapeHtml(p.ideologia)})</label>
          <input type="checkbox" value="${i}" ${checked}>
        </div>
      `;
    });

    html += `</div>`;
    html += `<p id="coalTot" style="margin-top:10px; font-weight:bold;"></p>`;
    confermaTesto.innerHTML = html;
    modalConferma.style.display = "block";

    const aggiornaTot = () => {
      const dati = assegnaSeggi();
      const checkboxes = modalConferma.querySelectorAll('input[type="checkbox"]');
      let seggiTotali = 0;

      checkboxes.forEach(cb => {
        if (cb.checked) {
          const p = dati[parseInt(cb.value)];
          if (p) seggiTotali += p.seggi;
        }
      });

      const coalTotEl = document.getElementById("coalTot");

      if (seggiTotali >= SEGGI_TOTALI / 2 + 1) {
        coalTotEl.style.color = '#1f7a1f';
        coalTotEl.textContent = `✅ Maggioranza (${seggiTotali} seggi)`;
      } else {
        coalTotEl.style.color = '#b30000';
        coalTotEl.textContent = `❌ Nessuna maggioranza (${seggiTotali} seggi)`;
      }
    };

    // listener checkbox
    setTimeout(() => {
      modalConferma.querySelectorAll('input[type="checkbox"]')
        .forEach(cb => cb.addEventListener('change', aggiornaTot));
      aggiornaTot();
    }, 0);

    btnConfermaSi.onclick = () => {
      const checked = [...modalConferma.querySelectorAll('input[type="checkbox"]:checked')]
        .map(cb => parseInt(cb.value));

      if (checked.length === 0) {
        alert("Seleziona almeno un partito.");
        return;
      }

      coalizioneMaggioranza = partiti.filter((p, i) => checked.includes(i));
      localStorage.setItem('coalizioneMaggioranza', JSON.stringify(coalizioneMaggioranza));

      modalConferma.style.display = "none";

      btnCoalizione.style.display = 'none';
      btnPdC.style.display = 'block';

      aggiornaUI();
      disegnaParlamento(); // ridisegna l'emiciclo: i seggi della maggioranza si illuminano
      resolve(true);
    };

    btnConfermaNo.onclick = () => {
      modalConferma.style.display = "none";
      resolve(false);
    };

  });
}

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
  pdcDiv.innerHTML = `Presidente del Consiglio: <span style="color:${pdcPartito.colore};font-weight:bold">${escapeHtml(presidenteConsiglio.nome)}</span> (${escapeHtml(presidenteConsiglio.partito)})`;
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
    `Il Presidente del Consiglio <strong>${escapeHtml(nomePdC)}</strong> vuole dimettersi. <p>Accogli le dimissioni?</p>`
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
    `Il Presidente del Consiglio ${escapeHtml(nomePdC)} si è dimesso. È necessario formare una nuova maggioranza.`
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
          <strong>${escapeHtml(l.titolo)}</strong>
          <small>${l.tipo === "governo" ? "Proposta del Governo" : "Proposta del Parlamento"}</small>
          <small>${escapeHtml(l.data)}</small>
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
      if (modal.id === "modalVoto") ripulisciFranchiTiratori();
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
  if(presidenteConsiglio) pdcDiv.innerHTML=`Presidente del Consiglio: <span style="color:${presidenteConsiglio.colore}; font-weight:bold">${escapeHtml(presidenteConsiglio.nome)}</span> (${escapeHtml(presidenteConsiglio.partito)})`; 
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
  modalTesto.innerHTML = testo;
  modal.style.display = "block";
}

chiudiModal.onclick = () => {
  modal.style.display = "none";
  ripulisciFranchiTiratori();
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


// =========================================================
// MOTORE DI VOTO (disciplina di partito, franchi tiratori, crisi di alleanza)
// =========================================================
// Come funziona:
// 1. Ogni PARTITO decide una linea ufficiale (si / no / astenuto) in base a ruolo
//    (maggioranza/opposizione), vicinanza ideologica e tipo di votazione.
// 2. Ogni partito ha una COESIONE per quella votazione: parte da una base, cala se il
//    partito è grande (più correnti interne), e subisce un "malumore" casuale a coda
//    lunga (di solito minimo, ogni tanto forte) più un "clima politico" comune a tutti.
// 3. Ogni DEPUTATO ha una propensione alla ribellione stabile (dipende dal suo nome):
//    i franchi tiratori sono quasi sempre gli stessi, non estratti a caso ogni volta.
// 4. I dissidenti non passano al fronte opposto: più spesso si astengono.
// 5. Nei voti di fiducia/sfiducia/leggi di governo un partito alleato può ritirare
//    il sostegno in blocco (crisi di alleanza).
// Tutti i parametri sono modificabili qui sotto.

const CONFIG_VOTO = {
  coesioneBase: {
    fiducia: 0.995,         // voto palese per appello nominale: dissentire = far cadere il governo
    sfiducia: 0.99,
    leggeGoverno: 0.975,
    leggeParlamento: 0.94,  // più libertà di coscienza
    proponente: 0.99        // il partito che propone la legge è compatto
  },
  // quanto "malumore" e effetto dimensione pesano in ciascun tipo di voto
  fattoreMalumore: {
    fiducia: 0.35,
    sfiducia: 0.45,
    leggeGoverno: 0.8,
    leggeParlamento: 1.3
  },
  penalitaDimensione: 0.06, // un partito che ha il 100% dei seggi perde 6 punti di coesione
  malumoreMedio: 0.02,      // malumore medio per partito (distribuzione esponenziale)
  malumoreMax: 0.30,
  climaMax: 0.015,          // oscillazione comune a tutti i partiti in ogni votazione
  probCrisiAlleanza: {      // probabilità che un partito alleato si astenga in blocco
    fiducia: 0.03,
    sfiducia: 0.03,
    leggeGoverno: 0.02,
    leggeParlamento: 0
  }
};

const ORDINE_IDEOLOGIA = { sinistra: 0, centro: 1, destra: 2 };

// probabilità di voto del partito in base alla distanza ideologica (0, 1, 2)
const VICINANZA = {
  0: { si: 0.50, astenuto: 0.30, no: 0.20 },
  1: { si: 0.15, astenuto: 0.35, no: 0.50 },
  2: { si: 0.04, astenuto: 0.16, no: 0.80 }
};
const OPPOSIZIONE_LEGGE_GOVERNO = {
  0: { si: 0.30, astenuto: 0.35, no: 0.35 },
  1: { si: 0.12, astenuto: 0.33, no: 0.55 },
  2: { si: 0.04, astenuto: 0.16, no: 0.80 }
};
const OPPOSIZIONE_SFIDUCIA = {
  0: { si: 0.90, astenuto: 0.10 },
  1: { si: 0.70, astenuto: 0.20, no: 0.10 },
  2: { si: 0.50, astenuto: 0.25, no: 0.25 }
};
// dove va il voto di chi dissente dalla linea del partito
const DIREZIONE_DISSENSO = {
  si:       { astenuto: 0.60, no: 0.40 },
  no:       { astenuto: 0.65, si: 0.35 },
  astenuto: { si: 0.50, no: 0.50 }
};

function distanzaIdeologica(a, b) {
  const x = ORDINE_IDEOLOGIA[a] ?? 1;
  const y = ORDINE_IDEOLOGIA[b] ?? 1;
  return Math.abs(x - y);
}

// sceglie una chiave con probabilità proporzionale ai pesi, es. {si:.5, no:.5}
function sceltaPesata(pesi) {
  const voci = Object.entries(pesi);
  const tot = voci.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * tot;
  for (const [k, w] of voci) {
    if (r < w) return k;
    r -= w;
  }
  return voci[voci.length - 1][0];
}

// hash stabile 0..1 a partire da una stringa (FNV-1a)
function hashNome(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// 0..1, con la maggior parte dei deputati disciplinati e pochi ribelli cronici
function propensioneRibelle(nome) {
  const u = hashNome(nome);
  return u * u;
}

function chiaveVotazione(tipo, tipoLegge) {
  if (tipo === "legge") return tipoLegge === "governo" ? "leggeGoverno" : "leggeParlamento";
  return tipo; // "fiducia" | "sfiducia"
}

// linea ufficiale del partito per questa votazione
function decidiPosizione(p, { tipo, tipoLegge, inMagg, pdcObj, proponenteObj, proponenteInMagg }) {
  const dist = (altro) => altro ? distanzaIdeologica(p.ideologia, altro.ideologia) : 1;

  if (tipo === "fiducia") {
    if (inMagg) return "si";
    return dist(pdcObj) === 2 ? "no" : sceltaPesata({ no: 0.85, astenuto: 0.15 });
  }

  if (tipo === "sfiducia") {
    if (proponenteObj && p.nome === proponenteObj.nome) return "si";
    if (inMagg) return sceltaPesata({ no: 0.90, astenuto: 0.10 });
    return sceltaPesata(OPPOSIZIONE_SFIDUCIA[dist(proponenteObj)]);
  }

  if (tipo === "legge" && tipoLegge === "governo") {
    if (inMagg) return "si";
    return sceltaPesata(OPPOSIZIONE_LEGGE_GOVERNO[dist(pdcObj)]);
  }

  if (tipo === "legge" && tipoLegge === "parlamento") {
    if (!proponenteObj) return "astenuto";
    if (p.nome === proponenteObj.nome) return "si";

    if (proponenteInMagg) {
      // proposta della maggioranza
      if (inMagg) return sceltaPesata({ si: 0.92, astenuto: 0.08 });
      return sceltaPesata(VICINANZA[dist(proponenteObj)]);
    }

    // proposta dell'opposizione
    if (inMagg) {
      // la maggioranza di norma boccia, ma un alleato ideologicamente vicino può appoggiarla
      return dist(proponenteObj) === 0
        ? sceltaPesata({ si: 0.20, astenuto: 0.30, no: 0.50 })
        : sceltaPesata({ si: 0.05, astenuto: 0.25, no: 0.70 });
    }
    return sceltaPesata(VICINANZA[dist(proponenteObj)]);
  }

  return "astenuto";
}

// prepara linea e coesione di ogni partito per UNA votazione
function preparaVotazione({ tipo, tipoLegge, proponente }) {
  const dati = assegnaSeggi();
  const chiave = chiaveVotazione(tipo, tipoLegge);
  const pdcObj = presidenteConsiglio ? partiti.find(p => p.nome === presidenteConsiglio.partito) : null;
  const proponenteObj = proponente ? partiti.find(p => p.nome === proponente) : null;
  const proponenteInMagg = !!proponenteObj && coalizioneMaggioranza.some(c => c.nome === proponenteObj.nome);
  const clima = (Math.random() * 2 - 1) * CONFIG_VOTO.climaMax;
  const lineaGoverno = (tipo === "sfiducia") ? "no" : "si";

  const mappa = {};
  const eventi = [];

  dati.forEach(p => {
    const inMagg = coalizioneMaggioranza.some(c => c.nome === p.nome);
    const èLeaderGoverno = !!pdcObj && p.nome === pdcObj.nome;
    const èProponente = !!proponenteObj && p.nome === proponenteObj.nome;

    let posizione = decidiPosizione(p, { tipo, tipoLegge, inMagg, pdcObj, proponenteObj, proponenteInMagg });

    // crisi di alleanza: un partner di governo si astiene in blocco
    let crisi = false;
    const probCrisi = CONFIG_VOTO.probCrisiAlleanza[chiave] || 0;
    if (inMagg && !èLeaderGoverno && !èProponente && posizione === lineaGoverno && Math.random() < probCrisi) {
      posizione = "astenuto";
      crisi = true;
      eventi.push(
        tipo === "legge"
          ? `⚠️ ${p.nome} si astiene in blocco su questa legge`
          : `⚠️ ${p.nome} ha ritirato il sostegno al governo (astensione di gruppo)`
      );
    }

    // coesione del partito in questa votazione
    let coesione = èProponente ? CONFIG_VOTO.coesioneBase.proponente : CONFIG_VOTO.coesioneBase[chiave];
    if (!èProponente) {
      const f = CONFIG_VOTO.fattoreMalumore[chiave];
      const malumore = Math.min(
        CONFIG_VOTO.malumoreMax,
        -Math.log(1 - Math.random()) * CONFIG_VOTO.malumoreMedio * f
      );
      coesione = coesione
        - malumore
        - (p.seggi / SEGGI_TOTALI) * CONFIG_VOTO.penalitaDimensione * f
        + clima * f;
    }
    if (crisi) coesione = 0.98; // la decisione è del gruppo: i membri la seguono
    coesione = Math.max(0.5, Math.min(1, coesione));

    mappa[p.nome] = { posizione, coesione };
  });

  return { mappa, eventi };
}

// voto del singolo deputato: segue la linea del partito, salvo dissenso
function votoDeputato(nome, ctxPartito) {
  const prob = (1 - ctxPartito.coesione) * (0.2 + 2.4 * propensioneRibelle(nome));
  if (Math.random() < Math.min(0.9, prob)) {
    return { voto: sceltaPesata(DIREZIONE_DISSENSO[ctxPartito.posizione]), dissente: true };
  }
  return { voto: ctxPartito.posizione, dissente: false };
}


// Evidenzia un seggio di franco tiratore: cerchio più grande con bordo scuro + tooltip
function segnaFranco(cerchio) {
  cerchio.setAttribute('r', 6.5);
  cerchio.setAttribute('stroke', '#111');
  cerchio.setAttribute('stroke-width', 1);
  const t = cerchio.querySelector('title');
  if (t && !t.textContent.includes('franco tiratore')) t.textContent += ' (franco tiratore)';
}

// Riporta i franchi tiratori a seggi normali (chiamata alla chiusura del popup del risultato)
function ripulisciFranchiTiratori() {
  parlamento.querySelectorAll('circle[data-partito][stroke]').forEach(c => {
    c.setAttribute('r', 5);
    c.removeAttribute('stroke');
    c.removeAttribute('stroke-width');

    const t = c.querySelector('title');
    if (t) t.textContent = t.textContent.replace(' (franco tiratore)', '');
  });
}

// Dopo un ridisegno dell'emiciclo rimette in evidenza i franchi tiratori dell'ultima votazione
function evidenziaFranchiTiratori(chiavi) {
  const set = new Set(chiavi);
  parlamento.querySelectorAll('circle[data-partito]').forEach(c => {
    if (set.has(c.getAttribute('data-partito') + '|' + c.getAttribute('data-seggio'))) segnaFranco(c);
  });
}

// Riepilogo di franchi tiratori ed eventi (crisi di alleanza) da aggiungere ai risultati
function riepilogoExtra(eventi, dissidenti) {
  let html = "";
  const nomi = Object.keys(dissidenti).filter(n => dissidenti[n] > 0);
  if (nomi.length) {
    const tot = nomi.reduce((s, n) => s + dissidenti[n], 0);
    html += `<p>🕵️ <strong>Franchi tiratori: ${tot}</strong><br>` +
      nomi.sort((x, y) => dissidenti[y] - dissidenti[x])
          .map(n => `${escapeHtml(n)}: ${dissidenti[n]}`).join("<br>") + `</p>`;
  } else {
    html += `<p>🕵️ Nessun franco tiratore: tutti i gruppi hanno votato compatti.</p>`;
  }
  if (eventi.length) html += `<p>${eventi.map(escapeHtml).join("<br>")}</p>`;
  return html;
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
  // Linea di ogni partito + coesione calcolate UNA volta per votazione
  const { mappa, eventi } = preparaVotazione({ tipo, tipoLegge, proponente });
  const dissidenti = {}; // franchi tiratori per partito
  const chiaviDissidenti = []; // seggi dei franchi tiratori (partito|numero seggio)

  for (let i = 0; i < cerchi.length; i++) {

    const cerchio = cerchi[i];
    const nomePartito = cerchio.getAttribute('data-partito');
    const ctx = mappa[nomePartito];
    if (!ctx) continue;

    const { voto, dissente } = votoDeputato(cerchio.nomeDeputato || `seggio-${i}`, ctx);
    if (dissente) {
      dissidenti[nomePartito] = (dissidenti[nomePartito] || 0) + 1;
      chiaviDissidenti.push(nomePartito + '|' + cerchio.getAttribute('data-seggio'));
      segnaFranco(cerchio);
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

  const extraHtml = riepilogoExtra(eventi, dissidenti);

  const soglia = Math.floor(SEGGI_TOTALI / 2) + 1;
  const approvato = favorevoli >= soglia;
  if (tipo === "sfiducia") {

  const soglia = Math.floor(SEGGI_TOTALI / 2) + 1;
  const percentFav = ((favorevoli / SEGGI_TOTALI) * 100).toFixed(1);
  const percentContr = ((contrari / SEGGI_TOTALI) * 100).toFixed(1);
  const percentAst = ((astenuti / SEGGI_TOTALI) * 100).toFixed(1);

  if (approvato) {
    const nomePdC = presidenteConsiglio?.nome;
    const scarto = favorevoli - soglia;

    presidenteConsiglio = null;
    coalizioneMaggioranza = [];

    localStorage.removeItem("presidenteConsiglio");
    localStorage.removeItem("coalizioneMaggioranza");

    aggiornaPdC();
    aggiornaUI();

    mostraRisultato(
      "💥 Governo caduto",
      `La mozione di sfiducia è stata <strong>approvata</strong>.

<p>
📊 <strong>RISULTATO VOTAZIONE</strong><br>
Favorevoli: ${favorevoli} (${percentFav}%)<br>
Contrari: ${contrari} (${percentContr}%)<br>
Astenuti: ${astenuti} (${percentAst}%)
</p>

<p>
🎯 Maggioranza richiesta: ${soglia} voti<br>
📈 Scarto: +${scarto} voti
</p>

Il governo dell'<strong>${escapeHtml(nomePdC || "")}</strong> è caduto.${extraHtml}`
    );

    btnCoalizione.style.display = "block";
    btnPdC.style.display = "none";
    btnLegge.style.display = "none";

  } else {

    const scartoNo = soglia - favorevoli;

    mostraRisultato(
      "🛡️ Governo salvo",
      `La mozione di sfiducia è stata <strong>respinta</strong>.

<p>
📊 <strong>RISULTATO VOTAZIONE</strong><br>
Favorevoli: <strong>${favorevoli}</strong> (${percentFav}%)<br>
Contrari: <strong>${contrari}</strong> (${percentContr}%)<br>
Astenuti: <strong>${astenuti}</strong> (${percentAst}%)
</p>

<p>
🎯 Maggioranza richiesta: <strong>${soglia} voti</strong><br>
📉 Scarto: <strong>${scartoNo}</strong> voti per approvare
</p>${extraHtml}`
    );
  }

  disegnaParlamento();
  evidenziaFranchiTiratori(chiaviDissidenti);
  return; 
}

  // LAMPEGGIO FINALE
  for (let j = 0; j < 2; j++) {
    cerchi.forEach(c => c.setAttribute('fill', approvato ? '#00a900' : '#ff0000'));
    await new Promise(r => setTimeout(r, 400));
    cerchi.forEach((c,i) => c.setAttribute('fill', coloriOriginali[i]));
    await new Promise(r => setTimeout(r, 400));
  }

  // RISULTATO
  // CALCOLI EXTRA
const percentFav = ((favorevoli / SEGGI_TOTALI) * 100).toFixed(1);
const percentContr = ((contrari / SEGGI_TOTALI) * 100).toFixed(1);
const percentAst = ((astenuti / SEGGI_TOTALI) * 100).toFixed(1);

const scarto = approvato 
  ? (favorevoli - soglia) 
  : (soglia - favorevoli);

// TITOLI DINAMICI
let titoloRisultato = "";
let intestazione = "";

if (tipo === "fiducia") {
  titoloRisultato = approvato ? "🟢 Fiducia approvata" : "🔴 Crisi di Governo";
  intestazione = "Voto di fiducia al Governo";
}

else if (tipo === "legge") {
  titoloRisultato = approvato ? "📜 Legge approvata" : "❌ Legge respinta";
  intestazione = escapeHtml(titolo || "Disegno di legge");
}

// OUTPUT
mostraRisultato(
  titoloRisultato,
  `<strong>${intestazione}</strong>

<p>
📊 <strong>RISULTATO VOTAZIONE</strong><br>
Favorevoli: <strong>${favorevoli}</strong> (${percentFav}%)<br>
Contrari: <strong>${contrari}</strong> (${percentContr}%)<br>
Astenuti: <strong>${astenuti}</strong> (${percentAst}%)
</p>

<p>
🎯 Maggioranza richiesta: <strong>${soglia} voti</strong><br>
${approvato 
  ? `📈 Scarto: <strong>+${scarto}</strong> voti` 
  : `📉 Mancano: <strong>${scarto}</strong> voti`}
</p>${extraHtml}`
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
  evidenziaFranchiTiratori(chiaviDissidenti);
}
function rimuoviDaMaggioranza(nomePartito) {

  // 1. rimuovi il partito
  coalizioneMaggioranza = coalizioneMaggioranza.filter(p => p.nome !== nomePartito);

  localStorage.setItem('coalizioneMaggioranza', JSON.stringify(coalizioneMaggioranza));

  // 2. rimuovi i ministri di quel partito
  if (presidenteConsiglio && presidenteConsiglio.ministri && coalizioneMaggioranza.length > 0) {

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