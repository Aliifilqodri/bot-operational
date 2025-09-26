// file: TicketCard.jsx
import React from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { mapStatusForUI } from '../utils/statusUtils'; // fungsi mapStatusForUI dari backend

const STATUS_LIST = [
  { value: 'diproses', label: 'Diproses' },
  { value: 'on hold', label: 'On Hold' },
  { value: 'waiting third party', label: 'Menunggu Approval' },
  { value: 'done', label: 'Done' }
];

const TicketCard = ({ ticket, onUpdate }) => {

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value; // ini harus sesuai STATUS_LIST.value
    try {
      const res = await api.patch(`/tickets/${ticket._id}/set-status`, { status: newStatus });
      toast.success('Status berhasil diperbarui!');
      if (onUpdate) onUpdate(res.data); // update parent state
    } catch (err) {
      console.error('Gagal update status:', err);
      toast.error(err.response?.data?.message || 'Gagal update status');
    }
  };

  return (
    <div className="ticket-card p-4 shadow rounded bg-white">
      <h3 className="font-bold">{ticket.ticketCode}</h3>
      <p>{ticket.text}</p>

      <div className="mt-2">
        <label className="mr-2">Status:</label>
        <select
          value={ticket.status} // ini harus backend value: diproses/on hold/waiting third party/done
          onChange={handleStatusChange}
          className="border rounded px-2 py-1"
        >
          {STATUS_LIST.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-2 text-gray-500">
        Tampilan: {mapStatusForUI(ticket.status)}
      </p>
    </div>
  );
};

export default TicketCard;
