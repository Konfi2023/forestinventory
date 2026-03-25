import { requireSystemAdmin } from '@/lib/admin-auth';
import { listCoupons } from '@/actions/admin-coupons';
import { CouponsClient } from './_components/CouponsClient';

export default async function AdminCouponsPage() {
  await requireSystemAdmin();
  const coupons = await listCoupons();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Gutscheine verwalten</h2>
        <p className="text-sm text-slate-500 mt-1">
          Erstelle Rabatt-Codes für Kunden. Codes werden automatisch in Stripe angelegt und können beim Checkout eingegeben werden.
        </p>
      </div>
      <CouponsClient coupons={coupons} />
    </div>
  );
}
