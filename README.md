# BotCraft AI - Low Code AI Agent and Chatbot Builder

BotCraft AI is a powerful platform that allows users to create custom AI chatbots trained on their own data without writing a single line of code. By leveraging RAG (Retrieval-Augmented Generation), you can ingest PDFs, CSV files, text files, or URLs, and build intelligent bots that answer questions based on your specific content.

## Features

-   **Custom Chatbot Creation**: Create multiple distinct chatbots, each with its own knowledge base.
-   **RAG Powered**: Uses advanced RAG techniques to retrieve relevant context from uploaded documents and websites.
-   **Visual Workflow Builder**: Create complex AI agent workflows using a drag-and-drop interface powered by React Flow and LangGraph. Connect LLMs, Doc writers, Email nodes, and MCP servers.
-   **Voice Agents**: Experience interactive real-time voice conversations using LiveKit.
-   **Multi-Channel Deployment**: Instantly deploy your bots to Telegram and WhatsApp Business.
-   **Document Extraction & Generation**: Supports uploading PDFs, CSVs, and URLs. Generates Word documents, Excel spreadsheets, PowerPoint presentations, and Google Sheets, straight from your chatbot workflows.
-   **MCP Integration**: Connect to local Model Context Protocol (MCP) servers to extend your agent's capabilities with custom tools and scripts.
-   **Dashboard & Analytics**: A centralized dashboard to manage your bots, view stats, and monitor usage.
-   **Secure Authentication**: User management and data security powered by Supabase.

## Tech Stack

### Frontend
-   **Framework**: [React](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Visual Editor**: [React Flow](https://reactflow.dev/)
-   **Voice Integration**: [LiveKit Components](https://livekit.io/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Routing**: [React Router](https://reactrouter.com/)

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
-   **AI Orchestration**: [LangChain](https://python.langchain.com/) & [LangGraph](https://langchain-ai.github.io/langgraph/)
-   **Real-time Voice**: [LiveKit Server](https://livekit.io/)
-   **LLM Provider**: [Google GenAI (Gemini)](https://ai.google.dev/)
-   **Vector Store**: [ChromaDB](https://www.trychroma.com/)
-   **Database**: [Supabase](https://supabase.com/)

## Getting Started

Follow these steps to set up BotCraft AI locally.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or higher)
-   [Python](https://www.python.org/) (v3.10 or higher)
-   A [Supabase](https://supabase.com/) project
-   A [Google Cloud](https://console.cloud.google.com/) project with Gemini API enabled
-   *(Optional)* Google Cloud OAuth Credentials for Google Sheets/Docs/Slides integrations
-   *(Optional)* Twilio WhatsApp Developers API credentials
-   *(Optional)* Telegram Bot token
-   *(Optional)* LiveKit Server for Voice integrations

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Create a `.env` file in the `backend` directory. Refer to the codebase for the required keys. Main ones include:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    SUPABASE_URL=your_supabase_url
    SUPABASE_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_KEY=your_supabase_service_role_key
    
    # Workflow Integrations (Optional, refer to workflow_engine.py for all nodes)
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password
    TWILIO_ACCOUNT_SID=your_twilio_sid
    TWILIO_AUTH_TOKEN=your_twilio_auth_token
    TWILIO_FROM_NUMBER=whatsapp:you_number
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    LIVEKIT_URL=your_livekit_url
    LIVEKIT_API_KEY=your_livekit_key
    LIVEKIT_API_SECRET=your_livekit_secret
    WHATSAPP_VERIFY_TOKEN=your_whatsapp_webhook_token
    ```

5.  Run the backend server:
    ```bash
    uvicorn main:app --reload
    ```
    The server will start at `http://localhost:8000`.

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`. Optionally, configure `.env` variables if required by Vite (e.g. `VITE_SUPABASE_URL`).

## Usage

1.  Sign up or log in using the authentication page.
2.  Go to the Dashboard and click "Create New Bot".
3.  Name your bot and upload a PDF, CSV file, Text file, or provide a URL to train it.
4.  Once ingested, click on the **Workflow** tab to set up custom LLM graphs, connecting LangGraph-based logic for document parsing, MCP integrations, emails, or just standard RAG querying.
5.  Link your workflow to your Bot, or proceed to chat with it utilizing RAG natively! Use multi-channel outputs to deploy and interact with your AI anywhere (Web, Voice, WhatsApp, Telegram).

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.
