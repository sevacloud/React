import GraphQLAPI, { graphqlOperation, GraphQLResult } from '@aws-amplify/api-graphql';
import { useInfiniteQuery, UseInfiniteQueryResult } from '@tanstack/react-query';

interface InfiniteQueryOptions<TInput, TResponse> {
  query: string;
  input?: Omit<TInput, 'NextToken'>;
  queryKey: string[];
  getNextToken: (response: TResponse) => string | undefined;
}

interface GraphQLErrorDetail {
  message: string;
}

class GraphQLFetchError extends Error {
  errors: GraphQLErrorDetail[];

  constructor(message: string, errors: GraphQLErrorDetail[] = []) {
    super(message);
    this.errors = errors;
  }
}

/**
 * A custom React Query hook for paginated (infinite) GraphQL queries against an AWS AppSync endpoint.
 *
 * @author Liamarjit, Seva Cloud
 * @website https://sevacloud.co.uk
 *
 * @template TInput     The variables/input shape for the GraphQL query, including a `NextToken` field.
 * @template TResponse  The shape of the GraphQL response data returned for each page.
 *
 * @param props.query        The GraphQL query document (usually code-generated) to execute.
 * @param [props.input]      Initial input variables to send, excluding `NextToken`. Subsequent pages
 *                            will automatically pass the `NextToken` returned from the previous page.
 * @param props.queryKey     An array of strings used by React Query to uniquely cache and identify this query.
 * @param props.getNextToken A function that, given the response data of type `TResponse`, extracts the
 *                            `NextToken` string for fetching the next page, or returns `undefined` if
 *                            there are no more pages.
 *
 * @returns A `UseInfiniteQueryResult<TResponse, Error>` object from React Query, containing:
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
 *     getNextToken: data => data.listUsers?.nextToken ?? undefined,
 *   });
 * }
 * ```
 */
export default function useGraphQLInfiniteQuery<TInput, TResponse>({
  query,
  input,
  queryKey,
  getNextToken,
}: InfiniteQueryOptions<TInput, TResponse>): UseInfiniteQueryResult<TResponse, unknown> {
  const queryFn = async ({ pageParam }: { pageParam?: TResponse; }) => {
    try {
        console.log(`Loading all ${query} Data via AppSync and React Query`, input);
        const variables = pageParam ? { input: { NextToken: pageParam } } : {};

        const result = (await GraphQLAPI.graphql<GraphQLResult<TResponse>>(
            graphqlOperation(query, variables)
        )) as GraphQLResult<TResponse>;

        if (!result.data) throw new Error('No data returned from API');

        return result.data;
    } catch (err: any) {
      const gqlErrors = err?.errors ?? [];
      const message = gqlErrors.length > 0
        ? gqlErrors.map((e: GraphQLErrorDetail) => e.message).join(', ')
        : err.message || 'Unknown GraphQL error';
      console.error('GraphQL query error:', message);
      throw new GraphQLFetchError(message, gqlErrors);
    };
  };

  return useInfiniteQuery<TResponse, GraphQLFetchError>({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => getNextToken(lastPage),
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
  });
}
