import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe(handlers: SwipeHandlers) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  }, [handlers]);

  const handleSwipe = useCallback(() => {
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && handlers.onSwipeLeft) {
      handlers.onSwipeLeft();
    } else if (isRightSwipe && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }
  }, [handlers]);

  return { handleTouchStart, handleTouchEnd };
}
