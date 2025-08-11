import useSWR, { SWRConfiguration, mutate } from 'swr';
import axios from './axios';

export const swrFetcher = async (url: string) => {
  const res = await axios.get(url);
  return res.data?.data ?? res.data;
};

export const defaultSWRConfig: SWRConfiguration = {
  fetcher: swrFetcher,
  revalidateOnFocus: true,
  dedupingInterval: 2000,
  keepPreviousData: true,
  errorRetryCount: 2
};

export { useSWR, mutate };


