import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * True once this component has hydrated in the browser; false during
 * server rendering and the first client paint. For anything that can only
 * be known client-side — today's date, `navigator.clipboard` — reading it
 * straight in render would make the server-rendered HTML and the first
 * client render disagree (a hydration mismatch React logs as an error).
 * `useSyncExternalStore`'s `getServerSnapshot` is the supported fix: it
 * forces that first client render to still report `false`, matching the
 * server, and only flips to `true` on the render immediately after
 * hydration finishes — so this never calls `setState` from inside a
 * `useEffect` body (which a plain `useState` + `useEffect(() => set(true))`
 * pattern would, and which is a lint error in this repo).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
