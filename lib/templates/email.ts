import { Partner, EnhancedWeeklyReportData } from '@/types';
import { formatDateRange } from '../utils/dates';

export function generateMonthlyReportEmail(
  partner: Partner,
  aiGeneratedContent: string,
  dateRange: { start: Date; end: Date }
): string {
  const dateRangeStr = formatDateRange(dateRange.start, dateRange.end);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
    }
    .section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .section h2 {
      color: #667eea;
      margin-top: 0;
      font-size: 20px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .data-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .data-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .data-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .data-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Raport Miesięczny</h1>
    <p><strong>${partner.nazwaKonta}</strong></p>
    <p>${dateRangeStr}</p>
  </div>

  <div class="section">
    <h2>📈 Kluczowe Metryki</h2>
    <div class="data-grid">
      <div class="data-item">
        <div class="data-label">Sprzedaż Łączna</div>
        <div class="data-value">${partner.suma.toLocaleString('pl-PL')} PLN</div>
      </div>
      <div class="data-item">
        <div class="data-label">Cel Miesięczny</div>
        <div class="data-value">${partner.cel.toLocaleString('pl-PL')} PLN</div>
      </div>
      <div class="data-item">
        <div class="data-label">Realizacja</div>
        <div class="data-value">${partner.realizacji}%</div>
      </div>
      <div class="data-item">
        <div class="data-label">Progres</div>
        <div class="data-value">${partner.progres}</div>
      </div>
      <div class="data-item">
        <div class="data-label">Koszt ADS</div>
        <div class="data-value">${partner.kosztAds.toLocaleString('pl-PL')} PLN</div>
      </div>
      <div class="data-item">
        <div class="data-label">Zwrot z ADS</div>
        <div class="data-value">${partner.zwrotZAds}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🎯 Podsumowanie Działań</h2>
    <div class="content">
      ${aiGeneratedContent.replace(/\n/g, '<br>')}
    </div>
  </div>

  <div class="footer">
    <p>Ten raport został wygenerowany automatycznie przez system Partner Reports</p>
    <p>W razie pytań, skontaktuj się z opiekunem: ${partner.opiekunFsEmail}</p>
  </div>
</body>
</html>
  `.trim();
}

export function generateWeeklyReportEmail(
  partner: Partner,
  aiGeneratedContent: string,
  dateRange: { start: Date; end: Date },
  enhancedData?: EnhancedWeeklyReportData
): string {
  const dateRangeStr = formatDateRange(dateRange.start, dateRange.end);

  // Calculate weekly sales from monthly (approximate)
  const weeklySales = (partner.suma / 30) * 7;
  const progressPercent = partner.celTygodniowy > 0
    ? ((weeklySales / partner.celTygodniowy) * 100).toFixed(1)
    : '0';

  // Build chart section if available
  const chartSection = enhancedData?.chartImage ? `
  <div class="section">
    <h2>📊 Wykres Sprzedaży</h2>
    <div style="text-align: center; background: white; padding: 20px; border-radius: 8px;">
      <img src="${enhancedData.chartImage}" alt="Wykres sprzedaży tygodniowej" style="max-width: 100%; height: auto; border-radius: 8px;">
    </div>
  </div>
  ` : '';

  // Build top changes section if available
  const topChangesSection = enhancedData?.topZmiany && enhancedData.topZmiany.length > 0 ? `
  <div class="section">
    <h2>🔥 TOP Wydarzenia Tygodnia</h2>
    <div class="content">
      ${enhancedData.topZmiany.map((change, index) => `
        <div style="padding: 12px; margin-bottom: 10px; background: ${index === 0 ? '#fff3cd' : '#f8f9fa'}; border-left: 4px solid ${index === 0 ? '#ffc107' : '#4facfe'}; border-radius: 4px;">
          <strong>${index + 1}. ${change.rodzaj}</strong><br>
          <span style="color: #666;">${change.description}</span><br>
          <small style="color: #999;">Zmiana wartości: ${change.wartoscZmiany.toLocaleString('pl-PL')} PLN | ${new Date(change.dataZdarzenia).toLocaleDateString('pl-PL')}</small>
        </div>
      `).join('')}
    </div>
  </div>
  ` : '';

  // Build links section
  const linksSection = `
  <div class="section">
    <h2>📎 Przydatne Linki</h2>
    <div class="content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
      <a href="https://allegro.pl/moje-allegro/sprzedaz/raporty" style="display: block; padding: 15px; background: #fff; border: 2px solid #ff5a00; border-radius: 8px; text-decoration: none; color: #333; text-align: center; font-weight: bold;">
        🛒 Allegro Analytics
      </a>
      <a href="https://app.clickup.com/" style="display: block; padding: 15px; background: #fff; border: 2px solid #7b68ee; border-radius: 8px; text-decoration: none; color: #333; text-align: center; font-weight: bold;">
        ✅ ClickUp - Zadania
      </a>
      <a href="https://docs.google.com/spreadsheets" style="display: block; padding: 15px; background: #fff; border: 2px solid #34a853; border-radius: 8px; text-decoration: none; color: #333; text-align: center; font-weight: bold;">
        📊 Google Sheets - Dane
      </a>
    </div>
  </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
    }
    .header p {
      margin: 5px 0;
      opacity: 0.95;
      font-size: 16px;
    }
    .section {
      background: #ffffff;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 25px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .section h2 {
      color: #4facfe;
      margin-top: 0;
      font-size: 22px;
      border-bottom: 3px solid #4facfe;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .data-item {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 20px;
      border-radius: 8px;
      border-left: 5px solid #4facfe;
      transition: transform 0.2s;
    }
    .data-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .data-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .data-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .content {
      background: #fafafa;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      line-height: 1.8;
    }
    .content ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .content li {
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 40px;
      padding: 25px;
      background: #fff;
      border-radius: 10px;
      border-top: 3px solid #4facfe;
    }
    a {
      color: #4facfe;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📅 Raport Tygodniowy</h1>
    <p><strong>${partner.nazwaKonta}</strong> | Pakiet: ${partner.pakiet}</p>
    <p>${dateRangeStr}</p>
  </div>

  <div class="section">
    <h2>📊 Kluczowe Metryki</h2>
    <div class="data-grid">
      <div class="data-item">
        <div class="data-label">Cel Tygodniowy</div>
        <div class="data-value">${partner.celTygodniowy.toLocaleString('pl-PL')} PLN</div>
      </div>
      <div class="data-item">
        <div class="data-label">Sprzedaż Tygodniowa</div>
        <div class="data-value">${Math.round(weeklySales).toLocaleString('pl-PL')} PLN</div>
      </div>
      <div class="data-item">
        <div class="data-label">Progres</div>
        <div class="data-value">${progressPercent}%</div>
      </div>
      <div class="data-item">
        <div class="data-label">Dynamika M/M</div>
        <div class="data-value">${partner.dynamikaMM}</div>
      </div>
      <div class="data-item">
        <div class="data-label">Cel Miesięczny</div>
        <div class="data-value">${partner.realizacji}%</div>
      </div>
      <div class="data-item">
        <div class="data-label">Koszt ADS</div>
        <div class="data-value">${partner.kosztAds.toLocaleString('pl-PL')} PLN</div>
      </div>
    </div>
  </div>

  ${chartSection}

  ${topChangesSection}

  <div class="section">
    <h2>📝 Szczegółowy Raport</h2>
    <div class="content">
      ${aiGeneratedContent.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
    </div>
  </div>

  ${linksSection}

  <div class="footer">
    <p><strong>🚀 System Partner Reports by Vsprint</strong></p>
    <p>Ten raport został wygenerowany automatycznie na podstawie danych z Google Sheets, ClickUp i AI.</p>
    <p style="margin-top: 15px;">W razie pytań, skontaktuj się z opiekunem:<br><strong>${partner.opiekunFsEmail}</strong></p>
  </div>
</body>
</html>
  `.trim();
}

export function generateOpinionRequestEmail(
  partner: Partner,
  opiekunEmail: string,
  token: string,
  baseUrl: string
): string {
  const generateStarLink = (rating: number) => {
    const stars = '⭐'.repeat(rating);
    const url = `${baseUrl}/api/opinion/submit/${token}?stars=${rating}`;
    return `<a href="${url}" style="text-decoration: none; font-size: 32px; margin: 0 5px; display: inline-block; padding: 10px; background: #f8f9fa; border-radius: 8px; transition: all 0.2s;">${stars}</a>`;
  };

  const starLinks = [1, 2, 3, 4, 5]
    .map((rating) => generateStarLink(rating))
    .join(' ');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
      text-align: center;
    }
    .rating-section {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 8px;
      margin: 30px 0;
      text-align: center;
    }
    .rating-section h3 {
      color: #f5576c;
      margin-bottom: 20px;
    }
    .stars {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💬 Poproś o Opinię</h1>
    <p>Twoja opinia jest dla nas bardzo ważna!</p>
  </div>

  <div class="content">
    <h2>Witaj, ${partner.nazwaKonta}!</h2>
    <p>
      Chcielibyśmy poznać Twoją opinię na temat naszej współpracy.<br>
      Jak oceniasz nasze usługi w ostatnim okresie?
    </p>

    <div class="rating-section">
      <h3>Kliknij na gwiazdki, aby wybrać ocenę:</h3>
      <div class="stars">
        ${starLinks}
      </div>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        (1 ⭐ = Niezadowolony | 5 ⭐⭐⭐⭐⭐ = Bardzo zadowolony)
      </p>
    </div>

    <p>
      Kliknij na gwiazdki, aby wyrazić swoją opinię.<br>
      To zajmie tylko chwilę!
    </p>
  </div>

  <div class="footer">
    <p>Dziękujemy za współpracę!</p>
    <p>Zespół Vsprint | ${partner.opiekunFsEmail}</p>
  </div>
</body>
</html>
  `.trim();
}

export function generatePDFAttachmentEmail(
  partner: Partner,
  reportType: 'monthly' | 'weekly',
  dateRange: { start: Date; end: Date }
): string {
  const dateRangeStr = formatDateRange(dateRange.start, dateRange.end);
  const reportName = reportType === 'monthly'
    ? 'Raport Miesięczny'
    : 'Raport Tygodniowy';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 3px solid #FF7F50;
    }
    .header h2 {
      color: #FF7F50;
      margin: 0;
    }
    .content {
      padding: 30px 0;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>${reportName}</h2>
    <p style="margin: 10px 0 0 0; color: #666;">${dateRangeStr}</p>
  </div>

  <div class="content">
    <p>Dzień dobry <strong>${partner.nazwaKonta}</strong>,</p>

    <p>W załączniku przesyłamy ${reportName.toLowerCase()} z podsumowaniem działań na Państwa koncie za okres ${dateRangeStr}.</p>

    <p>Raport zawiera:</p>
    <ul>
      <li>Podsumowanie wykonanych działań</li>
      <li>Opis współpracy i rekomendacje</li>
      <li>Wyniki sprzedażowe</li>
      <li>Metryki kampanii reklamowych ADS</li>
      <li>Dynamikę wzrostu (R/R, M/M)</li>
      <li>Historię sprzedaży</li>
    </ul>

    <p>W razie pytań pozostajemy do dyspozycji.</p>

    <p>Z poważaniem,<br>
    <strong>${partner.opiekun || 'Zespół vSprint'}</strong></p>
  </div>

  <div class="footer">
    <p><strong>vSprint | Allegro Ads Partner</strong></p>
    <p>${partner.opiekunFsEmail}</p>
  </div>
</body>
</html>
  `.trim();
}
