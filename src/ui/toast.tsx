import { useEffect, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const MAX = 5
const DURATION = 2600

let push: ((message: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'info') {
  if (push) push(message, type)
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])
  const [leaving, setLeaving] = useState<number[]>([])
  const seq = useRef(0)

  useEffect(() => {
    push = (message, type) => {
      seq.current += 1
      const id = seq.current
      setItems((prev) => {
        const next = [...prev, { id, message, type }]
        return next.length > MAX ? next.slice(next.length - MAX) : next
      })
      window.setTimeout(() => {
        setLeaving((prev) => [...prev, id])
        window.setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== id))
          setLeaving((prev) => prev.filter((x) => x !== id))
        }, 180)
      }, DURATION)
    }
    return () => {
      push = null
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast toast--${item.type}${leaving.includes(item.id) ? ' is-leaving' : ''}`}>
          <i />
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  )
}
