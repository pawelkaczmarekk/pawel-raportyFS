export default function OpinionError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
      <div className="bg-white p-12 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Wystąpił błąd
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Przepraszamy, nie udało się przetworzyć Twojej opinii.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Link może być nieprawidłowy lub wygasły. Skontaktuj się z opiekunem, jeśli problem się powtarza.
          </p>
        </div>
      </div>
    </div>
  );
}
