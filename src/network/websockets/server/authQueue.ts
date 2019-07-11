export function makeAuthQueue<AuthDetails>(params: {
  onTerminate: () => void;
}) {
  const { onTerminate } = params;

  let authDetails: Promise<AuthDetails | undefined> = Promise.resolve(
    undefined
  );
  let preAuthMessageQueue: (() => void)[] = [];

  const processQueue = () => {
    preAuthMessageQueue.forEach(f => f());
    preAuthMessageQueue = [];
  };

  const addToQueue = (msg: any) => {
    if (preAuthMessageQueue.length > 100) {
      console.warn("Cache Size exceeded maximum allowed length");
      onTerminate();
      return;
    }
    preAuthMessageQueue.push(msg);
  };

  return {
    details: async (): Promise<AuthDetails> => {
      let details: AuthDetails | undefined;
      while (!details) {
        details = await authDetails;
        if (!details) await new Promise(addToQueue);
      }
      return details;
    },
    newAuthIncoming: async (p: Promise<AuthDetails | undefined>) => {
      authDetails = p;
      processQueue();
    }
  };
}
