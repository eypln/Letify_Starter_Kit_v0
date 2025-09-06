'use client';

import { useSearchParams } from 'next/navigation';

export default function NewPostClient() {
  const params = useSearchParams();
  const step = params.get('step') ?? '1';

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">New Post</h1>
      <p className="opacity-70">step: {step}</p>
      {/* burada eski UI'nı tekrar koyabilirsin */}
    </div>
  );
}
