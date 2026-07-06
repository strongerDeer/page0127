import axios from 'axios';

/**
 * axios 클라이언트 인스턴스
 *
 * 학습 포인트:
 * - axios.create(): 공통 설정을 가진 인스턴스 생성
 * - baseURL: 모든 요청의 기본 URL (/api)
 * - timeout: 요청 제한 시간 (10초)
 * - 인터셉터: 요청/응답 전후 공통 로직 처리
 */
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  // 쿠키 기반 인증: 모든 요청에 자격 증명(쿠키) 포함 (fetch의 credentials: 'include' 대체)
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터
 * 모든 요청 전에 실행되는 로직
 *
 * 학습 포인트:
 * - 향후 인증 토큰을 자동으로 추가할 수 있음
 * - 요청 로깅, 데이터 변환 등 가능
 */
apiClient.interceptors.request.use(
  (config) => {
    // 향후 인증 토큰 추가 가능
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 * 모든 응답 후에 실행되는 로직
 *
 * 학습 포인트:
 * - 에러 처리를 한 곳에서 통합 관리
 * - 401 에러 시 로그인 페이지로 리다이렉트 등 가능
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // '/auth/me'는 로그인 여부를 확인하는 용도라 401이 정상 흐름 → 로깅 제외
    const isAuthCheck = error.config?.url === '/auth/me';

    // 인증 에러 처리
    if (error.response?.status === 401 && !isAuthCheck) {
      console.error('인증이 필요합니다.');
      // 향후: 로그인 페이지로 리다이렉트
      // window.location.href = '/login';
    }

    // 서버 에러 처리
    if (error.response?.status === 500) {
      console.error('서버 에러가 발생했습니다.');
    }

    return Promise.reject(error);
  }
);
