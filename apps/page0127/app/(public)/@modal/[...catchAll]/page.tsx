/**
 * 모달에서 다른 페이지로 이동하면(예: "이 책 보러 가기") {modal} 칸을 비운다.
 *
 * 왜 필요한가: 소프트 내비게이션에서 Parallel Route 칸은 새 주소에 맞는 것이 없으면 "이전 상태를 유지"한다.
 * 그러면 다른 페이지로 가도 모달이 남는다. 어떤 주소든 맞는 빈 페이지를 둬서 칸을 비운다.
 */
const ModalCatchAll = () => null;

export default ModalCatchAll;
