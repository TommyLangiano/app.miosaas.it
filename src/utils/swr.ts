import useSWR, { SWRConfiguration, mutate } from 'swr';
import axios from './axios';

export const swrFetcher = async (url: string) => {
  let headers: Record<string, string> = {};
  try {
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
    if (companyId) headers['X-Company-ID'] = companyId;
  } catch {}
  const res = await axios.get(url, { headers });
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


