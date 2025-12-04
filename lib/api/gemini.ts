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
• Zgodność z celem: ${partner.zgodnosc}

═══════════════════════════════════════════════════════════════
WYKONANE ZADANIA (ClickUp)
═══════════════════════════════════════════════════════════════
${tasksSummary}

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

<h2>🚀 Rekomendacje na przyszłość</h2>
<p>1-2 zdania z konkretnymi rekomendacjami</p>

ZASADY:
1. MAX 150 słów łącznie
2. Używaj LICZB z danych (sprzedaż, ROAS, dynamika)
3. NIE pisz wstępów typu "Z przyjemnością informujemy..."
4. AKTYWNY głos: "Zrealizowaliśmy", "Osiągnęliśmy"
5. Wyróżniaj kluczowe liczby za pomocą <strong>

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

    const prompt = `
Jesteś asystentem tworzącym profesjonalny tygodniowy raport dla partnera agencji marketingowej.

═══════════════════════════════════════════════════════════════
INFORMACJE O PARTNERZE
═══════════════════════════════════════════════════════════════
PARTNER: ${partner.nazwaKonta}
PAKIET: ${partner.pakiet}
OKRES: Ostatnie 7 dni

═══════════════════════════════════════════════════════════════
WYNIKI SPRZEDAŻOWE
═══════════════════════════════════════════════════════════════
• Cel tygodniowy: ${celTygodniowy.toLocaleString('pl-PL')} PLN
• Zrealizowano: ${Math.round(sprzedazTygodniowa).toLocaleString('pl-PL')} PLN
• Progres: ${progres}% (${dynamika})
• Dynamika miesiąc do miesiąca: ${partner.dynamikaMM}
• Realizacja celu miesięcznego: ${partner.realizacji}%

═══════════════════════════════════════════════════════════════
TOP 5 NAJWAŻNIEJSZYCH ZMIAN W SYSTEMIE
═══════════════════════════════════════════════════════════════
${userInput.topZmiany || 'Brak znaczących zmian w tym okresie.'}

═══════════════════════════════════════════════════════════════
HISTORIA ZMIAN (szczegóły)
═══════════════════════════════════════════════════════════════
${userInput.historiaZmian || 'Brak danych z historii zmian.'}

═══════════════════════════════════════════════════════════════
WYKONANE ZADANIA W CLICKUP
═══════════════════════════════════════════════════════════════
${tasksSummary}

═══════════════════════════════════════════════════════════════
DODATKOWE INFORMACJE OD OPIEKUNA
═══════════════════════════════════════════════════════════════
${userInput.wykonaneDzialania}

═══════════════════════════════════════════════════════════════

ZADANIE: Stwórz kompleksowy raport tygodniowy w formacie HTML.

WYMAGANY FORMAT HTML:
- Używaj <h1> dla głównego tytułu sekcji
- Używaj <h2> dla podsekcji
- Używaj <p> dla akapitów
- Używaj <ul><li> dla list punktowanych
- Używaj <strong> dla wyróżnienia ważnych liczb i pojęć
- Używaj emoji w nagłówkach dla lepszej wizualizacji

STRUKTURA RAPORTU:

<h1>📊 Podsumowanie tygodnia</h1>
<p>1-2 zdania podsumowujące wyniki sprzedażowe w kontekście celu tygodniowego. Użyj <strong> dla kluczowych liczb.</p>

<h1>⭐ Najważniejsze wydarzenia</h1>
<ul>
<li><strong>[Wydarzenie]</strong> - znaczenie/wpływ dla partnera</li>
</ul>
(TOP 3-5 najważniejszych zmian z danych)

<h1>✅ Wykonane działania</h1>
<ul>
<li><strong>[Działanie]</strong> - rezultat/cel działania</li>
</ul>
(3-7 punktów łączących zadania ClickUp, informacje od opiekuna, zmiany w systemie)

<h1>🚀 Rekomendacje na przyszły tydzień</h1>
<p>1-2 zdania z konkretnymi rekomendacjami opartymi na danych z raportu.</p>

ZASADY:
1. Pisz w języku polskim
2. Bądź konkretny - używaj liczb, dat, nazw produktów z danych
3. Zachowaj profesjonalny ale ciepły ton
4. Podkreślaj pozytywne aspekty, ale bądź szczery o wyzwaniach
5. Jeśli brakuje danych w jakiejś sekcji, pomiń ją lub napisz krótko
6. Wyróżniaj kluczowe informacje za pomocą <strong>
7. NIE używaj markdown (**, ##) - tylko czyste tagi HTML

Odpowiedź (tylko kod HTML, po polsku):`;

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
