import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement, // Diperlukan untuk Pie & Doughnut chart
  Tooltip,
  Legend,
  Title, // Opsional untuk judul
} from 'chart.js';

// Daftarkan komponen Chart.js yang akan digunakan untuk Pie Chart
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  Title
);

const StatusChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    // Hancurkan chart yang ada sebelumnya
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    
    chartInstance.current = new ChartJS(ctx, {
      type: 'pie', // Tipe chart diubah menjadi 'pie'
      data: {
        // Label sekarang mendefinisikan setiap "potongan" pie
        labels: ['Diproses', 'Selesai'],
        datasets: [
          {
            // Data adalah array yang sesuai dengan urutan label
            data: [data.totalDiproses, data.totalSelesai],
            // BackgroundColor juga array yang sesuai dengan urutan label
            backgroundColor: [
              'rgba(255, 159, 64, 0.7)', // Warna oranye untuk 'Diproses'
              'rgba(75, 192, 192, 0.7)', // Warna hijau toska untuk 'Selesai'
            ],
            borderColor: [
              'rgba(255, 159, 64, 1)',
              'rgba(75, 192, 192, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top', // Posisi legenda (misal: 'top', 'bottom', 'left', 'right')
          },
          title: {
            display: true,
            text: 'Distribusi Status Tiket', // Judul chart
            font: {
              size: 16
            }
          },
        },
        // Pie chart tidak menggunakan skala sumbu (x/y)
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default StatusChart;