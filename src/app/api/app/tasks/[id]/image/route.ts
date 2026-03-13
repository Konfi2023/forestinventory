import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/storage';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  // Prüfen ob Task existiert und User Zugriff hat
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { forest: { include: { organization: { include: { members: { where: { userId: session.user.id } } } } } } },
  });

  if (!task || !task.forest.organization.members[0]) {
    return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
  // Accept unknown types too — mobile browsers sometimes report empty/wrong MIME types
  if (file.type && file.type !== '' && !ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    console.warn('[image upload] unexpected MIME type:', file.type, '— accepting anyway');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 400 });
  }

  let url: string, key: string;
  try {
    ({ url, key } = await uploadFile(file, 'task-images'));
  } catch (uploadErr: any) {
    console.error('[image upload] uploadFile failed:', uploadErr?.message);
    return NextResponse.json({ error: 'Upload fehlgeschlagen: ' + uploadErr?.message }, { status: 500 });
  }

  const image = await prisma.image.create({
    data: {
      name: file.name,
      s3Key: key,
      url,
      taskId,
    },
  });

  return NextResponse.json({ success: true, image });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  const images = await prisma.image.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, url: true, name: true, createdAt: true },
  });

  return NextResponse.json({ images });
}
