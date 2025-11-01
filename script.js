const conversationEl = document.getElementById('conversation');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message');
const newChatButton = document.getElementById('new-chat');
const messageTemplate = document.getElementById('message-template');
const connectionStatusEl = document.getElementById('connection-status');
const connectionStatusLabel = connectionStatusEl?.querySelector('.status__label');

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
const SYSTEM_PROMPT =
  'Je bent EcoNexus, een Nederlandstalige klimaat- en duurzaamheidsassistent. Geef concrete, empathische en uitvoerbare adviezen over groene innovaties, beleid en lifestyle. Houd antwoorden beknopt maar informatief en gebruik Nederlands als primaire taal.';

const geminiApiKey = (window.ECONEXUS_CONFIG?.geminiApiKey ?? '').trim();

const ecoResponses = [
  {
    keywords: ['energie', 'zonne', 'wind'],
    reply:
      'Voor een duurzame energiemix kun je starten met een energie-audit van je woning of kantoor. Combineer zonnepanelen met slimme laadpalen en kies voor een dynamisch energiecontract dat groene stroom garandeert. EcoNexus helpt je om investeringen te prioriteren en subsidieprogramma\'s te vinden.'
  },
  {
    keywords: ['lifestyle', 'eten', 'voeding', 'zero waste', 'plastic'],
    reply:
      'Kies voor seizoensgebonden voeding, verminder voedselverspilling en kies verpakkingsvrije winkels. Stel een persoonlijk actieplan op met drie haalbare gewoontes per week en evalueer maandelijks je voortgang.'
  },
  {
    keywords: ['bedrijf', 'strategie', 'rapportage', 'scope'],
    reply:
      'Voor organisaties raad ik aan om een CO₂-baseline te berekenen en doelstellingen te koppelen aan het Science Based Targets initiative. Integreer scope 1, 2 én 3 emissies in je rapportages en gebruik de EcoNexus toolkit voor stakeholdercommunicatie.'
  },
  {
    keywords: ['klimaat', 'data', 'statistiek', 'impact'],
    reply:
      'Recente IPCC-data tonen aan dat snelle decarbonisatie in de komende vijf jaar cruciaal is. Focus op elektrificatie, circulariteit en natuurherstel. EcoNexus kan grafieken genereren en scenario\'s modelleren voor je projecten.'
  },
  {
    keywords: ['mobiliteit', 'reizen', 'transport'],
    reply:
      'Stap over op gedeelde mobiliteit, stimuleer fietsgebruik met kilometervergoedingen en kies voor elektrische vlootplanning. Gebruik realtime data om routes te optimaliseren en koppel resultaten aan je duurzaamheidsdoelen.'
  }
];

function createGeminiError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function updateConnectionStatus(state) {
  if (!connectionStatusEl) return;
  connectionStatusEl.classList.remove('status--ready', 'status--warning', 'status--error');
  connectionStatusEl.classList.add(`status--${state}`);

  if (connectionStatusLabel) {
    const labelMap = {
      ready: 'Verbonden met Gemini',
      warning: 'API-sleutel ontbreekt',
      error: 'Verbindingsfout'
    };
    connectionStatusLabel.textContent = labelMap[state] || '';
  }
}

function createMessageElement({ author, text, type, isPending = false }) {
  const messageEl = messageTemplate.content.firstElementChild.cloneNode(true);
  const avatarEl = messageEl.querySelector('.message__avatar');
  const authorEl = messageEl.querySelector('.message__author');
  const timeEl = messageEl.querySelector('.message__time');
  const textEl = messageEl.querySelector('.message__text');

  messageEl.classList.add(type);
  if (isPending) {
    messageEl.classList.add('message--pending');
  }

  authorEl.textContent = author;
  textEl.textContent = text;
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit'
  });
  timeEl.dateTime = now.toISOString();

  avatarEl.textContent = type === 'eco' ? 'EN' : 'JIJ';

  return messageEl;
}

function appendMessage(message) {
  const messageEl = createMessageElement(message);
  conversationEl.append(messageEl);
  conversationEl.scrollTo({ top: conversationEl.scrollHeight, behavior: 'smooth' });
  return messageEl;
}

function updateMessageText(messageEl, text) {
  if (!messageEl) return;
  const textEl = messageEl.querySelector('.message__text');
  if (textEl) {
    textEl.textContent = text;
  }
}

function setMessagePending(messageEl, isPending) {
  if (!messageEl) return;
  messageEl.classList.toggle('message--pending', isPending);
}

function ecoReply(text) {
  const cleaned = text.toLowerCase();
  const matched = ecoResponses.find((item) =>
    item.keywords.some((keyword) => cleaned.includes(keyword))
  );

  if (matched) {
    return matched.reply;
  }

  return (
    'Dank je voor je vraag! EcoNexus kan je helpen met duurzame strategieën, klimaatdata en praktische tips. Geef gerust extra context zodat ik gerichte aanbevelingen kan doen.'
  );
}

async function callGemini(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(geminiApiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nGebruikersvraag: ${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 512
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errorPayload = await response.json();
        message = errorPayload?.error?.message ?? message;
      } catch (error) {
        // ignore JSON parse errors
      }
      throw createGeminiError('api', `Gemini API-fout: ${message}`);
    }

    const data = await response.json();
    const candidates = data?.candidates;
    const parts = candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts
          .map((part) => part?.text ?? '')
          .join('')
          .trim()
      : '';

    if (!text) {
      throw createGeminiError('empty', 'Gemini gaf een leeg antwoord.');
    }

    return text;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createGeminiError('timeout', 'De aanvraag naar Gemini duurde te lang.', error);
    }
    if (error.code) {
      throw error;
    }
    throw createGeminiError('network', 'Er is een netwerkfout opgetreden bij het verbinden met Gemini.', error);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateGeminiReply(prompt) {
  if (!geminiApiKey) {
    throw createGeminiError('missing-key', 'Er is geen Google Gemini API-sleutel ingesteld.');
  }

  return callGemini(prompt);
}

function handleGeminiError(error, userInput) {
  console.error('Gemini API-fout', error);

  const fallback = ecoReply(userInput);

  switch (error.code) {
    case 'missing-key':
      updateConnectionStatus('warning');
      return (
        'Ik heb je Google Gemini API-sleutel nodig om echte antwoorden te geven. Vul je sleutel in het bestand config.js in en laad de pagina opnieuw. Tot die tijd alvast een duurzame tip: ' +
        fallback
      );
    case 'timeout':
      updateConnectionStatus('error');
      return (
        'De verbinding met Gemini duurde te lang. Probeer het nog eens. Hier is intussen een duurzame suggestie: ' +
        fallback
      );
    case 'network':
      updateConnectionStatus('error');
      return (
        'Ik kon geen contact maken met Gemini vanwege een netwerkfout. Controleer je verbinding en probeer het later opnieuw. Intussen: ' +
        fallback
      );
    case 'api':
    case 'empty':
      updateConnectionStatus('error');
      return (
        `${error.message} Ik geef je voorlopig een offline EcoNexus-tip: ${fallback}`
      );
    default:
      updateConnectionStatus('error');
      return (
        'Er is een onverwachte fout opgetreden. Probeer het opnieuw of ververs de pagina. Hier is alvast een duurzame suggestie: ' +
        fallback
      );
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const value = messageInput.value.trim();
  if (!value) {
    return;
  }

  appendMessage({ author: 'Jij', text: value, type: 'user' });
  chatForm.reset();
  messageInput.focus();

  const pendingMessageEl = appendMessage({
    author: 'EcoNexus',
    text: 'EcoNexus formuleert een antwoord...',
    type: 'eco',
    isPending: true
  });
  setMessagePending(pendingMessageEl, true);

  try {
    const reply = await generateGeminiReply(value);
    updateMessageText(pendingMessageEl, reply);
    setMessagePending(pendingMessageEl, false);
    updateConnectionStatus('ready');
  } catch (error) {
    const fallback = handleGeminiError(error, value);
    updateMessageText(pendingMessageEl, fallback);
    setMessagePending(pendingMessageEl, false);
  }
}

function resetConversation() {
  conversationEl.innerHTML = '';
  appendMessage({
    author: 'EcoNexus',
    text: 'Hallo! Ik ben EcoNexus, je duurzame assistent. Vraag me alles over groene innovaties, klimaatbeleid of bewuste lifestyle-keuzes.',
    type: 'eco'
  });
}

function registerEventListeners() {
  if (chatForm) {
    chatForm.addEventListener('submit', handleSubmit);
  }

  if (newChatButton) {
    newChatButton.addEventListener('click', resetConversation);
  }
}

registerEventListeners();
resetConversation();

if (geminiApiKey) {
  updateConnectionStatus('ready');
} else {
  updateConnectionStatus('warning');
}
