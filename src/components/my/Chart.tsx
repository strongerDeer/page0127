// https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1SSCL020R&vw_cd=MT_ZTITLE&list_id=D21B_2009&seqNo=&lang_mode=ko&language=kor&obj_var_id=&itm_id=&conn_path=MT_ZTITLE

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const options: ChartOptions<'radar'> = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
  elements: {
    line: {
      backgroundColor: 'rgba(46, 111, 242, 0.2)',
      borderColor: '#2e6ff2',
      borderWidth: 2,
      tension: 0.1,
    },
    point: {
      backgroundColor: '#2e6ff2',
      borderColor: '#2e6ff2',
      radius: 2,
      borderWidth: 2,
    },
  },

  scales: {
    r: {
      beginAtZero: true,
      angleLines: {
        color: '#f5f5f5',
      },
      grid: {
        color: '#eee',
      },
      pointLabels: {
        color: '#333',
      },
      ticks: {
        display: false,
        color: '#333',
      },
    },
  },
};

export default function Chart({ userData }: { userData?: any }) {
  const { category, displayName } = userData;

  const data = {
    labels: [
      `인문학(${category['인문학']?.length})`,
      `경제경영(${category['경제경영']?.length})`,
      `소설/시/희곡(${category['소설시희곡']?.length})`,
      `자기계발(${category['자기계발']?.length})`,
      `컴퓨터/모바일(${category['컴퓨터모바일']?.length})`,
      `에세이(${category['에세이']?.length})`,
    ],
    datasets: [
      {
        label: displayName || '',
        data: [
          category['인문학']?.length || 0,
          category['경제경영']?.length || 0,
          category['소설시희곡']?.length || 0,
          category['자기계발']?.length || 0,
          category['컴퓨터모바일']?.length || 0,
          category['에세이']?.length || 0,
        ],
      },
    ],
  };

  return <Radar options={options} data={data} />;
}
