import { useCallback, useRef, useState } from "react";

// Minimal toast system. One active toast at a time is enough for this app.
// Auto-dismisses after `duration` ms; clearing is idempotent.
export function useToast(duration = 3200) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback(
    (message, type = "info") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type, id: Date.now() });
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  return { toast, show, dismiss };
}
