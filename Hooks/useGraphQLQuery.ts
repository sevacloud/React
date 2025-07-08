import GraphQLAPI, { graphqlOperation, GraphQLResult } from '@aws-amplify/api-graphql';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../Utils/types';

interface GraphQLResponse<T> {
  [key: string]: T | null;
}

type GeneratedQuery<TVariables, TQuery> = string & {
  __generatedQueryInput: TVariables;
  __generatedQueryOutput: TQuery;
};

interface UseGraphQLQueryProps<T, Q extends GraphQLResponse<T>, V, I = undefined> {
  /** Unique cache key for React Query */
  readonly cacheKey: string;
  /** Variables of type I passed into the GraphQL call */
  readonly queryInput?: I;
  /** Generated GraphQL document */
  readonly graphQLQuery: GeneratedQuery<V, Q>;
  /** Field name in the GraphQL response to extract the array from */
  readonly operationName: keyof Q;
  /** Optional React Query configuration */
  readonly options?: UseQueryOptions<T, ApiError<GraphQLResponse<T>>>;
}

/**
 * A generic React Query hook for fetching lists of items from AppSync.
 *
 * @author Liamarjit, Seva Cloud
 * @website https://sevacloud.co.uk
 * @Donation: https://www.paypal.com/donate/?hosted_button_id=6EB8U2A94PX5Q
 *
 * @template T The array item type returned by the query.
 * @template Q The overall GraphQL response shape, mapping keys to arrays of T.
 * @template V The variables-object type for your generated GraphQL query.
 * @template I The concrete Input subtype you want to send.
 *
 * @param cacheKey        Unique React Query cache key.
 * @param queryInput      Variables object of type I.
 * @param graphQLQuery    Amplify-generated GraphQL document.
 * @param operationName   Key on the response to pull the T[] from.
 * @param options         Optional React Query settings.
 *
 * @returns A UseQueryResult<T[], ApiError<…>> with `.data`, `.isLoading`, `.error`, etc.
 */
function useGraphQLQuery<
  T,
  Q extends GraphQLResponse<T>,
  V,
  I = undefined
>({
  cacheKey,
  queryInput,
  graphQLQuery,
  operationName,
  options,
}: UseGraphQLQueryProps<T, Q, V, I>): UseQueryResult<T, ApiError<GraphQLResponse<T>>> {
  console.log(`Loading ${String(operationName)} via AppSync and React Query`);

  const fetcher = async (input: I) => {
    console.log(`${String(operationName)} input:`, input);

    const response = (await GraphQLAPI.graphql<Q>(
      graphqlOperation(graphQLQuery, { input })
    )) as GraphQLResult<Q>;

    console.log('RESPONSE', response)

    if (response.errors?.length) {
      throw new Error(response.errors.map(e => e.message).join(', '));
    }
    if (!response.data || !(operationName in response.data)) {
      throw new Error(`No data for operation: ${String(operationName)}`);
    }

    const result = response.data[operationName] as T;
    if (result === null) {
      throw new Error(`Null data for operation: ${String(operationName)}`);
    }

    console.log(`${String(operationName)} result:`, result);
    return result;
  };

  return useQuery<T, ApiError<GraphQLResponse<T>>>({
    queryKey: [cacheKey, queryInput],
    queryFn: () => fetcher(queryInput as I),
    ...options,
  });
}

export default useGraphQLQuery;

