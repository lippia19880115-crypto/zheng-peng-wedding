import { listRsvps } from '@/db/rsvp';

export async function GET() {
  return Response.json(
    { ok: true, ...(await listRsvps()) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
