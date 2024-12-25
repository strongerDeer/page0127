'use client';

import RadarChart from '@components/my/RadarChart';
import useUserCount from '@connect/user/useUserCount';
import { Radar } from 'react-chartjs-2';

export default function Page() {
  const { data: counterData } = useUserCount('dreamfulbud', '2024');

  console.log(counterData?.category);
  return (
    <div>
      테스트
      {counterData && (
        <>
          {/* <BarChart title="ddd" userData={counterData.date} year="2024" /> */}
          <RadarChart
            title={'ddd'}
            userData={{
              소설시희곡: 6,
              컴퓨터모바일: 11,
              경제경영: 15,
              만화: 0,
              인문학: 8,
              에세이: 7,
              자기계발: 6,
              예술대중문화: 1,
              어린이: 0,
            }}
          />
        </>
      )}
    </div>
  );
}
