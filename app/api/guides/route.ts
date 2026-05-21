import { NextResponse } from 'next/server';
import { getGuides, addGuide } from '@/lib/server-store';
import type { GuideHistoryEntry } from '@/lib/guide-history';

export async function GET() {
  return NextResponse.json(getGuides());
}

export async function POST(req: Request) {
  try {
    const entry = (await req.json()) as GuideHistoryEntry;
    if (!entry?.id || !entry?.guide) {
      return NextResponse.json({ error: 'Invalid entry' }, { status: 400 });
    }
    addGuide(entry);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
