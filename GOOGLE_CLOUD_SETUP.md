# Google Cloud Console Setup - Gmail Integration

## ⚠️ WYMAGANE KROKI przed użyciem aplikacji

Po zintegrowaniu Gmail z NextAuth, musisz skonfigurować Google Cloud Console:

### 1. Włącz Gmail API

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Wybierz swój projekt
3. Przejdź do **APIs & Services** → **Library**
4. Wyszukaj **"Gmail API"**
5. Kliknij **"Enable"** (Włącz)

### 2. Zaktualizuj OAuth Consent Screen

1. Przejdź do **APIs & Services** → **OAuth consent screen**
2. Kliknij **"Edit App"**
3. W sekcji **"Scopes"** kliknij **"Add or Remove Scopes"**
4. Znajdź i zaznacz:
   - `https://www.googleapis.com/auth/gmail.send`
   - (Powinny już być dodane: `.../auth/userinfo.email`, `.../auth/userinfo.profile`)
5. Kliknij **"Update"** i **"Save and Continue"**

###3. Zweryfikuj Authorized Redirect URIs

1. Przejdź do **APIs & Services** → **Credentials**
2. Znajdź swój **OAuth 2.0 Client ID**
3. Kliknij w niego aby edytować
4. W sekcji **"Authorized redirect URIs"** upewnij się że masz:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://twoja-domena.com/api/auth/callback/google`
5. Kliknij **"Save"**

### 4. Poczekaj na propagację

Po zapisaniu zmian, poczekaj **1-2 minuty** aż Google rozpropaguje konfigurację.

---

## ✅ Weryfikacja

Po skonfigurowaniu:

1. Otwórz aplikację: `http://localhost:3000`
2. Wyloguj się (jeśli jesteś zalogowany)
3. Zaloguj się ponownie
4. Google powinien zapytać o **2 uprawnienia**:
   - Dostęp do profilu (email, nazwa, zdjęcie)
   - **Wysyłanie emaili w Twoim imieniu** ← NOWE!
5. Kliknij **"Zezwól"** (Allow)
6. Po zalogowaniu, wypróbuj wysyłkę testowego emaila opinii

---

## 🐛 Troubleshooting

### Błąd: "Access blocked: This app's request is invalid"

**Przyczyna**: Gmail API nie jest włączone lub scope nie został dodany

**Rozwiązanie**:
- Sprawdź czy Gmail API jest włączone (krok 1)
- Sprawdź czy scope `gmail.send` jest dodany na OAuth consent screen (krok 2)
- Poczekaj 1-2 minuty po zmianach

### Błąd: "redirect_uri_mismatch"

**Przyczyna**: Redirect URI nie jest dodany do dozwolonych

**Rozwiązanie**:
- Sprawdź dokładnie czy masz `http://localhost:3000/api/auth/callback/google` (nie `/gmail`!)
- Upewnij się że nie ma końcowego slasha
- Dla produkcji użyj https

### Użytkownik nie widzi prośby o uprawnienia Gmail

**Przyczyna**: Użytkownik był wcześniej zalogowany bez Gmail scope

**Rozwiązanie**:
1. Wyloguj się z aplikacji
2. Przejdź do: https://myaccount.google.com/permissions
3. Znajdź swoją aplikację i usuń dostęp
4. Zaloguj się ponownie - tym razem powinien zapytać o Gmail

### Email nie wysyła się - błąd 403

**Przyczyna**: Użytkownik nie autoryzował Gmail scope

**Rozwiązanie**:
- Wyloguj się i zaloguj ponownie
- Upewnij się że kliknąłeś "Zezwól" dla obu uprawnień
- Sprawdź w konsoli czy `session.refreshToken` nie jest undefined

---

## 📝 Notatki

- **Tylko @vsprint**: Aplikacja przyjmuje tylko emaile z domeny @vsprint
- **Każdy użytkownik osobno**: Każdy zalogowany użytkownik wysyła emaile ze swojego konta Gmail
- **Token refresh**: Google automatycznie odświeża tokeny, nie musisz się tym martwić
- **Odwołanie dostępu**: Jeśli użytkownik odwoła dostęp w ustawieniach Google, musi się wylogować i zalogować ponownie
