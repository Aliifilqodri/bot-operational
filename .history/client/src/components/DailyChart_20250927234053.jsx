import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const DailyPieChart = ({ today = {}, yesterday = {} }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');

    chartInstance.current = new ChartJS(ctx, {
      type: 'doughnut', // donut chart
      data: {
        labels: ['Diproses', 'Selesai'],
        datasets: [
          {
            label: 'Hari Ini',
            data: [today.diproses || 0, today.selesai || 0],
            backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(147, 197, 253, 0.8)'],
            borderColor: ['#3b82f6', '#3b82f6'],
            borderWidth: 2,
            hoverOffset: 15,
          },
          {
            label: 'Kemarin',
            data: [yesterday.diproses || 0, yesterday.selesai || 0],
            backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(167, 243, 208, 0.8)'],
            borderColor: ['#10b981', '#10b981'],
            borderWidth: 2,
            hoverOffset: 15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%', // bentuk donut
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 20, padding: 15 },
          },
          title: {
            display: true,
            text: 'Perbandingan Status Tiket',
            font: { size: 18, weight: 'bold' },
          },
          tooltip: {
            callbacks: {
              label: function (tooltipItem) {
                const value = tooltipItem.raw;
                const dataset = tooltipItem.dataset.data;
                const total = dataset.reduce((a, b) => a + b, 0);
                const percent = total ? ((value / total) * 100).toFixed(1) : 0;
                return `${tooltipItem.dataset.label} - ${tooltipItem.label}: ${value} (${percent}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [today, yesterday]);

  return (
    <div style={{ position: 'relative', height: '350px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default DailyPieChart;
