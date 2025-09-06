'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SubscriptionClient() {
  const sp = useSearchParams();
  useEffect(() => {
    // Küçük bir değişiklik yapalım
    console.log('SubscriptionClient rendered', Object.fromEntries(sp.entries()));
  }, [sp]);
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Works</div>
        </CardContent>
      </Card>
    </div>
  );
}
