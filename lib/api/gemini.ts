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

ZADANIE: Napisz ZWIĘZŁY opis współpracy (MAX 100-120 słów!)

ZASADY:
1. MAX 2 krótkie akapity - nie więcej!
2. Używaj LICZB z danych (sprzedaż, ROAS, dynamika)
3. Pierwszy akapit: podsumowanie wyników (2-3 zdania)
4. Drugi akapit: krótka rekomendacja (1-2 zdania)
5. NIE pisz wstępów typu "Z przyjemnością informujemy..."
6. NIE używaj wypunktowań
7. AKTYWNY głos: "Zrealizowaliśmy", "Osiągnęliśmy"

LIMITY: Absolutnie MAX 120 słów. Każde zdanie musi nieść konkretną informację.

Odpowiedź (tylko tekst, bez nagłówków, po polsku):`;

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

Zadanie: Na podstawie ALL powyższych danych stwórz kompleksowy raport tygodniowy z następującymi sekcjami:

**SEKCJA 1: Podsumowanie sprzedaży (1-2 zdania)**
Krótkie podsumowanie wyników sprzedażowych w kontekście celu tygodniowego.

**SEKCJA 2: Najważniejsze wydarzenia (TOP 3-5)**
Lista najważniejszych zmian i wydarzeń z ostatniego tygodnia. Wykorzystaj dane z "TOP 5 ZMIAN" oraz historii. Każdy punkt powinien:
- Wyjaśniać DLACZEGO jest to ważne dla partnera
- Być konkretny (liczby, daty, produkty)
- Format: • [Krótki opis] - [Znaczenie/wpływ]

**SEKCJA 3: Wykonane działania (3-7 punktów)**
Lista konkretnych działań wykonanych przez zespół. Połącz:
- Zadania z ClickUp
- Informacje od opiekuna
- Działania związane ze zmianami w systemie

Format każdego punktu: • [Działanie] - [Rezultat/cel działania]

**SEKCJA 4: Call-to-action (1-2 zdania)**
Zachęta lub rekomendacja dla partnera na następny tydzień, oparta na danych z raportu.

WAŻNE ZASADY:
- Pisz w języku polskim
- Używaj emoji (📊 💰 🚀 ⭐ ✅ 📈 🎯) aby raport był bardziej wizualny
- Bądź konkretny - używaj liczb, dat, nazwań produktów z danych
- Zachowaj profesjonalny ale ciepły ton
- Podkreślaj pozytywne aspekty, ale bądź szczery o wyzwaniach
- Jeśli brakuje danych w jakiejś sekcji, napisz to wprost (nie wymyślaj)

Odpowiedź (pełny raport ze wszystkimi sekcjami):`;

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
