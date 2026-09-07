import { exportRsvpsAsText } from '@/db/rsvp';

export async function GET() {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(await exportRsvpsAsText(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="wedding-rsvp-${date}.txt"`,
      'Cache-Control': 'no-store',
    },
  });
}
