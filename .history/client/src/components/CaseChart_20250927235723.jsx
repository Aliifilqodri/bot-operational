import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

// Daftarkan komponen chart.js
ChartJS.register(ArcElement, Tooltip, Legend, Title);

function CasePieChart({ data }) {
  const safeData = data || {};
  const labels = Object.keys(safeData);
  const values = Object.values(safeData).map(val => Number(val) || 0);

  // Warna pie otomatis
  const backgroundColors = labels.map(
    (_, i) =>
      `hsl(${(i * 360) / labels.length}, 70%, 50%)` // variasi warna HSL
  );

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: backgroundColors,
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 20,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'Distribusi Kasus',
        font: {
          size: 18,
          weight: 'bold',
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (tooltipItem) {
            const label = tooltipItem.label || '';
            const value = tooltipItem.raw || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  return <Pie data={chartData} options={options} />;
}

export default CasePieChart;
