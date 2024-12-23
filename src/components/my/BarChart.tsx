'use client';
import styles from './Chart.module.scss';
import { PRIMARY_RGB } from '@constants';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const options: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    title: {
      display: false,
    },
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        title: () => '',
        label: (context) => `${context.label}월: ${context.formattedValue}권`,
      },
    },
  },

  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: { size: 12 },
      },
    },
    y: {
      display: false,
      beginAtZero: true,
    },
  },
};

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
);

interface UserData {
  [key: `${string}-${string}`]: number;
}

export default function BarChart({
  title,
  userData,
  year,
}: {
  title: string;
  userData: UserData;
  year: string;
}) {
  const data = useMemo(() => {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    return {
      labels: MONTHS.map((month) => `${Number(month)}`),
      datasets: [
        {
          label: title,
          data: MONTHS.map((month) => userData?.[`${year}-${month}`] ?? 0),
          backgroundColor: MONTHS.map((month) =>
            month === currentMonth
              ? `rgba(${PRIMARY_RGB}, 1)`
              : `rgba(${PRIMARY_RGB}, 0.4)`,
          ),
          borderRadius: 4,
        },
      ],
    };
  }, [userData, year, title]);

  return (
    <div className={styles.wrap}>
      <Bar options={options} data={data} />
    </div>
  );
}
