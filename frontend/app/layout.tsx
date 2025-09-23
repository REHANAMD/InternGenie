import './globals.css'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'InternGenie',
  description: 'Find your perfect Product Management internship with AI-powered recommendations',
  keywords: 'product management, internship, jobs, AI, recommendations, career',
  authors: [{ name: 'InternGenie' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <div id="root">{children}</div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#1f2937',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
            },
            success: {
              style: {
                background: 'rgba(16, 185, 129, 0.9)',
                color: '#fff',
              },
            },
            error: {
              style: {
                background: 'rgba(239, 68, 68, 0.9)',
                color: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}