'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const rating = searchParams.get('rating') || '0';
  const stars = '⭐'.repeat(parseInt(rating));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white p-12 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="text-6xl mb-6">✓</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Dziękujemy!
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Twoja opinia została zapisana.
        </p>
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <p className="text-sm text-gray-500 mb-2">Twoja ocena:</p>
          <div className="text-4xl">{stars}</div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{rating}/5</p>
        </div>
        <p className="text-sm text-gray-500">
          Twoja opinia pomoże nam lepiej świadczyć usługi.
        </p>
      </div>
    </div>
  );
}

export default function ThankYou() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
