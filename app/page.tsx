// app/page.tsx

'use client'

import { useState } from 'react'

// Define the shape of a pairing
interface Pairing {
  board_num: string
  black: string
  white: string
  result: string
}

export default function Home() {
  const [eventCode, setEventCode] = useState('')
  const [round, setRound] = useState('')
  const [allPairings, setAllPairings] = useState<Pairing[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const loadPairings = async () => {
    if (!eventCode || !round) {
      alert('Please enter both event code and round')
      return
    }

    const leagoUrl =
      `https://leago.gg/event/${encodeURIComponent(eventCode)}` +
      `/matches/r/${encodeURIComponent(round)}`

    const res = await fetch(
      `/api/pairings?url=${encodeURIComponent(leagoUrl)}`
    )
    const data = (await res.json()) as { pairings: Pairing[] }
    setAllPairings(data.pairings)

    // Extract unique player names from pairings
    const names = Array.from(
      new Set(data.pairings.flatMap(p => [p.black, p.white]))
    ).sort()
    setPlayers(names)

    // Initialize checkbox state
    const initChecked: Record<string, boolean> = {}
    names.forEach(name => {
      initChecked[name] = false
    })
    setChecked(initChecked)
  }

  const toggle = (name: string) => {
    setChecked(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const filtered = allPairings.filter(
    p => checked[p.black] || checked[p.white]
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Go Pairing Viewer</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Event code (e.g. tvushbs)"
          value={eventCode}
          onChange={e => setEventCode(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="number"
          placeholder="Round (e.g. 5)"
          value={round}
          onChange={e => setRound(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        onClick={loadPairings}
        className="px-4 py-2 bg-blue-600 text-white rounded mb-6"
      >
        Load Pairings
      </button>

      {players.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search players…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <div className="border rounded h-40 overflow-y-auto p-2 grid grid-cols-2 gap-2">
            {players
              .filter(name =>
                name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(name => (
                <label key={name} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={checked[name]}
                    onChange={() => toggle(name)}
                  />
                  <span>{name}</span>
                </label>
              ))}
          </div>
        </div>
      )}

      {players.length > 0 && (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Board</th>
              <th className="border px-2 py-1">Black</th>
              <th className="border px-2 py-1">White</th>
              <th className="border px-2 py-1">Result</th>
            </tr>
          </thead>
          <tbody>
            {(Object.values(checked).some(v => v) ? filtered : allPairings).map((p, i) => (
              <tr key={i}>
                <td className="border px-2 py-1">{p.board_num}</td>
                <td className="border px-2 py-1">{p.black}</td>
                <td className="border px-2 py-1">{p.white}</td>
                <td className="border px-2 py-1">{p.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
