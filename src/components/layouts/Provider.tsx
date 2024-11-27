import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from 'react-query';

// context
import { AlertContextProvider } from '@contexts/AlertContext';
import { ModalContextProvider } from '@contexts/ModalContext';
import { ThemeProvider } from '@contexts/ThemeContext';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, //쿼리 실패 시 재시도 횟수(기본값 3)
      retryDelay: 3000, // 재시도 간격 3초
      staleTime: 30000, // 30초
      cacheTime: 300000, // 5분
      refetchOnWindowFocus: false,
      keepPreviousData: true, // 새 데이터 로딩 중 이전 데이터 유지
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RecoilRoot>
      <ThemeProvider>
        <AlertContextProvider>
          <ModalContextProvider>
            <QueryClientProvider client={client}>
              {children}
            </QueryClientProvider>
          </ModalContextProvider>
        </AlertContextProvider>
      </ThemeProvider>
    </RecoilRoot>
  );
}
