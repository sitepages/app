'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const KEY = 'financa_hide_values'
const EVENT = 'financa_hide_values_change'

export function useHideValues() {
  const [hidden, setHidden] = useState(true)
  const ref = useRef(true)

  useEffect(() => {
    const stored = localStorage.getItem(KEY)
    const initial = stored === null ? true : stored === 'true'
    ref.current = initial
    setHidden(initial)

    const handler = (e: Event) => {
      const val = (e as CustomEvent<boolean>).detail
      ref.current = val
      setHidden(val)
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const toggle = useCallback(() => {
    const next = !ref.current
    ref.current = next
    localStorage.setItem(KEY, String(next))
    setHidden(next)
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  }, [])

  return { hidden, toggle }
}
