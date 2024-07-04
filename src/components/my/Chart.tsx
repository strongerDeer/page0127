// https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1SSCL020R&vw_cd=MT_ZTITLE&list_id=D21B_2009&seqNo=&lang_mode=ko&language=kor&obj_var_id=&itm_id=&conn_path=MT_ZTITLE

import useUser from '@hooks/auth/useUser';
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
} from 'chart.js';
import { useContext } from 'react';
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

const options = {
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
      backgroundColor: 'rgba(88, 212, 175, 0.2)',
      borderColor: '#58D4AF',
      borderWidth: 2,
      // tension: 0.2,
    },
  },
  point: {
    pointBackgroundColor: '#58D4AF',
    pointBorderColor: '#58D4AF',
    pointRadius: 2,
    pointBorderWidth: 2,
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
      '인문학',
      '경제경영',
      '소설/시/희곡',
      '자기계발',
      '컴퓨터/모바일',
      '에세이',
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
