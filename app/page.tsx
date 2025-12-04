'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MonthlyReportTab from '@/components/MonthlyReportTab';
import WeeklyReportTab from '@/components/WeeklyReportTab';
import OpinionRequestTab from '@/components/OpinionRequestTab';

type Tab = 'monthly' | 'weekly' | 'opinion';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('monthly');
  const [partners, setPartners] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPartners();
    }
  }, [status]);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners');
      const data = await response.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Partner Reports
              </h1>
              <p className="text-xs text-gray-500">System raportów Vsprint</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {session?.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('monthly')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'monthly'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📊 Raport Miesięczny
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'weekly'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📅 Raport Tygodniowy
              </button>
              <button
                onClick={() => setActiveTab('opinion')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'opinion'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                💬 Prośba o Opinię
              </button>
            </nav>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Ładowanie danych partnerów...</p>
              </div>
            ) : (
              <>
                {activeTab === 'monthly' && (
                  <MonthlyReportTab partners={partners} />
                )}
                {activeTab === 'weekly' && (
                  <WeeklyReportTab partners={partners} />
                )}
                {activeTab === 'opinion' && (
                  <OpinionRequestTab partners={partners} />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
