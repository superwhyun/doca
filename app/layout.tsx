import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DOCA - AI 문서 요약기',
  description: 'OpenAI GPT-5를 활용한 한국어 문서 요약 서비스. Word 파일을 업로드하면 AI가 자동으로 요약과 키워드를 추출해드립니다.',
  keywords: ['AI', '문서요약', '요약기', 'OpenAI', 'GPT-5', '한국어', 'Word', 'DOCX', '키워드추출'],
  authors: [{ name: 'DOCA Team' }],
  creator: 'DOCA',
  publisher: 'DOCA',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
