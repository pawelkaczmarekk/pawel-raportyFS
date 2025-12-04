export function getPreviousMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

export function getLast7DaysRange(): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  // Ensure we have Date objects (handles both Date and ISO string inputs)
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return `${startDate.toLocaleDateString('pl-PL', options)} - ${endDate.toLocaleDateString('pl-PL', options)}`;
}

export function getDayName(date: Date): string {
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  return days[date.getDay()];
}

export function getLastNDays(n: number): Date[] {
  const dates: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}
