export function makeAuthQueue<Details>(params: { onTerminate: () => void }) {
  const { onTerminate } = params;

  let currentPromise: Promise<Details | undefined> = Promise.resolve(undefined);
  let latestPromise: Promise<Details | undefined> = Promise.resolve(undefined);
  const waitingCalls: ((details: Details) => void)[] = [];

  return {
    details: async (): Promise<Details> => {
      const details = await currentPromise;
      if (details) return details;
      if (waitingCalls.length > 100) {
        console.warn("Cache Size exceeded maximum allowed length");
        onTerminate();
        return new Promise(() => {});
      }
      return new Promise((resolve) => waitingCalls.push(resolve));
    },
    newAuthIncoming: async (
      p: Promise<Details | undefined>,
      options: { block?: boolean } = {}
    ) => {
      const shouldBlock = options.block !== false;

      latestPromise = p;

      if (shouldBlock) currentPromise = p;

      const details = await p;
      if (!details || latestPromise !== p) return;

      if (!shouldBlock) currentPromise = p;

      waitingCalls.forEach((f) => f(details));
      waitingCalls.splice(0);
    },
  };
}
