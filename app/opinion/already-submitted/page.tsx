export default function AlreadySubmitted() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-100">
      <div className="bg-white p-12 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="text-6xl mb-6">ℹ️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Ankieta już wypełniona
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Dziękujemy! Twoja opinia została już wcześniej zapisana.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Każdy link do ankiety może być użyty tylko raz ze względów bezpieczeństwa.
          </p>
        </div>
      </div>
    </div>
  );
}
