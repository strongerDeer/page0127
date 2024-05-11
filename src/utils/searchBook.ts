export const searchBook = async (query: string) => {
  const queryType = 'Keyword'; // Keyword: 제목+저자 | Title | Author | Publisher
  const start = 1;

  const url = `/ttb/api/ItemSearch.aspx?ttbkey=${process.env.NEXT_PUBLIC_ALADIN_API}&Query=${query}&QueryType=${queryType}&MaxResults=10&start=${start}&Cover=Big&Output=JS&Version=20131101`;

  const response = await fetch(url);
  const data = await response.json();

  return data;
};

export const getDataBook = async (isbn: string) => {
  const url = `/ttb/api/ItemLookUp.aspx?ttbkey=${process.env.NEXT_PUBLIC_ALADIN_API}&itemIdType=ISBN&ItemId=${isbn}&output=js&Version=20131101`;

  const response = await fetch(url);
  const data = await response.json();

  return data;
};
