// File: ../components/PlatformChart.jsx

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
// Penting: Pastikan Anda telah menginstal dan mendaftarkan Chart.js components
// import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
// ChartJS.register(ArcElement, Tooltip, Legend);

const PlatformChart = ({ data }) => {
  const chartData = {
    labels: Object.keys(data),
    datasets: [
      {
        label: 'Jumlah Tiket',
        data: Object.values(data),
        backgroundColor: [
          '#0088CC', // Warna untuk Telegram (Biru)
          '#25D366', // Warna untuk WhatsApp (Hijau)
          '#FFC107', // Warna cadangan
        ],
        hoverBackgroundColor: [
          '#0077B3', 
          '#1DA850', 
          '#E0A800',
        ],
        borderColor: '#f4f7f9',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.raw !== null) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1) + '%';
              label += `${context.raw} (${percentage})`;
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '250px', position: 'relative' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default PlatformChart;