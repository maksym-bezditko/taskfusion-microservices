export type Error = {
  error?: string;
  status?: number;
  microserviceName?: string;
};

export type Errorable<T> = T & Error;

export const isError = (obj: unknown): obj is Error =>
  typeof obj === 'object' && obj !== null && 'error' in obj;
