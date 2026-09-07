import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://lippialab.top';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '郑柯杨 & 彭丽丹｜婚礼请柬',
  description: '诚邀您见证郑柯杨与彭丽丹的婚礼。2026年10月25日，自贡市富顺县。',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    title: '郑柯杨 & 彭丽丹｜婚礼请柬',
    description: '2026年10月25日，诚邀您见证我们的幸福时刻。',
    images: [{ url: '/wechat-share.jpg', width: 500, height: 500, alt: '郑柯杨与彭丽丹婚礼请柬' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
