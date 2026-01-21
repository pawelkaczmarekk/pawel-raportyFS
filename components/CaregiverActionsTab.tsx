'use client';

import { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { ClickUpTask, HistoryChange, TopChange } from '@/types';

interface CaregiverActionsTabProps {
  partners: Array<{ id: string; name: string; email: string }>;
}

interface CompletedActionsData {
  clickupTasks: ClickUpTask[];
  driveChanges: HistoryChange[];
  topChanges: TopChange[];
  dateRange: {
    start: string;
    end: string;
  };
}

type DateRangeOption = 7 | 14 | 30;

export default function CaregiverActionsTab({ partners }: CaregiverActionsTabProps) {
  const [selectedPartner, setSelectedPartner] = useState('');
  const [selectedDays, setSelectedDays] = useState<DateRangeOption>(7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompletedActionsData | null>(null);

  const handlePartnerChange = (partnerName: string) => {
    setSelectedPartner(partnerName);
    setData(null);
    setError(null);
  };

  const handleDaysChange = (days: DateRangeOption) => {
    setSelectedDays(days);
    if (selectedPartner) {
      fetchCompletedActions(selectedPartner, days);
    }
  };

  const fetchCompletedActions = async (partnerName: string, days: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reports/completed-actions?partnerName=${encodeURIComponent(partnerName)}&days=${days}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nie udalo sie pobrac danych');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil nieoczekiwany blad');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetch = () => {
    if (selectedPartner) {
      fetchCompletedActions(selectedPartner, selectedDays);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHistoryDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-5 mb-6">
        <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <span>Wykonane Dzialania</span>
        </h3>
        <div className="text-sm text-emerald-800 space-y-2">
          <p className="flex items-start gap-2">
            <span className="text-lg">📊</span>
            <span><strong>Zadania ClickUp:</strong> Ukonczone zadania dla wybranego partnera</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">📂</span>
            <span><strong>Historia zmian (Drive):</strong> Zmiany zarejestrowane w arkuszach partnera</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">🔍</span>
            <span><strong>Widok read-only:</strong> Dane pobierane automatycznie z systemow</span>
          </p>
        </div>
      </div>

      {/* Partner selection and filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            value={selectedPartner}
            onChange={handlePartnerChange}
            options={partners}
            label="Wybierz Partnera"
            placeholder="Wpisz nazwe partnera lub wybierz z listy..."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zakres czasowy
            </label>
            <div className="flex gap-2">
              {([7, 14, 30] as DateRangeOption[]).map((days) => (
                <button
                  key={days}
                  onClick={() => handleDaysChange(days)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDays === days
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {days} dni
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleFetch}
          disabled={!selectedPartner || isLoading}
          className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Pobieranie...
            </span>
          ) : (
            '🔄 Pobierz dane'
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">❌</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Date range info */}
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            Zakres dat: <strong>{formatDate(data.dateRange.start)}</strong> - <strong>{formatDate(data.dateRange.end)}</strong>
          </div>

          {/* ClickUp Tasks Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">✅</span>
              Zadania ClickUp ({data.clickupTasks.length})
            </h4>

            {data.clickupTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">📭</span>
                <p>Brak ukonczonych zadan w tym okresie</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data.clickupTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-gray-900">{task.name}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {task.status?.status || 'Zamkniete'}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {task.date_closed && (
                            <span>Zamkniete: {formatDateTime(task.date_closed)}</span>
                          )}
                          {task.assignees && task.assignees.length > 0 && (
                            <span>Przypisane: {task.assignees.map(a => a.username).join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drive Changes Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📂</span>
              Historia zmian Drive ({data.driveChanges.length})
            </h4>

            {data.driveChanges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">📭</span>
                <p>Brak zmian w historii dla tego partnera</p>
              </div>
            ) : (
              <>
                {/* Top Changes Summary */}
                {data.topChanges.length > 0 && (
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h5 className="font-medium text-emerald-900 mb-2">Podsumowanie typow zmian:</h5>
                    <div className="flex flex-wrap gap-2">
                      {data.topChanges.map((change, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-100 text-emerald-800"
                        >
                          {change.description}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Changes List */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {data.driveChanges.map((change, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {change.rodzaj}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {formatHistoryDate(change.dataZdarzenia)} {change.godzinaZdarzenia}
                            </span>
                          </div>
                          {change.idOferty && (
                            <p className="text-xs text-gray-500 mb-1">
                              Oferta: {change.idOferty}
                            </p>
                          )}
                          {change.wartosc && (
                            <p className="text-gray-700">
                              <span className="text-green-600">→</span> {change.wartosc.substring(0, 100)}{change.wartosc.length > 100 ? '...' : ''}
                            </p>
                          )}
                          {change.wartoscPrzed && (
                            <p className="text-gray-500 text-xs mt-1">
                              <span className="text-red-500">←</span> Poprzednio: {change.wartoscPrzed.substring(0, 80)}{change.wartoscPrzed.length > 80 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no partner selected */}
      {!data && !isLoading && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          <span className="text-5xl block mb-3">🔍</span>
          <p className="text-lg">Wybierz partnera i kliknij &quot;Pobierz dane&quot;</p>
          <p className="text-sm mt-1">aby wyswietlic wykonane dzialania</p>
        </div>
      )}
    </div>
  );
}
