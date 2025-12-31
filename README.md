# BotCraft AI - No Code Chatbot Builder

BotCraft AI is a powerful platform that allows users to create custom AI chatbots trained on their own data without writing a single line of code. By leveraging RAG (Retrieval-Augmented Generation), you can ingest PDFs, text files, or URLs, and build intelligent bots that answer questions based on your specific content.

## Features

-   **Custom Chatbot Creation**: Create multiple distinct chatbots, each with its own knowledge base.
-   **RAG Powered**: Uses advanced RAG techniques to retrieve relevant context from uploaded documents and websites.
-   **Multi-Source Ingestion**: Support for uploading PDF documents, text files, and scraping content from URLs.
-   **Dashboard**: A centralized dashboard to manage your bots, view stats, and monitor usage.
-   **Interactive Chat Interface**: Test your bots immediately in a clean, responsive chat UI.
-   **Secure Authentication**: User management and data security powered by Supabase.

## Tech Stack

### Frontend
-   **Framework**: [React](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **State Management**: React Hooks & Context API
-   **Routing**: [React Router](https://reactrouter.com/)

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
-   **AI Orchestration**: [LangChain](https://python.langchain.com/)
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

4.  Create a `.env` file in the `backend` directory with the following keys:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    SUPABASE_URL=your_supabase_url
    SUPABASE_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_KEY=your_supabase_service_role_key
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
    The application will be available at `http://localhost:5173`.

## Usage

1.  Sign up or log in using the authentication page.
2.  Go to the Dashboard and click "Create New Bot".
3.  Name your bot and upload a PDF/Text file or provide a URL to train it.
4.  Once ingested, click "Chat" to start interacting with your custom AI agent.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.
