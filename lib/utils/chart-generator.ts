import { WeeklySalesData, MonthlySalesData } from '@/types';

interface ChartConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  chartType?: 'bar' | 'line';
}

// Polish month abbreviations
const POLISH_MONTHS = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'
];

class ChartGenerator {
  private readonly QUICKCHART_BASE_URL = 'https://quickchart.io/chart';

  /**
   * Generate a 12-month sales chart with thin, readable bars
   * Shows data from 12 months back starting from previous month
   *
   * Best practices applied:
   * - Thin bars with proper spacing (barPercentage: 0.6)
   * - Zero baseline for accurate comparison
   * - Minimal gridlines for cleaner look
   * - Data labels on bars for easy reading
   * - Subtle colors with accent for current period
   * - Clear month/year labels
   */
  async generateMonthlyTrendChart(
    monthlySalesData: MonthlySalesData[],
    config: ChartConfig = {}
  ): Promise<string> {
    const {
      width = 1000,
      height = 500,
      backgroundColor = 'white',
    } = config;

    // Sort by date and take last 12 months
    const sortedData = [...monthlySalesData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12);

    // Prepare labels (Month 'YY format)
    const labels = sortedData.map((d) => {
      const yearShort = String(d.year).slice(-2);
      return `${d.month} '${yearShort}`;
    });

    const data = sortedData.map((d) => d.sales);

    // Calculate average for reference line
    const average = data.reduce((sum, val) => sum + val, 0) / data.length;
    const averageLine = new Array(data.length).fill(Math.round(average));

    // Highlight last month (most recent) with different color
    const backgroundColors = data.map((_, index) =>
      index === data.length - 1
        ? 'rgba(99, 102, 241, 0.9)'   // Indigo for last month
        : 'rgba(99, 102, 241, 0.5)'   // Lighter for others
    );

    const borderColors = data.map((_, index) =>
      index === data.length - 1
        ? 'rgba(99, 102, 241, 1)'
        : 'rgba(99, 102, 241, 0.7)'
    );

    // Chart.js configuration optimized for readability
    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sprzedaż miesięczna',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.6,        // Thin bars
            categoryPercentage: 0.8,   // Good spacing between bars
          },
          {
            label: 'Średnia',
            data: averageLine,
            type: 'line',
            borderColor: 'rgba(234, 88, 12, 0.8)',  // Orange
            borderWidth: 2,
            borderDash: [8, 4],
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
            top: 30,    // Space for data labels
            right: 20,
            bottom: 10,
            left: 10,
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              font: {
                size: 12,
                family: 'Arial, sans-serif',
              },
              usePointStyle: true,
              boxWidth: 8,
              padding: 20,
            },
          },
          title: {
            display: true,
            text: 'Trend sprzedaży - ostatnie 12 miesięcy',
            font: {
              size: 18,
              weight: 'bold',
              family: 'Arial, sans-serif',
            },
            padding: {
              bottom: 20,
            },
            color: '#1f2937',
          },
          // Data labels plugin - show values on top of bars
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            offset: 4,
            font: {
              size: 10,
              weight: 'bold',
            },
            color: '#374151',
            formatter: (value: number) => {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(0) + 'k';
              }
              return value.toString();
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.06)',  // Very subtle gridlines
              drawBorder: false,
            },
            border: {
              display: false,
            },
            ticks: {
              font: {
                size: 11,
              },
              color: '#6b7280',
              padding: 8,
              callback: function(value: number) {
                if (value >= 1000000) {
                  return (value / 1000000).toFixed(1) + 'M PLN';
                } else if (value >= 1000) {
                  return (value / 1000).toFixed(0) + 'k PLN';
                }
                return value + ' PLN';
              },
            },
          },
          x: {
            grid: {
              display: false,  // No vertical gridlines
            },
            border: {
              display: false,
            },
            ticks: {
              font: {
                size: 11,
                weight: '500',
              },
              color: '#374151',
              padding: 8,
            },
          },
        },
      },
    };

    try {
      const chartUrl = new URL(this.QUICKCHART_BASE_URL);
      chartUrl.searchParams.set('c', JSON.stringify(chartConfig));
      chartUrl.searchParams.set('width', width.toString());
      chartUrl.searchParams.set('height', height.toString());
      chartUrl.searchParams.set('backgroundColor', backgroundColor);
      chartUrl.searchParams.set('devicePixelRatio', '2');  // High DPI for crisp rendering

      console.log('[ChartGenerator] Generating 12-month trend chart');

      const response = await fetch(chartUrl.toString());

      if (!response.ok) {
        throw new Error(`QuickChart API error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      console.log('[ChartGenerator] 12-month chart generated successfully');

      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('[ChartGenerator] Error generating monthly trend chart:', error);
      throw error;
    }
  }

  /**
   * Helper to generate monthly sales data for the last 12 months
   * starting from the previous month
   */
  static generateLast12MonthsData(
    getMonthlySales: (year: number, month: number) => number
  ): MonthlySalesData[] {
    const result: MonthlySalesData[] = [];
    const now = new Date();

    // Start from previous month
    let currentDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Go back 12 months
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() - (11 - i));

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();

      result.push({
        month: POLISH_MONTHS[month],
        year: year,
        date: new Date(year, month, 1),
        sales: getMonthlySales(year, month + 1),  // month + 1 for 1-indexed
      });
    }

    return result;
  }

  // ============================================
  // Original weekly chart methods (kept for compatibility)
  // ============================================

  async generateSalesChart(
    salesData: WeeklySalesData[],
    config: ChartConfig = {}
  ): Promise<string> {
    const {
      width = 800,
      height = 400,
      backgroundColor = 'white',
      chartType = 'bar',
    } = config;

    const labels = salesData.map((d) => {
      const date = new Date(d.date);
      return `${d.day}\n${date.getDate()}.${date.getMonth() + 1}`;
    });

    const data = salesData.map((d) => d.sales);

    const chartConfig = {
      type: chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sprzedaż (PLN)',
            data: data,
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,  // Cleaner without legend for simple chart
          },
          title: {
            display: true,
            text: 'Sprzedaż w ostatnim tygodniu',
            font: {
              size: 16,
              weight: 'bold',
            },
            padding: 16,
          },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            font: {
              size: 10,
              weight: 'bold',
            },
            formatter: (value: number) => {
              return value >= 1000
                ? (value / 1000).toFixed(1) + 'k'
                : value.toString();
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.06)',
            },
            ticks: {
              callback: function (value: number) {
                return value.toLocaleString('pl-PL') + ' PLN';
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    };

    try {
      const chartUrl = new URL(this.QUICKCHART_BASE_URL);
      chartUrl.searchParams.set('c', JSON.stringify(chartConfig));
      chartUrl.searchParams.set('width', width.toString());
      chartUrl.searchParams.set('height', height.toString());
      chartUrl.searchParams.set('backgroundColor', backgroundColor);

      console.log('[ChartGenerator] Generating chart from QuickChart.io');

      const response = await fetch(chartUrl.toString());

      if (!response.ok) {
        throw new Error(`QuickChart API error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      console.log('[ChartGenerator] Chart generated successfully');

      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('[ChartGenerator] Error generating chart:', error);

      const fallbackUrl = new URL(this.QUICKCHART_BASE_URL);
      fallbackUrl.searchParams.set('c', JSON.stringify(chartConfig));
      fallbackUrl.searchParams.set('width', width.toString());
      fallbackUrl.searchParams.set('height', height.toString());

      return fallbackUrl.toString();
    }
  }

  generateSimpleTextChart(salesData: WeeklySalesData[]): string {
    let chart = 'SPRZEDAŻ W OSTATNIM TYGODNIU:\n\n';

    salesData.forEach((d) => {
      const date = new Date(d.date);
      const barLength = Math.round((d.sales / 10000) * 20);
      const bar = '█'.repeat(Math.max(1, barLength));

      chart += `${d.day} ${date.getDate()}.${date.getMonth() + 1}: ${bar} ${d.sales.toLocaleString('pl-PL')} PLN\n`;
    });

    return chart;
  }

  async generateWeeklySummaryChart(
    salesData: WeeklySalesData[],
    celTygodniowy: number
  ): Promise<string> {
    const totalSales = salesData.reduce((sum, d) => sum + d.sales, 0);

    const labels = salesData.map((d) => {
      const date = new Date(d.date);
      return `${d.day}\n${date.getDate()}.${date.getMonth() + 1}`;
    });

    const data = salesData.map((d) => d.sales);
    const dailyTarget = celTygodniowy / 7;
    const targetLine = new Array(salesData.length).fill(dailyTarget);

    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sprzedaż dzienna',
            data: data,
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.7,
            order: 2,
          },
          {
            label: 'Cel dzienny',
            data: targetLine,
            type: 'line',
            borderColor: 'rgba(34, 197, 94, 0.9)',
            borderWidth: 2,
            borderDash: [6, 3],
            fill: false,
            pointRadius: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              font: {
                size: 11,
              },
              usePointStyle: true,
              boxWidth: 8,
            },
          },
          title: {
            display: true,
            text: [
              'Sprzedaż tygodniowa',
              `Suma: ${totalSales.toLocaleString('pl-PL')} PLN | Cel: ${celTygodniowy.toLocaleString('pl-PL')} PLN`,
            ],
            font: {
              size: 16,
              weight: 'bold',
            },
            padding: 16,
          },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            font: {
              size: 10,
            },
            formatter: (value: number) => {
              return value >= 1000
                ? (value / 1000).toFixed(1) + 'k'
                : value.toString();
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.06)',
            },
            ticks: {
              callback: function (value: number) {
                return value.toLocaleString('pl-PL');
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    };

    try {
      const chartUrl = new URL(this.QUICKCHART_BASE_URL);
      chartUrl.searchParams.set('c', JSON.stringify(chartConfig));
      chartUrl.searchParams.set('width', '900');
      chartUrl.searchParams.set('height', '450');
      chartUrl.searchParams.set('backgroundColor', 'white');

      const response = await fetch(chartUrl.toString());

      if (!response.ok) {
        throw new Error(`QuickChart API error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('[ChartGenerator] Error generating summary chart:', error);
      return this.generateSalesChart(salesData);
    }
  }
}

export const chartGenerator = new ChartGenerator();
export { ChartGenerator };
