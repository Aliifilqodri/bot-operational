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

  // Gradien warna
  const gradientToday = 'rgba(59, 130, 246, 0.8)';
  const gradientYesterday = 'rgba(16, 185, 129, 0.8)';

  const chartData = {
    labels: ['Diproses', 'Selesai'],
    datasets: [
      { label: 'Hari Ini', data: todayData, backgroundColor: gradientToday, borderRadius: 10 },
      { label: 'Kemarin', data: yesterdayData, backgroundColor: gradientYesterday, borderRadius: 10 },
    ],
  };

  const options = {
    indexAxis: 'y', // horizontal bar
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 20, padding: 15 } },
      title: { display: true, text: 'Perbandingan Status Tiket', font: { size: 18, weight: 'bold' } },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            const total = tooltipItem.chart._metasets[tooltipItem.datasetIndex].total;
            const percent = ((value / total) * 100).toFixed(1);
            return `${tooltipItem.dataset.label}: ${value} (${percent}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: '#e5e7eb' },
      },
      y: {
        ticks: { autoSkip: false },
        grid: { drawTicks: false },
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  };

  return <Bar data={chartData} options={options} />;
}

export default DailyChart;
