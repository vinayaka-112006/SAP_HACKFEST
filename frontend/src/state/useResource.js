import { useEffect, useRef, useState, useCallback } from "react";
export function useResource(key, loader, enabled = true) {
  const latestLoader = useRef(loader);
  latestLoader.current = loader;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    key: null,
    data: null,
    loading: false,
    error: null,
  });
  const resourceKey = key + ":" + revision;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    // Deferral lets StrictMode clean up its first development mount before issuing a request.
    const timer = setTimeout(async () => {
      setState({ key: resourceKey, data: null, loading: true, error: null });
      try {
        const data = await latestLoader.current(controller.signal);
        if (active)
          setState({ key: resourceKey, data, loading: false, error: null });
      } catch (error) {
        if (active && !controller.signal.aborted)
          setState({ key: resourceKey, data: null, loading: false, error });
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [resourceKey, enabled]);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  // Never show the previous incident/window/identity's values under a new selection.
  return {
    ...(enabled && state.key === resourceKey
      ? state
      : { data: null, error: null, loading: enabled }),
    refresh,
  };
}
