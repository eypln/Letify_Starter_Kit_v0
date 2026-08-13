'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import { ArrowLeft, Download, FileText, Loader2, Receipt, RefreshCw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface InvoiceRecord {
  id: string | number
  user_id: string
  ref_no: string | null
  client_name: string | null
  rent_amount: number | null
  landlord_fee: number | null
  client_fee: number | null
  date_rented: string | null
  date_signed: string | null
  date_move_in: string | null
  landlord_paid_date: string | null
  client_paid_date: string | null
  listing_fee: number | null
  agent_income: number | null
  collaboration_with: string | null
  created_at: string
  requester_name: string
  invoice_owner_name: string | null
  invoice_owner_id: string | null
  invoice_client_name: string | null
  invoice_client_id: string | null
  invoice_number: string | null
  invoice_pdf_path: string | null
  invoice_document_type: 'invoice_owner' | 'invoice_client' | null
  invoice_date: string | null
  invoice_due_date: string | null
  invoice_vat_number: string | null
  invoice_company_name: string | null
  invoice_branch_address: string | null
  invoice_beneficiary_name: string | null
  invoice_iban: string | null
  invoice_bic: string | null
  invoice_description: string | null
  invoice_quantity: number | null
  invoice_unit_price: number | null
  invoice_tax_rate: number | null
  invoice_total_amount: number | null
  admin_invoice_notified: boolean
  lease_agreement_url: string | null
  invoice_pdf_url: string | null
}

interface InvoiceForm {
  documentType: 'invoice_owner' | 'invoice_client'
  invoiceDate: string
  dueDate: string
  companyName: string
  branchAddress: string
  vatNumber: string
  beneficiaryName: string
  iban: string
  bic: string
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
}

const initialForm: InvoiceForm = {
  documentType: 'invoice_owner',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  companyName: 'JC Rentals Limited',
  branchAddress: "QuickLets - St. Julian's Branch, C3, Mirax Court, Birkirkara Hill, St. Julian's, STJ 1149, Malta",
  vatNumber: 'MT 29861628',
  beneficiaryName: 'JC Rentals Limited',
  iban: 'MT08VALL22013000000050020181250',
  bic: 'VALLMTMT',
  description: 'Agency Fee',
  quantity: '1',
  unitPrice: '',
  taxRate: '18',
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB')
}

function money(value: number | null | undefined) {
  return `€${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildInvoicePdf(invoice: InvoiceRecord, form: InvoiceForm, invoiceNumber: string) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const left = 18
  const right = pageWidth - 18
  const quantity = Number(form.quantity) || 1
  const unitPrice = Number(form.unitPrice) || 0
  const taxRate = Number(form.taxRate) || 0
  const subtotal = quantity * unitPrice
  const tax = subtotal * taxRate / 100
  const total = subtotal + tax
  const recipientName = form.documentType === 'invoice_owner' ? invoice.invoice_owner_name : invoice.invoice_client_name
  const recipientId = form.documentType === 'invoice_owner' ? invoice.invoice_owner_id : invoice.invoice_client_id

  pdf.setTextColor(27, 38, 59)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('PAYMENT ADVICE', left, 22)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Invoice Number: ${invoiceNumber}`, right, 18, { align: 'right' })
  pdf.text(`Reference: ${invoice.ref_no || 'N/A'}`, right, 24, { align: 'right' })

  pdf.setDrawColor(210, 216, 226)
  pdf.line(left, 30, right, 30)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('To:', left, 41)
  pdf.setFont('helvetica', 'normal')
  const addressLines = pdf.splitTextToSize(form.branchAddress, 75)
  pdf.text([form.companyName, ...addressLines], left, 48)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Customer', 112, 41)
  pdf.setFont('helvetica', 'normal')
  pdf.text(recipientName || invoice.client_name || 'N/A', 112, 48)
  if (recipientId) pdf.text(`ID: ${recipientId}`, 112, 54)
  pdf.text(`Invoice Date: ${formatDate(form.invoiceDate)}`, 112, 63)
  if (form.dueDate) pdf.text(`Due Date: ${formatDate(form.dueDate)}`, 112, 69)

  let y = 88
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('Tax Invoice', left, y)
  y += 10
  pdf.setFontSize(9)
  pdf.setFillColor(241, 244, 248)
  pdf.rect(left, y - 5, right - left, 9, 'F')
  pdf.text('Description', left + 3, y)
  pdf.text('Quantity', 115, y, { align: 'right' })
  pdf.text('Unit Price', 145, y, { align: 'right' })
  pdf.text('Tax', 168, y, { align: 'right' })
  pdf.text('Amount EUR', right - 3, y, { align: 'right' })
  y += 10
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${form.description} - ${invoice.ref_no || ''}`, left + 3, y)
  pdf.text(quantity.toFixed(2), 115, y, { align: 'right' })
  pdf.text(unitPrice.toFixed(2), 145, y, { align: 'right' })
  pdf.text(`${taxRate}%`, 168, y, { align: 'right' })
  pdf.text(subtotal.toFixed(2), right - 3, y, { align: 'right' })
  y += 14
  pdf.line(120, y, right, y)
  pdf.text('Subtotal', 145, y + 8, { align: 'right' })
  pdf.text(subtotal.toFixed(2), right - 3, y + 8, { align: 'right' })
  pdf.text(`TOTAL SALES VAT ${taxRate}%`, 145, y + 16, { align: 'right' })
  pdf.text(tax.toFixed(2), right - 3, y + 16, { align: 'right' })
  pdf.setFont('helvetica', 'bold')
  pdf.text('TOTAL EUR', 145, y + 27, { align: 'right' })
  pdf.text(total.toFixed(2), right - 3, y + 27, { align: 'right' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(`VAT: ${form.vatNumber}`, left, 158)
  if (form.dueDate) pdf.text(`Due Date: ${formatDate(form.dueDate)}`, left, 165)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Payment details', left, 181)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Beneficiary Name: ${form.beneficiaryName}`, left, 189)
  pdf.text(`IBAN: ${form.iban}`, left, 196)
  pdf.text(`BIC: ${form.bic}`, left, 203)

  return { pdf, total }
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null)
  const [form, setForm] = useState<InvoiceForm>(initialForm)
  const [generating, setGenerating] = useState(false)

  const pendingCount = useMemo(() => invoices.filter((invoice) => !invoice.invoice_number).length, [invoices])

  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/invoices')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load invoices')
      setInvoices(data.invoices || [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvoices() }, [])

  const openGenerator = (invoice: InvoiceRecord) => {
    const defaultUnitPrice = invoice.invoice_unit_price || (invoice.invoice_document_type === 'invoice_client' ? invoice.client_fee : invoice.landlord_fee) || invoice.rent_amount || 0
    setSelectedInvoice(invoice)
    setForm({
      ...initialForm,
      documentType: invoice.invoice_document_type || 'invoice_owner',
      invoiceDate: invoice.invoice_date || initialForm.invoiceDate,
      dueDate: invoice.invoice_due_date || '',
      companyName: invoice.invoice_company_name || initialForm.companyName,
      branchAddress: invoice.invoice_branch_address || initialForm.branchAddress,
      vatNumber: invoice.invoice_vat_number || initialForm.vatNumber,
      beneficiaryName: invoice.invoice_beneficiary_name || initialForm.beneficiaryName,
      iban: invoice.invoice_iban || initialForm.iban,
      bic: invoice.invoice_bic || initialForm.bic,
      description: invoice.invoice_description || initialForm.description,
      quantity: String(invoice.invoice_quantity || 1),
      unitPrice: String(defaultUnitPrice),
      taxRate: String(invoice.invoice_tax_rate ?? 18),
    })
  }

  const updateForm = (key: keyof InvoiceForm, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const generateInvoice = async () => {
    if (!selectedInvoice) return
    setGenerating(true)
    try {
      const numberResponse = await fetch('/api/admin/invoices/number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revenueId: selectedInvoice.id }),
      })
      const numberData = await numberResponse.json()
      if (!numberResponse.ok) throw new Error(numberData.error || 'Could not reserve invoice number')

      const invoiceNumber = numberData.invoiceNumber as string
      const { pdf, total } = buildInvoicePdf(selectedInvoice, form, invoiceNumber)
      const pdfBlob = pdf.output('blob')
      const payload = new FormData()
      payload.append('revenueId', String(selectedInvoice.id))
      payload.append('invoiceNumber', invoiceNumber)
      payload.append('documentType', form.documentType)
      payload.append('invoiceDate', form.invoiceDate)
      payload.append('dueDate', form.dueDate)
      payload.append('companyName', form.companyName)
      payload.append('branchAddress', form.branchAddress)
      payload.append('vatNumber', form.vatNumber)
      payload.append('beneficiaryName', form.beneficiaryName)
      payload.append('iban', form.iban)
      payload.append('bic', form.bic)
      payload.append('description', form.description)
      payload.append('quantity', form.quantity)
      payload.append('unitPrice', form.unitPrice)
      payload.append('taxRate', form.taxRate)
      payload.append('totalAmount', String(total))
      payload.append('pdf', pdfBlob, `${invoiceNumber}.pdf`)

      const response = await fetch('/api/admin/invoices/generate', { method: 'POST', body: payload })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save invoice')

      pdf.save(`${invoiceNumber}.pdf`)
      setSelectedInvoice(null)
      await fetchInvoices()
    } catch (generationError) {
      alert(generationError instanceof Error ? generationError.message : 'Failed to generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8 md:px-8 lg:px-16">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" />Admin Dashboard</Link>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Receipt className="h-8 w-8 text-purple-600" />Invoices</h1>
            <p className="text-muted-foreground mt-2">Prepare, download and publish invoice PDFs for invoice requests.</p>
          </div>
          <button onClick={fetchInvoices} disabled={loading} title="Refresh invoices" aria-label="Refresh invoices" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Invoice Requests</p><p className="text-3xl font-bold mt-2">{invoices.length}</p></div>
          <div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Awaiting Invoice</p><p className="text-3xl font-bold text-amber-600 mt-2">{pendingCount}</p></div>
          <div className="rounded-lg border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Generated PDFs</p><p className="text-3xl font-bold text-green-600 mt-2">{invoices.length - pendingCount}</p></div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b"><h2 className="text-xl font-semibold">Invoice Deal Register</h2><p className="text-sm text-muted-foreground mt-1">Each row contains the deal and recipient data used by the PDF invoice.</p></div>
          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div> : error ? <div className="p-8 text-center text-red-600">{error}</div> : invoices.length === 0 ? <div className="p-12 text-center text-muted-foreground">No invoice requests yet.</div> : (
            <div className="overflow-x-auto"><table className="w-full min-w-375"><thead><tr className="border-b text-left">
              {['Invoice No.', 'Deal / Ref', 'Requested by', 'Owner + ID', 'Client + ID', 'Invoice date', 'Due date', 'Unit price', 'VAT', 'Total', 'Contract', 'Action'].map((heading) => <th key={heading} className="px-4 py-3 text-sm font-semibold">{heading}</th>)}
            </tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/40 align-top">
              <td className="px-4 py-4 font-semibold whitespace-nowrap">{invoice.invoice_number || <Badge variant="secondary">Not generated</Badge>}</td>
              <td className="px-4 py-4"><div className="font-medium">{invoice.ref_no || 'No reference'}</div><div className="text-sm text-muted-foreground">{invoice.client_name || 'No client name'}</div><div className="text-xs text-muted-foreground mt-1">Rent: {money(invoice.rent_amount)}</div></td>
              <td className="px-4 py-4 text-sm">{invoice.requester_name}<div className="text-xs text-muted-foreground">{formatDate(invoice.created_at)}</div></td>
              <td className="px-4 py-4 text-sm">{invoice.invoice_owner_name || 'N/A'}<div className="text-xs text-muted-foreground">ID: {invoice.invoice_owner_id || 'N/A'}</div></td>
              <td className="px-4 py-4 text-sm">{invoice.invoice_client_name || 'N/A'}<div className="text-xs text-muted-foreground">ID: {invoice.invoice_client_id || 'N/A'}</div></td>
              <td className="px-4 py-4 text-sm">{formatDate(invoice.invoice_date)}</td>
              <td className="px-4 py-4 text-sm">{formatDate(invoice.invoice_due_date)}</td>
              <td className="px-4 py-4 text-sm">{money(invoice.invoice_unit_price)}</td>
              <td className="px-4 py-4 text-sm">{invoice.invoice_tax_rate ?? 18}%</td>
              <td className="px-4 py-4 text-sm font-medium">{money(invoice.invoice_total_amount)}</td>
              <td className="px-4 py-4">{invoice.lease_agreement_url ? <a href={invoice.lease_agreement_url} target="_blank" rel="noreferrer" title="Open lease agreement" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><FileText className="h-4 w-4" />Open</a> : <span className="text-sm text-muted-foreground">N/A</span>}</td>
              <td className="px-4 py-4 whitespace-nowrap">{invoice.invoice_pdf_url && <a href={invoice.invoice_pdf_url} target="_blank" rel="noreferrer" title="Download generated invoice" className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline mr-3"><Download className="h-4 w-4" />PDF</a>}<button onClick={() => openGenerator(invoice)} className="rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700">{invoice.invoice_number ? 'Regenerate' : 'Prepare invoice'}</button></td>
            </tr>)}</tbody></table></div>
          )}
        </div>
      </div>

      {selectedInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !generating) setSelectedInvoice(null) }}>
        <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-lg bg-background shadow-xl">
          <div className="flex items-center justify-between border-b p-6"><div><h2 className="text-xl font-semibold">Prepare Invoice</h2><p className="text-sm text-muted-foreground">{selectedInvoice.ref_no || 'Deal'} · {selectedInvoice.client_name || 'No client name'}</p></div><button onClick={() => setSelectedInvoice(null)} disabled={generating} title="Close" aria-label="Close" className="rounded-md p-2 hover:bg-muted"><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            <label className="text-sm font-medium">Invoice type<select value={form.documentType} onChange={(event) => updateForm('documentType', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2"><option value="invoice_owner">Invoice - Owner</option><option value="invoice_client">Invoice - Client</option></select></label>
            <label className="text-sm font-medium">Invoice date<input type="date" value={form.invoiceDate} onChange={(event) => updateForm('invoiceDate', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">Due date <span className="font-normal text-muted-foreground">(optional)</span><input type="date" value={form.dueDate} onChange={(event) => updateForm('dueDate', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">VAT number<input value={form.vatNumber} onChange={(event) => updateForm('vatNumber', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">Company name<input value={form.companyName} onChange={(event) => updateForm('companyName', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">Branch address<textarea value={form.branchAddress} onChange={(event) => updateForm('branchAddress', event.target.value)} rows={3} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">Description<input value={form.description} onChange={(event) => updateForm('description', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">Quantity<input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">Unit price (EUR)<input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => updateForm('unitPrice', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">VAT rate (%)<input type="number" min="0" step="0.01" value={form.taxRate} onChange={(event) => updateForm('taxRate', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">Beneficiary name<input value={form.beneficiaryName} onChange={(event) => updateForm('beneficiaryName', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">IBAN<input value={form.iban} onChange={(event) => updateForm('iban', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
            <label className="text-sm font-medium">BIC<input value={form.bic} onChange={(event) => updateForm('bic', event.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
          </div>
          <div className="flex justify-end gap-3 border-t p-6"><button onClick={() => setSelectedInvoice(null)} disabled={generating} className="rounded-md border px-4 py-2">Cancel</button><button onClick={generateInvoice} disabled={generating || !form.unitPrice || !form.invoiceDate} className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50">{generating && <Loader2 className="h-4 w-4 animate-spin" />}{generating ? 'Generating...' : 'Generate and download PDF'}</button></div>
        </div>
      </div>}
    </main>
  )
}
