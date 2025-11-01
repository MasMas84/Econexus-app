# EcoNexus Chatbot Webapp

Een moderne, single-page webapplicatie voor de EcoNexus chatbot. De interface is volledig client-side en werkt zonder backend. Gebruikers kunnen hun vragen stellen en EcoNexus reageert met contextuele duurzaamheidsadviezen.

## Functies

- 🌿 Frisse en toegankelijke interface in EcoNexus-stijl
- 🗨️ Conversatiegeschiedenis met tijdstempels
- ⚡ Directe antwoorden op basis van thema's als energie, mobiliteit en lifestyle
- 🔐 Directe integratie met de Google Gemini API via een configureerbaar sleutelbestand
- 🔄 "Start fris gesprek"-knop om het gesprek te resetten
- 📱 Volledig responsief ontwerp voor desktop, tablet en mobiel

## Projectstructuur

```
index.html   # Hoofdpagina met structuur en semantiek
styles.css   # Thema, layout en component-styling
script.js    # Chatlogica en dynamische interacties
config.js    # Privéconfiguratie met je Google Gemini API-sleutel
```

## Lokale installatie en gebruik

1. Clone of download de repository.
2. Open `config.js` en vul je Google Gemini API-sleutel in plaats van `VUL_HIER_JE_GEMINI_API_SLEUTEL_IN`.
3. Open `index.html` in je browser naar keuze.
4. Start een gesprek met EcoNexus. Zonder sleutel ontvang je offline tips, maar met Gemini krijg je realtime AI-adviezen.

> 💡 Deel je sleutel nooit publiekelijk en commit hem niet naar versiebeheer. Voor productie-implementaties is een beveiligde backend-proxy aan te raden om je sleutel te beschermen.

Wil je de app hosten? Zet de bestanden online via een statische host zoals GitHub Pages, Netlify of Vercel.
