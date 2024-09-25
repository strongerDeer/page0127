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
  plugins: {
    title: {
      display: false,
    },
    legend: {
      display: false,
    },
  },
  backgroundColor: 'rgba(46, 111, 242, 1)',

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

export default function BarChart({
  title,
  userData,
}: {
  title: string;
  userData: any;
}) {
  console.log(userData);
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

  const data = {
    labels: labelTexts.map((label) => `${Number(label)}`),
    datasets: [
      {
        label: '',
        data: labelTexts.map((label) =>
          userData && userData[label] ? userData[label]?.length || 0 : 0,
        ),
        borderRadius: 4,
      },
    ],
  };

  return <Bar options={options} data={data} />;
}
