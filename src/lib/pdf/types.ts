export type OrgInfo = {
  name: string;
  legalName?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  vatId?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  isKleinunternehmer: boolean;
  defaultPaymentDays: number;
};

export type OwnerInfo = {
  name: string;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  email?: string | null;
};

export type ReportEntry = {
  date: string;
  forestName: string;
  taskTitle: string;
  category: string;
  userName: string;
  minutes: number;
  hourlyRate: number | null;
  cost: number;
};

export type ForestGroup = {
  forestName: string;
  entries: ReportEntry[];
  totalMinutes: number;
  totalCost: number;
};

/** An explicit line item for the invoice PDF – bypasses forestGroups when provided. */
export type InvoiceLineItem = {
  pos: string;
  desc: string;
  qty: string;    // e.g. "10h 30m" or "1 Pauschal"
  rate: string;   // e.g. "45 €/h" or "pauschal"
  amount: number;
};

export type ReportData = {
  org: OrgInfo;
  owner: OwnerInfo;
  periodFrom: string;
  periodTo: string;
  forestGroups: ForestGroup[];
  totalMinutes: number;
  totalCost: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  /** When provided, these override the auto-computed forest-group line items in InvoicePdf. */
  lineItemsOverride?: InvoiceLineItem[];
  /** VAT rate as a percentage number, e.g. 19 for 19%. Omit/null for Kleinunternehmer (no VAT). */
  vatRate?: number | null;
  /** Human-readable VAT label, e.g. "Normalsatz (19 %)". */
  vatLabel?: string | null;
};
