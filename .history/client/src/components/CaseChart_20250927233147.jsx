import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

// Daftarkan komponen chart.js yang dibutuhkan untuk Pie
ChartJS.register(ArcElement, Tooltip, Legend, Title);

function CaseChart({ data }) {
  const safeData = data || {};
  const labels = Object.keys(safeData);
  const values = Object.values(safeData).map(val => Number(val) || 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Jumlah Kemunculan',
        data: values,
        backgroundColor: [
          '#3b82f6',
          '#ef4444',
          '#f59e0b',
          '#10b981',
          '#8b5cf6',
          '#ec4899',
          '#14b8a6',
          '#f97316',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
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

  return <Pie data={chartData} options={options} />;
}

export default CaseChart;
