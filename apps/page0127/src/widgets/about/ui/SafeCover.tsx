import { CoverImage } from '@repo/ui';

type SafeCoverProps = {
  src: string;
  /** src 를 못 불러왔을 때 대신 쓸 주소 (Storage 사본) */
  fallbackSrc?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** 못 불러왔을 때 대신 그릴 것 — 없으면 아무것도 그리지 않는다 */
  fallback?: React.ReactNode;
};

/**
 * 불러오지 못한 표지는 칸째로 사라진다(또는 fallback 으로 바뀐다).
 *
 * 소개 페이지의 표지는 장식이라 "이미지 없음" 대체 그림을 보여 줄 이유가 없다 —
 * 깨진 아이콘이 줄지어 있는 것보다 그 자리를 비우는 편이 낫다.
 * (운영에서도 원본 주소가 죽은 표지가 섞일 수 있다. 로컬에서는 운영 저장소 주소가
 *  CSP 에 막혀 같은 상황이 재현된다.)
 *
 * 실패 시 대체와 YES24 크기 고르기는 CoverImage 가 한다. 여기는 기본값(비우기)만 정한다.
 */
export const SafeCover = ({ fallback = null, ...props }: SafeCoverProps) => (
  <CoverImage {...props} fallback={fallback} />
);
