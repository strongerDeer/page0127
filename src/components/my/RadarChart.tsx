// https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1SSCL020R&vw_cd=MT_ZTITLE&list_id=D21B_2009&seqNo=&lang_mode=ko&language=kor&obj_var_id=&itm_id=&conn_path=MT_ZTITLE

import styles from './RadarChart.module.scss';

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
import { useMemo } from 'react';
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
interface Category {
  [category: string]: number;
}

const LABEL_TEXTS = {
  컴퓨터모바일: '컴퓨터/모바일',
  소설시희곡: '소설/시/희곡',
  에세이: '에세이',
  경제경영: '경제/경영',
  인문학: '인문학',
  자기계발: '자기계발',
} as const;
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
    tooltip: {
      callbacks: {
        title: () => '',
        label: (context) => `${context.label}: ${context.formattedValue}권`,
      },
    },
  },
  elements: {
    line: {
      backgroundColor: `rgba(${PRIMARY_RGB}, 0.2)`,
      borderColor: `rgba(${PRIMARY_RGB}, 1)`,
      borderWidth: 1,
    },
    point: {
      backgroundColor: `rgba(${PRIMARY_RGB}, 1)`,
      borderColor: `rgba(${PRIMARY_RGB}, 1)`,
      radius: 2,
      borderWidth: 0,
    },
  },
  scales: {
    r: {
      suggestedMin: 0,
    },
  },
};
export default function RadarChart({
  title,
  userData,
}: {
  title: string;
  userData: Category;
}) {
  const chartOptions: ChartOptions<'radar'> = useMemo(
    () => ({
      ...options,
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
            font: {
              size: 12,
            },
          },
          ticks: {
            display: false,
            color: '#333',
          },
          suggestedMax: Math.max(...Object.values(userData)),
        },
      },
    }),
    [userData],
  );
  const data = useMemo(() => {
    const labelEntries = Object.entries(LABEL_TEXTS);

    return {
      labels: labelEntries.map(([_, value]) => value),
      datasets: [
        {
          label: title,
          data: labelEntries.map(([key]) => userData[key] ?? 0),
        },
      ],
    };
  }, [userData, title]);

  return (
    <div className={styles.wrap} role="img" aria-label={`${title} 레이더 차트`}>
      <Radar options={chartOptions} data={data} />
    </div>
  );
}
