import { form } from "framer-motion/client";

const API_URL = 'http://localhost:8000';

export interface IngestResponse {
    status: string;
    chunks: number;
    bot_id: string;
}

export interface ChatResponse {
    answer: string;
}

/* Reusing types from types.ts would be better, but defining here for speed/isolation */
export interface Bot {
    id: string;
    name: string;
    status: string;
    tone: string;
    use_case: string;
    created_at: string;
}

export const api = {
    /**
     * Uploads a PDF document to the backend for ingestion.
     */
    ingestDocument: async (name: string, file: File | null, token: string, url?: string, csvFile ?: File): Promise<IngestResponse> => {
        const formData = new FormData();
        formData.append('name', name);

        if (file) {
            formData.append('file', file);
        }

        if (url) {
            formData.append('url', url);
        }

        if (csvFile){
            formData.append('csvfile',csvFile);
        }

        const response = await fetch(`${API_URL}/ingest`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to ingest document');
        }

        return response.json();
    },

    /**
     * Fetch user's bots
     */
    getBots: async (token: string): Promise<Bot[]> => {
        const response = await fetch(`${API_URL}/bots`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error("Failed to fetch bots");
        return response.json();
    },

    getStats: async (token: string): Promise<{ total_bots: number; total_messages: number; total_conversations: number }> => {
        const response = await fetch(`${API_URL}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error("Failed to fetch stats");
        return response.json();
    },

    deleteBot: async (botId: string, token: string) => {
        const response = await fetch(`${API_URL}/bots/${botId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to delete bot');
        }
        return await response.json();
    },

    /**
     * Sends a chat message to the backend RAG pipeline.
     */
    chatWithBot: async (botId: string, question: string): Promise<ChatResponse> => {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bot_id: botId,
                question: question,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to get answer');
        }

        return response.json();
    },

    connectTelegram: async (botId: string, telegramToken: string, token: string) => {
        const formData = new FormData();
        formData.append('token',telegramToken);

        const response = await fetch(`${API_URL}/bots/${botId}/telegram`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData, 
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Failed to connect Telegram');
        }
        return response.json();
        }
};
