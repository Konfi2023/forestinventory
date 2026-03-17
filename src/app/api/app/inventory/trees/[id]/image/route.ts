import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile, MAX_IMAGE_SIZE_BYTES } from '@/lib/storage';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const poiId = (await params).id;

  const poi = await prisma.forestPoi.findUnique({
    where: { id: poiId },
    include: { forest: { include: { organization: { include: { members: { where: { userId: session.user.id } } } } } } },
  });

  if (!poi || !poi.forest.organization.members[0]) {
    return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 400 });
  }

  const imageType = req.nextUrl.searchParams.get('type'); // 'trunk' | 'crown'
  const isCrown = imageType === 'crown';

  let key: string;
  try {
    ({ key } = await uploadFile(file, 'tree-images'));
  } catch (uploadErr: any) {
    console.error('[tree image upload] uploadFile failed:', uploadErr?.message);
    return NextResponse.json({ error: 'Upload fehlgeschlagen: ' + uploadErr?.message }, { status: 500 });
  }

  await prisma.forestPoiTree.update({
    where: { poiId },
    data: isCrown ? { crownImageKey: key } : { imageKey: key },
  });

  return NextResponse.json({ success: true, imageKey: key, type: isCrown ? 'crown' : 'trunk' });
}
