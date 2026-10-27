-- 책등 이미지를 공용 카탈로그(global_books)에도 채운다.
--
-- 왜: 책등은 등록 직후 브라우저가 "YES24 회색 대체 이미지가 아닌지" 확인한 뒤
-- books 행에만 채운다(spineImage.ts). global_books 는 등록 순간 spine_image NULL 로
-- 만들어지고 이후 아무도 고치지 않아서, 내 서재에는 책등이 보이는데 전체 도서
-- 목록(/books/all, global_books 를 읽음)에서는 빠졌다. 2026-09-28 백필 이후 들어온 책이 해당.
--
-- 규칙: global_books.spine_image 가 비어 있을 때만, 그 책의 상품번호로 만든
-- YES24 책등 주소와 정확히 같은 값만 옮긴다. 사용자가 books.spine_image 에 임의 주소를
-- 넣어도 공용 카탈로그로 번지지 않게 하려는 것이다.

CREATE FUNCTION public.sync_global_spine_image() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.spine_image IS NOT NULL THEN
    UPDATE public.global_books g
       SET spine_image = NEW.spine_image
     WHERE g.isbn = NEW.isbn
       AND g.spine_image IS NULL
       AND g.provider_item_id IS NOT NULL
       AND NEW.spine_image = 'https://image.yes24.com/goods/' || g.provider_item_id || '/SIDE/XL';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_global_spine_image() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER books_sync_global_spine_image
  AFTER INSERT OR UPDATE OF spine_image ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.sync_global_spine_image();

-- 이미 비어 있는 행을 한 번 채운다 (같은 규칙)
UPDATE public.global_books g
   SET spine_image = b.spine_image
  FROM (
    SELECT DISTINCT ON (isbn) isbn, spine_image
      FROM public.books
     WHERE spine_image IS NOT NULL
  ) b
 WHERE g.isbn = b.isbn
   AND g.spine_image IS NULL
   AND g.provider_item_id IS NOT NULL
   AND b.spine_image = 'https://image.yes24.com/goods/' || g.provider_item_id || '/SIDE/XL';
