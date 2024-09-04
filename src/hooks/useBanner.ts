import { getBanners } from '@remote/banner';
import { useQuery } from 'react-query';

export default function useBanner() {
  return useQuery(['banners'], () => getBanners({ hasAccount: false }), {
    suspense: true,
  });
}
