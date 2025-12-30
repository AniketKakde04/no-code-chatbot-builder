(function () {
    const SCRIPT_TAG = document.currentScript;
    const BOT_ID = SCRIPT_TAG.getAttribute('data-bot-id');
    const API_URL = 'http://localhost:8000/chat';

    if (!BOT_ID) {
        console.error('Chat Widget: data-bot-id attribute is missing.');
        return;
    }

    // --- Styles ---
    const styles = `
    .bot-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .bot-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #4F46E5;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .bot-widget-button:hover {
      transform: scale(1.1);
    }
    .bot-widget-button svg {
      width: 30px;
      height: 30px;
      color: white;
    }
    .bot-widget-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .bot-widget-header {
      background: #4F46E5;
      color: white;
      padding: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bot-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f9fafb;
    }
    .bot-message {
      margin-bottom: 12px;
      max-width: 80%;
      align-self: flex-start;
      background: #e5e7eb;
      padding: 8px 12px;
      border-radius: 12px 12px 12px 0;
      color: #1f2937;
      font-size: 14px;
    }
    .user-message {
      margin-bottom: 12px;
      max-width: 80%;
      align-self: flex-end;
      background: #4F46E5;
      padding: 8px 12px;
      border-radius: 12px 12px 0 12px;
      color: white;
      font-size: 14px;
      margin-left: auto;
    }
    .bot-widget-input-area {
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    .bot-widget-input {
      flex: 1;
      padding: 8px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      outline: none;
    }
    .bot-widget-send {
      background: #4F46E5;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
    .bot-widget-send:disabled {
        background: #a5a6f6;
        cursor: not-allowed;
    }
  `;

    // --- HTML Structure ---
    const container = document.createElement('div');
    container.className = 'bot-widget-container';
    container.innerHTML = `
    <style>${styles}</style>
    <div class="bot-widget-window" id="bot-window">
      <div class="bot-widget-header">
        <span>AI Assistant</span>
        <span style="cursor:pointer" id="bot-close">✕</span>
      </div>
      <div class="bot-widget-messages" id="bot-messages">
        <div class="bot-message">Hello! How can I help you today?</div>
      </div>
      <div class="bot-widget-input-area">
        <input type="text" class="bot-widget-input" id="bot-input" placeholder="Type a message..." />
        <button class="bot-widget-send" id="bot-send">Send</button>
      </div>
    </div>
    <div class="bot-widget-button" id="bot-toggle">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    </div>
  `;

    document.body.appendChild(container);

    // --- Logic ---
    const windowEl = document.getElementById('bot-window');
    const toggleBtn = document.getElementById('bot-toggle');
    const closeBtn = document.getElementById('bot-close');
    const inputEl = document.getElementById('bot-input');
    const sendBtn = document.getElementById('bot-send');
    const messagesEl = document.getElementById('bot-messages');

    let isOpen = false;

    toggleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        windowEl.style.display = isOpen ? 'flex' : 'none';
    });

    closeBtn.addEventListener('click', () => {
        isOpen = false;
        windowEl.style.display = 'none';
    });

    const addMessage = (text, isUser) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = isUser ? 'user-message' : 'bot-message';
        msgDiv.textContent = text;
        messagesEl.appendChild(msgDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    const sendMessage = async () => {
        const text = inputEl.value.trim();
        if (!text) return;

        addMessage(text, true);
        inputEl.value = '';
        sendBtn.disabled = true;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_id: BOT_ID, question: text })
            });

            const data = await response.json();
            addMessage(data.answer || "Sorry, I didn't get that.", false);
        } catch (err) {
            console.error(err);
            addMessage("Error connecting to server.", false);
        } finally {
            sendBtn.disabled = false;
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

})();
