// =========================================================
// SIMULAZIONE ELETTORALE - PARTE 1: MOTORE
// Funzioni pure (non toccano il DOM): consensi, seggi, premio di maggioranza.
// =========================================================

const EL_TOT_SEGGI = 400;
const EL_SOGLIA_MAGGIORANZA = 201;
const EL_MIN_PARTITI = 3;
const EL_MAX_PARTITI = 15;
const EL_QUOTA_MIN = 1.5;   // nessun partito sotto l'1,5% (evita risultati irrisori)
const EL_QUOTA_MAX = 45;    // tetto di sicurezza (evita risultati sproporzionati)
const EL_GINOCCHIO = 34;    // oltre questa quota i consensi vengono compressi gradualmente
const EL_AREE = ['sinistra', 'centro', 'destra'];
const EL_NOME_AREA = { sinistra: 'Sinistra', centro: 'Centro', destra: 'Destra' };

// Peso medio di ciascuna area politica nei vari climi (somma ~100).
const EL_CLIMI = {
  equilibrato: {
    nome: 'Equilibrato',
    descrizione: 'Nessuna spinta particolare: le tre aree si equivalgono e la sfida resta aperta.',
    aree: { sinistra: 34, centro: 32, destra: 34 }
  },
  polarizzato: {
    nome: 'Polarizzato',
    descrizione: 'Sinistra e destra si rafforzano, il centro perde peso.',
    aree: { sinistra: 40, centro: 20, destra: 40 }
  },
  centro: {
    nome: 'Voglia di centro',
    descrizione: "L'elettorato premia la moderazione: il centro cresce a spese delle ali.",
    aree: { sinistra: 28, centro: 44, destra: 28 }
  },
  sinistra: {
    nome: 'Vento a sinistra',
    descrizione: "Un'ondata progressista: la sinistra guadagna, la destra cala.",
    aree: { sinistra: 46, centro: 28, destra: 26 }
  },
  destra: {
    nome: 'Vento a destra',
    descrizione: "Un'ondata conservatrice: la destra guadagna, la sinistra cala.",
    aree: { sinistra: 26, centro: 28, destra: 46 }
  }
};

// ---------------------------------------------------------
// Utilità numeriche
// ---------------------------------------------------------

// numero casuale con distribuzione normale (media 0, deviazione 1)
function elNormale() {
  let u = 0;
  while (u === 0) u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Riparto a resti più alti: distribuisce esattamente `totale` unità in proporzione ai pesi.
function elRipartisci(pesi, totale) {
  const n = pesi.length;
  if (n === 0) return [];
  const somma = pesi.reduce((a, b) => a + b, 0);
  if (somma <= 0) {
    // caso di emergenza: divisione uniforme
    const base = Math.floor(totale / n);
    const out = pesi.map(() => base);
    for (let i = 0; i < totale - base * n; i++) out[i]++;
    return out;
  }
  const quote = pesi.map((w, i) => {
    const esatto = (w / somma) * totale;
    return { i, w, base: Math.floor(esatto), resto: esatto - Math.floor(esatto) };
  });
  let mancanti = totale - quote.reduce((s, q) => s + q.base, 0);
  [...quote]
    .sort((a, b) => (b.resto - a.resto) || (b.w - a.w) || (a.i - b.i))
    .forEach(q => { if (mancanti > 0) { q.base++; mancanti--; } });
  return quote.map(q => q.base);
}

// Porta tutti i valori dentro [min, max] mantenendo somma 100
function elLimitaQuote(valori, min, max) {
  const nomi = Object.keys(valori);
  const fissi = {};
  for (let giro = 0; giro < 50; giro++) {
    const sommaFissi = nomi.reduce((s, n) => (fissi[n] !== undefined ? s + fissi[n] : s), 0);
    const liberi = nomi.filter(n => fissi[n] === undefined);
    if (!liberi.length) break;
    const sommaLiberi = liberi.reduce((s, n) => s + valori[n], 0);
    const k = (100 - sommaFissi) / sommaLiberi;
    liberi.forEach(n => { valori[n] *= k; });
    let violato = false;
    liberi.forEach(n => {
      if (valori[n] < min) { valori[n] = min; fissi[n] = min; violato = true; }
      else if (valori[n] > max) { valori[n] = max; fissi[n] = max; violato = true; }
    });
    if (!violato) break;
  }
  return valori;
}

// ---------------------------------------------------------
// Generazione dei consensi
// ---------------------------------------------------------
// 1. Ogni area parte dal peso del clima, con una piccola oscillazione casuale
//    e un leggero vantaggio per le aree con più partiti (più offerta politica).
// 2. Dentro ogni area il consenso si divide tra i partiti con pesi casuali contenuti.
// 3. I partiti molto forti vengono compressi, si impone un minimo/massimo di sicurezza
//    e si arrotonda al decimale (somma 100,0).
function elGeneraConsensi(partiti, climaKey) {
  const clima = EL_CLIMI[climaKey] || EL_CLIMI.equilibrato;
  const perArea = {};
  EL_AREE.forEach(a => { perArea[a] = []; });
  partiti.forEach(p => { if (perArea[p.ideologia]) perArea[p.ideologia].push(p); });

  const pesoArea = {};
  let totArea = 0;
  EL_AREE.forEach(a => {
    const n = perArea[a].length;
    pesoArea[a] = n ? clima.aree[a] * Math.exp(elNormale() * 0.12) * Math.pow(n, 0.3) : 0;
    totArea += pesoArea[a];
  });

  const valori = {};
  EL_AREE.forEach(a => {
    const lista = perArea[a];
    if (!lista.length) return;
    const quotaArea = (pesoArea[a] / totArea) * 100;
    const pesi = lista.map(() => Math.exp(elNormale() * 0.5));
    const somma = pesi.reduce((s, w) => s + w, 0);
    lista.forEach((p, i) => { valori[p.nome] = quotaArea * pesi[i] / somma; });
  });

  // compressione graduale dei partiti molto forti: evita il tetto "secco" e risultati tutti uguali
  Object.keys(valori).forEach(n => {
    if (valori[n] > EL_GINOCCHIO) valori[n] = EL_GINOCCHIO + (valori[n] - EL_GINOCCHIO) * 0.4;
  });
  elLimitaQuote(valori, EL_QUOTA_MIN, EL_QUOTA_MAX);

  const nomi = Object.keys(valori);
  const decimi = elRipartisci(nomi.map(n => valori[n]), 1000);
  const out = {};
  nomi.forEach((n, i) => { out[n] = decimi[i] / 10; });
  return out;
}

// ---------------------------------------------------------
// Seggi
// ---------------------------------------------------------
// partiti:      [{nome, ...}]
// voti:         { nome: percentuale }
// coalizioni:   [{id, nome}]
// assegnazioni: { nomePartito: idCoalizione }  (assente = partito fuori coalizione)
// legge:        { tipo: 'proporzionale' | 'premio', soglia: % voti, premio: % seggi }
function elCalcolaSeggi(partiti, voti, coalizioni, assegnazioni, legge, totale) {
  totale = totale || EL_TOT_SEGGI;
  const nomi = partiti.map(p => p.nome);

  // liste in competizione: ogni coalizione e ogni partito senza coalizione
  const entita = [];
  coalizioni.forEach(c => {
    const membri = nomi.filter(n => assegnazioni[n] === c.id);
    if (membri.length) {
      entita.push({
        key: 'c:' + c.id, tipo: 'coalizione', nome: c.nome, partiti: membri,
        voti: membri.reduce((s, n) => s + voti[n], 0), seggi: 0
      });
    }
  });
  nomi.forEach(n => {
    const idc = assegnazioni[n];
    if (!idc || !coalizioni.some(c => c.id === idc)) {
      entita.push({ key: 'p:' + n, tipo: 'partito', nome: n, partiti: [n], voti: voti[n], seggi: 0 });
    }
  });
  entita.sort((a, b) => (b.voti - a.voti) || a.nome.localeCompare(b.nome));

  // base: proporzionale puro tra i singoli partiti
  const prop = elRipartisci(nomi.map(n => voti[n]), totale);
  const seggi = {};
  nomi.forEach((n, i) => { seggi[n] = prop[i]; });

  const premio = { attivo: legge.tipo === 'premio', assegnato: false, vincitore: null, extra: 0, motivo: '' };

  if (premio.attivo && entita.length) {
    const w = entita[0];
    premio.vincitore = w.nome;
    if (w.voti < legge.soglia) {
      premio.motivo = 'soglia';
    } else {
      const target = Math.round(legge.premio / 100 * totale);
      const propVincitore = w.partiti.reduce((s, n) => s + seggi[n], 0);
      if (propVincitore >= target) {
        premio.motivo = 'gia-sopra';
      } else {
        const sv = elRipartisci(w.partiti.map(n => voti[n]), target);
        w.partiti.forEach((n, i) => { seggi[n] = sv[i]; });
        const altri = nomi.filter(n => !w.partiti.includes(n));
        const sa = elRipartisci(altri.map(n => voti[n]), totale - target);
        altri.forEach((n, i) => { seggi[n] = sa[i]; });
        premio.assegnato = true;
        premio.extra = target - propVincitore;
      }
    }
  }

  entita.forEach(e => { e.seggi = e.partiti.reduce((s, n) => s + seggi[n], 0); });
  return { seggi, entita, premio };
}

// ---------------------------------------------------------
// Validazioni (restituiscono un messaggio d'errore oppure null)
// ---------------------------------------------------------
function elValidaPartiti(partiti) {
  if (partiti.length < EL_MIN_PARTITI) return `Servono almeno ${EL_MIN_PARTITI} partiti.`;
  if (partiti.length > EL_MAX_PARTITI) return `Al massimo ${EL_MAX_PARTITI} partiti.`;
  const mancanti = EL_AREE.filter(a => !partiti.some(p => p.ideologia === a));
  if (mancanti.length) {
    return 'Manca almeno un partito di: ' + mancanti.map(a => EL_NOME_AREA[a].toLowerCase()).join(', ') + '.';
  }
  return null;
}

function elValidaCoalizioni(coalizioni, assegnazioni, partiti) {
  const visti = new Set();
  for (const c of coalizioni) {
    const nome = (c.nome || '').trim();
    if (!nome) return 'Ogni coalizione deve avere un nome.';
    if (visti.has(nome.toLowerCase())) return `Il nome «${nome}» è usato da due coalizioni.`;
    visti.add(nome.toLowerCase());
    const membri = partiti.filter(p => assegnazioni[p.nome] === c.id);
    if (membri.length < 2) return `La coalizione «${nome}» ha bisogno di almeno 2 partiti (o eliminala).`;
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EL_TOT_SEGGI, EL_CLIMI, EL_AREE, EL_QUOTA_MIN, EL_QUOTA_MAX,
    elRipartisci, elGeneraConsensi, elCalcolaSeggi, elValidaPartiti, elValidaCoalizioni
  };
}

// =========================================================
// SIMULAZIONE ELETTORALE - PARTE 2: INTERFACCIA A 5 PASSI
// 1 Partiti · 2 Consensi · 3 Coalizioni · 4 Legge elettorale · 5 Scrutinio
// Alla fine i seggi passano alla modalità parlamentare esistente.
// =========================================================

const EL_PASSI = ['Partiti', 'Consensi', 'Coalizioni', 'Legge elettorale', 'Scrutinio'];
const EL_PALETTE = [
  '#d62728', '#1f77b4', '#2ca02c', '#ff7f0e', '#9467bd',
  '#17becf', '#e377c2', '#8c564b', '#bcbd22', '#7f7f7f',
  '#0b6e4f', '#b5179e', '#f4a261', '#264653', '#e63946'
];
const EL_CHIAVE_STATO = 'elezioniStato';

function elStatoIniziale() {
  return {
    passo: 1,
    partiti: [],              // [{nome, colore, ideologia}]
    clima: 'equilibrato',
    voti: null,               // { nome: percentuale } dopo la generazione
    coalizioni: [],           // [{id, nome}]
    assegnazioni: {},         // { nomePartito: idCoalizione }
    legge: { tipo: 'proporzionale', soglia: 40, premio: 55 },
    scrutinio: false,
    prossimoId: 1
  };
}

let elStato = elStatoIniziale();

function elCaricaStato() {
  try {
    const s = JSON.parse(localStorage.getItem(EL_CHIAVE_STATO));
    if (!s || !Array.isArray(s.partiti)) return null;
    const base = elStatoIniziale();
    return Object.assign(base, s, { legge: Object.assign(base.legge, s.legge || {}) });
  } catch (e) {
    return null;
  }
}

function elSalva() {
  try { localStorage.setItem(EL_CHIAVE_STATO, JSON.stringify(elStato)); } catch (e) { /* storage non disponibile */ }
}

// ---------------------------------------------------------
// Helper DOM (tutto il testo passa da textContent: niente HTML iniettato)
// ---------------------------------------------------------
function elc(tag, props, ...figli) {
  const e = document.createElement(tag);
  if (props) {
    Object.keys(props).forEach(k => {
      const v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') e[k] = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, v);
    });
  }
  figli.flat(Infinity).forEach(f => {
    if (f === null || f === undefined || f === false) return;
    e.appendChild(typeof f === 'object' ? f : document.createTextNode(String(f)));
  });
  return e;
}

function elFmt(n) {
  return (Math.round(n * 10) / 10).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function elPallino(colore) {
  const d = elc('span', { class: 'el-dot' });
  d.style.background = colore;
  return d;
}

function elBadgeArea(area) {
  return elc('span', { class: 'el-badge el-badge-' + area }, EL_NOME_AREA[area]);
}

// ---------------------------------------------------------
// Navigazione e validazione
// ---------------------------------------------------------
function elValidaPasso(n) {
  if (n === 1) return elValidaPartiti(elStato.partiti);
  if (n === 2) return elStato.voti ? null : 'Genera prima i consensi.';
  if (n === 3) return elValidaCoalizioni(elStato.coalizioni, elStato.assegnazioni, elStato.partiti);
  return null;
}

function elPassoMax() {
  if (elValidaPasso(1)) return 1;
  if (elValidaPasso(2)) return 2;
  if (elValidaPasso(3)) return 3;
  return 5;
}

function elInvalidaConsensi() {
  elStato.voti = null;
  elStato.scrutinio = false;
}

function elVaiA(n) {
  elStato.passo = Math.max(1, Math.min(5, n));
  elSalva();
  elRender();
}

// ---------------------------------------------------------
// Rendering principale
// ---------------------------------------------------------
function elRender() {
  const overlay = document.getElementById('elezioniScreen');
  const y = overlay.scrollTop;
  const panel = document.getElementById('elPanel');
  const err = document.getElementById('elErr');
  err.textContent = '';
  panel.innerHTML = '';

  // uno stato salvato incoerente non deve portare a un passo non raggiungibile
  const massimo = elPassoMax();
  if (elStato.passo > massimo) elStato.passo = massimo;
  const passo = elStato.passo;
  if (passo === 1) elRenderPartiti(panel);
  else if (passo === 2) elRenderConsensi(panel);
  else if (passo === 3) elRenderCoalizioni(panel);
  else if (passo === 4) elRenderLegge(panel);
  else elRenderScrutinio(panel);

  elRenderStepper();
  document.getElementById('elIndietro').style.visibility = passo > 1 ? 'visible' : 'hidden';
  document.getElementById('elAvanti').style.display = passo < 5 ? 'inline-block' : 'none';
  overlay.scrollTop = y;
}

function elRenderStepper() {
  const box = document.getElementById('elStepper');
  const max = elPassoMax();
  box.innerHTML = '';
  EL_PASSI.forEach((nome, i) => {
    const n = i + 1;
    let cls = 'el-passo';
    if (n === elStato.passo) cls += ' attivo';
    else if (n < elStato.passo) cls += ' fatto';
    if (n > max) cls += ' bloccato';
    box.appendChild(elc('button', {
      type: 'button', class: cls, 'aria-current': n === elStato.passo ? 'step' : false,
      onclick: () => { if (n <= elPassoMax()) elVaiA(n); }
    }, elc('span', { class: 'el-passo-n' }, String(n)), ' ', nome));
  });
}

function elTitolo(testo, sottotitolo) {
  return [elc('h2', { class: 'el-titolo' }, testo), sottotitolo ? elc('p', { class: 'el-sotto' }, sottotitolo) : null];
}

// ---------------------------------------------------------
// Passo 1 - Partiti
// ---------------------------------------------------------
function elRenderPartiti(panel) {
  const usati = elStato.partiti.map(p => p.colore.toLowerCase());
  const predef = EL_PALETTE.find(c => !usati.includes(c.toLowerCase())) || '#888888';

  const msg = elc('div', { class: 'el-errore', role: 'alert' });
  const inNome = elc('input', { type: 'text', id: 'elNome', placeholder: 'Nome partito', maxlength: '40', required: true, autocomplete: 'off' });
  const inColore = elc('input', { type: 'color', id: 'elColore', value: predef, class: 'el-colore' });
  const selIdeo = elc('select', { id: 'elIdeo', required: true },
    elc('option', { value: '', disabled: true, selected: true }, 'Scegli ideologia'),
    EL_AREE.map(a => elc('option', { value: a }, EL_NOME_AREA[a])));

  const form = elc('form', {
    class: 'el-form',
    onsubmit: (e) => {
      e.preventDefault();
      const nome = inNome.value.trim();
      msg.textContent = '';
      if (!nome) { msg.textContent = 'Inserisci un nome.'; return; }
      if (elStato.partiti.length >= EL_MAX_PARTITI) { msg.textContent = `Hai raggiunto il massimo di ${EL_MAX_PARTITI} partiti.`; return; }
      if (elStato.partiti.some(p => p.nome.toLowerCase() === nome.toLowerCase())) { msg.textContent = 'Esiste già un partito con questo nome.'; return; }
      if (!selIdeo.value) { msg.textContent = "Scegli l'orientamento ideologico."; return; }
      elStato.partiti.push({ nome, colore: inColore.value, ideologia: selIdeo.value });
      elInvalidaConsensi();
      elSalva();
      elRender();
      const nuovo = document.getElementById('elNome');
      if (nuovo) nuovo.focus();
    }
  },
    elc('label', { for: 'elNome' }, 'Nome del partito'), inNome,
    elc('label', { for: 'elColore' }, 'Colore'), inColore,
    elc('label', { for: 'elIdeo' }, 'Orientamento'), selIdeo,
    elc('button', { type: 'submit' }, '➕ Aggiungi partito'),
    msg);

  const lista = elc('div', { class: 'el-lista' });
  if (!elStato.partiti.length) {
    lista.appendChild(elc('p', { class: 'el-vuoto' }, 'Nessun partito creato. Aggiungine almeno tre, uno per ogni area politica.'));
  }
  elStato.partiti.forEach((p, i) => {
    lista.appendChild(elc('div', { class: 'el-riga' },
      elPallino(p.colore),
      elc('strong', { class: 'el-riga-nome' }, p.nome),
      elBadgeArea(p.ideologia),
      elc('button', {
        type: 'button', class: 'el-x', title: 'Rimuovi ' + p.nome, 'aria-label': 'Rimuovi ' + p.nome,
        onclick: () => {
          elStato.partiti.splice(i, 1);
          delete elStato.assegnazioni[p.nome];
          elInvalidaConsensi();
          elSalva();
          elRender();
        }
      }, '✕')));
  });

  const requisiti = elc('div', { class: 'el-requisiti' },
    elc('span', { class: elStato.partiti.length >= EL_MIN_PARTITI ? 'ok' : 'no' },
      (elStato.partiti.length >= EL_MIN_PARTITI ? '✓ ' : '✗ ') + `Partiti: ${elStato.partiti.length} (da ${EL_MIN_PARTITI} a ${EL_MAX_PARTITI})`),
    EL_AREE.map(a => {
      const ok = elStato.partiti.some(p => p.ideologia === a);
      return elc('span', { class: ok ? 'ok' : 'no' }, (ok ? '✓ ' : '✗ ') + EL_NOME_AREA[a]);
    }));

  panel.appendChild(elc('div', null,
    elTitolo('Crea i partiti', 'Servono partiti di tutte e tre le aree politiche. Le percentuali le genererà il simulatore.'),
    elc('div', { class: 'el-due-colonne' }, form, elc('div', null, lista, requisiti))));
}

// ---------------------------------------------------------
// Passo 2 - Clima politico e consensi
// ---------------------------------------------------------
function elRenderConsensi(panel) {
  const cards = Object.keys(EL_CLIMI).map(k => {
    const c = EL_CLIMI[k];
    const attivo = elStato.clima === k;
    return elc('label', { class: 'el-opzione' + (attivo ? ' scelta' : '') },
      elc('input', {
        type: 'radio', name: 'elClima', value: k, checked: attivo,
        onchange: () => { elStato.clima = k; elInvalidaConsensi(); elSalva(); elRender(); }
      }),
      elc('span', null, elc('strong', null, c.nome), elc('small', null, c.descrizione)));
  });

  const blocco = elc('div', { class: 'el-risultato' });
  if (elStato.voti) {
    const nomi = elStato.partiti.map(p => p.nome).sort((a, b) => elStato.voti[b] - elStato.voti[a]);
    const max = Math.max(...nomi.map(n => elStato.voti[n]));
    nomi.forEach(n => {
      const p = elStato.partiti.find(x => x.nome === n);
      const barra = elc('div', { class: 'el-barra-riempi' });
      barra.style.width = (elStato.voti[n] / max * 100) + '%';
      barra.style.background = p.colore;
      blocco.appendChild(elc('div', { class: 'el-barra-riga' },
        elc('span', { class: 'el-barra-nome' }, elPallino(p.colore), p.nome),
        elc('div', { class: 'el-barra' }, barra),
        elc('strong', { class: 'el-barra-val' }, elFmt(elStato.voti[n]) + '%')));
    });
    const aree = EL_AREE.map(a => {
      const tot = elStato.partiti.filter(p => p.ideologia === a).reduce((s, p) => s + elStato.voti[p.nome], 0);
      return `${EL_NOME_AREA[a]} ${elFmt(tot)}%`;
    }).join('  ·  ');
    blocco.appendChild(elc('p', { class: 'el-nota' }, 'Per area: ' + aree));
  } else {
    blocco.appendChild(elc('p', { class: 'el-vuoto' }, 'Scegli il clima politico e genera i consensi.'));
  }

  panel.appendChild(elc('div', null,
    elTitolo('Clima politico e consensi', 'Il clima orienta i risultati, senza stravolgerli: ogni generazione è diversa ma plausibile.'),
    elc('div', { class: 'el-opzioni' }, cards),
    elc('div', { class: 'el-azione' },
      elc('button', {
        type: 'button',
        onclick: () => {
          elStato.voti = elGeneraConsensi(elStato.partiti, elStato.clima);
          elStato.scrutinio = false;
          elSalva();
          elRender();
        }
      }, elStato.voti ? '🎲 Rigenera i consensi' : '🎲 Genera i consensi')),
    blocco));
}

// ---------------------------------------------------------
// Passo 3 - Coalizioni
// ---------------------------------------------------------
function elRenderCoalizioni(panel) {
  const msg = elc('div', { class: 'el-errore', role: 'alert' });
  const inNome = elc('input', { type: 'text', placeholder: 'Nome della coalizione', maxlength: '40', autocomplete: 'off' });
  const form = elc('form', {
    class: 'el-form el-form-riga',
    onsubmit: (e) => {
      e.preventDefault();
      const nome = inNome.value.trim();
      msg.textContent = '';
      if (!nome) { msg.textContent = 'Dai un nome alla coalizione.'; return; }
      if (elStato.coalizioni.some(c => c.nome.toLowerCase() === nome.toLowerCase())) { msg.textContent = 'Esiste già una coalizione con questo nome.'; return; }
      elStato.coalizioni.push({ id: 'c' + elStato.prossimoId++, nome });
      elStato.scrutinio = false;
      elSalva();
      elRender();
    }
  }, inNome, elc('button', { type: 'submit' }, '➕ Crea coalizione'));

  // carte delle coalizioni
  const carte = elStato.coalizioni.map(c => {
    const membri = elStato.partiti.filter(p => elStato.assegnazioni[p.nome] === c.id);
    const tot = membri.reduce((s, p) => s + elStato.voti[p.nome], 0);
    const nomeInput = elc('input', {
      type: 'text', value: c.nome, maxlength: '40', 'aria-label': 'Nome coalizione',
      onchange: () => { c.nome = nomeInput.value.trim() || c.nome; elStato.scrutinio = false; elSalva(); elRender(); }
    });
    return elc('div', { class: 'el-coalizione' + (membri.length < 2 ? ' incompleta' : '') },
      elc('div', { class: 'el-coalizione-testa' }, nomeInput,
        elc('button', {
          type: 'button', class: 'el-x', title: 'Elimina coalizione', 'aria-label': 'Elimina coalizione ' + c.nome,
          onclick: () => {
            elStato.coalizioni = elStato.coalizioni.filter(x => x.id !== c.id);
            Object.keys(elStato.assegnazioni).forEach(n => { if (elStato.assegnazioni[n] === c.id) delete elStato.assegnazioni[n]; });
            elStato.scrutinio = false;
            elSalva();
            elRender();
          }
        }, '✕')),
      elc('div', { class: 'el-coalizione-corpo' },
        membri.length ? membri.map(p => elc('span', { class: 'el-chip' }, elPallino(p.colore), p.nome)) : elc('em', null, 'Nessun partito assegnato'),
        elc('strong', { class: 'el-coalizione-tot' }, elFmt(tot) + '%')),
      membri.length < 2 ? elc('small', { class: 'el-errore' }, 'Servono almeno 2 partiti.') : null);
  });

  // assegnazione dei partiti
  const righe = [...elStato.partiti].sort((a, b) => elStato.voti[b.nome] - elStato.voti[a.nome]).map(p => {
    const sel = elc('select', {
      'aria-label': 'Coalizione di ' + p.nome,
      onchange: () => {
        if (sel.value) elStato.assegnazioni[p.nome] = sel.value; else delete elStato.assegnazioni[p.nome];
        elStato.scrutinio = false;
        elSalva();
        elRender();
      }
    }, elc('option', { value: '' }, 'Fuori da coalizioni'),
      elStato.coalizioni.map(c => elc('option', { value: c.id, selected: elStato.assegnazioni[p.nome] === c.id }, c.nome)));
    return elc('div', { class: 'el-riga' },
      elPallino(p.colore),
      elc('strong', { class: 'el-riga-nome' }, p.nome),
      elBadgeArea(p.ideologia),
      elc('span', { class: 'el-voto' }, elFmt(elStato.voti[p.nome]) + '%'),
      sel);
  });

  panel.appendChild(elc('div', null,
    elTitolo('Coalizioni', 'Facoltative: raggruppa i partiti in coalizioni con un nome a scelta, oppure lasciali correre da soli. Ogni partito mantiene il suo colore.'),
    form, msg,
    carte.length ? elc('div', { class: 'el-coalizioni' }, carte) : null,
    elc('div', { class: 'el-lista' }, righe)));
}

// ---------------------------------------------------------
// Passo 4 - Legge elettorale
// ---------------------------------------------------------
function elRenderLegge(panel) {
  const L = elStato.legge;
  const anteprima = elCalcolaSeggi(elStato.partiti, elStato.voti, elStato.coalizioni, elStato.assegnazioni, L);
  const primo = anteprima.entita[0];

  const campo = (etichetta, valore, min, max, chiave, aiuto) => {
    const inp = elc('input', {
      type: 'number', value: valore, min: String(min), max: String(max), step: '1', 'aria-label': etichetta,
      onchange: () => {
        let v = parseInt(inp.value, 10);
        if (isNaN(v)) v = valore;
        L[chiave] = Math.max(min, Math.min(max, v));
        elStato.scrutinio = false;
        elSalva();
        elRender();
      }
    });
    return elc('label', { class: 'el-campo' }, elc('span', null, etichetta), inp, elc('small', null, aiuto));
  };

  const target = Math.round(L.premio / 100 * EL_TOT_SEGGI);
  const parametri = L.tipo === 'premio' ? elc('div', { class: 'el-parametri' },
    campo('Soglia di voti per ottenere il premio (%)', L.soglia, 0, 70, 'soglia', '0 = il premio va sempre alla lista più votata.'),
    campo('Seggi garantiti alla lista vincente (%)', L.premio, 51, 70, 'premio', `Pari a ${target} seggi su ${EL_TOT_SEGGI}.`)) : null;

  let esito;
  if (L.tipo === 'premio') {
    const pr = anteprima.premio;
    if (pr.assegnato) esito = `Con i consensi attuali «${pr.vincitore}» (${elFmt(primo.voti)}%) otterrebbe il premio: +${pr.extra} seggi, fino a ${primo.seggi}.`;
    else if (pr.motivo === 'soglia') esito = `Con i consensi attuali la lista più votata («${pr.vincitore}», ${elFmt(primo.voti)}%) resterebbe sotto la soglia del ${L.soglia}%: nessun premio.`;
    else esito = `Con i consensi attuali «${pr.vincitore}» avrebbe già ${primo.seggi} seggi: il premio non servirebbe.`;
  } else {
    esito = `Con i consensi attuali la lista più votata («${primo.nome}», ${elFmt(primo.voti)}%) avrebbe ${primo.seggi} seggi su ${EL_TOT_SEGGI}.`;
  }

  const opzione = (tipo, titolo, testo) => elc('label', { class: 'el-opzione' + (L.tipo === tipo ? ' scelta' : '') },
    elc('input', {
      type: 'radio', name: 'elLegge', value: tipo, checked: L.tipo === tipo,
      onchange: () => { L.tipo = tipo; elStato.scrutinio = false; elSalva(); elRender(); }
    }),
    elc('span', null, elc('strong', null, titolo), elc('small', null, testo)));

  panel.appendChild(elc('div', null,
    elTitolo('Legge elettorale', 'Non c’è soglia di sbarramento: un partito resta fuori solo se i voti non bastano a ottenere un seggio.'),
    elc('div', { class: 'el-opzioni' },
      opzione('proporzionale', 'Proporzionale puro', 'Ogni partito riceve seggi in proporzione ai voti. Le coalizioni non hanno alcun premio: i seggi vanno ai singoli partiti.'),
      opzione('premio', 'Proporzionale con premio di maggioranza', 'La lista (coalizione o partito) più votata, se supera la soglia, ottiene una quota garantita di seggi. Gli altri si dividono il resto.')),
    parametri,
    elc('p', { class: 'el-nota' }, '📊 ' + esito)));
}

// ---------------------------------------------------------
// Passo 5 - Scrutinio
// ---------------------------------------------------------
function elOrdineParlamento(ris) {
  const ordineArea = { sinistra: 0, centro: 1, destra: 2 };
  return elStato.partiti
    .filter(p => ris.seggi[p.nome] > 0)
    .sort((a, b) => (ordineArea[a.ideologia] - ordineArea[b.ideologia]) || (ris.seggi[b.nome] - ris.seggi[a.nome]) || a.nome.localeCompare(b.nome));
}

function elDisegnaEmiciclo(svg, ordine, seggi, animato) {
  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  const cx = 400, cy = 400, raggioMax = 300, step = 30, righe = 5;
  let inizio = Math.PI;
  const cerchi = [];
  ordine.forEach(p => {
    const n = seggi[p.nome];
    const arco = Math.PI * (n / EL_TOT_SEGGI);
    for (let r = 0; r < righe; r++) {
      const raggio = raggioMax - r * step;
      const perRiga = Math.floor(n / righe) + (r < n % righe ? 1 : 0);
      for (let i = 0; i < perRiga; i++) {
        const a = inizio + arco * (i / perRiga);
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', cx + raggio * Math.cos(a));
        c.setAttribute('cy', cy + raggio * Math.sin(a));
        c.setAttribute('r', 5);
        c.setAttribute('fill', animato ? '#d5d8de' : p.colore);
        const t = document.createElementNS(NS, 'title');
        t.textContent = p.nome;
        c.appendChild(t);
        svg.appendChild(c);
        cerchi.push({ c, colore: p.colore, ang: a });
      }
    }
    inizio += arco;
  });
  if (animato) {
    // lo scrutinio "si accende" da sinistra a destra
    cerchi.sort((x, y) => x.ang - y.ang).forEach((o, i) => setTimeout(() => o.c.setAttribute('fill', o.colore), i * 5));
  }
}

function elRenderScrutinio(panel) {
  const L = elStato.legge;
  if (!elStato.scrutinio) {
    const nCoal = elStato.coalizioni.length;
    panel.appendChild(elc('div', { class: 'el-centro' },
      elTitolo('Tutto pronto per lo scrutinio'),
      elc('p', { class: 'el-nota' },
        `${elStato.partiti.length} partiti · ${nCoal} ${nCoal === 1 ? 'coalizione' : 'coalizioni'} · clima «${EL_CLIMI[elStato.clima].nome}» · ` +
        (L.tipo === 'premio' ? `premio di maggioranza (soglia ${L.soglia}%, ${L.premio}% dei seggi)` : 'proporzionale puro')),
      elc('button', {
        type: 'button', class: 'el-grande',
        onclick: () => { elAnimaProssimo = true; elStato.scrutinio = true; elSalva(); elRender(); }
      }, '🗳️ Avvia lo scrutinio')));
    return;
  }

  const ris = elCalcolaSeggi(elStato.partiti, elStato.voti, elStato.coalizioni, elStato.assegnazioni, L);
  const ordine = elOrdineParlamento(ris);
  const fuori = elStato.partiti.filter(p => ris.seggi[p.nome] === 0);

  // messaggi su premio e maggioranza
  const pr = ris.premio;
  let notaPremio = null;
  if (pr.attivo) {
    const w = ris.entita.find(e => e.nome === pr.vincitore);
    if (pr.assegnato) notaPremio = `🏆 Premio di maggioranza a «${pr.vincitore}»: +${pr.extra} seggi, per un totale di ${w.seggi}.`;
    else if (pr.motivo === 'soglia') notaPremio = `Nessun premio: «${pr.vincitore}» ha il ${elFmt(w.voti)}% dei voti, sotto la soglia del ${L.soglia}%.`;
    else notaPremio = `Nessun premio necessario: «${pr.vincitore}» ha già ${w.seggi} seggi.`;
  }
  const maggioranza = ris.entita.find(e => e.seggi >= EL_SOGLIA_MAGGIORANZA);
  const notaMagg = maggioranza
    ? `✅ «${maggioranza.nome}» ha la maggioranza assoluta con ${maggioranza.seggi} seggi (ne servono ${EL_SOGLIA_MAGGIORANZA}).`
    : `⚠️ Nessuna lista ha la maggioranza assoluta (${EL_SOGLIA_MAGGIORANZA} seggi): servirà una coalizione di governo.`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 90 800 330');
  svg.setAttribute('class', 'el-emiciclo');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Composizione del nuovo Parlamento');

  // tabella partiti
  const righeP = [...elStato.partiti]
    .sort((a, b) => (ris.seggi[b.nome] - ris.seggi[a.nome]) || (elStato.voti[b.nome] - elStato.voti[a.nome]))
    .map(p => {
      const idc = elStato.assegnazioni[p.nome];
      const coal = elStato.coalizioni.find(c => c.id === idc);
      return elc('tr', null,
        elc('td', null, elPallino(p.colore), p.nome),
        elc('td', null, elBadgeArea(p.ideologia)),
        elc('td', { class: 'el-dim' }, coal ? coal.nome : '—'),
        elc('td', { class: 'num' }, elFmt(elStato.voti[p.nome]) + '%'),
        elc('td', { class: 'num' }, elc('strong', null, String(ris.seggi[p.nome]))));
    });

  // tabella liste/coalizioni
  const righeE = ris.entita.map(e => elc('tr', null,
    elc('td', null, elc('strong', null, e.nome), elc('small', { class: 'el-dim' }, e.tipo === 'coalizione' ? ' coalizione' : ' senza coalizione')),
    elc('td', { class: 'num' }, elFmt(e.voti) + '%'),
    elc('td', { class: 'num' }, elc('strong', null, String(e.seggi))),
    elc('td', { class: 'num' }, e.seggi >= EL_SOGLIA_MAGGIORANZA ? '✅' : '')));

  panel.appendChild(elc('div', null,
    elTitolo('Risultati dello scrutinio'),
    elc('div', { class: 'el-metriche' },
      elc('div', { class: 'el-metrica' }, elc('span', null, 'Seggi totali'), elc('strong', null, String(EL_TOT_SEGGI))),
      elc('div', { class: 'el-metrica' }, elc('span', null, 'Maggioranza assoluta'), elc('strong', null, String(EL_SOGLIA_MAGGIORANZA))),
      elc('div', { class: 'el-metrica' }, elc('span', null, 'Legge elettorale'), elc('strong', null, L.tipo === 'premio' ? 'Con premio' : 'Proporzionale'))),
    svg,
    notaPremio ? elc('p', { class: 'el-nota' }, notaPremio) : null,
    elc('p', { class: 'el-nota' }, notaMagg),
    elc('h3', { class: 'el-sottotitolo' }, 'Partiti'),
    elc('div', { class: 'el-scroll' }, elc('table', { class: 'el-tabella el-tabella-partiti' },
      elc('thead', null, elc('tr', null, elc('th', null, 'Partito'), elc('th', null, 'Area'), elc('th', null, 'Coalizione'), elc('th', { class: 'num' }, 'Voti'), elc('th', { class: 'num' }, 'Seggi'))),
      elc('tbody', null, righeP))),
    elc('h3', { class: 'el-sottotitolo' }, 'Coalizioni e liste'),
    elc('div', { class: 'el-scroll' }, elc('table', { class: 'el-tabella' },
      elc('thead', null, elc('tr', null, elc('th', null, 'Lista'), elc('th', { class: 'num' }, 'Voti'), elc('th', { class: 'num' }, 'Seggi'), elc('th', { class: 'num' }, ''))),
      elc('tbody', null, righeE))),
    fuori.length ? elc('p', { class: 'el-nota' }, 'Non entrano in Parlamento: ' + fuori.map(p => p.nome).join(', ') + '.') : null,
    elc('div', { class: 'el-azione' },
      partiti.length ? elc('p', { class: 'el-avviso' }, '⚠️ Il Parlamento attuale verrà sostituito da quello appena eletto.') : null,
      elc('button', { type: 'button', class: 'el-grande', onclick: () => elTrasferisci(ris) }, '🏛️ Passa al Parlamento'))));

  elDisegnaEmiciclo(svg, ordine, ris.seggi, elAnimaProssimo);
  elAnimaProssimo = false;
}

let elAnimaProssimo = false;

// ---------------------------------------------------------
// Passaggio alla modalità parlamentare
// ---------------------------------------------------------
function elTrasferisci(ris) {
  const ordine = elOrdineParlamento(ris);
  const maggioranza = ris.entita.find(e => e.seggi >= EL_SOGLIA_MAGGIORANZA);
  const primi = ris.entita[0];

  // i seggi diventano percentuali (seggi / 4: divisione esatta, quindi somma sempre 100)
  partiti = ordine.map(p => ({
    nome: p.nome,
    colore: p.colore,
    ideologia: p.ideologia,
    percentuale: ris.seggi[p.nome] / (EL_TOT_SEGGI / 100)
  }));
  presidente = null;
  presidenteConsiglio = null;
  coalizioneMaggioranza = [];

  try { localStorage.removeItem(EL_CHIAVE_STATO); } catch (e) { /* ignora */ }
  elStato = elStatoIniziale();

  salvaPartiti();
  entraNelParlamento();
  updateTitle();
  aggiornaPresidente();
  aggiornaPdC();

  const riga = maggioranza
    ? `✅ <strong>${escapeHtml(maggioranza.nome)}</strong> ha la maggioranza assoluta con ${maggioranza.seggi} seggi.`
    : `⚠️ Nessuna lista ha la maggioranza assoluta (${EL_SOGLIA_MAGGIORANZA} seggi). La lista più forte è <strong>${escapeHtml(primi.nome)}</strong> con ${primi.seggi} seggi: servirà una coalizione di governo.`;
  mostraRisultato(
    '🗳️ Nuovo Parlamento eletto',
    `${riga}<p>Ora puoi eleggere il Presidente del Parlamento, formare la maggioranza di governo e nominare il Presidente del Consiglio dalla colonna Azioni.</p>`
  );
}

// ---------------------------------------------------------
// Apertura / chiusura della schermata
// ---------------------------------------------------------
function apriSimulazioneElezioni() {
  document.body.classList.remove('landing-active');
  document.body.classList.add('elezioni-active');
  const landing = document.getElementById('landingScreen');
  if (landing) landing.style.display = 'none';
  try { localStorage.setItem('schermataAttiva', 'elezioni'); } catch (e) { /* ignora */ }
  elRender();
}

function elTornaAllaHome() {
  document.body.classList.remove('elezioni-active');
  document.body.classList.add('landing-active');
  try { localStorage.setItem('schermataAttiva', 'iniziale'); } catch (e) { /* ignora */ }
  const landing = document.getElementById('landingScreen');
  if (landing) landing.style.display = 'flex';
}

function elInit() {
  const caricato = elCaricaStato();
  if (caricato) elStato = caricato;

  document.getElementById('elHome').addEventListener('click', elTornaAllaHome);
  document.getElementById('elReset').addEventListener('click', () => {
    if (!confirm('Ricominciare da capo? Partiti, consensi e coalizioni di questa simulazione andranno persi.')) return;
    elStato = elStatoIniziale();
    elSalva();
    elRender();
  });
  document.getElementById('elIndietro').addEventListener('click', () => elVaiA(elStato.passo - 1));
  document.getElementById('elAvanti').addEventListener('click', () => {
    const errore = elValidaPasso(elStato.passo);
    if (errore) { document.getElementById('elErr').textContent = errore; return; }
    elVaiA(elStato.passo + 1);
  });

  // ripristino dopo un ricaricamento della pagina
  let schermata = null;
  try { schermata = localStorage.getItem('schermataAttiva'); } catch (e) { /* ignora */ }
  if (schermata === 'elezioni') apriSimulazioneElezioni();
}

if (typeof document !== 'undefined') {
  elInit();
}