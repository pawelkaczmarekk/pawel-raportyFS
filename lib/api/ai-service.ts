import { GeminiService } from './gemini';
import { OpenAdapterService } from './openadapter';
import { ClickUpTask, Partner } from '@/types';

type AIProvider = 'gemini' | 'openadapter';

interface AIService {
  generateMonthlyReport(
    partner: Partner,
    tasks: ClickUpTask[],
    userInput: {
      osiagniecia: string;
      wyzwania: string;
      plany: string;
      historiaDzialan?: string;
    }
  ): Promise<string>;
  generateWeeklyReport(
    partner: Partner,
    tasks: ClickUpTask[],
    userInput: {
      wykonaneDzialania: string;
      historiaZmian?: string;
      topZmiany?: string;
    }
  ): Promise<string>;
}

function getAIProvider(): AIProvider {
  return (process.env.AI_PROVIDER as AIProvider) || 'gemini';
}

export function getAIService(): AIService {
  const provider = getAIProvider();

  if (provider === 'openadapter') {
    return new OpenAdapterService();
  }

  return new GeminiService();
}

export const aiService = getAIService();