import { getBanners } from '@remote/banner';
import { useQuery } from 'react-query';

export default function useBanner() {
  const { data, isLoading } = useQuery(['banners'], () => getBanners());
  return { data, isLoading };
}
