import type { Book } from '@/entities/book';

/**
 * 이 책을 몇 번째로 읽는지 계산한다.
 *
 * `existingBook` 은 중복 다이얼로그가 세팅하는데 취소 경로에서 지워지지 않는다.
 * 그래서 "취소 후 다른 책 선택" 이면 남의 read_count 가 새 책에 붙어
 * 읽은 적 없는 책이 "2회독" 으로 기록된다 → ISBN 이 같은지 확인해야 한다.
 *
 * @param existingBook 중복 체크에서 찾은 기존 책. 없으면 null
 * @param selectedIsbn 지금 저장하려는 책의 ISBN13
 */
export const resolveReadCount = (
  existingBook: Pick<Book, 'isbn' | 'read_count'> | null,
  selectedIsbn: string
): number =>
  existingBook && existingBook.isbn === selectedIsbn
    ? existingBook.read_count + 1
    : 1;
