export interface GraphQLResponse<TResponse> {
  [key: string]: TResponse[] | null;
}

// This is the error object within React Query output
export type ApiError<TResponse> = {
  data: TResponse;
  errors: ErrorObject[];
};

interface ErrorObject {
  path: number[] | string[];
  errorType: string;
  locations: any | null;
  message: string;
}
