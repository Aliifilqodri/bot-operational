// client/src/components/TicketCard.jsx
import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const CONFIG = {
  COLORS: {
    'diproses': { bg: '#fffbeb', text: '#d97706' },
    'on hold': { bg: '#fef2f2', text: '#dc2626' },
    'waiting third party': { bg: '#eff6ff', text: '#2563eb' },
    'done': { bg: '#ecfdf5', text: '#059669' }
  }
};

const STATUS_LIST = ['diproses', 'on hold', 'waiting third party', 'done'];

const TicketCard = ({ ticket }) => {
  const [loading, setLoading] = useState(false);

  const handleChangeStatus = async (newStatus) => {
    try {
      setLoading(true);
      const res = await api.put(`/tickets/${ticket._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(res.data.message);
      window.location.reload();
    } catch (err) {
      console.error('Gagal ubah status:', err);
      toast.error('Gagal mengubah status');
    } finally {
      setLoading(false);
    }
  };

  const color = CONFIG.COLORS[ticket.status] || { bg: '#f9fafb', text: '#111827' };

  return (
    <div className="p-4 rounded-2xl shadow-md mb-4" style={{ backgroundColor: color.bg }}>
      <h3 className="font-bold text-lg">{ticket.username}</h3>
      <p>{ticket.text}</p>
      <p className="text-sm" style={{ color: color.text }}>
        Status: {ticket.status}
      </p>

      <div className="flex gap-2 mt-3">
        {STATUS_LIST.map(s => (
          <button
            key={s}
            onClick={() => handleChangeStatus(s)}
            disabled={loading}
            className={`px-3 py-1 rounded-xl text-sm ${
              ticket.status === s ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TicketCard;
