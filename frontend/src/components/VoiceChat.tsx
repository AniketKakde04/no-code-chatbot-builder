import { LiveKitRoom, RoomAudioRenderer, StartAudio, useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import "@livekit/components-styles";
import { Mic, X } from "lucide-react";
import { useVoice } from "@/contexts/VoiceContext";

export function VoiceChat() {
  const { token, url, isConnecting, connect, disconnect } = useVoice();

  if (!token || !url) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        onClick={disconnect}
        className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-full shadow-lg border border-slate-700"
        title="Disconnect"
      >
        <X className="w-4 h-4" />
      </button>
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={disconnect}
        className="bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden w-[300px] h-[400px]"
      >
        <SimpleVoiceInterface />
        <RoomAudioRenderer />
        <StartAudio label="Click to allow audio playback" />

      </LiveKitRoom>
    </div>
  );
}

function SimpleVoiceInterface() {
  const connectionState = useConnectionState();

  if (connectionState === ConnectionState.Connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
          <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center relative z-10 border border-indigo-500/30">
            <Mic className="w-10 h-10 text-indigo-400" />
          </div>

          {/* Audio waves animation */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-indigo-500/10 rounded-full animate-[ping_3s_linear_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-indigo-500/5 rounded-full animate-[ping_4s_linear_infinite]" />
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium tracking-wide">LISTENING</span>
          </div>
          <p className="text-sm text-slate-400 max-w-[200px]">
            Speak naturally. I'm listening to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <p>Connecting...</p>
    </div>
  );
}
