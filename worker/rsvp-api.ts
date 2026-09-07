interface Env {
  DB: D1Database;
}

type RsvpRecord = {
  id: number;
  guestName: string;
  attendeeCount: number;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
};

const allowedOrigins = new Set([
  'https://lippialab.top',
  'https://www.lippialab.top',
  'http://localhost:3000',
  'http://localhost:3001',
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') ?? '';
  const headers = new Headers({ Vary: 'Origin' });
  if (allowedOrigins.has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

function json(request: Request, value: unknown, status = 200) {
  const headers = corsHeaders(request);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(value), { status, headers });
}

function cleanGuestName(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

async function saveRsvp(env: Env, guestName: string, attendeeCount: number) {
  const previous = await env.DB
    .prepare('SELECT id FROM rsvps WHERE guest_name = ? ORDER BY id DESC LIMIT 1')
    .bind(guestName)
    .first<{ id: number }>();
  const result = await env.DB
    .prepare('INSERT INTO rsvps (guest_name, attendee_count, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
    .bind(guestName, attendeeCount)
    .run();

  return {
    id: Number(result.meta.last_row_id),
    updated: Boolean(previous),
    guestName,
    attendeeCount,
  };
}

async function listRsvps(env: Env) {
  const result = await env.DB.prepare(`
    WITH ranked AS (
      SELECT id,
             guest_name AS guestName,
             attendee_count AS attendeeCount,
             created_at AS updatedAt,
             MIN(created_at) OVER (PARTITION BY guest_name) AS createdAt,
             COUNT(*) OVER (PARTITION BY guest_name) AS revisionCount,
             ROW_NUMBER() OVER (PARTITION BY guest_name ORDER BY id DESC) AS rowNumber
      FROM rsvps
    )
    SELECT id, guestName, attendeeCount, revisionCount, createdAt, updatedAt
    FROM ranked
    WHERE rowNumber = 1
    ORDER BY id DESC
  `).all<RsvpRecord>();
  const records = result.results;
  const summary = records.reduce((value, record) => ({
    responseCount: value.responseCount + 1,
    attendingGuestCount: value.attendingGuestCount + record.attendeeCount,
    attendingResponseCount: value.attendingResponseCount + (record.attendeeCount > 0 ? 1 : 0),
    declinedResponseCount: value.declinedResponseCount + (record.attendeeCount === 0 ? 1 : 0),
  }), {
    responseCount: 0,
    attendingGuestCount: 0,
    attendingResponseCount: 0,
    declinedResponseCount: 0,
  });
  return { records, summary };
}

async function submit(request: Request, env: Env) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 2048) return json(request, { ok: false, message: '请求内容过大' }, 413);
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return json(request, { ok: false, message: '请求格式不正确' }, 415);
  }

  try {
    const body = await request.json() as { guestName?: unknown; attendeeCount?: unknown; company?: unknown };
    if (typeof body.company === 'string' && body.company.trim()) return json(request, { ok: true });
    const guestName = typeof body.guestName === 'string' ? cleanGuestName(body.guestName) : '';
    const attendeeCount = body.attendeeCount;
    if (!guestName || guestName.length > 40 || !Number.isInteger(attendeeCount) || Number(attendeeCount) < 0 || Number(attendeeCount) > 10) {
      return json(request, { ok: false, message: '请填写姓名，并选择 0–10 人' }, 400);
    }
    return json(request, { ok: true, ...(await saveRsvp(env, guestName, Number(attendeeCount))) });
  } catch (error) {
    console.error('Failed to save wedding RSVP', error);
    return json(request, { ok: false, message: '提交失败，请稍后再试' }, 500);
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      const headers = corsHeaders(request);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      headers.set('Access-Control-Max-Age', '86400');
      return new Response(null, { status: 204, headers });
    }
    if (request.method === 'POST' && url.pathname === '/rsvp') return submit(request, env);
    if (request.method === 'GET' && url.pathname === '/rsvps') {
      return json(request, { ok: true, ...(await listRsvps(env)) });
    }
    if (request.method === 'GET' && url.pathname === '/rsvps/export') {
      const { records, summary } = await listRsvps(env);
      const rows = records.map((record) => `${record.guestName}\t${record.attendeeCount}`);
      const text = [
        '\uFEFF郑柯杨与彭丽丹婚礼回执统计',
        `导出时间\t${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        '',
        '姓名\t人数',
        ...rows,
        '',
        `确认出席总人数\t${summary.attendingGuestCount}`,
        `无法出席回执\t${summary.declinedResponseCount}`,
      ].join('\r\n');
      const headers = corsHeaders(request);
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="wedding-rsvp-${new Date().toISOString().slice(0, 10)}.txt"`);
      headers.set('Cache-Control', 'no-store');
      return new Response(text, { headers });
    }
    return json(request, { ok: false, message: 'Not found' }, 404);
  },
};

export default worker;
