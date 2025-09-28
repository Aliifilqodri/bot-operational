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

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    chartInstance.current = new ChartJS(ctx, {
      type: 'doughnut', // donut chart
      data: {
        labels: ['Diproses', 'Selesai'],
        datasets: [
          {
            data: [data.totalDiproses || 0, data.totalSelesai || 0],
            backgroundColor: [
              'rgba(255, 159, 64, 0.8)', // orange
              'rgba(75, 192, 192, 0.8)', // teal
            ],
            borderColor: [
              'rgba(255, 159, 64, 1)',
              'rgba(75, 192, 192, 1)',
            ],
            borderWidth: 2,
            hoverOffset: 15, // slice "pop" saat hover
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%', // bikin donut
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
                const total = tooltipItem.chart._metasets[tooltipItem.datasetIndex].total;
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
