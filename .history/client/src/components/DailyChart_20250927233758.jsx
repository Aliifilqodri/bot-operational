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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function DailyChart({ today = {}, yesterday = {} }) {
  const todayData = [Number(today.diproses) || 0, Number(today.selesai) || 0];
  const yesterdayData = [Number(yesterday.diproses) || 0, Number(yesterday.selesai) || 0];

  // Gradien warna untuk visual modern
  const gradientToday = (ctx) => {
    const chart = ctx.chart;
    const {ctx: c, chartArea} = chart;
    if (!chartArea) return null;
    const gradient = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    gradient.addColorStop(1, 'rgba(147, 197, 253, 0.8)');
    return gradient;
  };

  const gradientYesterday = (ctx) => {
    const chart = ctx.chart;
    const {ctx: c, chartArea} = chart;
    if (!chartArea) return null;
    const gradient = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
    gradient.addColorStop(1, 'rgba(167, 243, 208, 0.8)');
    return gradient;
  };

  const chartData = {
    labels: ['Diproses', 'Selesai'],
    datasets: [
      { label: 'Hari Ini', data: todayData, backgroundColor: gradientToday, borderRadius: 12, hoverOffset: 10 },
      { label: 'Kemarin', data: yesterdayData, backgroundColor: gradientYesterday, borderRadius: 12, hoverOffset: 10 },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 20, padding: 15, color: '#fff' } },
      title: { display: true, text: 'Perbandingan Status Tiket', font: { size: 20, weight: 'bold' }, color: '#fff' },
      tooltip: {
        enabled: true,
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            const dataset = tooltipItem.dataset.data;
            const total = dataset.reduce((a,b)=>a+b,0);
            const percent = total ? ((value/total)*100).toFixed(1) : 0;
            return `${tooltipItem.dataset.label}: ${value} (${percent}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#fff', stepSize: 1 },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      y: {
        ticks: { color: '#fff', autoSkip: false },
        grid: { drawTicks: false, color: 'rgba(255,255,255,0.05)' },
      },
    },
    animation: { duration: 1000, easing: 'easeOutQuart' },
  };

  return <Bar data={chartData} options={options} />;
}

export default DailyChart;
