'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
      <div className="text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Błąd logowania
        </h1>
        <p className="text-gray-600 mb-6">
          {error === 'AccessDenied'
            ? 'Dostęp tylko dla użytkowników z domeny @vsprint'
            : 'Wystąpił błąd podczas logowania. Spróbuj ponownie.'}
        </p>
        <Link
          href="/auth/signin"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Powrót do logowania
        </Link>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
      <Suspense fallback={
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="text-gray-300 text-5xl mb-4">⏳</div>
            <p className="text-gray-600">Ładowanie...</p>
          </div>
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
