import { supabase } from '@/lib/supabase'; // Import the Supabase client

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- NEW HELPER: Get Auth Token from Supabase ---
export const getAuthToken = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        throw new Error('User is not authenticated');
    }
    return session.access_token;
};

// --- Existing Bot Endpoints ---

export const getBots = async () => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/bots`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch bots');
    return response.json();
};

export const createBot = async (formData: FormData) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/ingest`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
    });
    if (!response.ok) throw new Error('Failed to create bot');
    return response.json();
};

export const getBotDetails = async (id: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/bots/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch bot details');
    return response.json();
};

export const deleteBot = async (id: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/bots/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to delete bot');
    return response.json();
};

export const getStats = async () => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
};

// --- New Workflow Endpoints (Added for Agent Builder) ---

export const saveWorkflow = async (workflowData: { name: string; description: string; nodes: any[]; edges: any[] }) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/workflows`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workflowData),
    });

    if (!response.ok) {
        // Extract exact error detail from backend instead of a generic message
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || 'Failed to save workflow on backend';
        console.error("Backend Error Details:", errorMsg);
        throw new Error(errorMsg);
    }
    return response.json();
};

export const getWorkflows = async () => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/workflows`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch workflows');
    }
    return response.json();
};

export const updateWorkflow = async (id: string, workflowData: { name: string; description: string; nodes: any[]; edges: any[] }) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/workflows/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workflowData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || 'Failed to update workflow';
        throw new Error(errorMsg);
    }
    return response.json();
};

export const linkWorkflowToBot = async (botId: string, workflowId: string) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('workflow_id', workflowId);

    const response = await fetch(`${API_URL}/bots/${botId}/link-workflow`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to link workflow to bot');
    }
    return response.json();
};

// --- Chat & Messages ---

export const sendMessage = async (botId: string, question: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bot_id: botId, question }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
};

export const getMessages = async (botId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/bots/${botId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
};

export const clearMessages = async (botId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/bots/${botId}/messages`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to clear messages');
    return response.json();
};

export const toggleShare = async (botId: string, isPublic: boolean) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/bots/${botId}/share`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_public: isPublic }),
    });
    if (!response.ok) throw new Error('Failed to toggle sharing');
    return response.json();
};

// --- Public (No Auth) ---

export const getPublicBot = async (shareId: string) => {
    const response = await fetch(`${API_URL}/public/bot/${shareId}`);
    if (!response.ok) throw new Error('Bot not found or not public');
    return response.json();
};

export const sendPublicMessage = async (shareId: string, question: string) => {
    const response = await fetch(`${API_URL}/public/chat/${shareId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
};

export const connectWhatsApp = async (botId: string, phoneId: string, accessToken: string) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('phone_id', phoneId);
    formData.append('access_token', accessToken);

    const response = await fetch(`${API_URL}/bots/${botId}/whatsapp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
    });
    if (!response.ok) throw new Error('Failed to connect WhatsApp');
    return response.json();
};

// --- Export an 'api' object to fix missing import errors in other files ---
export const api = {
    getBots,
    createBot,
    getBotDetails,
    deleteBot,
    getStats,
    saveWorkflow,
    getWorkflows,
    updateWorkflow,
    linkWorkflowToBot,
    sendMessage,
    getMessages,
    clearMessages,
    toggleShare,
    getPublicBot,
    sendPublicMessage,
    connectWhatsApp
};