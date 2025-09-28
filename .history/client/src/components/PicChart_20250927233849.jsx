import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function PicChart({ data }) {
  const labels = Object.keys(data);
  const values = Object.values(data).map(val => Number(val) || 0);

  // Hitung total untuk persentase
  const total = values.reduce((a, b) => a + b, 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Jumlah Tiket',
        data: values,
        borderRadius: 10,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return '#ef4444';
          const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
          gradient.addColorStop(0, '#ef4444');
          gradient.addColorStop(1, '#fca5a5');
          return gradient;
        },
      },
    ],
  };

  const options = {
    indexAxis: 'y', // horizontal bar
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            const percent = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${tooltipItem.label}: ${value} (${percent}%)`;
          },
        },
      },
    },
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#e5e7eb' } },
      y: { ticks: { autoSkip: false }, grid: { drawTicks: false } },
    },
    animation: { duration: 1000, easing: 'easeOutQuart' },
  };

  return <Bar data={chartData} options={options} />;
}

export default PicChart;
