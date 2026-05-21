import { NextResponse } from 'next/server';
import { removeGuide } from '@/lib/server-store';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  removeGuide(id);
  return NextResponse.json({ ok: true });
}
