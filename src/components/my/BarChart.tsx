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
  },
  // backgroundColor: 'rgba(46, 111, 242, 1)',

  scales: {
    x: {
      grid: {
        display: false,
        // color: '#eee',
      },
    },
    y: {
      display: false,
    },
  },
};

const labelTexts = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
];

export default function BarChart({
  title,
  userData,
  year,
}: {
  title: string;
  userData: any;
  year: string;
}) {
  const data = {
    labels: labelTexts.map((label) => `${Number(label)}`),
    datasets: [
      {
        label: title,
        data: labelTexts.map((label) =>
          userData && userData[`${year}-${label}`]
            ? userData[`${year}-${label}`] || 0
            : 0,
        ),
        backgroundColor: labelTexts.map((label) => {
          if (Number(label) === new Date().getMonth() + 1) {
            return `rgba(${PRIMARY_RGB}, 1)`;
          } else {
            return `rgba(${PRIMARY_RGB}, 0.4)`;
          }
        }),
        borderRadius: 4,
      },
    ],
  };

  return <Bar options={options} data={data} />;
}
