/**
 * Lets one asynchronous action run at a time. A second call while the first is still
 * running (a double click, Enter held down, a second tab key on the button) is ignored
 * and does not start the action again. Used where a repeat would write twice.
 */
export interface SingleFlight {
  /** Runs `action` unless one is already running; resolves to its result, or undefined when the call was ignored. */
  run<T>(action: () => Promise<T>): Promise<T | undefined>;
  isBusy(): boolean;
}

export function createSingleFlight(): SingleFlight {
  let busy = false;
  return {
    async run<T>(action: () => Promise<T>) {
      if (busy) return undefined;
      busy = true;
      try {
        return await action();
      } finally {
        busy = false;
      }
    },
    isBusy: () => busy,
  };
}
