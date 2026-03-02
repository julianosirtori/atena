import { useRef, useCallback } from 'react'

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/notification.mp3')
        audioRef.current.volume = 0.5
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Silently ignore autoplay restrictions
      })
    } catch {
      // Audio not supported
    }
  }, [])

  return { play }
}
