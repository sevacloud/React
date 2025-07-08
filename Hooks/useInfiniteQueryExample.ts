import { InfiniteQueryExampleQuery, InfiniteQueryExampleItem, InfiniteQueryExampleInput, InfiniteQueryExampleStartKey, InfiniteQueryExampleLastEvaluatedKey } from 'API';
import { getInfiniteQueryExample } from '../../graphql/queries';
import useGraphQLInfiniteQuery from './useGraphQLInfiniteQuery';

export /**
 * Leverage the generic Infinite Query hook to call a GraphQL endpoint for paginated data
 *
 * @author Liamarjit, Seva Cloud
 * @website https://sevacloud.co.uk
 * @Donation: https://www.paypal.com/donate/?hosted_button_id=6EB8U2A94PX5Q
 *
 * @ Example
 * const {items, isLoading, isError, error} = useInfiniteQueryExample();
 *
 * @return {
 *   items: InfiniteQueryExampleItem[],
 *   isLoading: boolean,
 *   isError: boolean,
 *   error: Error,
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
