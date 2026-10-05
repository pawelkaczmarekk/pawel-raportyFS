import OpenAI from 'openai';
import { ClickUpTask, Partner } from '@/types';

export class OpenAdapterService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENADAPTER_API_KEY || '',
      baseURL: 'https://api.openadapter.in/v1',
    });
    this.model = process.env.AI_MODEL || 'Qwen3.8-Max';
  }

  async generateMonthlyReport(
    partner: Partner,
    tasks: ClickUpTask[],
    userInput: {
      osiagniecia: string;
      wyzwania: string;
      plany: string;
      historiaDzialan?: string;
    }
  ): Promise<string> {
    const tasksSummary = this.formatTasksForAI(tasks);

    const dataSections: string[] = [];

    dataSections.push(`WYNIKI:
- Sprzedaż: ${partner.suma?.toLocaleString('pl-PL')} PLN
- Dynamika R/R: ${partner.dynamikaRR}, M/M: ${partner.dynamikaMM}
- Realizacja celu: ${partner.realizacji}%
- ROAS: ${partner.zwrotZAds}x`);

    if (tasks.length > 0) {
      dataSections.push(`ZADANIA CLICKUP:\n${tasksSummary}`);
    }
    if (userInput.historiaDzialan) {
      dataSections.push(`HISTORIA ZMIAN:\n${userInput.historiaDzialan}`);
    }
    if (userInput.osiagniecia) {
      dataSections.push(`OSIĄGNIĘCIA: ${userInput.osiagniecia}`);
    }
    if (userInput.wyzwania) {
      dataSections.push(`WYZWANIA: ${userInput.wyzwania}`);
    }
    if (userInput.plany) {
      dataSections.push(`PLANY: ${userInput.plany}`);
    }

    const prompt = `
Stwórz ZWIĘZŁY raport miesięczny w HTML. Max 150 słów.

PARTNER: ${partner.nazwaKonta}

${dataSections.join('\n\n')}

FORMAT HTML (WAŻNE - użyj dokładnie tych tagów):
<h2>Podsumowanie wyników</h2>
<p>1-2 zdania z liczbami</p>

<h2>Wykonane działania</h2>
<p>Opis ogólny wykonanych działań w formie ciągłego tekstu, np. "Edytowaliśmy opisy ofert, dostosowaliśmy strategię promowania, zoptymalizowaliśmy kampanie reklamowe."</p>

<h2>Rekomendacje</h2>
<p>1 zdanie</p>

ZASADY:
- Pisz z perspektywy "MY" (opiekuna konta): "wprowadziliśmy", "zoptymalizowaliśmy", "osiągnęliśmy"
- Tylko fakty i liczby
- Krótkie zdania, aktywny głos
- <strong> dla kluczowych liczb
- NIE pisz o brakujących danych
- NIE używaj emoji
- W sekcji Wykonane działania opisuj ogólnie kategorie działań (np. edycja opisów, zmiana promowań, optymalizacja kampanii) — NIE wymieniaj szczegółów jak ID ofert, liczba zmian itp. Pisz ciągłym tekstem, nie używaj list.
- Język polski

HTML:`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0]?.message?.content || 'Nie udało się wygenerować raportu.';
    } catch (error) {
      console.error('Error generating monthly report with OpenAdapter:', error);
      return 'Nie udało się wygenerować raportu. Prosimy spróbować ponownie.';
    }
  }

  async generateWeeklyReport(
    partner: Partner,
    tasks: ClickUpTask[],
    userInput: {
      wykonaneDzialania: string;
      historiaZmian?: string;
      topZmiany?: string;
    }
  ): Promise<string> {
    const tasksSummary = this.formatTasksForAI(tasks);

    const dataLines = [
      `- Partner: ${partner.nazwaKonta}`,
      `- Sprzedaż: ${partner.suma.toLocaleString('pl-PL')} PLN (${partner.realizacji}% celu)`,
      `- Dynamika M/M: ${partner.dynamikaMM}`,
      `- Realizacja miesięczna: ${partner.realizacji}%`,
    ];

    if (userInput.historiaZmian) {
      dataLines.push(`- Historia zmian: ${userInput.historiaZmian}`);
    }
    if (tasks.length > 0) {
      dataLines.push(`- Zadania ClickUp: ${tasksSummary}`);
    }
    if (userInput.wykonaneDzialania) {
      dataLines.push(`- Działania opiekuna: ${userInput.wykonaneDzialania}`);
    }

    const prompt = `
Stwórz ZWIĘZŁY raport tygodniowy w HTML. Maksymalnie 100 słów.

DANE:
${dataLines.join('\n')}

FORMAT (tylko HTML, bez markdown):
<h2>Wyniki</h2>
<p>1 zdanie z kluczowymi liczbami</p>

<h2>Wykonano</h2>
<ul><li>punkt 1</li><li>punkt 2</li></ul>
(3-5 punktów - same fakty, bez opisów)

<h2>Plan</h2>
<p>1 zdanie - co dalej</p>

ZASADY:
- Pisz z perspektywy "MY" (opiekuna konta): "wprowadziliśmy", "zoptymalizowaliśmy", "osiągnęliśmy"
- Tylko fakty i liczby
- Bez wstępów i ozdobników
- Krótkie zdania
- Język polski
- NIE pisz o brakujących danych

HTML:`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0]?.message?.content || 'Nie udało się wygenerować raportu.';
    } catch (error) {
      console.error('Error generating weekly report with OpenAdapter:', error);
      return 'Nie udało się wygenerować raportu. Prosimy spróbować ponownie.';
    }
  }

  private formatTasksForAI(tasks: ClickUpTask[]): string {
    if (tasks.length === 0) {
      return 'Brak zakończonych zadań w systemie ClickUp w tym okresie.';
    }

    return tasks
      .map((task, index) => {
        const closedDate = task.date_closed
          ? new Date(parseInt(task.date_closed)).toLocaleDateString('pl-PL')
          : 'N/A';
        return `${index + 1}. ${task.name}${
          task.description ? ` - ${task.description}` : ''
        } (zakończone: ${closedDate})`;
      })
      .join('\n');
  }
}

export const openAdapterService = new OpenAdapterService();