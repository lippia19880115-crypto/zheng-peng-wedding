import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '郑柯杨 & 彭丽丹｜婚礼请柬',
  description: '诚邀您见证郑柯杨与彭丽丹的婚礼。2026年10月25日，自贡市富顺县。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
