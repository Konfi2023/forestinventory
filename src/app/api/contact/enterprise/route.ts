import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email, message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Nachricht fehlt' }, { status: 400 });

  const to = process.env.CONTACT_EMAIL;
  const from = process.env.RESEND_FROM;
  if (!to || !from) return NextResponse.json({ error: 'Konfigurationsfehler' }, { status: 500 });

  await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Enterprise-Anfrage von ${name}`,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>E-Mail:</strong> ${email}</p>
      <p><strong>Nachricht:</strong></p>
      <p style="white-space:pre-wrap">${message}</p>
    `,
  });

  return NextResponse.json({ success: true });
}
