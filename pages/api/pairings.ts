// pages/api/pairings.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { chromium } from 'playwright'

type Pairing = {
  board_num: string
  black:     string
  white:     string
  result:    string
}

export const config = {
  api: { externalResolver: true }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ pairings: Pairing[] } | { error: string }>
) {
  const url = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url
  const playersParam = Array.isArray(req.query.players)
    ? req.query.players[0]
    : req.query.players ?? ''

  if (!url) {
    return res.status(400).json({ error: 'URL not given!' })
  }

  try {
    // 1. Launch headless Chromium
    const browser = await chromium.launch()
    const page    = await browser.newPage()

    // 2. Navigate and wait for the table to render
    const response = await page.goto(url, { timeout: 15_000, waitUntil: 'domcontentloaded' })
    if (!response || !response.ok()) {
      throw new Error(`Failed to load page: ${response?.status()}`)
    }
    await page.waitForSelector('table.MuiTable-root tbody tr')

    // 3. Scrape with Playwright
    const pairings = await page.$$eval(
      'table.MuiTable-root tbody tr',
      (rows) =>
        rows.map((tr) => {
          const cells = Array.from(tr.querySelectorAll('td'))
          return {
            board_num: cells[0]?.textContent?.trim() ?? '',
            black:     cells[1]?.textContent?.trim() ?? '',
            white:     cells[2]?.textContent?.trim() ?? '',
            result:    cells[4]?.textContent?.trim() ?? '',
          }
        })
    )

    await browser.close()

    // 4. Filter by players if given
    const names = playersParam
      .split(',')
      .map((n) => n.trim().toLowerCase())
      .filter((n) => n)

    const filtered = names.length
      ? pairings.filter(
          (p) =>
            names.includes(p.black.toLowerCase()) ||
            names.includes(p.white.toLowerCase())
        )
      : pairings

    // 5. Return JSON
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    return res.status(200).json({ pairings: filtered })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: msg })
  }
}
