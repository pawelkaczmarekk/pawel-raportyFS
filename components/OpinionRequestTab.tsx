'use client';

import { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import EmailEditorModal from './EmailEditorModal';

interface OpinionRequestTabProps {
  partners: Array<{ id: string; name: string; email: string }>;
}

export default function OpinionRequestTab({
  partners,
}: OpinionRequestTabProps) {
  const [selectedPartner, setSelectedPartner] = useState('');
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
      const response = await fetch('/api/reports/opinion/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: selectedPartner,
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
      alert('Wystąpił błąd podczas generowania prośby o opinię');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (editedContent: string) => {
    if (!reportData) return;

    setSending(true);

    try {
      const response = await fetch('/api/reports/opinion/send', {
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
        alert('Prośba o opinię została wysłana!');
        // Reset form
        setSelectedPartner('');
        setReportGenerated(false);
        setShowEditorModal(false);
        setEditableContent('');
        setReportData(null);
      } else {
        alert('Błąd: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Wystąpił błąd podczas wysyłania prośby o opinię');
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
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-pink-900 mb-2">
          Jak działa prośba o opinię?
        </h3>
        <p className="text-sm text-pink-800">
          Partner otrzyma email z klikalnym emoji gwiazdek (od 1 do 5). Po
          kliknięciu zostanie przekierowany do formularza Typeform z
          pre-wypełnionym polem oceny, gdzie będzie mógł podzielić się swoją
          opinią.
        </p>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-3 rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generowanie emaila...</span>
              </span>
            ) : (
              '👁️ Wygeneruj podgląd emaila'
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Email został wygenerowany!</span>
            </h3>
            <p className="text-sm text-green-800">
              Kliknij przycisk poniżej, aby otworzyć edytor i przejrzeć treść przed wysłaniem.
            </p>
          </div>

          <button
            onClick={() => setShowEditorModal(true)}
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-4 rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
          >
            <span>📝</span>
            <span>Otwórz edytor i wyślij prośbę</span>
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
        subject={`Prośba o opinię - ${selectedPartner}`}
        recipientEmail={reportData?.partner?.opiekunFsEmail || ''}
        isSending={sending}
      />
    </div>
  );
}
