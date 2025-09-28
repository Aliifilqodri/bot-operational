import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function PicPieChart({ data }) {
  const labels = Object.keys(data);
  const values = Object.values(data).map(val => Number(val) || 0);

  // Warna otomatis untuk setiap slice
  const backgroundColors = labels.map(
    (_, i) => `hsl(${(i * 360) / labels.length}, 70%, 50%)`
  );

  const total = values.reduce((a, b) => a + b, 0);

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
      legend: { position: 'right', labels: { boxWidth: 20, padding: 15 } },
      title: { display: true, text: 'Distribusi Tiket', font: { size: 18, weight: 'bold' } },
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
  };

  return <Pie data={chartData} options={options} />;
}

export default PicPieChart;
