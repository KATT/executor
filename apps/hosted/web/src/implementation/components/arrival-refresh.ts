import { useContext, useEffect, useState } from "react";
import { PaintContext } from "./organization.tsx";

/**
 * Cover a list the first time this document opens it from another page, and read it for that
 * arrival. A document load keeps the server's read. Returning to a list this document already
 * showed keeps that list, and does not read it again while it is still fresh.
 */
export function useArrivalCover(list: string, waiting: boolean, refresh: () => void) {
  const store = useContext(PaintContext);
  const [arrived] = useState(store?.get() ?? false);
  const [seen] = useState(store?.seen(list) ?? false);
  const [sawWait, setSawWait] = useState(false);
  const [settled, setSettled] = useState(!arrived || seen);
  if (arrived && !seen && !settled && waiting && !sawWait) setSawWait(true);
  if (arrived && !seen && !settled && sawWait && !waiting) {
    setSettled(true);
    store?.note(list);
  }
  useEffect(() => {
    if (!arrived || seen) {
      store?.note(list);
      return;
    }
    refresh();
  }, [arrived, list, refresh, seen, store]);
  return arrived && !seen && !settled;
}
