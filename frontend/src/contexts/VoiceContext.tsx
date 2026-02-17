import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';

interface VoiceContextType {
  token: string | null;
  url: string | null;
  isConnecting: boolean;
  connect: (overrideBotId?: string) => Promise<void>;
  disconnect: () => void;
  botId: string | null;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const location = useLocation();

  // Determine current Bot ID from URL
  const match = matchPath("/chat/:botId", location.pathname);
  const currentBotId = match?.params.botId || null;

  // Reset connection if we switch bots (optional)
  // useEffect(() => {
  //   if (token && currentBotId) {
  //       // Logic to reconnect or stay connected? 
  //       // For now, let's keep it simple: if you navigate away, we disconnect.
  //       disconnect();
  //   }
  // }, [location.pathname]);

  const connect = useCallback(async (overrideBotId?: string) => {
    setIsConnecting(true);
    try {
      const roomName = "room-" + Math.random().toString(36).substring(7);
      const participantName = "user-" + Math.random().toString(36).substring(7);
      
      const targetBotId = overrideBotId || currentBotId;

      let apiUrl = `http://localhost:8000/api/token?room_name=${roomName}&participant_name=${participantName}`;
      if (targetBotId) {
        apiUrl += `&bot_id=${targetBotId}`;
      }
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.token) {
        setToken(data.token);
        setUrl(data.url);
      }
    } catch (e) {
      console.error("Failed to connect to voice:", e);
    } finally {
      setIsConnecting(false);
    }
  }, [currentBotId]);

  const disconnect = useCallback(() => {
    setToken(null);
    setUrl(null);
  }, []);

  return (
    <VoiceContext.Provider value={{ token, url, isConnecting, connect, disconnect, botId: currentBotId }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
