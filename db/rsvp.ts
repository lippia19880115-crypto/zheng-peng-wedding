import { env } from 'cloudflare:workers';

export async function saveRsvp(guestName: string, attendeeCount: number) {
  const database = env.DB;
  if (!database) throw new Error('回执服务暂不可用');

  const result = await database
    .prepare('INSERT INTO rsvps (guest_name, attendee_count, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
    .bind(guestName, attendeeCount)
    .run();

  return result.meta.last_row_id;
}
