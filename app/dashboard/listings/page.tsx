export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getListings } from './actions';
import AddDialog from './add-dialog';

// DEBUG: Her render'da kaç kayıt geldiğini ve son eklenen kaydın id'sini göster
export default async function ListingsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams?.page ?? '1') || 1);
  const { rows, pageCount, pageSize } = await getListings({ page });
  const startIndex = (page - 1) * pageSize;

  function hrefFor(p: number) {
    const params = new URLSearchParams(searchParams as any);
    params.set('page', String(p));
    return `?${params.toString()}`;
  }

  const first = 1;
  const last = pageCount;
  const prev = Math.max(first, page - 1);
  const next = Math.min(last, page + 1);
  const windowSize = 5;
  const start = Math.max(first, page - Math.floor(windowSize / 2));
  const end = Math.min(last, start + windowSize - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Listings</h1>
        <AddDialog />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th className="w-12">#</th>
              <th>Adding date</th>
              <th>Source URL</th>
              <th>City</th>
              <th>Price</th>
              <th>Bedroom</th>
              <th>Bathroom</th>
              <th>Property type</th>
              <th>Description</th>
              <th>FB post</th>
              <th>FB reels</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2">
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="text-right text-gray-500">{startIndex + i + 1}</td>
                <td className="whitespace-nowrap">{new Date(r.addingDate).toLocaleString()}</td>
                <td className="max-w-[220px] truncate">
                  {r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Link</a> : <span className="text-gray-400">—</span>}
                </td>
                <td className="max-w-[120px] truncate">{r.city ?? '—'}</td>
                <td className="whitespace-nowrap">{typeof r.price === 'number' ? r.price.toLocaleString() : '—'}</td>
                <td>{r.bedroom ?? '—'}</td>
                <td>{r.bathroom ?? '—'}</td>
                <td className="max-w-[140px] truncate">{r.propertyType ?? '—'}</td>
                <td>
                  <div className="max-w-[320px] h-[3.25rem] overflow-hidden text-ellipsis"
                       style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {r.description ?? '—'}
                  </div>
                </td>
                <td className="max-w-[220px] truncate">
                  {r.fbPostUrl ? <a href={r.fbPostUrl} target="_blank" rel="noopener noreferrer" className="underline">Open</a> : <span className="text-gray-400">pending</span>}
                </td>
                <td className="max-w-[220px] truncate">
                  {r.fbReelsUrl ? <a href={r.fbReelsUrl} target="_blank" rel="noopener noreferrer" className="underline">Open</a> : <span className="text-gray-400">pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <nav aria-label="Pagination" className="flex items-center gap-2">
        <a className="px-3 py-1 rounded border" href={hrefFor(first)} aria-disabled={page===first}>First</a>
        <a className="px-3 py-1 rounded border" href={hrefFor(prev)} aria-disabled={page===first}>Prev</a>

        {start > first && <span className="px-2">…</span>}
        {pages.map(n => (
          <a
            key={n}
            href={hrefFor(n)}
            className={`px-3 py-1 rounded border ${n===page ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            {n}
          </a>
        ))}
        {end < last && <span className="px-2">…</span>}

        <a className="px-3 py-1 rounded border" href={hrefFor(next)} aria-disabled={page===last}>Next</a>
        <a className="px-3 py-1 rounded border" href={hrefFor(last)} aria-disabled={page===last}>Last</a>
      </nav>
    </div>
  );
}
