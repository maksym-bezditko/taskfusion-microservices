export type Error = {
  error?: unknown;
};

export type Errorable<T> = T & Error;
