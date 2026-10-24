import { useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PaintContext } from "./organization.tsx";

const emptySubscribe = () => () => {};

/**
 * Cover a list the first time this document opens it from another page, and read it for that
 * arrival. A document load keeps the server's read. Returning to a list this document already
 * showed keeps that list, and does not read it again while it is still fresh.
 */
export function useArrivalCover(list: string, waiting: boolean, refresh: () => void) {
  const store = useContext(PaintContext);
  // Hydration, including a list streamed after the frame's effect, uses the server snapshot.
  // A document load therefore never covers. A later navigation mounts this hook in the browser
  // and reads the paint store.
  const hydrating = useSyncExternalStore(
    emptySubscribe,
    () => false,
    () => true,
  );
  const [arrived] = useState(() => !hydrating && (store?.get() ?? false));
  const [seen] = useState(store?.seen(list) ?? false);
  const [sawWait, setSawWait] = useState(false);
  const [settled, setSettled] = useState(!arrived || seen);
  const phase = useSyncExternalStore(
    store === null ? emptySubscribe : store.subscribe,
    () => store?.phase(list) ?? 0,
    () => 0,
  );
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  const covering = arrived && !seen && !settled;
  if (covering && phase >= 1 && waiting && !sawWait) setSawWait(true);
  if (covering && ((sawWait && !waiting) || (phase >= 2 && !waiting && !sawWait))) {
    setSettled(true);
    store?.note(list);
  }
  useEffect(() => {
    if (!arrived || seen) {
      store?.note(list);
      return;
    }
    refreshRef.current();
    store?.arm(list);
  }, [arrived, list, seen, store]);
  useEffect(() => {
    if (phase === 1) store?.ready(list);
  }, [phase, list, store]);
  return covering;
}
