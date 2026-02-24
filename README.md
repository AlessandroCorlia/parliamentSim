# Parlamento Interattivo
Questo progetto permette di creare un "Parlamento fai da te".

---

## Funzionalità principali

- Aggiungi partiti con:
  - Nome
  - Colore
  - Ideologia (Sinistra, Centro, Destra)
  - Percentuale di seggi
- Visualizza la **composizione del Parlamento** come semicerchio di pallini colorati
- **Presidente del Parlamento**:
  - Pallino centrato in basso
  - Colore del partito con più seggi
  - In caso di parità, viene scelto casualmente
- **Governo**:
  - Presidente del Consiglio (PCM) posizionato al centro sopra il Presidente del Parlamento
  - 6 Ministri distribuiti in fila sopra il PCM:
    - Colore scelto casualmente tra i partiti con più voti della stessa ideologia
- **Gestione dei partiti**:
  - Modifica i dati di un partito già inserito tramite un form a scomparsa
  - Eliminazione singola dei partiti
  - Reset totale del Parlamento
- Il form di inserimento viene **bloccato automaticamente** quando il Parlamento raggiunge il 100% dei seggi, per evitare overbooking

---

## Come usare l’applicazione

1. Apri il file `index.html` in un browser moderno (Chrome, Firefox, Edge).
2. Inserisci i dati dei partiti nel form:
   - Nome del partito
   - Colore
   - Ideologia
   - Percentuale di seggi
3. Premi **"Eleggi Partito"** per aggiungerlo al Parlamento.
4. La legenda a sinistra mostra tutti i partiti con:
   - Numero di seggi
   - Colore e ideologia
   - Pulsanti per **modifica** e **elimina**
5. Quando vuoi modificare un partito:
   - Clicca sull’icona della **matita** nella legenda
   - Si aprirà un form a scomparsa per aggiornare i dati
   - Dopo la modifica, il Parlamento viene aggiornato automaticamente
6. Per resettare tutto:
   - Premi **"Sciogli Parlamento"**
   - Conferma la finestra di dialogo

---

## Requisiti

- Browser moderno con supporto a **ES6** e **SVG**
- Nessun server richiesto: tutto funziona in locale

---
## Note aggiuntive

- L’applicazione salva i partiti nel **LocalStorage**, quindi i dati rimangono salvati anche dopo il refresh della pagina.