import { WeeklySalesData } from '@/types';

interface ChartConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  chartType?: 'bar' | 'line';
}

class ChartGenerator {
  private readonly QUICKCHART_BASE_URL = 'https://quickchart.io/chart';

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

    // Prepare data for Chart.js format
    const labels = salesData.map((d) => {
      const date = new Date(d.date);
      return `${d.day}\n${date.getDate()}.${date.getMonth() + 1}`;
    });

    const data = salesData.map((d) => d.sales);

    // Create Chart.js configuration
    const chartConfig = {
      type: chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sprzedaż (PLN)',
            data: data,
            backgroundColor: 'rgba(255, 127, 80, 0.8)', // Orange like in PDF
            borderColor: 'rgba(255, 127, 80, 1)',
            borderWidth: 2,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 14,
                family: 'Arial',
              },
            },
          },
          title: {
            display: true,
            text: 'Sprzedaż w ostatnim tygodniu',
            font: {
              size: 18,
              weight: 'bold',
            },
            padding: 20,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value: number) {
                return value.toLocaleString('pl-PL') + ' PLN';
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
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
      // Use QuickChart.io to generate chart image
      const chartUrl = new URL(this.QUICKCHART_BASE_URL);
      chartUrl.searchParams.set('c', JSON.stringify(chartConfig));
      chartUrl.searchParams.set('width', width.toString());
      chartUrl.searchParams.set('height', height.toString());
      chartUrl.searchParams.set('backgroundColor', backgroundColor);

      console.log('[ChartGenerator] Generating chart from QuickChart.io');

      // Fetch the image as base64
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

      // Return a fallback simple chart URL (without downloading)
      const fallbackUrl = new URL(this.QUICKCHART_BASE_URL);
      fallbackUrl.searchParams.set('c', JSON.stringify(chartConfig));
      fallbackUrl.searchParams.set('width', width.toString());
      fallbackUrl.searchParams.set('height', height.toString());

      return fallbackUrl.toString();
    }
  }

  generateSimpleTextChart(salesData: WeeklySalesData[]): string {
    // Fallback: Generate ASCII-style text representation
    let chart = 'SPRZEDAŻ W OSTATNIM TYGODNIU:\n\n';

    salesData.forEach((d) => {
      const date = new Date(d.date);
      const barLength = Math.round((d.sales / 10000) * 20); // Scale to ~20 chars max
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
    const avgDailySales = totalSales / salesData.length;

    // Create a summary chart with target line
    const labels = salesData.map((d) => {
      const date = new Date(d.date);
      return `${d.day}\n${date.getDate()}.${date.getMonth() + 1}`;
    });

    const data = salesData.map((d) => d.sales);

    // Target line (cel tygodniowy divided by 7 days)
    const dailyTarget = celTygodniowy / 7;
    const targetLine = new Array(salesData.length).fill(dailyTarget);

    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sprzedaż dzienna (PLN)',
            data: data,
            backgroundColor: 'rgba(255, 127, 80, 0.8)',
            borderColor: 'rgba(255, 127, 80, 1)',
            borderWidth: 2,
            borderRadius: 6,
            order: 2,
          },
          {
            label: 'Cel dzienny (PLN)',
            data: targetLine,
            type: 'line',
            borderColor: 'rgba(76, 175, 80, 1)',
            borderWidth: 3,
            borderDash: [10, 5],
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
            labels: {
              font: {
                size: 14,
                family: 'Arial',
              },
            },
          },
          title: {
            display: true,
            text: [
              'Sprzedaż w ostatnim tygodniu',
              `Łącznie: ${totalSales.toLocaleString('pl-PL')} PLN | Cel: ${celTygodniowy.toLocaleString('pl-PL')} PLN`,
            ],
            font: {
              size: 18,
              weight: 'bold',
            },
            padding: 20,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value: number) {
                return value.toLocaleString('pl-PL');
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
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
      // Return simple chart as fallback
      return this.generateSalesChart(salesData);
    }
  }
}

export const chartGenerator = new ChartGenerator();
