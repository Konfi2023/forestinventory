'use client';

import { signIn } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { ArrowRight } from 'lucide-react';

interface Props {
  label?: string;
  className?: string;
}

export function SignInButton({ label = 'Jetzt kostenlos starten', className }: Props) {
  const locale = useLocale();
  return (
    <button
      onClick={() => signIn('keycloak', undefined, { ui_locales: locale })}
      className={className}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {label} <ArrowRight size={15} />
      </span>
    </button>
  );
}
