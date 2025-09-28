import React, { useRef, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const DailyPieChart = ({ today = {}, yesterday = {} }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');

    const todayTotal = (Number(today.diproses) || 0) + (Number(today.selesai) || 0);
    const yesterdayTotal = (Number(yesterday.diproses) || 0) + (Number(yesterday.selesai) || 0);

    chartInstance.current = new ChartJS(ctx, {
      type: 'doughnut', // donut chart
      data: {
        labels: ['Hari Ini', 'Kemarin'],
        datasets: [
          {
            data: [todayTotal, yesterdayTotal],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)', // biru
              'rgba(16, 185, 129, 0.8)', // hijau
            ],
            borderColor: ['rgba(59, 130, 246, 1)', 'rgba(16, 185, 129, 1)'],
            borderWidth: 2,
            hoverOffset: 15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%', // donut
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 20, padding: 15 },
          },
          title: {
            display: true,
            text: 'Perbandingan Total Tiket Hari Ini vs Kemarin',
            font: { size: 18, weight: 'bold' },
          },
          tooltip: {
            callbacks: {
              label: function (tooltipItem) {
                const value = tooltipItem.raw;
                const total = tooltipItem.dataset.data.reduce((a, b) => a + b, 0);
                const percent = total ? ((value / total) * 100).toFixed(1) : 0;
                return `${tooltipItem.label}: ${value} (${percent}%)`;
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
    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default DailyPieChart;
