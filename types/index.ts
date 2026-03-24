export interface Partner {
  opiekun: string;
  partner: string;
  nazwaKonta: string;
  pakiet: string;
  allegroPl: number;
  allegroCz: number;
  allegreSk: number;
  allegroHu: number;
  suma: number;
  allegroCzPl: number;
  allegroSkPl: number;
  allegroHuPl: number;
  celDzienny: number;
  celTygodniowy: number;
  cel: number;
  realizacji: number;
  progres: string;
  dynamikaRR: string;
  dynamikaMM: string;
  trend2024: string;
  trend2025: string;
  kosztAds: number;
  przychodAds: number;
  zwrotZAdsPoprzedniMiesiac: number;
  zwrotZAds: number;
  oczekiwanyZwrotZAds: number;
  zgodnosc: string;
  udzialAdsWPrzychodach: string;
  sumaProwizji: number;
  dopuszczalnaProwizja: number;
  czasWysylki: string;
  iloscOfertZGnc: number;
  iloscWystawionychOfert: number;
  iloscZoptymalizowanychOfert: number;
  iloscWyroznionychOfert: number;
  iloscOfertWStrefieOkazji: number;
  allegroDays: string;
  allegroDiamond: string;
  opiekunAds: string;
  raportAllegroAds: string;
  idSprzedawcy: string;
  dodatkoweInformacje: string;
  zyskAllegro: number;
  opiekunFsEmail: string;
  opiekunAdsEmail: string;
}

export interface PartnerAction {
  data: string;
  opis: string;
  kategoria: string;
  status: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
  };
  date_created: string;
  date_closed?: string;
  description: string;
  assignees: Array<{
    username: string;
    email: string;
  }>;
}

export interface ReportData {
  partner: Partner;
  actions: PartnerAction[];
  clickupTasks: ClickUpTask[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface MonthlyReportInput {
  partnerId: string;
  osiagniecia: string;
  wyzwania: string;
  plany: string;
}

export interface WeeklyReportInput {
  partnerId: string;
  wykonaneDzialania: string;
}

export interface OpinionRequestInput {
  partnerId: string;
}

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailTemplateWithAttachment extends EmailTemplate {
  attachments?: EmailAttachment[];
}

export interface TypeformLink {
  rating: number;
  url: string;
}

export interface HistoryChange {
  dataZdarzenia: Date;
  godzinaZdarzenia: string;
  konto: string;
  rodzaj: string;
  idOferty: string;
  wartosc: string;      // tekstowa wartość (np. nowy tytuł oferty)
  wartoscPrzed: string; // poprzednia wartość tekstowa
}

export interface WeeklySalesData {
  day: string;
  date: Date;
  sales: number;
}

export interface MonthlySalesData {
  month: string;      // Format: "Sty", "Lut", etc.
  year: number;
  date: Date;
  sales: number;
}

export interface TopChange {
  description: string;
  konto: string;
  rodzaj: string;
  wartosc: string;       // nowa wartość (tekst)
  wartoscPrzed: string;  // poprzednia wartość (tekst)
  dataZdarzenia: Date;
  idOferty: string;
}

export interface EnhancedWeeklyReportData extends ReportData {
  historiaZmian: HistoryChange[];
  topZmiany: TopChange[];
  salesData: WeeklySalesData[];
  chartImage?: string;
}
