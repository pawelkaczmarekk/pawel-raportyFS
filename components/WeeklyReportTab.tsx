'use client';

import { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import EmailEditorModal from './EmailEditorModal';

interface WeeklyReportTabProps {
  partners: Array<{ id: string; name: string; email: string }>;
}

export default function WeeklyReportTab({ partners }: WeeklyReportTabProps) {
  const [selectedPartner, setSelectedPartner] = useState('');
  const [wykonaneDzialania, setWykonaneDzialania] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Preview state
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setReportGenerated(false);

    try {
      const response = await fetch('/api/reports/weekly/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: selectedPartner,
          wykonaneDzialania,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPreviewHtml(data.preview);
        setEditableContent(data.aiContent);
        setReportData(data.reportData); // Store only the reportData part
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
      const response = await fetch('/api/reports/weekly/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: selectedPartner,
          aiContent: editedContent, // Send edited content from modal
          reportData: reportData,
          userInput: { wykonaneDzialania }, // Include user input for PDF actions section
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Raport tygodniowy został wysłany!');
        // Reset form
        setSelectedPartner('');
        setWykonaneDzialania('');
        setReportGenerated(false);
        setShowEditorModal(false);
        setPreviewHtml('');
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
    setPreviewHtml('');
    setEditableContent('');
    setReportData(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-5 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <span>Rozszerzony Raport Tygodniowy</span>
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p className="flex items-start gap-2">
            <span className="text-lg">📊</span>
            <span><strong>Automatyczne dane sprzedażowe:</strong> System pobierze dane z ostatnich 7 dni i wygeneruje wykres sprzedaży</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">🔥</span>
            <span><strong>TOP wydarzenia:</strong> AI analizuje najważniejsze zmiany w systemie i wyróżnia 5 kluczowych wydarzeń</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">✅</span>
            <span><strong>Zadania z ClickUp:</strong> Automatycznie pobierane zamknięte zadania z ostatniego tygodnia</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">📝</span>
            <span><strong>Podgląd i edycja:</strong> Przed wysłaniem możesz przejrzeć i edytować treść wygenerowaną przez AI</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-lg">🤖</span>
            <span><strong>AI + Twoje dane:</strong> Gemini AI łączy wszystkie źródła danych z Twoim opisem w profesjonalny raport</span>
          </p>
        </div>
      </div>

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
              Wykonane działania
              <span className="text-gray-500 font-normal ml-2">(opcjonalne dodatkowe informacje)</span>
            </label>
            <textarea
              value={wykonaneDzialania}
              onChange={(e) => setWykonaneDzialania(e.target.value)}
              required
              rows={6}
              placeholder="Opisz dodatkowe działania, które nie są widoczne w ClickUp lub systemie...&#10;&#10;Przykłady:&#10;• Konsultacje telefoniczne z klientem&#10;• Analiza konkurencji&#10;• Przygotowanie strategii na kolejny tydzień&#10;• Troubleshooting problemów technicznych"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
            />
            <p className="mt-2 text-sm text-gray-500">
              💡 Tip: AI automatycznie połączy Twój opis z danymi z ClickUp, Google Sheets i historią zmian
            </p>
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
        subject={`Raport tygodniowy - ${selectedPartner}`}
        recipientEmail={reportData?.partner?.opiekunFsEmail || ''}
        isSending={sending}
      />
    </div>
  );
}
