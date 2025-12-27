
export type ChatbotTone = 'Professional' | 'Friendly' | 'Supportive' | 'Funny';
export type UseCase = 'Support' | 'Sales' | 'Education' | 'FAQ';

export interface DataSource {
  id: string;
  type: 'file' | 'url' | 'text';
  name: string;
  content: string;
  status: 'processing' | 'ready';
}

export interface ChatbotConfig {
  id: string;
  name: string;
  tone: ChatbotTone;
  useCase: UseCase;
  brandColor: string;
  welcomeMessage: string;
  position: 'left' | 'right';
  avatar?: string;
  isDarkMode: boolean;
  dataSources: DataSource[];
  createdAt: number;
  status: 'Active' | 'Paused';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface DashboardStats {
  totalChats: number;
  questionsAnswered: number;
  unansweredQueries: number;
  activeSources: number;
}
