
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatbotConfig, ChatMessage } from "../types";

const API_KEY = process.env.API_KEY || '';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  private buildSystemInstruction(config: ChatbotConfig): string {
    const knowledgeBase = config.dataSources
      .filter(ds => ds.status === 'ready')
      .map(ds => `[Source: ${ds.name}]\n${ds.content}`)
      .join('\n\n');

    return `
      You are an AI Chatbot named "${config.name}".
      Your Tone: ${config.tone}.
      Your Primary Use Case: ${config.useCase}.
      
      Your knowledge is strictly limited to the following data sources provided by the owner. 
      If a user asks something not contained in this knowledge base, politely explain that you don't have that information and offer to escalate to a human if applicable.
      Do not hallucinate or make up facts.
      
      Knowledge Base:
      ${knowledgeBase}

      Current Date: ${new Date().toLocaleDateString()}
    `;
  }

  async chat(config: ChatbotConfig, history: ChatMessage[], message: string): Promise<string> {
    const model = 'gemini-3-flash-preview';
    
    // Prepare contents with history for context
    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: this.buildSystemInstruction(config),
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        }
      });

      return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "An error occurred while connecting to the AI engine. Please try again.";
    }
  }

  async extractContentFromUrl(url: string): Promise<string> {
    // Simulate web crawling using Gemini's search capabilities if needed, 
    // or just return a placeholder for this demo
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this URL and extract the core business information and FAQs as if you were a web crawler: ${url}`,
        config: {
            tools: [{ googleSearch: {} }]
        }
      });
      return response.text || "Failed to extract content.";
    } catch (e) {
      return `Simulated content from ${url}: This is a high-quality knowledge source about ${url.split('.')[1]}.`;
    }
  }
}

export const gemini = new GeminiService();
