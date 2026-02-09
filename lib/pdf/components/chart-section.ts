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
// Optimized for 12 months with thin, readable bars
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

    // Calculate average for reference line
    const average = salesInThousands.reduce((sum, val) => sum + val, 0) / salesInThousands.length;
    const averageLine = new Array(salesInThousands.length).fill(Math.round(average));

    console.log(`[Chart] Labels:`, formattedLabels);
    console.log(`[Chart] Values (tys.):`, salesInThousands);
    console.log(`[Chart] Average:`, Math.round(average));

    // Highlight last month (most recent) with different color - Official vSprint orange #ff5c0a
    const backgroundColors = salesInThousands.map((_, index) =>
      index === salesInThousands.length - 1
        ? 'rgba(255, 92, 10, 0.95)'    // Official vSprint orange for last month
        : 'rgba(255, 92, 10, 0.65)'    // Lighter vSprint orange for others
    );

    const borderColors = salesInThousands.map((_, index) =>
      index === salesInThousands.length - 1
        ? 'rgba(230, 80, 8, 1)'        // Darker vSprint orange border
        : 'rgba(255, 92, 10, 0.85)'    // vSprint orange border
    );

    const chartConfig = {
      type: 'bar',
      data: {
        labels: formattedLabels,
        datasets: [
          {
            label: 'Sprzedaż (tyś. PLN)',
            data: salesInThousands,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.5,        // Thin bars (50% of available space)
            categoryPercentage: 0.85,  // Good spacing between bar groups
          },
          {
            label: 'Średnia',
            data: averageLine,
            type: 'line',
            borderColor: 'rgba(55, 65, 81, 0.8)',  // Dark gray for contrast
            borderWidth: 2,
            borderDash: [6, 3],
            fill: false,
            pointRadius: 0,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 25,
            right: 20,
            bottom: 10,
            left: 10,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Trend sprzedaży - ostatnie 12 miesięcy',
            font: { size: 24, weight: 'bold', family: 'Arial, sans-serif' },
            color: '#1f2937',
            padding: { top: 10, bottom: 20 },
          },
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              font: { size: 14, family: 'Arial, sans-serif' },
              color: '#4b5563',
              padding: 16,
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
            },
          },
          datalabels: {
            display: true,
            color: '#374151',
            font: { size: 11, weight: 'bold', family: 'Arial, sans-serif' },
            anchor: 'end',
            align: 'top',
            offset: 4,
            formatter: (val: number) => {
              if (val >= 1000) {
                return (val / 1000).toFixed(1) + 'M';
              }
              return val + 'k';
            },
          },
        },
        scales: {
          y: {
            display: true,
            beginAtZero: true,
            grace: '15%',
            border: {
              display: false,
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.06)',
              lineWidth: 1,
            },
            ticks: {
              font: { size: 12, family: 'Arial, sans-serif' },
              color: '#6b7280',
              padding: 8,
              callback: (value: number) => {
                if (value >= 1000) {
                  return (value / 1000).toFixed(0) + 'M';
                }
                return value + 'k';
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            border: {
              display: false,
            },
            ticks: {
              font: { size: 12, weight: '500', family: 'Arial, sans-serif' },
              color: '#374151',
              maxRotation: 45,
              minRotation: 45,
              padding: 6,
            },
          },
        },
      },
    };

    // Use POST method for reliable chart generation
    const response = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart: chartConfig,
        width: 900,
        height: 450,
        backgroundColor: 'white',
        format: 'png',
        devicePixelRatio: 3,  // High resolution for crisp PDF
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

  // Section header - 12 months
  y = generator.drawSectionHeader(page, '5. Historia sprzedaży (12 miesięcy)', x, y);
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

  // Warn if we have very few data points - might indicate wrong column matching
  if (data.months.length < 3) {
    console.warn(`[ChartSection] WARNING: Only ${data.months.length} data point(s) found - chart may be incomplete!`);
    console.warn(`[ChartSection] This might indicate wrong column matching in Statystyki sheet.`);
    console.warn(`[ChartSection] Data:`, data);
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
