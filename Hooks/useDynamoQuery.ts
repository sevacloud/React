import GraphQLAPI, { graphqlOperation, GraphQLResult } from '@aws-amplify/api-graphql';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { DynamoDBQueryInput } from 'API';
import { ApiError } from '../utils/types';

interface GraphQLResponse<T> {
  [key: string]: T[] | null;
}

type GeneratedQuery<TVariables, TQuery> = string & {
  __generatedQueryInput: TVariables;
  __generatedQueryOutput: TQuery;
};

interface UseDynamoQueryProps<T, Q, V> {
  readonly cacheKey: string;
  readonly queryInput?: DynamoDBQueryInput;
  readonly graphQLQuery: GeneratedQuery<V, Q>;
  readonly operationName: keyof Q;
  readonly options?: UseQueryOptions<T[], ApiError<GraphQLResponse<T>>>;
}

/**
 * A reusable React Query hook for fetching lists of items from an AWS AppSync GraphQL endpoint
 * using a DynamoDB query API.
 *
 * @template T The type of the individual items in the returned array.
 * @template Q The raw GraphQL response shape, constrained to a map of arrays of T.
 * @template V The variables object type accepted by the generated GraphQL query.
 *
 * @param cacheKey Unique key to cache this query in React Query.
 * @param queryInput DynamoDBQueryInput object (e.g. { Operation: 'scan', ... }) that will be passed as the `input` variable to the GraphQL call.
 * @param graphQLQuery A typed, generated GraphQL query string (e.g. from AWS Amplify codegen).
 * @param operationName The key in the GraphQL response data under which the list is returned. Must match one of the keys on Q.
 * @param options Optional React Query `UseQueryOptions` to customize caching, retry behavior, stale times, etc.
 *
 * @returns A React Query `UseQueryResult<T[], ApiError<GraphQLResponse<T>>>` containing:
 *  - `data`: the array of T items when the query succeeds,
 *  - `isLoading`, `isError`, `error`, and other query-state flags.
 *
 * @example
 * ```ts
 * function useFailedDrivesAuditData() {
 *   return useDynamoQuery<
 *     FailedDrivesAuditData,
 *     GetFailedDrivesAuditDataQuery,
 *     GetFailedDrivesAuditDataQueryVariables
 *   >({
 *     cacheKey: 'failedDrives',
 *     queryInput: { Operation: 'scan' },
 *     graphQLQuery: getFailedDrivesAuditData,
 *     operationName: 'getFailedDrivesAuditData',
 *     options: {
 *       staleTime: 5 * 60 * 1000, // 5 minutes
 *       retry: 2,
 *     },
 *   });
 * }
 * ```
 */
const useDynamoQuery = <T, Q extends GraphQLResponse<T>, V>({
  cacheKey,
  queryInput,
  graphQLQuery,
  operationName,
  options,
}: UseDynamoQueryProps<T, Q, V>) => {
  console.log(`Loading ${String(operationName)} Data via AppSync and React Query`);

  const getData = async (queryInput: DynamoDBQueryInput) => {
    console.log(`${String(operationName)} Query Input: ${queryInput}`);

    try {
      // Call GraphQL endpoint
      const response = await GraphQLAPI.graphql<Q>(
        graphqlOperation(graphQLQuery, { input: queryInput }),
      ) as GraphQLResult<Q>;

      // Check for GraphQL errors
      if (response.errors?.length) {
        throw new Error(response.errors.map(e => e.message).join(', '));
      }

      // Check if data exists and has the operation
      if (!response.data || !(operationName in response.data)) {
        throw new Error(`No data returned for operation: ${String(operationName)}`);
      }

      const data = response.data[operationName] as T[];

      // Check if data is null
      if (data === null) {
        throw new Error(`Null data returned for operation: ${String(operationName)}`);
      }

      console.log(`${String(operationName)} data:`, data);
      return data;

    } catch (error) {
      // Handle different types of errors
      if (error instanceof Error) {
        // Re-throw with additional context if needed
        throw new Error(`GraphQL Query Error: ${error.message}`);
      }
      // Handle unknown error types
      throw new Error(`Unknown error occurred: ${String(JSON.stringify(error))}`);
    }
  };

  return useQuery<T[], ApiError<GraphQLResponse<T>>>({
    queryKey: [cacheKey, queryInput],
    queryFn: () => getData(queryInput),
    ...options, // Allow overriding defaults with passed options
  });
};

export default useDynamoQuery;
