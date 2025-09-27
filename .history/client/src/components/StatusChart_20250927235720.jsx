import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const StatusChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');

    // Buat gradien untuk slice
    const gradientDiproses = ctx.createLinearGradient(0, 0, 0, 300);
    gradientDiproses.addColorStop(0, '#fbbf24'); // oranye muda
    gradientDiproses.addColorStop(1, '#f59e0b'); // oranye tua

    const gradientSelesai = ctx.createLinearGradient(0, 0, 0, 300);
    gradientSelesai.addColorStop(0, '#34d399'); // hijau muda
    gradientSelesai.addColorStop(1, '#10b981'); // hijau tua

    chartInstance.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Diproses', 'Selesai'],
        datasets: [
          {
            data: [data.totalDiproses || 0, data.totalSelesai || 0],
            backgroundColor: [gradientDiproses, gradientSelesai],
            borderColor: ['#f59e0b', '#10b981'],
            borderWidth: 2,
            hoverOffset: 20,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 20, padding: 15 },
          },
          title: {
            display: true,
            text: 'Distribusi Status Tiket',
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
  }, [data]);

  return (
    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default StatusChart;
