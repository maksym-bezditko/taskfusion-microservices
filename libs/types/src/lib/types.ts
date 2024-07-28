export type Error = {
  error?: string;
}

export type Errorable<T> =
  | T
  | Error;
