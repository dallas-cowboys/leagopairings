export const config = { api: { externalResolver: true } }

import type { NextApiRequest, NextApiResponse } from 'next'
import { chromium } from 'playwright'

const selector = 'table.MuiTable-root tbody tr'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const url = req.query.url as string | undefined
  const playersParam = (req.query.players as string | undefined) || ''

  if (!url) {
    return res.status(400).json({ error: 'URL not given!' })
  }

  try {
    console.log('pairing API module loaded')
    // Launch headless Chromium
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    // Navigate and wait for table rows
    const response = await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
    if (!response || !response.ok()) {
      throw new Error(`Failed to load page: ${response?.status()}`)
    }
    await page.waitForSelector(selector)

    // Scrape each row
    const rows = await page.$$(selector)
    const pairings: Array<{ board_num: string; black: string; white: string; result: string }> = []

    for (const row of rows) {
      const cells = await row.$$('td')
      const board_num = (await cells[0].innerText()).trim()
      const black_info = (await cells[1].innerText()).trim()
      const white_info = (await cells[2].innerText()).trim()
      const result = (await cells[4].innerText()).trim()

      pairings.push({ board_num, black: black_info, white: white_info, result })
    }

    await browser.close()

    // Filter by players if provided
    const names = playersParam
      .split(',')
      .map(n => n.trim().toLowerCase())
      .filter(Boolean)

    const filtered = names.length
      ? pairings.filter(
          p =>
            names.includes(p.black.toLowerCase()) ||
            names.includes(p.white.toLowerCase())
        )
      : pairings

    // Send JSON response
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    return res.status(200).json({ pairings: filtered })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('pairing API error:', message)
    return res.status(500).json({ error: message })
  }
}
