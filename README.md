# Partner Reports - System Raportów Vsprint

System do automatycznego generowania i wysyłania raportów dla partnerów agencji marketingowej.

## Funkcjonalności

### 🔐 Autentykacja
- Logowanie przez Google OAuth
- Ograniczenie dostępu do domeny @vsprint
- Sesje użytkowników z NextAuth.js

### 📊 Raporty
1. **Raport Miesięczny**
   - Zakres: cały poprzedni miesiąc
   - Sekcje: Osiągnięcia, Wyzwania, Plany
   - Dane z: Google Sheets + ClickUp + input użytkownika
   - AI generuje narrację na podstawie danych

2. **Raport Tygodniowy**
   - Zakres: ostatnie 7 dni
   - Sekcja: Wykonane działania
   - AI tworzy listę kluczowych działań

3. **Prośba o Opinię**
   - Email z klikalnym emoji gwiazdek (1-5)
   - Redirect do Typeform z pre-wypełnionymi danymi
   - Spersonalizowane linki dla każdego partnera

### 🔌 Integracje
- **Google Sheets**: Pobieranie danych partnerów
- **ClickUp**: Zakończone zadania z folderów partnerów
- **Gemini 3.0**: Generowanie treści raportów
- **Gmail API**: Wysyłka emaili
- **Typeform**: Zbieranie opinii

## Instalacja

### 1. Instalacja zależności

```bash
npm install
```

### 2. Konfiguracja zmiennych środowiskowych

Skopiuj plik `.env.local.example` do `.env.local`:

```bash
cp .env.local.example .env.local
```

Następnie wypełnij wszystkie zmienne środowiskowe zgodnie z instrukcjami poniżej.

### 3. Konfiguracja Google OAuth

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz nowy projekt lub wybierz istniejący
3. Włącz **Google+ API**
4. Przejdź do **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Skonfiguruj:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Skopiuj **Client ID** i **Client Secret** do `.env.local`

### 4. Konfiguracja Google Sheets API

1. W tym samym projekcie włącz **Google Sheets API**
2. Utwórz Service Account:
   - Przejdź do **Credentials** → **Create Credentials** → **Service Account**
   - Pobierz klucz JSON
3. Skopiuj `client_email` i `private_key` do `.env.local`
4. Udostępnij swój Google Sheet temu service account (jako Viewer)

### 5. Konfiguracja Gmail API

1. Włącz **Gmail API** w projekcie
2. Użyj tego samego OAuth Client ID co w kroku 3
3. Wygeneruj refresh token:
   - Możesz użyć [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Scope: `https://www.googleapis.com/auth/gmail.send`
4. Dodaj refresh token do `.env.local`

### 6. Konfiguracja ClickUp API

1. Przejdź do [ClickUp Settings](https://app.clickup.com/settings/apps)
2. Wygeneruj API Token
3. Dodaj do `.env.local`
4. Skonfiguruj mapowanie folderów partnerów w `CLICKUP_FOLDER_MAPPING`

### 7. Konfiguracja Gemini API

1. Przejdź do [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Wygeneruj API Key
3. Dodaj do `.env.local`

### 8. Konfiguracja Typeform

1. Utwórz formularz w [Typeform](https://www.typeform.com/)
2. Dodaj hidden fields: `partner_id`, `rating`, `partner_email`, `opiekun_email`
3. Skopiuj Form ID z URL (np. `form.typeform.com/to/YOUR_FORM_ID`)
4. Dodaj do `.env.local`

### 9. Uruchomienie

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

## Struktura Projektu

```
partner-reports/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth endpoint
│   │   ├── partners/              # Lista partnerów
│   │   └── reports/               # Generowanie raportów
│   ├── auth/                      # Strony logowania/błędów
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Główna strona z tabami
├── components/
│   ├── MonthlyReportTab.tsx       # Tab raportu miesięcznego
│   ├── WeeklyReportTab.tsx        # Tab raportu tygodniowego
│   ├── OpinionRequestTab.tsx      # Tab prośby o opinię
│   └── SessionProvider.tsx        # Provider sesji
├── lib/
│   ├── api/
│   │   ├── sheets.ts              # Google Sheets service
│   │   ├── clickup.ts             # ClickUp service
│   │   ├── gemini.ts              # Gemini AI service
│   │   └── gmail.ts               # Gmail service
│   ├── templates/
│   │   └── email.ts               # Szablony emaili HTML
│   ├── utils/
│   │   ├── dates.ts               # Operacje na datach
│   │   └── typeform.ts            # Generowanie linków Typeform
│   └── auth.ts                    # Konfiguracja NextAuth
├── types/
│   ├── index.ts                   # TypeScript types
│   └── next-auth.d.ts             # NextAuth types
└── .env.local.example             # Przykładowa konfiguracja
```

## Użytkowanie

### Logowanie
1. Otwórz aplikację
2. Kliknij "Zaloguj się przez Google"
3. Wybierz konto z domeny @vsprint

### Raport Miesięczny
1. Wybierz partnera z listy
2. Wypełnij 3 sekcje: Osiągnięcia, Wyzwania, Plany
3. Kliknij "Wygeneruj i wyślij raport"
4. System pobierze dane z Google Sheets i ClickUp
5. AI skomponuje treść raportu
6. Email zostanie wysłany do partnera

### Raport Tygodniowy
1. Wybierz partnera
2. Opisz wykonane działania
3. Kliknij "Wygeneruj i wyślij raport"
4. Email z listą działań zostanie wysłany

### Prośba o Opinię
1. Wybierz partnera
2. Kliknij "Wyślij prośbę o opinię"
3. Partner otrzyma email z gwiazdkami (1-5)
4. Po kliknięciu zostanie przekierowany do Typeform

## Stack Technologiczny

- **Framework**: Next.js 15 (App Router)
- **Język**: TypeScript
- **Styling**: Tailwind CSS
- **Autentykacja**: NextAuth.js
- **AI**: Google Gemini 3.0
- **APIs**: Google Sheets, Gmail, ClickUp, Typeform
