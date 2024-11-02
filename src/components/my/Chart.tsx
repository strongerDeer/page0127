// https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1SSCL020R&vw_cd=MT_ZTITLE&list_id=D21B_2009&seqNo=&lang_mode=ko&language=kor&obj_var_id=&itm_id=&conn_path=MT_ZTITLE

import { PRIMARY_RGB } from '@constants';
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
  maintainAspectRatio: true,
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
      backgroundColor: `rgba(${PRIMARY_RGB}, 0.2)`,
      borderColor: `rgba(${PRIMARY_RGB}, 1)`,
      borderWidth: 2,
      tension: 0.1,
    },
    point: {
      backgroundColor: `rgba(${PRIMARY_RGB}, 1)`,
      borderColor: `rgba(${PRIMARY_RGB}, 1)`,
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

interface Category {
  [category: string]: string[];
}
export default function Chart({
  title,
  userData,
}: {
  title: string;
  userData: Category;
}) {
  const labelTexts = [
    '컴퓨터모바일',
    '소설시희곡',
    '에세이',
    '경제경영',
    '인문학',
    '자기계발',
  ];

  const data = {
    labels: labelTexts.map((label) => `${label} (${userData[label] || 0})`),
    datasets: [
      {
        label: title,
        data: labelTexts.map((label) => userData[label] || 0),
      },
    ],
  };

  return <Radar options={options} data={data} />;
}
