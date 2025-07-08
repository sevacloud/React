import { InfiniteQueryExampleQuery, InfiniteQueryExampleItem, InfiniteQueryExampleInput, InfiniteQueryExampleStartKey, InfiniteQueryExampleLastEvaluatedKey } from 'API';
import { getInfiniteQueryExample } from '../../graphql/queries';
import useGraphQLInfiniteQuery from './useGraphQLInfiniteQuery';

export /**
 * Leverage the generic Infinite Query hook to call a GraphQL endpoint for paginated data
 *
 * @return {
 *   items: InfiniteQueryExampleItem[];
 *   ...
 * }
 */
const useInfiniteQueryExample = () => {
  return useGraphQLInfiniteQuery<
    InfiniteQueryExampleInput,
    InfiniteQueryExampleQuery,
    InfiniteQueryExampleItem,
    InfiniteQueryExampleStartKey,
    InfiniteQueryExampleLastEvaluatedKey
  >({
    query: getInfiniteQueryExample,
    queryKey: ['infiniteQueryExample'],
    queryInput: {PrimaryKey: 'PrimaryKeyValue'},
    queryString: 'getInfiniteQueryExample',
    getNextToken: (data) => data?.getInfiniteQueryExample.NextToken,
    nextTokenKey: 'NextToken',
    itemsKey: 'Items',
    options: {
      refetchInterval: 30 * 60 * 1000, // Match RefreshRate of the data
      staleTime: 30 * 60 * 1000,
    }
  });
};
