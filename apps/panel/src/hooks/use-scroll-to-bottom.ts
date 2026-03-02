import { useCallback, useRef, useState } from 'react'

const BOTTOM_THRESHOLD = 100

export function useScrollToBottom(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [newMessageCount, setNewMessageCount] = useState(0)
  const isAtBottomRef = useRef(true)

  const checkIfAtBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD
  }, [scrollRef])

  const updatePosition = useCallback(() => {
    isAtBottomRef.current = checkIfAtBottom()
    if (isAtBottomRef.current) {
      setNewMessageCount(0)
    }
  }, [checkIfAtBottom])

  const onNewMessage = useCallback(() => {
    if (checkIfAtBottom()) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      })
    } else {
      setNewMessageCount((c) => c + 1)
    }
  }, [checkIfAtBottom, scrollRef])

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
    setNewMessageCount(0)
  }, [scrollRef])

  return {
    isAtBottom: isAtBottomRef.current,
    newMessageCount,
    onNewMessage,
    scrollToBottom,
    updatePosition,
  }
}
