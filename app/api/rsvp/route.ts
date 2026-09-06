import { saveRsvp } from '@/db/rsvp';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return Response.json({ ok: false, message: '请求格式不正确' }, { status: 415 });
    }

    const body = await request.json() as { guestName?: unknown; attendeeCount?: unknown };
    const guestName = typeof body.guestName === 'string' ? body.guestName.trim() : '';
    const attendeeCount = body.attendeeCount;

    if (!guestName || guestName.length > 40 || !Number.isInteger(attendeeCount) || Number(attendeeCount) < 0 || Number(attendeeCount) > 10) {
      return Response.json({ ok: false, message: '请填写姓名，并选择 0–10 人' }, { status: 400 });
    }

    const id = await saveRsvp(guestName, Number(attendeeCount));
    return Response.json({ ok: true, id });
  } catch (error) {
    console.error('Failed to save wedding RSVP', error);
    return Response.json({ ok: false, message: '提交失败，请稍后再试' }, { status: 500 });
  }
}
