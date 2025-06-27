import GraphQLAPI, { graphqlOperation, GraphQLResult } from '@aws-amplify/api-graphql';
import { useInfiniteQuery, UseInfiniteQueryOptions, UseInfiniteQueryResult } from '@tanstack/react-query';
import { ApiError, GraphQLResponse } from '../utils/types';

interface InfiniteQueryOptions<TInput, TResponse, TItem = undefined> {
  query: string;
  input?: TInput;
  queryKey: string[];
  getNextToken: (response: TResponse) => string | TItem | undefined;
  /** Optional React Query configuration */
  readonly options?: UseInfiniteQueryOptions<TResponse, ApiError<GraphQLResponse<TResponse>>>;
}

/**
 * A generic React Query hook for fetching paginated data from an AWS AppSync GraphQL endpoint using client side pagination.
 *
 * @author Liamarjit, Seva Cloud
 * @website https://sevacloud.co.uk
 * @Donation: https://www.paypal.com/donate/?hosted_button_id=6EB8U2A94PX5Q
 *
 * @template TInput      The variables/input shape for the GraphQL query.
 * @template TResponse   The shape of the GraphQL response data returned for each page.
 * @template TItem       The shape of the items array within each page
 *
 * @param params.query           The GraphQL query document (usually code-generated) to execute.
 * @param params.input           Initial input variables to send.Subsequent pages will automatically pass
 *                                the `NextToken` returned from the previous page.
 * @param params.queryKey        An array of strings used by React Query to uniquely cache and identify this query.
 * @param params.getNextToken    A function that, given the response data of type `TResponse`, extracts the
 *                                `NextToken` string for fetching the next page, or returns `undefined` if
 *                                there are no more pages.
 * @param [params.options]       Optional React Query `UseInfiniteQueryOptions` to customize caching,
 *                                retry behavior, stale times, etc.
 *
 * @returns A `UseInfiniteQueryResult<TResponse, ApiError<GraphQLResponse<TResponse>>>` object from React Query, containing:
 *  - `data.pages`: an array of `TResponse` objects, one per fetched page,
 *  - `fetchNextPage()`, `hasNextPage`, `isFetching`, and other React Query utilities.
 *
 * @example
 * ```ts
 * function useAllUsers() {
 *   return useGraphQLInfiniteQuery<
 *     ListUsersQueryVariables,
 *     ListUsersQuery
 *   >({
 *     query: listUsersQuery,
 *     input: { limit: 50 },
 *     queryKey: ['users', 'infinite'],
 *     getNextToken: data => data.listUsers?.nextToken,
 *     options: {
 *       staleTime: 1000 * 60 * 5, // 5 minutes
 *       retry: 1,
 *     },
 *   });
 * }
 * ```
 */
export default function useGraphQLInfiniteQuery<TInput, TResponse, TItem = undefined>({
  query,
  input,
  queryKey,
  getNextToken,
  options,
}: InfiniteQueryOptions<TInput, TResponse, TItem>): UseInfiniteQueryResult<TResponse, ApiError<GraphQLResponse<TResponse>>> {
  const queryFn = async ({ pageParam }: { pageParam?: TResponse; }) => {
    console.log(`Loading all ${query} Data via AppSync and React Query`, input);
    const variables = pageParam ? { input: { ...input, NextToken: pageParam } } : {...input};

    const result = (await GraphQLAPI.graphql<GraphQLResult<TResponse>>(
        graphqlOperation(query, variables)
    )) as GraphQLResult<TResponse>;

    if (result.errors?.length) {
      throw new Error(result.errors.map(e => e.message).join(', '));
    }

    if (result === null) {
      throw new Error(`Null data for operation: ${query}`);
    }

    return result.data;
  };

  return useInfiniteQuery<TResponse, ApiError<GraphQLResponse<TResponse>>>({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => getNextToken(lastPage),
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
    ...options,
  });
}
