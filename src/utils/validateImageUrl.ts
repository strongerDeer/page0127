const validateImageUrl = async (
  url: string,
  timeout: number = 3000,
): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => resolve(false), timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };

    img.src = url;
  });
};

export const validateSpineflipUrl = async (
  coverUrl: string,
  isbn: string,
): Promise<string> => {
  const imgArr = coverUrl.split('cover200');

  // 두 가지 가능한 spineflip URL 생성
  const spineflipUrl1 = `${imgArr[0]}spineflip${imgArr[1].split('_')[0]}_d.jpg`;
  const spineflipUrl2 = `${imgArr[0]}spineflip/${isbn}_d.jpg`;

  // 첫 번째 URL 검증

  if (await validateImageUrl(spineflipUrl1)) {
    return spineflipUrl1;
  }

  // 두 번째 URL 검증
  if (await validateImageUrl(spineflipUrl2)) {
    return spineflipUrl2;
  }

  // 둘 다 실패하면 빈 문자열 반환
  return '/images/no-book.jpg';
};
