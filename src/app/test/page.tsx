import BarChart from '@components/my/BarChart';
import RadarChart from '@components/my/RadarChart';
import useUserCount from '@connect/user/useUserCount';

export default function Page() {
  const { data: counterData } = useUserCount('dreamfulbud', '2024');

  return (
    <div>
      {counterData && (
        <>
          {/* <BarChart title="ddd" userData={counterData.date} year="2024" /> */}
          {/* <RadarChart title={'ddd'} userData={counterData.category || {}} /> */}
        </>
      )}
    </div>
  );
}
