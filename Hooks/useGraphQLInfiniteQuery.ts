import GraphQLAPI, { graphqlOperation, GraphQLResult } from '@aws-amplify/api-graphql';
import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { ApiError, GraphQLResponse } from '../utils/types';

interface InfiniteQueryOptions<TInput, TResponse, TItem> {
  query: string;
  input?: TInput;
  queryKey: string[];
  queryString: keyof TResponse;
  getNextToken: (response: TResponse) => string | TItem;
  /** Optional React Query configuration */
  readonly options?: UseInfiniteQueryOptions<TResponse, ApiError<GraphQLResponse<TResponse>>>;
}

/**
 * A generic React Query hook for fetching paginated data from an AWS AppSync GraphQL endpoint.
 *
 * @author Liamarjit, Seva Cloud
 * @website https://sevacloud.co.uk
 * @Donation: https://www.paypal.com/donate/?hosted_button_id=6EB8U2A94PX5Q
 *
 * @template TInput      The shape of the GraphQL query input variables.
 * @template TResponse   The shape of the GraphQL response per page.
 * @template TItem       The shape of individual items in the paginated list.
 *
 * @param params.query            GraphQL query string to execute.
 * @param params.input            Initial input variables for the query. The `NextToken` will be injected automatically.
 * @param params.queryKey         A unique array used by React Query to identify and cache the query.
 * @param params.queryString      The top-level key in the GraphQL response where the paginated `Items` array is found.
 * @param params.getNextToken     A function to extract the pagination token from a page of data.
 * @param [params.options]        Additional React Query options such as `staleTime`, `retry`, etc.
 *
 * @returns An extended React Query result including:
 *  - `data.pages`: Array of full page responses
 *  - `items`: Flattened array of all items fetched across pages
 *  - `fetchNextPage()`, `hasNextPage`, `isFetching`, etc.
 *
 * @example
 * ```tsx
 * const { items, isLoading } = useGraphQLInfiniteQuery({
 *   query: listUsersQuery,
 *   input: { limit: 100 },
 *   queryKey: ['users'],
 *   queryString: 'listUsers',
 *   getNextToken: (data) => data.listUsers?.nextToken,
 * });
 * ```
 */
export default function useGraphQLInfiniteQuery<TInput, TResponse, TItem>({
  query,
  input,
  queryKey,
  queryString,
  getNextToken,
  options,
}: InfiniteQueryOptions<TInput, TResponse, TItem>) {
  const queryFn = async ({ pageParam }: { pageParam?: TResponse; }) => {
    console.log(`Loading all ${query} Data via AppSync and React Query`, input);
    const variables = { ...input, NextToken: pageParam };

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

  const infiniteQuery = useInfiniteQuery<TResponse, ApiError<GraphQLResponse<TResponse>>>({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => getNextToken(lastPage),
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
    ...options,
  });

  // Auto-fetch all pages
  useEffect(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetching) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery.data]);

  // Flatten items
  const items: TItem[] = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap(page => (page[queryString] as any)?.Items ?? []) ?? [];
  }, [infiniteQuery.data]);

  return {
    ...infiniteQuery,
    items,
  };
}
