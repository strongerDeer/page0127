export const getSearchBook = async (query: string) => {
  if (!query) return [];
  const queryType = 'Keyword'; // Keyword: 제목+저자 | Title | Author | Publisher
  const start = 1;
  const url = `/ttb/api/ItemSearch.aspx?ttbkey=${process.env.NEXT_PUBLIC_ALADIN_API}&Query=${query}&QueryType=${queryType}&MaxResults=10&start=${start}&Cover=Big&Output=JS&Version=20131101`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('검색 중 오류가 발생했습니다.');
  const data = await response.json();
  return data?.item || [];
};

export const getBookInfo = async (isbn: string) => {
  const url = `/ttb/api/ItemLookUp.aspx?ttbkey=${process.env.NEXT_PUBLIC_ALADIN_API}&itemIdType=ISBN&ItemId=${isbn}&output=js&Version=20131101`;

  const response = await fetch(url);
  const data = await response.json();

  return data.item;
};
