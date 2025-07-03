import GraphQLAPI, { graphqlOperation, GraphQLResult } from '@aws-amplify/api-graphql';
import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { ApiError, GraphQLResponse } from '../utils/types';

interface InfiniteQueryOptions<TInput, TResponse, TStartKey> {
  query: string
  queryInput?: TInput;
  itemsKey: string;
  queryKey: string[];
  nextTokenKey: string;
  queryString: keyof TResponse;
  getNextToken: (response: TResponse) => string | TStartKey;
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
 * @template TStartKey   The shape of the Start Key
 * @template TLastKey    The shape of the Last Evaluated Key
 *
 * @param params.query            GraphQL query string to execute.
 * @param params.input            Initial input variables for the query. The `NextToken` key will be injected automatically.
 * @param params.itemsKey         String containg the key of items within the query to return
 * @param params.queryKey         A unique array used by React Query to identify and cache the query.
 * @param params.nextTokenKey     The key name to inject the token into the input object (e.g., 'ExclusiveStartKey').
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
 *   queryInput: { limit: 100 },
 *   queryKey: ['users'],
 *   queryString: 'listUsers',
 *   itemsKey: 'Users',
 *   getNextToken: (data) => data.listUsers?.nextToken,
 *   nextTokenKey: 'ExclusiveStartKey',
 *   itemsKey: 'Items',
 * });
 * ```
 */
export default function useGraphQLInfiniteQuery<TInput, TResponse, TItem, TStartKey, TLastKey>({
  query,
  queryInput,
  itemsKey,
  queryKey,
  queryString,
  nextTokenKey,
  getNextToken,
  options,
}: InfiniteQueryOptions<TInput, TResponse, TStartKey>) {
  const queryFn = async ({ pageParam }: { pageParam?: string | TLastKey; }) => {
    console.log(`Loading all ${query} Data via AppSync and React Query`, queryInput);

    // Prevents double-stringification of strings and removes the __typename prop.
    const tokenValue = pageParam && typeof pageParam === 'object'
    ? Object.fromEntries(
        Object.entries(pageParam).filter(([key]) => key !== '__typename')
      )
    : pageParam;

    const variables = {
      input: {
        ...queryInput,
        ...(tokenValue ? { [nextTokenKey]: tokenValue } : {}),
      }
    };

    const result = (await GraphQLAPI.graphql<GraphQLResult<TResponse>>(
        graphqlOperation(query, variables)
    )) as GraphQLResult<TResponse>;

    if (result.errors?.length) {
      throw new Error(result.errors.map(e => e.message).join(', '));
    }

    if (!result.data) {
      throw new Error(`Null data for operation: ${query}`);
    }

    return result.data;
  };

  const infiniteQuery = useInfiniteQuery<TResponse, ApiError<GraphQLResponse<TResponse>>>({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => getNextToken(lastPage),
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
    return (
      infiniteQuery.data?.pages.flatMap((page) => {
        const resultBlock = page?.[queryString];
        return resultBlock?.[itemsKey] ?? [];
      }) ?? []
    );
  }, [infiniteQuery.data]);

  return {
    ...infiniteQuery,
    items,
  };
}
