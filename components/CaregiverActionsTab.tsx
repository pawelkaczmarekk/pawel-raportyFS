'use client';

import { useState, useEffect, useRef } from 'react';
import SearchableSelect from './SearchableSelect';

interface CaregiverActionsTabProps {
  partners: Array<{ id: string; name: string; email: string }>;
}

interface SavedAction {
  id: string;
  partnerName: string;
  action: string;
  timestamp: string;
}

const STORAGE_KEY = 'caregiver-actions';

function getInitialActions(): SavedAction[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export default function CaregiverActionsTab({ partners }: CaregiverActionsTabProps) {
  const [selectedPartner, setSelectedPartner] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [savedActions, setSavedActions] = useState<SavedAction[]>(getInitialActions);
  const [filterPartner, setFilterPartner] = useState('');
  const isInitialMount = useRef(true);

  // Save actions to localStorage whenever they change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedActions));
  }, [savedActions]);

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !currentAction.trim()) return;

    const newAction: SavedAction = {
      id: Date.now().toString(),
      partnerName: selectedPartner,
      action: currentAction.trim(),
      timestamp: new Date().toLocaleString('pl-PL'),
    };

    setSavedActions(prev => [newAction, ...prev]);
    setCurrentAction('');
  };

  const handleDeleteAction = (id: string) => {
    setSavedActions(prev => prev.filter(action => action.id !== id));
  };

  const filteredActions = filterPartner
    ? savedActions.filter(action => action.partnerName === filterPartner)
    : savedActions;

  const uniquePartners = [...new Set(savedActions.map(a => a.partnerName))];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-5 mb-6">
        <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <span>Dziennik Działań Opiekuna</span>
        </h3>
        <div className="text-sm text-emerald-800 space-y-2">
          <p className="flex items-start gap-2">
            <span className="text-lg">✍️</span>
            <span><strong>Zapisuj działania:</strong> Notuj wykonane czynności na kontach partnerów</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">📂</span>
            <span><strong>Lokalne przechowywanie:</strong> Dane zapisywane są lokalnie w przeglądarce</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">🔍</span>
            <span><strong>Filtrowanie:</strong> Przeglądaj działania dla wybranego partnera</span>
          </p>
        </div>
      </div>

      {/* Add new action form */}
      <form onSubmit={handleSaveAction} className="space-y-4 bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Dodaj nowe działanie</h4>

        <SearchableSelect
          value={selectedPartner}
          onChange={setSelectedPartner}
          options={partners}
          required
          label="Wybierz Partnera"
          placeholder="Wpisz nazwę partnera lub wybierz z listy..."
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opis wykonanego działania
          </label>
          <textarea
            value={currentAction}
            onChange={(e) => setCurrentAction(e.target.value)}
            required
            rows={4}
            placeholder="Opisz wykonane działanie na koncie partnera...&#10;&#10;Przykłady:&#10;• Aktualizacja kampanii reklamowej&#10;• Optymalizacja słów kluczowych&#10;• Kontakt telefoniczny z klientem"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={!selectedPartner || !currentAction.trim()}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
        >
          💾 Zapisz działanie
        </button>
      </form>

      {/* Saved actions list */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h4 className="font-medium text-gray-900">
            Zapisane działania ({filteredActions.length})
          </h4>

          {uniquePartners.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filtruj:</label>
              <select
                value={filterPartner}
                onChange={(e) => setFilterPartner(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value="">Wszyscy partnerzy</option>
                {uniquePartners.map(partner => (
                  <option key={partner} value={partner}>{partner}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredActions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl block mb-2">📭</span>
            <p>Brak zapisanych działań</p>
            {filterPartner && (
              <p className="text-sm mt-1">Spróbuj usunąć filtr lub dodaj nowe działanie</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredActions.map(action => (
              <div
                key={action.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {action.partnerName}
                      </span>
                      <span className="text-xs text-gray-500">{action.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{action.action}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteAction(action.id)}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                    title="Usuń działanie"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
