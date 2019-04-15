export type Connectivity = "online" | "connecting" | "offline" | "crashed";

export type NetworkAdapter<Domain> = (params: {
  onChange: <K extends keyof Domain>(params: {
    kind: K;
    id: string;
    revision: string;
    value: Domain[K];
  }) => void;
  onConnectivityChange: (value: Connectivity) => void;
  onError: (error: Error) => void;
  onPushResult: (pushId: string, result: PushResult) => void;
}) => {
  getAndObserve: <K extends keyof Domain>(kind: K, id: string) => () => void;
  push: <K extends keyof Domain>(params: {
    kind: K;
    id: string;
    lastSeenRevision: string;
    pushId: string;
    value: Domain[K];
  }) => void;
};

export type PushResult = "success" | "conflict" | "internalError";
