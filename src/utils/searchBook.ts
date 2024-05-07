export const searchBook = async (query: string) => {
  const queryType = 'Keyword'; // Keyword: 제목+저자 | Title | Author | Publisher
  const start = 1;

  const url = `http://www.aladin.co.kr/ttb/api/ttb/api/ItemSearch.aspx?ttbkey=${process.env.NEXT_PUBLIC_ALADIN_API}&Query=${query}&QueryType=${queryType}&MaxResults=10&start=${start}&Cover=Big&Output=JS&Version=20131101`;

  const response = await fetch(url);
  const data = await response.json();

  return data;
};
