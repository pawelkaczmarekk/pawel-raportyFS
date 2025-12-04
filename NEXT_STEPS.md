# Następne Kroki - Partner Reports

## ✅ Co zostało zrobione

Aplikacja Partner Reports została w pełni zaimplementowana z następującymi funkcjonalnościami:

1. **Autentykacja**
   - Logowanie przez Google OAuth
   - Ograniczenie do domeny @vsprint
   - Middleware chroniący trasy

2. **3 Typy Raportów**
   - Raport Miesięczny (poprzedni miesiąc, 3 sekcje)
   - Raport Tygodniowy (ostatnie 7 dni, 1 sekcja)
   - Prośba o Opinię (email z gwiazdkami → Typeform)

3. **Integracje**
   - Google Sheets API (dane partnerów)
   - ClickUp API (zadania)
   - Gemini 3.0 (generowanie treści AI)
   - Gmail API (wysyłka emaili)
   - Typeform (linki do ocen)

4. **UI**
   - Responsywny interfejs z 3 tabami
   - Formularze z walidacją
   - Podgląd wysłanych emaili
   - Ładne szablony HTML dla emaili

## 🔧 Co musisz teraz zrobić

### 1. Konfiguracja API (KLUCZOWE!)

Musisz skonfigurować wszystkie API klucze w pliku `.env.local`. Skopiuj `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Następnie wypełnij:

#### A. Google OAuth (do logowania)
- Utwórz projekt w [Google Cloud Console](https://console.cloud.google.com/)
- Włącz Google+ API
- Utwórz OAuth 2.0 Client ID
- Dodaj redirect URI: `http://localhost:3000/api/auth/callback/google`
- Wklej Client ID i Secret do `.env.local`

#### B. Google Sheets API (do pobierania danych partnerów)
- W tym samym projekcie włącz Google Sheets API
- Utwórz Service Account
- Pobierz klucz JSON
- Skopiuj `client_email` i `private_key` do `.env.local`
- **WAŻNE**: Udostępnij swój główny Google Sheet temu service account!

#### C. Gmail API (do wysyłki emaili)
- Włącz Gmail API w projekcie
- Wygeneruj refresh token ([OAuth Playground](https://developers.google.com/oauthplayground/))
- Scope: `https://www.googleapis.com/auth/gmail.send`
- Dodaj do `.env.local`

#### D. ClickUp API
- Przejdź do [ClickUp Settings](https://app.clickup.com/settings/apps)
- Wygeneruj API Token
- **WAŻNE**: Skonfiguruj `CLICKUP_FOLDER_MAPPING` - mapowanie nazw partnerów na ID folderów

#### E. Gemini API
- Przejdź do [Google AI Studio](https://makersuite.google.com/app/apikey)
- Wygeneruj API Key
- Dodaj do `.env.local`

#### F. Typeform
- Utwórz formularz z hidden fields: `partner_id`, `rating`, `partner_email`, `opiekun_email`
- Skopiuj Form ID
- Dodaj do `.env.local`

### 2. Struktura Google Sheets

Twój główny Google Sheet musi mieć następujące kolumny (w tej kolejności):

| A | B | C | D | E | F | G | H | ... | AQ | AR |
|---|---|---|---|---|---|---|---|-----|-----|-----|
| Opiekun | Nazwa konta | Pakiet | ALLEGRO PL | ALLEGRO CZ | ALLEGRO SK | ALLEGRO HU | SUMA | ... | Opiekum FS (e-mail) | Opiekum ADS (e-mail) |

Wszystkie 44 kolumny muszą być w odpowiedniej kolejności zgodnie z twoim obecnym arkuszem.

### 3. ClickUp Folder Mapping

W `.env.local` musisz skonfigurować mapowanie:

```env
CLICKUP_FOLDER_MAPPING={"Nazwa Partnera 1": "123456789", "Nazwa Partnera 2": "987654321"}
```

Gdzie:
- Klucz = **dokładna** nazwa z kolumny "Nazwa konta" w Google Sheets
- Wartość = ID folderu w ClickUp dla tego partnera

Aby znaleźć ID folderu w ClickUp:
1. Otwórz folder w ClickUp
2. Sprawdź URL: `https://app.clickup.com/123456/v/f/987654321`
3. Ostatnia liczba to Folder ID

### 4. Test lokalny

```bash
npm run dev
```

1. Otwórz http://localhost:3000
2. Zaloguj się kontem @vsprint
3. Sprawdź czy lista partnerów się ładuje
4. Spróbuj wygenerować raport testowy

### 5. Typeform Setup

Twój formularz Typeform powinien mieć:

1. **Hidden fields** (dodaj w ustawieniach formularza):
   - `partner_id`
   - `rating` (zostanie pre-wypełnione 1-5)
   - `partner_email`
   - `opiekun_email`

2. **Pytanie główne**: "Jak oceniasz naszą współpracę?"
   - Może być pole tekstowe lub rating
   - Hidden field `rating` już będzie wypełnione, więc to pytanie jest opcjonalne

3. **Dodatkowe pytania**: Możesz dodać pole na uwagi, sugestie itp.

## 🚀 Deployment (później)

Gdy wszystko będzie działać lokalnie:

1. **Vercel** (zalecane):
   - Push do GitHub
   - Połącz z Vercel
   - Dodaj wszystkie env variables w panelu
   - Zmień `NEXTAUTH_URL` na produkcyjny URL
   - Deploy!

2. **Inne**: Działa na każdej platformie wspierającej Next.js 15

## 🐛 Potencjalne problemy

### "Unauthorized" po zalogowaniu
- Sprawdź czy email ma @vsprint
- Upewnij się, że `ALLOWED_EMAIL_DOMAIN=vsprint` w `.env.local`

### Błąd Google Sheets
- Upewnij się, że service account ma dostęp do arkusza
- Sprawdź czy `MAIN_SHEET_ID` jest poprawne
- Upewnij się, że `\n` w private key są właściwie escapowane

### ClickUp - brak zadań
- Sprawdź ID folderów w `CLICKUP_FOLDER_MAPPING`
- Upewnij się, że nazwy partnerów są identyczne jak w Sheets
- Sprawdź czy są zakończone zadania w folderze

### Email nie wysyłany
- Sprawdź Gmail refresh token
- Upewnij się, że Gmail API jest włączone
- Sprawdź logi w konsoli

## 📝 TODO (opcjonalne ulepszenia na przyszłość)

- [ ] Dashboard z historią wysłanych raportów
- [ ] Możliwość edycji przed wysyłką
- [ ] Harmonogram automatycznych wysyłek
- [ ] Statystyki i analytics
- [ ] Eksport raportów do PDF
- [ ] Bulk sending (wysyłka do wielu partnerów jednocześnie)
- [ ] Email templates editor
- [ ] Integracja z innymi źródłami danych

## 🆘 Potrzebujesz pomocy?

Jeśli coś nie działa:
1. Sprawdź console w przeglądarce (F12)
2. Sprawdź terminal gdzie uruchomiony jest `npm run dev`
3. Zweryfikuj wszystkie klucze API w `.env.local`
4. Upewnij się, że wszystkie API są włączone w Google Cloud Console

---

**Projekt gotowy do użytku! Powodzenia! 🎉**
