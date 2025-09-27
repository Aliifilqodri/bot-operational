import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Daftarkan chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function DailyChart({ today = {}, yesterday = {} }) {
  const todayData = [Number(today.diproses) || 0, Number(today.selesai) || 0];
  const yesterdayData = [Number(yesterday.diproses) || 0, Number(yesterday.selesai) || 0];

  const chartData = {
    labels: ['Diproses', 'Selesai'],
    datasets: [
      { label: 'Hari Ini', data: todayData, backgroundColor: '#3b82f6', borderRadius: 6 },
      { label: 'Kemarin', data: yesterdayData, backgroundColor: '#10b981', borderRadius: 6 },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      title: { display: true, text: 'Perbandingan Status Tiket' },
      tooltip: { enabled: true },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  return <Bar data={chartData} options={options} />;
}

export default DailyChart;
