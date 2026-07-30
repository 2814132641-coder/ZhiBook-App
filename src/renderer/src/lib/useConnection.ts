import { useCallback, useEffect, useState } from 'react'

const HEALTH_URL = 'http://127.0.0.1:5210/health'

export function useConnection(pollInterval = 5000) {
  const [online, setOnline] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  const check = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch(HEALTH_URL, { cache: 'no-store' })
      setOnline(res.ok)
    } catch {
      setOnline(false)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    // initial check
    check()
    const id = setInterval(check, pollInterval)
    return () => clearInterval(id)
  }, [check, pollInterval])

  return { online, checking, retry: check }
}
