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
      {label} <ArrowRight size={16} />
    </button>
  );
}
