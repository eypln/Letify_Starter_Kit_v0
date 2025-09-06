
import dynamicImport from 'next/dynamic';

// İsim çakışmasın diye import'a dynamicImport ismi veriyoruz.
// Bu Next'in "export const dynamic" özel anahtarından farklıdır.
export const dynamic = 'force-dynamic'; // opsiyonel ama dev'de rahat

const NewPostClient = dynamicImport(() => import('./NewPostClient'), {
  ssr: false,
  loading: () => null,
});

export default function Page() {
  return <NewPostClient />;
}