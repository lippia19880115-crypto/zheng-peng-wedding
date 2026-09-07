import { cleanGuestName, saveRsvp } from '@/db/rsvp';

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 2048) {
      return Response.json({ ok: false, message: '请求内容过大' }, { status: 413 });
    }
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return Response.json({ ok: false, message: '请求格式不正确' }, { status: 415 });
    }

    const body = await request.json() as { guestName?: unknown; attendeeCount?: unknown; company?: unknown };
    if (typeof body.company === 'string' && body.company.trim()) {
      return Response.json({ ok: true });
    }
    const guestName = typeof body.guestName === 'string' ? cleanGuestName(body.guestName) : '';
    const attendeeCount = body.attendeeCount;

    if (!guestName || guestName.length > 40 || !Number.isInteger(attendeeCount) || Number(attendeeCount) < 0 || Number(attendeeCount) > 10) {
      return Response.json({ ok: false, message: '请填写姓名，并选择 0–10 人' }, { status: 400 });
    }

    const result = await saveRsvp(guestName, Number(attendeeCount));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to save wedding RSVP', error);
    return Response.json({ ok: false, message: '提交失败，请稍后再试' }, { status: 500 });
  }
}
