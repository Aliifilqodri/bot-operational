import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function PicChart({ data }) {
  const chartData = {
    labels: Object.keys(data),
    datasets: [{
      label: 'Jumlah Tiket',
      data: Object.values(data),
      backgroundColor: '#ef4444',
      borderRadius: 6,
    }],
  };
  const options = {
    responsive: true,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };
  return <Bar data={chartData} options={options} />;
}

export default PicChart;