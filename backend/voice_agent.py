import logging
import os
import json
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import openai, sarvam

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)


class VoiceAgent(Agent):
    def __init__(self, llm, instructions) -> None:
        super().__init__(
            instructions=instructions,
            
            # Saaras v3 STT - Converts speech to text
            stt=sarvam.STT(
                language="unknown",
                model="saaras:v3",
            ),
            
            # Dynamic LLM
            llm=llm,

            # Bulbul TTS - Converts text to speech
            tts=sarvam.TTS(
                target_language_code="en-IN",
                model="bulbul:v2",
                speaker="anushka"
            ),
        )
    
    async def on_enter(self):
        """Called when user joins - agent starts the conversation"""
        await self.session.generate_reply()


async def entrypoint(ctx: JobContext):
    """Main entry point - LiveKit calls this when a user connects"""
    logger.info(f"User connected to room: {ctx.room.name}")
    
    # Wait for participant to get metadata
    participant = await ctx.wait_for_participant()
    
    bot_id = None
    if participant.metadata:
        try:
            meta = json.loads(participant.metadata)
            bot_id = meta.get("bot_id")
        except Exception as e:
            logger.warning(f"Failed to parse metadata: {e}")

    # Configure LLM based on bot_id
    if bot_id:
        logger.info(f"🔗 Connected to specific Bot ID: {bot_id}")
        instructions = "You are a voice assistant representing a specific AI bot. Keep your answers brief and conversational."
        
        # Point to our local proxy which wraps the RAG/Workflow engine
        llm = openai.LLM(
            # The /v1 suffix is important for some OpenAI clients, checking compatibility
            # Our proxy is at /api/bot/{bot_id}, so we append /v1 if needed or just use base_url
            base_url=f"http://localhost:8000/api/bot/{bot_id}", 
            api_key="local-proxy", 
            model="bot-proxy",
        )
    else:
        logger.info("🤖 Using generic Sarvam AI Agent")
        instructions = """
            You are a helpful voice assistant.
            Be friendly, concise, and conversational.
        """
        llm = openai.LLM(
            base_url="https://api.sarvam.ai/v1",
            api_key=os.getenv("SARVAM_API_KEY"),
            model="sarvam-m",
            temperature=0.5,
        )

    # Start the session with the configured agent
    session = AgentSession()
    await session.start(
        agent=VoiceAgent(llm=llm, instructions=instructions),
        room=ctx.room
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
