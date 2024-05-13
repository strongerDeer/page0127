'use client';

// https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1SSCL020R&vw_cd=MT_ZTITLE&list_id=D21B_2009&seqNo=&lang_mode=ko&language=kor&obj_var_id=&itm_id=&conn_path=MT_ZTITLE
import { AuthContext } from '@contexts/AuthContext';
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
      tension: 0.2,
    },
    point: {
      pointBackgroundColor: '#58D4AF',
      pointBorderColor: '#58D4AF',
      pointRadius: 2,
      pointBorderWidth: 2,
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

export default function Chart() {
  const { category } = useContext(AuthContext);

  console.log(category);
  const data = {
    labels: [
      '인문',
      '경제경영',
      '소설/시/희곡',
      '자기계발',
      '컴퓨터/모바일',
      '에세이',
      '기타',
    ],
    datasets: [
      {
        label: '평균',
        data: [3, 3, 2, 3, 1, 3, 1],
        backgroundColor: 'rgb(98, 208, 243, 0.2)',
        borderColor: '#62D0F3',
        borderDash: [4, 4],
        pointBackgroundColor: '#62D0F3',
        pointBorderColor: '#62D0F3',
      },
      {
        label: '강혜진님',
        data: [
          category?.humanity,
          category?.economy,
          category?.novel,
          category?.improvement,
          category?.computer,
          category?.essay,
          category?.other,
        ],
      },
    ],
  };
  return <Radar options={options} data={data} />;
}
