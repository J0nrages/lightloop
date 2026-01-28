import * as React from 'react'
import { useSyncExternalStore } from '@/lib/use-sync-external-store-shim'

const objectIs =
  typeof Object.is === 'function'
    ? Object.is
    : (x: unknown, y: unknown) =>
        (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
        (x !== x && y !== y)

type UseSyncExternalStoreWithSelector = (...args: any[]) => any

export const useSyncExternalStoreWithSelector: UseSyncExternalStoreWithSelector = (
  subscribe,
  getSnapshot,
  getServerSnapshot,
  selector,
  isEqual
) => {
  const instRef = React.useRef<{ hasValue: boolean; value: any } | null>(null)
  if (instRef.current === null) {
    instRef.current = { hasValue: false, value: null }
  }
  const inst = instRef.current

  const [getSelection, getServerSelection] = React.useMemo(() => {
    let hasMemo = false
    let memoizedSnapshot: any
    let memoizedSelection: any
    const maybeGetServerSnapshot = getServerSnapshot ?? null

    const memoizedSelector = (nextSnapshot: any) => {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        const nextSelection = selector(nextSnapshot)
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection
            return memoizedSelection
          }
        }
        memoizedSelection = nextSelection
        return nextSelection
      }

      const currentSelection = memoizedSelection
      if (objectIs(memoizedSnapshot, nextSnapshot)) {
        return currentSelection
      }

      const nextSelection = selector(nextSnapshot)
      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot
        return currentSelection
      }

      memoizedSnapshot = nextSnapshot
      memoizedSelection = nextSelection
      return nextSelection
    }

    const getSnapshotWithSelector = () => memoizedSelector(getSnapshot())
    const getServerSnapshotWithSelector =
      maybeGetServerSnapshot === null
        ? undefined
        : () => memoizedSelector(maybeGetServerSnapshot())

    return [getSnapshotWithSelector, getServerSnapshotWithSelector]
  }, [getSnapshot, getServerSnapshot, selector, isEqual, inst])

  const value = useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection
  )

  React.useEffect(() => {
    inst.hasValue = true
    inst.value = value
  }, [value, inst])

  React.useDebugValue(value)
  return value
}

export default { useSyncExternalStoreWithSelector }
