import { GoogleGenerativeAI } from '@google/generative-ai';
import { ClickUpTask, Partner } from '@/types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    // Use model from env variable, default to gemini-1.5-flash (stable with better rate limits)
    // Note: Use simple model names without '-latest' suffix for v1beta API compatibility
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  async generateMonthlyReport(
    partner: Partner,
    tasks: ClickUpTask[],
    userInput: {
      osiagniecia: string;
      wyzwania: string;
      plany: string;
      historiaDzialan?: string;  // Historia działań z Google Drive
    }
  ): Promise<string> {
    const tasksSummary = this.formatTasksForAI(tasks);

    const prompt = `
Jesteś ekspertem ds. marketingu tworzącym DYNAMICZNY miesięczny raport dla partnera agencji Allegro Ads.

═══════════════════════════════════════════════════════════════
DANE PARTNERA
═══════════════════════════════════════════════════════════════
PARTNER: ${partner.nazwaKonta}
PAKIET: ${partner.pakiet}
OPIEKUN: ${partner.opiekun}

═══════════════════════════════════════════════════════════════
WYNIKI SPRZEDAŻOWE
═══════════════════════════════════════════════════════════════
• Sprzedaż łączna: ${partner.suma?.toLocaleString('pl-PL')} PLN
• Allegro.pl: ${partner.allegroPl?.toLocaleString('pl-PL')} PLN
• Dynamika R/R: ${partner.dynamikaRR}
• Dynamika M/M: ${partner.dynamikaMM}
• Realizacja celu: ${partner.realizacji}%

═══════════════════════════════════════════════════════════════
METRYKI ADS
═══════════════════════════════════════════════════════════════
• Koszt ADS: ${partner.kosztAds?.toLocaleString('pl-PL')} PLN
• Przychód ADS: ${partner.przychodAds?.toLocaleString('pl-PL')} PLN
• Zwrot z ADS: ${partner.zwrotZAds}x

═══════════════════════════════════════════════════════════════
WYKONANE ZADANIA (ClickUp)
═══════════════════════════════════════════════════════════════
${tasksSummary}

═══════════════════════════════════════════════════════════════
HISTORIA DZIAŁAŃ NA KONCIE (z systemu)
═══════════════════════════════════════════════════════════════
${userInput.historiaDzialan || 'Brak zarejestrowanych działań w systemie.'}

═══════════════════════════════════════════════════════════════
INFORMACJE OD OPIEKUNA
═══════════════════════════════════════════════════════════════
🏆 Osiągnięcia: ${userInput.osiagniecia}
⚡ Wyzwania: ${userInput.wyzwania}
🎯 Plany: ${userInput.plany}

═══════════════════════════════════════════════════════════════

ZADANIE: Napisz profesjonalny opis współpracy w formacie HTML.

WYMAGANY FORMAT HTML:
- Używaj <h2> dla nagłówków sekcji
- Używaj <p> dla akapitów
- Używaj <strong> dla wyróżnienia ważnych liczb i pojęć
- Możesz użyć <ul><li> dla krótkich list (max 3-4 punkty)

STRUKTURA RAPORTU:
<h2>📊 Podsumowanie wyników</h2>
<p>2-3 zdania z kluczowymi liczbami (sprzedaż, ROAS, dynamika)</p>

<h2>🎯 Kluczowe osiągnięcia</h2>
<p>lub krótka lista <ul><li> z 2-3 najważniejszymi osiągnięciami</p>

<h2>✅ Wykonane działania</h2>
<p>Podsumuj najważniejsze działania z historii systemu i ClickUp (edycje ofert, optymalizacje, zmiany)</p>

<h2>🚀 Rekomendacje na przyszłość</h2>
<p>1-2 zdania z konkretnymi rekomendacjami</p>

ZASADY:
1. MAX 200 słów łącznie
2. Używaj LICZB z danych (sprzedaż, ROAS, dynamika)
3. NIE pisz wstępów typu "Z przyjemnością informujemy..."
4. AKTYWNY głos: "Zrealizowaliśmy", "Osiągnęliśmy"
5. Wyróżniaj kluczowe liczby za pomocą <strong>
6. W sekcji "Wykonane działania" podsumuj typy działań z historii (edycje tytułów, optymalizacje opisów, itp.)

Odpowiedź (tylko kod HTML, po polsku):`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating monthly report with Gemini:', error);
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

    // Calculate weekly progress
    const celTygodniowy = partner.celTygodniowy || 0;
    const sprzedazTygodniowa = (partner.suma / 30) * 7; // Approximate weekly from monthly
    const progres = celTygodniowy > 0 ? ((sprzedazTygodniowa / celTygodniowy) * 100).toFixed(1) : '0';
    const dynamika = sprzedazTygodniowa > celTygodniowy ? 'powyżej celu' : 'poniżej celu';

    // Build data section only with available information
    const dataLines = [
      `- Partner: ${partner.nazwaKonta}`,
      `- Sprzedaż: ${Math.round(sprzedazTygodniowa).toLocaleString('pl-PL')} PLN (${progres}% celu)`,
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
- Tylko fakty i liczby
- Bez wstępów i ozdobników
- Krótkie zdania
- Język polski
- NIE pisz o brakujących danych - jeśli czegoś nie ma, po prostu pomiń

HTML:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating weekly report with Gemini:', error);
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

export const geminiService = new GeminiService();
