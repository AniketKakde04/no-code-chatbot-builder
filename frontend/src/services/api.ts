import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
};

export const api = {
  async createBot(formData: FormData) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/ingest`, {
      method: 'POST',
      headers: { ...headers }, // Don't set Content-Type for FormData, browser does it automatically
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to create bot');
    return response.json();
  },

  async updateBot(botId: string, formData: FormData) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/bots/${botId}`, {
      method: 'PATCH',
      headers: { ...headers }, // Don't set Content-Type for FormData
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to update bot');
    return response.json();
  },

  async getBots() {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/bots`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch bots');
    return response.json();
  },

  async getBot(botId: string) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/bots/${botId}`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch bot details');
    return response.json();
  },

  async deleteBot(botId: string) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/bots/${botId}`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to delete bot');
    return response.json();
  },

  async getStats() {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/stats`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async chat(botId: string, question: string) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id: botId, question }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  async connectTelegram(botId: string, token: string) {
    const headers = await getAuthHeader();
    const formData = new FormData();
    formData.append('token', token);
    
    const response = await fetch(`${API_URL}/bots/${botId}/telegram`, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
    });
    
    if (!response.ok) throw new Error('Failed to connect Telegram');
    return response.json();
  }
};