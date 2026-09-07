import { env } from 'cloudflare:workers';

export type RsvpRecord = {
  id: number;
  guestName: string;
  attendeeCount: number;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RsvpSummary = {
  responseCount: number;
  attendingGuestCount: number;
  attendingResponseCount: number;
  declinedResponseCount: number;
};

function database() {
  if (!env.DB) throw new Error('回执服务暂不可用');
  return env.DB;
}

export function cleanGuestName(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export async function saveRsvp(guestName: string, attendeeCount: number) {
  const normalizedName = cleanGuestName(guestName);
  const previous = await database()
    .prepare('SELECT id FROM rsvps WHERE guest_name = ? ORDER BY id DESC LIMIT 1')
    .bind(normalizedName)
    .first<{ id: number }>();
  const result = await database()
    .prepare('INSERT INTO rsvps (guest_name, attendee_count, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
    .bind(normalizedName, attendeeCount)
    .run();

  return {
    id: Number(result.meta.last_row_id),
    updated: Boolean(previous),
    guestName: normalizedName,
    attendeeCount,
  };
}

export async function listRsvps(): Promise<{ records: RsvpRecord[]; summary: RsvpSummary }> {
  const result = await database().prepare(`
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
  const summary = records.reduce<RsvpSummary>((value, record) => ({
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

export async function exportRsvpsAsText() {
  const { records, summary } = await listRsvps();
  const rows = records.map((record) => `${record.guestName}\t${record.attendeeCount}`);
  return [
    '\uFEFF郑柯杨与彭丽丹婚礼回执统计',
    `导出时间\t${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    '',
    '姓名\t人数',
    ...rows,
    '',
    `确认出席总人数\t${summary.attendingGuestCount}`,
    `无法出席回执\t${summary.declinedResponseCount}`,
  ].join('\r\n');
}
