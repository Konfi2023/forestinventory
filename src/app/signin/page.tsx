'use client';

import { Suspense, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';

function SignInRedirect() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const wantRegister = searchParams.get('register') === 'true';
    signIn('keycloak', { callbackUrl }, {
      ui_locales: locale,
      ...(wantRegister ? { kc_action: 'register' } : {}),
    });
  // searchParams intentionally excluded: we only want to fire once per mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInRedirect />
    </Suspense>
  );
}
