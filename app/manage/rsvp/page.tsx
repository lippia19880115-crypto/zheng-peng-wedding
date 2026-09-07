'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import styles from './rsvp-admin.module.css';

type RsvpRecord = {
  id: number;
  guestName: string;
  attendeeCount: number;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
};

type RsvpData = {
  records: RsvpRecord[];
  summary: {
    responseCount: number;
    attendingGuestCount: number;
    attendingResponseCount: number;
    declinedResponseCount: number;
  };
};

const rsvpApiBase = (process.env.NEXT_PUBLIC_RSVP_API_URL ?? 'https://api.lippialab.top').replace(/\/$/, '');

function formatDate(value: string) {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(normalized));
}

export default function RsvpAdminPage() {
  const [data, setData] = useState<RsvpData | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadRsvps = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${rsvpApiBase}/rsvps`, { cache: 'no-store' });
      const result = await response.json() as RsvpData & { ok?: boolean; message?: string };
      if (!response.ok) throw new Error(result.message || '读取回执失败');
      setData(result);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取回执失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadRsvps(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRsvps]);

  const summary = data?.summary;
  return (
    <main className={styles.adminShell}>
      <section className={styles.dashboard}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>ZHENG &amp; PENG · 2026.10.25</p>
            <h1>婚礼回执</h1>
            <p>每位宾客只展示最后一次填写的人数。</p>
          </div>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => void loadRsvps()} disabled={loading}>
              <RefreshCw className={loading ? styles.spinning : ''} />刷新
            </Button>
            <Button onClick={() => window.location.assign(`${rsvpApiBase}/rsvps/export`)}><Download />导出名单</Button>
          </div>
        </header>

        <div className={styles.stats}>
          <Card><CardContent><span>回执人数</span><strong>{summary?.attendingGuestCount ?? 0}</strong><small>确认到场总人数</small></CardContent></Card>
          <Card><CardContent><span>已回复</span><strong>{summary?.responseCount ?? 0}</strong><small>份有效回执</small></CardContent></Card>
          <Card><CardContent><span>无法出席</span><strong>{summary?.declinedResponseCount ?? 0}</strong><small>份回执</small></CardContent></Card>
        </div>

        <Card>
          <CardHeader className={styles.tableHeader}>
            <CardTitle><UsersRound />宾客名单</CardTitle>
            <span>{data?.records.length ?? 0} 条</span>
          </CardHeader>
          <CardContent>
            {message && <p className={styles.error} role="alert">{message}</p>}
            {!data?.records.length ? (
              <div className={styles.empty}>{loading ? '正在读取回执…' : '还没有收到回执'}</div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>姓名</TableHead><TableHead>人数</TableHead><TableHead>更新时间</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className={styles.guestName}>{record.guestName}</TableCell>
                      <TableCell><strong>{record.attendeeCount}</strong> 人</TableCell>
                      <TableCell>{formatDate(record.updatedAt)}</TableCell>
                      <TableCell>{record.revisionCount > 1 ? <Badge variant="outline">修改 {record.revisionCount - 1} 次</Badge> : <Badge variant="secondary">首次提交</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
