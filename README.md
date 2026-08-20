# 3D World Interactive Project

Questo progetto risolve tutti gli errori incontrati precedentemente:
1. **Risoltà l'eccezione CapsuleGeometry**: Utilizza Three.js r160 con relativo fallback automatico.
2. **Eliminati gli errori 404**: Tutte le texture per il terreno e l'illuminazione vengono generate programmaticamente via codice JS e HTML5 Canvas.
3. **Interazione Click Attiva**: Implementato Raycaster e Pointer Events per selezionare, evidenziare e far interagire tutti gli NPC nella scena 3D.

## Struttura del Progetto:
- `index.html`: File HTML principale con importazioni via CDN e interfaccia UI Overlay.
- `style.css`: Stili per l'interfaccia grafica HUD, schede di dialogo e notifiche.
- `game.js`: Logica completa 3D Three.js, modelli, fotocamera, illuminazione e sistema di click.

## Come eseguire:
Apri semplicemente il file `index.html` in un qualsiasi browser moderno (Chrome, Firefox, Edge, Safari) oppure servilo tramite un server locale (es. Live Server su VS Code).
