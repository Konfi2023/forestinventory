'use client';

import { Suspense, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    signIn('keycloak', { callbackUrl });
  }, [searchParams]);

  return null;
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInRedirect />
    </Suspense>
  );
}
