
import dynamicImport from 'next/dynamic';
export const dynamic = 'force-dynamic';

const SubscriptionClient = dynamicImport(() => import('./SubscriptionClient'), {
  ssr: false,
  loading: () => null,
});

export default function Page() {
  return <SubscriptionClient />;
}
