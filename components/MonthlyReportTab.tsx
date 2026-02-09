'use client';

import { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import EmailEditorModal from './EmailEditorModal';

interface MonthlyReportTabProps {
  partners: Array<{ id: string; name: string; email: string }>;
}

export default function MonthlyReportTab({ partners }: MonthlyReportTabProps) {
  const [selectedPartner, setSelectedPartner] = useState('');
  const [celMiesieczny, setCelMiesieczny] = useState('');
  const [obrot, setObrot] = useState('');
  const [osiagniecia, setOsiagniecia] = useState('');
  const [wyzwania, setWyzwania] = useState('');
  const [plany, setPlany] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Preview state
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setReportGenerated(false);

    try {
      const response = await fetch('/api/reports/monthly/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: selectedPartner,
          celMiesieczny: celMiesieczny ? parseFloat(celMiesieczny.replace(/\s/g, '').replace(',', '.')) : null,
          obrot: obrot ? parseFloat(obrot.replace(/\s/g, '').replace(',', '.')) : null,
          osiagniecia,
          wyzwania,
          plany,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEditableContent(data.aiContent);
        setReportData(data);
        setReportGenerated(true);
        setShowEditorModal(true); // Open modal immediately after generation
      } else {
        alert('Błąd: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Wystąpił błąd podczas generowania raportu');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (editedContent: string) => {
    if (!reportData) return;

    setSending(true);

    try {
      const response = await fetch('/api/reports/monthly/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: selectedPartner,
          aiContent: editedContent,
          reportData: reportData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Raport miesięczny został wysłany!');
        // Reset form
        setSelectedPartner('');
        setCelMiesieczny('');
        setObrot('');
        setOsiagniecia('');
        setWyzwania('');
        setPlany('');
        setReportGenerated(false);
        setShowEditorModal(false);
        setEditableContent('');
        setReportData(null);
      } else {
        alert('Błąd: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Wystąpił błąd podczas wysyłania raportu');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    setReportGenerated(false);
    setShowEditorModal(false);
    setEditableContent('');
    setReportData(null);
  };

  return (
    <div className="space-y-6">
      {!reportGenerated ? (
        <form onSubmit={handleGenerate} className="space-y-6">
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
              Cel na aktualny miesiąc (PLN)
              <span className="text-gray-500 font-normal ml-2">(zostanie zapisany w arkuszu bieżącego miesiąca)</span>
            </label>
            <input
              type="text"
              value={celMiesieczny}
              onChange={(e) => setCelMiesieczny(e.target.value)}
              placeholder="np. 150000 lub 150 000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            />
            <p className="mt-1 text-sm text-gray-500">
              Wpisz cel sprzedażowy na bieżący miesiąc. Raport podsumowuje poprzedni miesiąc, a cel zostanie zapisany dla aktualnego miesiąca.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Obrót uwzględniający zwroty i anulowane zamówienia (PLN)
            </label>
            <input
              type="text"
              value={obrot}
              onChange={(e) => setObrot(e.target.value)}
              placeholder="np. 120000 lub 120 000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            />
            <p className="mt-1 text-sm text-gray-500">
              Obrót po uwzględnieniu zwrotów i anulowanych zamówień za poprzedni miesiąc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Osiągnięcia
            </label>
            <textarea
              value={osiagniecia}
              onChange={(e) => setOsiagniecia(e.target.value)}
              required
              rows={4}
              placeholder="Opisz najważniejsze osiągnięcia w tym miesiącu..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wyzwania
            </label>
            <textarea
              value={wyzwania}
              onChange={(e) => setWyzwania(e.target.value)}
              required
              rows={4}
              placeholder="Opisz główne wyzwania i trudności..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plany na przyszłość
            </label>
            <textarea
              value={plany}
              onChange={(e) => setPlany(e.target.value)}
              required
              rows={4}
              placeholder="Opisz plany i cele na kolejny okres..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generowanie raportu z AI...</span>
              </span>
            ) : (
              '👁️ Wygeneruj podgląd raportu'
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Raport został wygenerowany!</span>
            </h3>
            <p className="text-sm text-green-800">
              Kliknij przycisk poniżej, aby otworzyć edytor i przejrzeć treść przed wysłaniem.
            </p>
          </div>

          <button
            onClick={() => setShowEditorModal(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
          >
            <span>📝</span>
            <span>Otwórz edytor i wyślij raport</span>
          </button>

          <button
            onClick={handleCancel}
            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all font-medium"
          >
            ← Anuluj i wróć do formularza
          </button>
        </div>
      )}

      {/* Email Editor Modal */}
      <EmailEditorModal
        isOpen={showEditorModal && !!editableContent}
        onClose={handleCancel}
        onSend={handleSend}
        initialContent={editableContent}
        subject={`Raport miesięczny - ${selectedPartner}`}
        recipientEmail={reportData?.partner?.opiekunFsEmail || ''}
        isSending={sending}
      />
    </div>
  );
}
