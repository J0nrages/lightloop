import * as React from 'react'

type UseSyncExternalStore = typeof React.useSyncExternalStore

const fallback: UseSyncExternalStore = ((
  _subscribe: Parameters<UseSyncExternalStore>[0],
  getSnapshot: Parameters<UseSyncExternalStore>[1]
) => getSnapshot()) as UseSyncExternalStore

export const useSyncExternalStore: UseSyncExternalStore =
  React.useSyncExternalStore ?? fallback

export default { useSyncExternalStore }
