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

// Daftarkan komponen chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function CaseChart({ data }) {
  // pastikan data selalu objek dan nilai angka
  const safeData = data || {};
  const labels = Object.keys(safeData);
  const values = Object.values(safeData).map(val => Number(val) || 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Jumlah Kemunculan',
        data: values,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    indexAxis: 'y', // horizontal bar
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
      y: {
        ticks: {
          autoSkip: false,
        },
      },
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Distribusi Kasus',
        font: {
          size: 16,
        },
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}

export default CaseChart;
