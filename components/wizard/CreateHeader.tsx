'use client';
import Link from 'next/link';
import HeaderTTL from './HeaderTTL';

export default function CreateHeader() {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">Yeni Post Oluştur</h1>
      <div className="flex items-center gap-3">
        <HeaderTTL />
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </Link>
      </div>
    </div>
  );
}