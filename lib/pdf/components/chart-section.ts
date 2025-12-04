import { PDFPage } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface ChartData {
  months: string[];
  sales: number[];
}

// Format month label: "11.2024" -> "Lis'24"
function formatMonthLabel(month: string): string {
  const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
  const parts = month.split('.');
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[0]) - 1;
    const year = parts[1].slice(-2);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNames[monthIdx]}'${year}`;
    }
  }
  return month;
}

// Generate chart using QuickChart.io API (POST method for reliability)
export async function generateHistoricalChart(data: ChartData): Promise<Buffer | null> {
  try {
    // Data should already be cleaned by sheets service - just validate
    if (data.months.length === 0 || data.sales.length === 0) {
      console.log('[Chart] No data provided for chart');
      return null;
    }

    console.log(`[Chart] Generating chart with ${data.months.length} data points`);
    console.log(`[Chart] Months:`, data.months);
    console.log(`[Chart] Sales:`, data.sales);

    // Format labels for display
    const formattedLabels = data.months.map(formatMonthLabel);

    // Convert sales to thousands for cleaner Y-axis
    const salesInThousands = data.sales.map(s => Math.round(s / 1000));

    console.log(`[Chart] Labels:`, formattedLabels);
    console.log(`[Chart] Values (tys.):`, salesInThousands);

    const chartConfig = {
      type: 'bar',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Sprzedaż (tyś. PLN)',
          data: salesInThousands,
          backgroundColor: 'rgba(255, 120, 70, 1)',
          borderColor: 'rgba(200, 80, 40, 1)',
          borderWidth: 3,
          borderRadius: 8,
          barPercentage: 0.75,
          categoryPercentage: 0.9,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'SPRZEDAŻ (w tysiącach PLN)',
            font: { size: 32, weight: 'bold', family: 'Arial' },
            color: '#222',
            padding: { top: 10, bottom: 20 },
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 24, weight: 'bold', family: 'Arial' },
              color: '#333',
              padding: 20,
              boxWidth: 30,
              boxHeight: 20,
            },
          },
          datalabels: {
            display: true,
            color: '#000',
            font: { size: 26, weight: 'bold', family: 'Arial' },
            anchor: 'end',
            align: 'top',
            offset: 6,
            formatter: (val: number) => val.toLocaleString('pl-PL') + ' tyś.',
          },
        },
        scales: {
          y: {
            display: true,
            beginAtZero: true,
            grace: '20%',
            title: {
              display: true,
              text: 'tyś. PLN',
              font: { size: 22, weight: 'bold', family: 'Arial' },
              color: '#444',
              padding: 10,
            },
            ticks: {
              font: { size: 20, weight: 'bold', family: 'Arial' },
              color: '#444',
              padding: 8,
            },
            grid: {
              color: 'rgba(0,0,0,0.1)',
              lineWidth: 1,
            },
          },
          x: {
            title: {
              display: true,
              text: 'Miesiąc',
              font: { size: 22, weight: 'bold', family: 'Arial' },
              color: '#444',
              padding: 10,
            },
            ticks: {
              font: { size: 24, weight: 'bold', family: 'Arial' },
              color: '#333',
              maxRotation: 0,
              minRotation: 0,
              padding: 10,
            },
            grid: { display: false },
            border: { display: false },
          },
        },
        layout: {
          padding: {
            top: 15,
            right: 40,
            bottom: 15,
            left: 15,
          },
        },
      },
    };

    // Use POST method for reliable chart generation
    // Smaller canvas = larger fonts relative to chart, then scale up with devicePixelRatio
    const response = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart: chartConfig,
        width: 800,    // Small canvas = fonts look bigger
        height: 500,   // Good aspect ratio
        backgroundColor: 'white',
        format: 'png',
        devicePixelRatio: 4,  // Scale up 4x for high resolution
      }),
    });

    if (!response.ok) {
      console.error('[Chart] QuickChart API error:', response.status, response.statusText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`[Chart] Generated chart, size: ${arrayBuffer.byteLength} bytes`);
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Chart] Error generating chart:', error);
    return null;
  }
}

export async function renderChartSection(
  generator: PDFGenerator,
  page: PDFPage,
  data: ChartData,
  startY: number
): Promise<number> {
  const x = LAYOUT.margin.left;
  let y = startY;

  // Section header - chart shows 5 months before current month (for previous month report)
  y = generator.drawSectionHeader(page, '6. Historia sprzedaży (5 ostatnich miesięcy)', x, y);
  y -= LAYOUT.spacing.paragraph;

  // Check if we have data (already cleaned by sheets service)
  if (data.months.length === 0 || data.sales.length === 0) {
    generator.drawText(page, 'Brak danych historycznych.', x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.muted,
    });
    y -= LAYOUT.fonts.body + LAYOUT.spacing.section;
    return y;
  }

  console.log(`[ChartSection] Rendering chart with ${data.months.length} months:`, data.months);

  // Generate chart
  const chartBuffer = await generateHistoricalChart(data);

  if (chartBuffer) {
    try {
      const chartImage = await generator.embedImageFromBuffer(chartBuffer, 'png');
      const chartWidth = LAYOUT.chart.width;
      const chartHeight = LAYOUT.chart.height;

      // Center the chart
      const chartX = x + (LAYOUT.content.width - chartWidth) / 2;

      generator.drawImage(page, chartImage, chartX, y, chartWidth, chartHeight);
      y -= chartHeight + LAYOUT.spacing.paragraph;
    } catch (error) {
      console.error('[Chart] Error embedding chart:', error);
      generator.drawText(page, 'Nie udało się wygenerować wykresu.', x, y, {
        size: LAYOUT.fonts.body,
        color: COLORS.text.muted,
      });
      y -= LAYOUT.fonts.body;
    }
  } else {
    generator.drawText(page, 'Nie udało się wygenerować wykresu.', x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.muted,
    });
    y -= LAYOUT.fonts.body;
  }

  y -= LAYOUT.spacing.section;

  return y;
}
