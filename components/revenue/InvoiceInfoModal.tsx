"use client";

interface InvoiceInfo {
  ownerName: string;
  ownerId: string;
  clientName: string;
  clientId: string;
}

interface InvoiceInfoModalProps {
  value: InvoiceInfo;
  onChange: (value: InvoiceInfo) => void;
  onSend: () => void;
  onClose: () => void;
}

export default function InvoiceInfoModal({ value, onChange, onSend, onClose }: InvoiceInfoModalProps) {
  const isComplete = Object.values(value).every((item) => item.trim() !== "");

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
        <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">Invoice Information</h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">Enter the owner and client details for the invoice.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Owner/Company Name
            <input className="mt-1 w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={value.ownerName} onChange={(event) => onChange({ ...value, ownerName: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Owner ID/Company VAT No
            <input className="mt-1 w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={value.ownerId} onChange={(event) => onChange({ ...value, ownerId: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Client/Company Name
            <input className="mt-1 w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={value.clientName} onChange={(event) => onChange({ ...value, clientName: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Client ID/Company VAT No
            <input className="mt-1 w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={value.clientId} onChange={(event) => onChange({ ...value, clientId: event.target.value })} />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="rounded-md border px-4 py-2 text-sm font-medium" onClick={onClose}>Cancel</button>
          <button type="button" disabled={!isComplete} className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onSend}>Send</button>
        </div>
      </div>
    </div>
  );
}
