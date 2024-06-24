import Select from '@components/form/Select';

export default function BasicInfo() {
  const options = [
    { value: 10, text: '10점: 인생책 등극!' },
    { value: 5, text: '5점: 추천' },
    { value: 4, text: '4점: 오 꽤괜' },
    { value: 3, text: '3점: 나쁘지 않았다!' },
    { value: 2, text: '2점: 음...내 취향은 아닌걸로!' },
    { value: 1, text: '1점: 꾸역꾸역' },
    { value: 0, text: '0점: 할많하안' },
  ];
  return (
    <div>
      <Select options={options} />
    </div>
  );
}
