import { DM_Sans, Fredoka } from 'next/font/google'

/** Heading. Diselfhost saat build karena CSP memakai `font-src 'self' data:`. */
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
})

/** Body. */
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const fontVariables = `${fredoka.variable} ${dmSans.variable}`
