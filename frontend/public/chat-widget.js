(function () {
  const SCRIPT_TAG = document.currentScript;
  const BOT_ID = SCRIPT_TAG.getAttribute('data-bot-id');
  const API_URL = SCRIPT_TAG.getAttribute('data-api-url') || 'http://localhost:8000/chat';
  const THEME = SCRIPT_TAG.getAttribute('data-theme') || 'dark'; // 'dark' or 'light'
  const ACCENT = SCRIPT_TAG.getAttribute('data-accent') || '#6366f1';
  const TITLE = SCRIPT_TAG.getAttribute('data-title') || 'AI Assistant';
  const WELCOME = SCRIPT_TAG.getAttribute('data-welcome') || 'Hello! How can I help you today?';

  if (!BOT_ID) {
    console.error('Chat Widget: data-bot-id attribute is missing.');
    return;
  }

  // --- Theme Colors ---
  const themes = {
    dark: {
      bg: '#0f172a',
      bgSecondary: '#1e293b',
      bgChat: '#0f172a',
      border: 'rgba(148, 163, 184, 0.1)',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      userBubble: ACCENT,
      userBubbleText: '#ffffff',
      botBubble: '#1e293b',
      botBubbleText: '#e2e8f0',
      inputBg: '#1e293b',
      inputBorder: 'rgba(148, 163, 184, 0.15)',
      inputText: '#f1f5f9',
      shadow: 'rgba(0, 0, 0, 0.4)',
      headerGradient: `linear-gradient(135deg, ${ACCENT}, ${adjustColor(ACCENT, -30)})`,
    },
    light: {
      bg: '#ffffff',
      bgSecondary: '#f8fafc',
      bgChat: '#f8fafc',
      border: 'rgba(0, 0, 0, 0.08)',
      text: '#0f172a',
      textMuted: '#64748b',
      userBubble: ACCENT,
      userBubbleText: '#ffffff',
      botBubble: '#f1f5f9',
      botBubbleText: '#1e293b',
      inputBg: '#ffffff',
      inputBorder: 'rgba(0, 0, 0, 0.12)',
      inputText: '#0f172a',
      shadow: 'rgba(0, 0, 0, 0.12)',
      headerGradient: `linear-gradient(135deg, ${ACCENT}, ${adjustColor(ACCENT, -30)})`,
    }
  };

  function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    let r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    let g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    let b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  const t = themes[THEME] || themes.dark;

  // --- Styles ---
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .bcw-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .bcw-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* --- Floating Button --- */
    .bcw-toggle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background: ${t.headerGradient};
      box-shadow: 0 8px 32px ${t.shadow}, 0 0 0 0 ${ACCENT}40;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: bcw-pulse 2s ease-in-out infinite;
    }
    .bcw-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 40px ${t.shadow};
    }
    .bcw-toggle.bcw-open {
      animation: none;
      transform: rotate(0deg);
    }
    .bcw-toggle svg {
      width: 28px;
      height: 28px;
      color: white;
      transition: transform 0.3s ease;
    }
    .bcw-toggle.bcw-open svg.bcw-icon-chat { display: none; }
    .bcw-toggle.bcw-open svg.bcw-icon-close { display: block; }
    .bcw-toggle:not(.bcw-open) svg.bcw-icon-close { display: none; }

    @keyframes bcw-pulse {
      0%, 100% { box-shadow: 0 8px 32px ${t.shadow}, 0 0 0 0 ${ACCENT}40; }
      50% { box-shadow: 0 8px 32px ${t.shadow}, 0 0 0 12px ${ACCENT}00; }
    }

    /* --- Chat Window --- */
    .bcw-window {
      position: absolute;
      bottom: 76px;
      right: 0;
      width: 380px;
      height: 560px;
      background: ${t.bg};
      border-radius: 20px;
      box-shadow: 0 25px 60px -12px ${t.shadow};
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid ${t.border};
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .bcw-window.bcw-visible {
      display: flex;
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    /* --- Header --- */
    .bcw-header {
      background: ${t.headerGradient};
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      overflow: hidden;
    }
    .bcw-header::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 100%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .bcw-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bcw-avatar svg {
      width: 22px;
      height: 22px;
      color: white;
    }
    .bcw-header-info {
      flex: 1;
    }
    .bcw-header-title {
      color: white;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: -0.01em;
    }
    .bcw-header-status {
      color: rgba(255,255,255,0.7);
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .bcw-status-dot {
      width: 7px;
      height: 7px;
      background: #34d399;
      border-radius: 50%;
      animation: bcw-glow 2s ease-in-out infinite;
    }
    @keyframes bcw-glow {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .bcw-close-btn {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      z-index: 1;
    }
    .bcw-close-btn:hover {
      background: rgba(255,255,255,0.25);
    }
    .bcw-close-btn svg { width: 16px; height: 16px; }

    /* --- Messages --- */
    .bcw-messages {
      flex: 1;
      padding: 20px 16px;
      overflow-y: auto;
      background: ${t.bgChat};
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }
    .bcw-messages::-webkit-scrollbar {
      width: 4px;
    }
    .bcw-messages::-webkit-scrollbar-thumb {
      background: ${t.border};
      border-radius: 4px;
    }

    .bcw-msg {
      max-width: 82%;
      padding: 12px 16px;
      font-size: 13.5px;
      line-height: 1.55;
      word-wrap: break-word;
      animation: bcw-fadeIn 0.25s ease;
    }
    .bcw-msg-bot {
      align-self: flex-start;
      background: ${t.botBubble};
      color: ${t.botBubbleText};
      border-radius: 18px 18px 18px 6px;
      border: 1px solid ${t.border};
    }
    .bcw-msg-user {
      align-self: flex-end;
      background: ${t.userBubble};
      color: ${t.userBubbleText};
      border-radius: 18px 18px 6px 18px;
      box-shadow: 0 2px 12px ${ACCENT}30;
    }

    @keyframes bcw-fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* --- Typing Indicator --- */
    .bcw-typing {
      align-self: flex-start;
      background: ${t.botBubble};
      border: 1px solid ${t.border};
      border-radius: 18px 18px 18px 6px;
      padding: 14px 20px;
      display: none;
      gap: 5px;
      align-items: center;
    }
    .bcw-typing.bcw-active { display: flex; }
    .bcw-typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${t.textMuted};
      animation: bcw-bounce 1.2s ease-in-out infinite;
    }
    .bcw-typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .bcw-typing-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bcw-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    /* --- Input Area --- */
    .bcw-input-area {
      padding: 14px 16px;
      border-top: 1px solid ${t.border};
      display: flex;
      gap: 10px;
      align-items: center;
      background: ${t.bgSecondary};
    }
    .bcw-input {
      flex: 1;
      padding: 11px 16px;
      border: 1.5px solid ${t.inputBorder};
      border-radius: 14px;
      outline: none;
      font-size: 13.5px;
      background: ${t.inputBg};
      color: ${t.inputText};
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .bcw-input::placeholder { color: ${t.textMuted}; }
    .bcw-input:focus {
      border-color: ${ACCENT};
      box-shadow: 0 0 0 3px ${ACCENT}20;
    }
    .bcw-send {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      border: none;
      background: ${t.headerGradient};
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .bcw-send:hover { transform: scale(1.05); box-shadow: 0 4px 16px ${ACCENT}40; }
    .bcw-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
    .bcw-send svg { width: 18px; height: 18px; }

    /* --- Powered By --- */
    .bcw-powered {
      text-align: center;
      padding: 8px;
      font-size: 10px;
      color: ${t.textMuted};
      background: ${t.bgSecondary};
      border-top: 1px solid ${t.border};
      letter-spacing: 0.02em;
    }
    .bcw-powered a {
      color: ${ACCENT};
      text-decoration: none;
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 420px) {
      .bcw-window {
        width: calc(100vw - 32px);
        height: calc(100vh - 120px);
        right: -8px;
        bottom: 72px;
        border-radius: 16px;
      }
    }
    `;

  // --- SVG Icons ---
  const ICON_CHAT = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>`;
  const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
  const ICON_BOT = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>`;
  const ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>`;
  const ICON_X = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

  // --- Build HTML ---
  const container = document.createElement('div');
  container.className = 'bcw-container';
  container.innerHTML = `
    <style>${styles}</style>
    <div class="bcw-window" id="bcw-window">
      <div class="bcw-header">
        <div class="bcw-avatar">${ICON_BOT}</div>
        <div class="bcw-header-info">
          <div class="bcw-header-title">${TITLE}</div>
          <div class="bcw-header-status"><span class="bcw-status-dot"></span> Online</div>
        </div>
        <button class="bcw-close-btn" id="bcw-close">${ICON_X}</button>
      </div>
      <div class="bcw-messages" id="bcw-messages">
        <div class="bcw-msg bcw-msg-bot">${WELCOME}</div>
      </div>
      <div class="bcw-typing" id="bcw-typing">
        <div class="bcw-typing-dot"></div>
        <div class="bcw-typing-dot"></div>
        <div class="bcw-typing-dot"></div>
      </div>
      <div class="bcw-input-area">
        <input type="text" class="bcw-input" id="bcw-input" placeholder="Type a message..." autocomplete="off" />
        <button class="bcw-send" id="bcw-send">${ICON_SEND}</button>
      </div>
      <div class="bcw-powered">Powered by <a href="#">BotCraft</a></div>
    </div>
    <button class="bcw-toggle" id="bcw-toggle">
      <span class="bcw-icon-chat">${ICON_CHAT}</span>
      <span class="bcw-icon-close" style="display:none">${ICON_CLOSE}</span>
    </button>
    `;

  document.body.appendChild(container);

  // --- Logic ---
  const windowEl = document.getElementById('bcw-window');
  const toggleBtn = document.getElementById('bcw-toggle');
  const closeBtn = document.getElementById('bcw-close');
  const inputEl = document.getElementById('bcw-input');
  const sendBtn = document.getElementById('bcw-send');
  const messagesEl = document.getElementById('bcw-messages');
  const typingEl = document.getElementById('bcw-typing');
  const chatIcon = toggleBtn.querySelector('.bcw-icon-chat');
  const closeIcon = toggleBtn.querySelector('.bcw-icon-close');

  let isOpen = false;

  function toggleWindow() {
    isOpen = !isOpen;
    if (isOpen) {
      windowEl.style.display = 'flex';
      requestAnimationFrame(() => windowEl.classList.add('bcw-visible'));
      toggleBtn.classList.add('bcw-open');
      chatIcon.style.display = 'none';
      closeIcon.style.display = 'block';
      inputEl.focus();
    } else {
      windowEl.classList.remove('bcw-visible');
      toggleBtn.classList.remove('bcw-open');
      chatIcon.style.display = 'block';
      closeIcon.style.display = 'none';
      setTimeout(() => { windowEl.style.display = 'none'; }, 300);
    }
  }

  toggleBtn.addEventListener('click', toggleWindow);
  closeBtn.addEventListener('click', toggleWindow);

  function addMessage(text, isUser) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `bcw-msg ${isUser ? 'bcw-msg-user' : 'bcw-msg-bot'}`;
    msgDiv.textContent = text;
    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    addMessage(text, true);
    inputEl.value = '';
    sendBtn.disabled = true;

    // Show typing indicator
    typingEl.classList.add('bcw-active');
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: BOT_ID, question: text })
      });

      const data = await response.json();
      addMessage(data.answer || "Sorry, I didn't get that.", false);
    } catch (err) {
      console.error('BotCraft Widget Error:', err);
      addMessage("Couldn't connect to the server. Please try again.", false);
    } finally {
      typingEl.classList.remove('bcw-active');
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

})();
