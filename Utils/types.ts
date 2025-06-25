export type ApiError<T> = {
  data: T;
  errors: ErrorObject[];
};
