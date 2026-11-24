import { SentenceModal } from '@/features/daily-sentence';
import { getTodaySentenceState } from '@/features/daily-sentence/api/getTodaySentenceState';

/**
 * /sentence 를 사이트 안에서 열면 여기서 가로채 모달로 띄운다 (Intercepting Route).
 *
 * (.) = 같은 단계의 sentence 세그먼트를 가로챈다. 라우트 그룹 (public) 은 단계로 세지 않는다.
 * 레이아웃의 {modal} 칸(Parallel Route `@modal`)에 그려져서 뒤의 홈·서재 화면은 그대로 남는다.
 */
const SentenceModalPage = async () => {
  const state = await getTodaySentenceState();
  return <SentenceModal {...state} />;
};

export default SentenceModalPage;
