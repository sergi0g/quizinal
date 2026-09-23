'use client'

import { useEffect, useState } from 'react'

type SwStatus = 'idle' | 'ready' | 'unsupported' | 'failed'

export function SWRegister() {
  const [status, setStatus] = useState<SwStatus>('idle')

  useEffect(() => {
    const supportsSw = 'serviceWorker' in navigator
    const secure = window.isSecureContext
    const protocol = window.location.protocol

    console.info('[SW]', {
      supportsSw,
      secure,
      protocol,
      controller: !!navigator.serviceWorker?.controller,
    })

    if (!supportsSw) {
      console.warn('[SW] Service worker API is not available in this browser.')
      setStatus('unsupported')
      return
    }

    if (!secure) {
      console.warn('[SW] Not in a secure context, so registration is blocked.', {
        protocol,
        isSecureContext: window.isSecureContext,
      })
      setStatus('unsupported')
      return
    }

    let active = true

    const updateStatus = () => {
      if (!active) return
      const ready = !!navigator.serviceWorker.controller
      console.info('[SW] controller state changed:', ready)
      setStatus(ready ? 'ready' : 'idle')
    }

    navigator.serviceWorker.addEventListener('controllerchange', updateStatus)

    const register = async () => {
      try {
        console.info('[SW] Registering /sw.js')
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.info('[SW] Registration succeeded')
        updateStatus()
      } catch (error) {
        console.error('[SW] Registration failed', error)
        if (active) setStatus('failed')
      }
    }

    void register()
    updateStatus()

    return () => {
      active = false
      navigator.serviceWorker.removeEventListener('controllerchange', updateStatus)
    }
  }, [])

  if (status === 'unsupported') {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-[min(90vw,28rem)] -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/10 backdrop-blur-lg px-4 py-2 text-center text-xs font-medium text-amber-900 dark:text-amber-100 shadow-lg">
        This browser is not running in a secure context, so image caching via service worker is unavailable.
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-[min(90vw,28rem)] -translate-x-1/2 rounded-full border border-destructive/40 bg-destructive/10 backdrop-blur-lg px-4 py-2 text-center text-xs font-medium text-foreground shadow-lg">
        Image caching is unavailable, so remote images are being loaded directly.
      </div>
    )
  }

  return null
}
