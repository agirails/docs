# AI Assistant Feature Roadmap

## Current State (Dec 2025)

AI Assistant je funkcionalan s:
- Streaming responses (Groq llama-3.3-70b)
- RAG preko Upstash Vector
- Markdown formatting
- Docked/floating UI modes
- Globalno dostupan kroz cijelu dokumentaciju

---

## Phase 2: Contextual Screen Awareness (PARKED)

**Status:** Odgođeno - preskupo za current phase

### Opis
AI Assistant koji "vidi" što korisnik gleda na ekranu i može kontekstualno pojasniti.

### Planirane funkcionalnosti

1. **Playground Context**
   - Vidi stanje transakcija (state, amount, parties)
   - Vidi agente na canvasu
   - Vidi generirani kod
   - Može pomoći debug-irati na temelju stvarnog stanja

2. **Documentation Context**
   - Zna koja stranica/sekcija je otvorena
   - Može referencirati okolni sadržaj
   - "Explain this code block" na bilo kojem primjeru

3. **Canvas Context**
   - Vidi node-ove i edge-ove
   - Pomaže dizajnirati agent workflow
   - Sugestije za sljedeće korake

### Tehničke opcije za smanjenje troška

| Opcija | Opis | Ušteda tokena |
|--------|------|---------------|
| **Tiered models** | 8b za simple, 70b za complex | ~60% |
| **Compressed context** | Summary umjesto full state | ~80% |
| **On-demand** | User mora kliknuti "Share screen" | ~90% |
| **Caching** | Cache frequent queries | ~30% |
| **Local embedding** | Ollama za dev | 100% dev costs |

### Implementacijski plan (kad budemo spremni)

```
1. Omogućiti playground context u api/chat.ts (ukloniti komentar)
2. Implementirati context compression (max 100 tokena)
3. Dodati "Share context" toggle u UI
4. A/B testirati: s kontekstom vs bez
5. Mjeriti cost per conversation
```

### Postojeći kod (spreman za aktivaciju)

- `AIAssistant.tsx` - već ima `playgroundContext` state i listener
- `usePlaygroundContext.ts` - hook za dohvat konteksta
- `api/chat.ts` - `formatPlaygroundContext()` funkcija postoji, samo je disabled

### Cost estimate

Trenutni cost bez konteksta: ~$0.001 per message
S punim kontekstom: ~$0.003-0.005 per message (3-5x više)

---

## Phase 3: Multi-modal (Future)

- Screenshot analysis
- Voice input
- Code execution u sandboxu

---

*Last updated: Dec 2025*
