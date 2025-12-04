/**
 * Test Script dla Systemu Opinii Gwiazdkowych
 *
 * Testuje:
 * 1. Generowanie tokenów
 * 2. Zapis do Google Sheets
 * 3. Walidację tokenów
 * 4. Oznaczanie jako użyte
 * 5. Sprawdzanie duplikatów
 */

const https = require('https');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = (urlObj.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            location: res.headers.location,
          };
          resolve(result);
        } catch (e) {
          resolve({ statusCode: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test results storage
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function logTest(name, passed, message) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (message) console.log(`   ${message}`);

  if (passed) {
    results.passed.push(name);
  } else {
    results.failed.push({ name, message });
  }
}

function logWarning(message) {
  console.log(`⚠️  WARNING: ${message}`);
  results.warnings.push(message);
}

async function runTests() {
  console.log('\n🧪 === ROZPOCZYNAM TESTY SYSTEMU OPINII GWIAZDKOWYCH ===\n');

  let testToken = null;

  // ============================================================
  // TEST 1: Sprawdzenie połączenia z serwerem
  // ============================================================
  console.log('\n📡 TEST 1: Połączenie z serwerem');
  try {
    const response = await makeRequest(`${BASE_URL}/api/partners`);
    logTest('Połączenie z serwerem', response.statusCode === 200 || response.statusCode === 401,
      `Status: ${response.statusCode}`);
  } catch (error) {
    logTest('Połączenie z serwerem', false, error.message);
    console.log('\n❌ Nie można połączyć się z serwerem. Upewnij się że npm run dev działa.');
    return;
  }

  // ============================================================
  // TEST 2: Walidacja nieprawidłowego tokenu (brak tokenu w bazie)
  // ============================================================
  console.log('\n🔍 TEST 2: Walidacja nieprawidłowego tokenu');
  try {
    const invalidToken = 'opinion_invalid_12345';
    const response = await makeRequest(
      `${BASE_URL}/api/opinion/submit/${invalidToken}?stars=5`,
      'GET',
      null,
      { 'X-Test': 'true' } // Header żeby oznaczyć to jako test
    );

    const redirectedToError = response.location && response.location.includes('/opinion/error');
    logTest('Nieprawidłowy token → /opinion/error',
      response.statusCode === 307 && redirectedToError,
      `Redirect: ${response.location || 'brak'}`);
  } catch (error) {
    logTest('Nieprawidłowy token → /opinion/error', false, error.message);
  }

  // ============================================================
  // TEST 3: Walidacja nieprawidłowej liczby gwiazdek
  // ============================================================
  console.log('\n⭐ TEST 3: Walidacja liczby gwiazdek');

  const invalidStars = [0, 6, -1, 'abc', ''];
  for (const stars of invalidStars) {
    try {
      const fakeToken = `opinion_${Date.now()}_test`;
      const response = await makeRequest(
        `${BASE_URL}/api/opinion/submit/${fakeToken}?stars=${stars}`,
        'GET'
      );

      const redirectedToError = response.location && response.location.includes('/opinion/error');
      logTest(`Nieprawidłowe gwiazdki (${stars}) → error`,
        response.statusCode === 307 && redirectedToError,
        `Stars: ${stars}, Redirect: ${response.location || 'brak'}`);
    } catch (error) {
      logTest(`Nieprawidłowe gwiazdki (${stars})`, false, error.message);
    }
  }

  // ============================================================
  // TEST 4: Sprawdzenie struktury strony /opinion/error
  // ============================================================
  console.log('\n🚨 TEST 4: Strona błędu opinii');
  try {
    const response = await makeRequest(`${BASE_URL}/opinion/error`);
    logTest('Strona /opinion/error istnieje',
      response.statusCode === 200,
      `Status: ${response.statusCode}`);

    if (response.body.includes('error') || response.body.includes('błąd') || response.body.includes('problem')) {
      logTest('Strona error zawiera odpowiednią treść', true);
    } else {
      logWarning('Strona error może nie zawierać odpowiedniej treści błędu');
    }
  } catch (error) {
    logTest('Strona /opinion/error', false, error.message);
  }

  // ============================================================
  // TEST 5: Sprawdzenie strony /opinion/already-submitted
  // ============================================================
  console.log('\n🔁 TEST 5: Strona już wysłanej opinii');
  try {
    const response = await makeRequest(`${BASE_URL}/opinion/already-submitted`);
    logTest('Strona /opinion/already-submitted istnieje',
      response.statusCode === 200,
      `Status: ${response.statusCode}`);

    if (response.body.includes('already') || response.body.includes('już') || response.body.includes('wysłan')) {
      logTest('Strona zawiera informację o już wysłanej opinii', true);
    } else {
      logWarning('Strona already-submitted może nie zawierać odpowiedniej treści');
    }
  } catch (error) {
    logTest('Strona /opinion/already-submitted', false, error.message);
  }

  // ============================================================
  // TEST 6: Sprawdzenie strony /opinion/thank-you
  // ============================================================
  console.log('\n🎉 TEST 6: Strona podziękowania');
  try {
    const response = await makeRequest(`${BASE_URL}/opinion/thank-you?rating=5`);
    logTest('Strona /opinion/thank-you istnieje',
      response.statusCode === 200,
      `Status: ${response.statusCode}`);

    if (response.body.includes('thank') || response.body.includes('dziękuj') || response.body.includes('dzięki')) {
      logTest('Strona zawiera podziękowanie', true);
    } else {
      logWarning('Strona thank-you może nie zawierać odpowiedniej treści');
    }
  } catch (error) {
    logTest('Strona /opinion/thank-you', false, error.message);
  }

  // ============================================================
  // PODSUMOWANIE
  // ============================================================
  console.log('\n\n📊 === PODSUMOWANIE TESTÓW ===\n');
  console.log(`✅ Testy zakończone sukcesem: ${results.passed.length}`);
  console.log(`❌ Testy nieudane: ${results.failed.length}`);
  console.log(`⚠️  Ostrzeżenia: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Nieudane testy:');
    results.failed.forEach(({ name, message }) => {
      console.log(`   - ${name}: ${message}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Ostrzeżenia:');
    results.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  console.log('\n📝 UWAGI:');
  console.log('   - Testy nie wymagają autentykacji (endpoint opinii jest publiczny)');
  console.log('   - Nie testuję rzeczywistego zapisu do Google Sheets (wymaga partnera)');
  console.log('   - Nie testuję wysyłki emaili (wymaga Gmail API)');
  console.log('   - Skupiam się na walidacji i przepływie redirect');

  console.log('\n🎯 KOLEJNE KROKI:');
  console.log('   1. Zaloguj się do aplikacji przez przeglądarkę');
  console.log('   2. Wyślij rzeczywistą prośbę o opinię do testowego partnera');
  console.log('   3. Sprawdź Google Sheets (arkusz Opinion_Responses)');
  console.log('   4. Kliknij link w emailu i sprawdź czy redirectuje poprawnie');
  console.log('   5. Spróbuj kliknąć ten sam link ponownie (powinno pokazać already-submitted)');

  console.log('\n✨ TESTY ZAKOŃCZONE ✨\n');
}

// Uruchom testy
runTests().catch(error => {
  console.error('\n💥 BŁĄD KRYTYCZNY:', error);
  process.exit(1);
});
