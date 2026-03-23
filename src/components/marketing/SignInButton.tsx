'use client';

import { signIn } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';

interface Props {
  label?: string;
  className?: string;
}

export function SignInButton({ label = 'Jetzt kostenlos starten', className }: Props) {
  return (
    <button
      onClick={() => signIn('keycloak')}
      className={className}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {label} <ArrowRight size={15} />
      </span>
    </button>
  );
}
