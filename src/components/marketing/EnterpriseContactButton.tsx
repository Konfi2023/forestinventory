'use client';

import { useEffect, useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export function EnterpriseContactButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslations('Enterprise');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/contact/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('success'));
      setOpen(false);
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    'w-full px-3.5 py-2.5 bg-[#efece2] border border-[#d4cfbe] rounded-lg text-[14px] text-[#1a1e17] placeholder:text-[#8a8f83] focus:outline-none focus:border-[#2d3d2a] focus:ring-2 focus:ring-[#2d3d2a]/20 transition-colors';
  const labelBase =
    'block font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.08em] text-[#8a8f83] mb-2';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] bg-[#1a1e17] text-[#efece2] border border-[#1a1e17] hover:bg-[#2d3d2a] hover:border-[#2d3d2a] hover:translate-x-1 transition-all whitespace-nowrap"
      >
        <Mail size={13} /> {t('button')} <span aria-hidden>→</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-[#1a1e17]/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#e8e4d6] rounded-2xl border border-[#d4cfbe] shadow-[0_30px_80px_rgba(26,30,23,0.22)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-[#d4cfbe]">
              <div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-[#8a8f83] mb-2">
                  04 / Enterprise
                </div>
                <h3 className="fm-serif text-[28px] leading-[1.1] tracking-[-0.02em] text-[#1a1e17]">
                  {t('title')}
                </h3>
                <p className="text-[13px] text-[#4a5148] mt-1.5 leading-[1.5]">{t('subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 p-2 -mr-1.5 rounded-full text-[#4a5148] hover:text-[#1a1e17] hover:bg-[#efece2] transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-7 pt-6 pb-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>{t('name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>{t('email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={inputBase}
                  />
                </div>
              </div>
              <div>
                <label className={labelBase}>{t('message')}</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder={t('placeholder')}
                  className={`${inputBase} resize-none`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] text-[#4a5148] border border-[#d4cfbe] hover:text-[#1a1e17] hover:border-[#1a1e17] transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] bg-[#1a1e17] text-[#efece2] border border-[#1a1e17] hover:bg-[#2d3d2a] hover:border-[#2d3d2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1a1e17] disabled:hover:border-[#1a1e17]"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                  {t('send')} <span aria-hidden>→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
