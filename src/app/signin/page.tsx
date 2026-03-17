'use client';

import { Suspense, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInRedirect() {
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    signIn('keycloak', { callbackUrl });
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
