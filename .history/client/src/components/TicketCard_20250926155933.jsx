// client/src/components/TicketCard.jsx
import React, { useState } from 'react';
import api from '../api'; // axios instance
import toast from 'react-hot-toast';

// --- KONFIGURASI DESAIN (Final Merge) ---
const CONFIG = {
  COLORS: {
    'diproses': { bg: '#fffbeb', text: '#d97706', border: '#fbbf24' },
    'on hold': { bg: '#fefce8', text: '#ca8a04', border: '#facc15' },
    'waiting third party': { bg: '#f0f9ff', text: '#0284c7', border: '#38bdf8' },
    'done': { bg: '#f0fdf4', text: '#16a34a', border: '#4ade80' },
    // fallback
    default: { bg: '#f9fafb', text: '#111827', border: '#d1d5db' }
  },
  ICONS: {
    group: "M17 20s5-4 5-8c0-3.866-3.582-7-8-7s-8 3.134-8 7c0 4 5 8 5 8h6zM8 9a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4z",
    reporter: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    pic: "M12 12a5 5 0 110-10 5 5 0 010 10zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    clock: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12H9v7h6v-2h-4V6z",
    send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    arrow: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3",
  }
};

// --- DAFTAR STATUS ---
const STATUS_LIST = ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'];

// Komponen Ikon
const Icon = ({ path, color, size = '1.2em' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill={color || 'currentColor'} style={{ width: size, height: size }}>
    <path d={path} />
  </svg>
);

function TicketCard({ ticket, picList = [], refreshData, onImageClick, onTextClick }) {
  const [balasan, setBalasan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Warna berdasarkan status
  const statusKey = ticket.status?.toLowerCase();
  const statusColors = CONFIG.COLORS[statusKey] || CONFIG.COLORS.default;

  const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const reportedDate = formatDate(ticket.createdAt);
  const completedDate = ticket.status === 'Done' && ticket.completedAt
    ? formatDate(ticket.completedAt)
    : null;

  // --- Handler ---
  const handleSetPic = (e) => {
    const selectedPic = e.target.value;
    toast.promise(
      api.patch(`/tickets/${ticket._id}/set-pic`, { pic: selectedPic }).then(() => {
        refreshData?.();
      }),
      {
        loading: 'Menetapkan PIC...',
        success: `PIC ditetapkan: ${selectedPic}`,
        error: 'Gagal menetapkan PIC.',
      }
    );
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    toast.promise(
      api.patch(`/tickets/${ticket._id}/set-status`, { status: newStatus }).then(() => {
        refreshData?.();
      }),
      {
        loading: 'Mengubah status...',
        success: `Status diubah menjadi ${newStatus}`,
        error: 'Gagal mengubah status.',
      }
    );
  };

  // Versi tombol cepat
  const handleQuickStatus = async (newStatus) => {
    try {
      setLoading(true);
      const res = await api.put(`/tickets/${ticket._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(res.data.message || `Status diubah ke ${newStatus}`);
      refreshData?.();
    } catch (err) {
      console.error('Gagal ubah status:', err);
      toast.error('Gagal mengubah status');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!balasan.trim()) return toast.error('Balasan tidak boleh kosong.');
    const formData = new FormData();
    formData.append('balasan', balasan);
    if (selectedFile) formData.append('photo', selectedFile);

    const toastId = toast.loading('Mengirim balasan...');
    try {
      await api.post(`/tickets/${ticket._id}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Balasan berhasil terkirim!', { id: toastId });
      setBalasan('');
      setSelectedFile(null);
      refreshData?.();
    } catch (err) {
      console.error("Gagal mengirim balasan:", err);
      toast.error('Gagal mengirim balasan.', { id: toastId });
    }
  };

  // --- Logic Potong Text ---
  const TRUNCATE_WORDS = 20;
  const words = ticket.text?.split(' ') || [];
  const isLongText = words.length > TRUNCATE_WORDS;

  return (
    <div className="rounded-2xl shadow-md flex flex-col h-full"
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${statusColors.border}`,
        transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3"
        style={{ backgroundColor: statusColors.bg, borderBottom: `1px solid ${CONFIG.COLORS.default.border}` }}>
        <span className="px-3 py-1 rounded-full text-white text-sm font-semibold"
          style={{ backgroundColor: statusColors.text }}>
          {ticket.status}
        </span>
        <div className="flex items-center gap-2 text-sm font-medium"
          style={{ color: statusColors.text }}>
          <Icon path={CONFIG.ICONS.group} />
          <span>{ticket.groupName || 'N/A'}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1">
        {ticket.photoUrl && (
          <img src={ticket.photoUrl} alt="Bukti"
            className="w-full rounded-lg mb-4 object-cover cursor-pointer"
            style={{ maxHeight: '300px' }}
            onClick={() => onImageClick?.(ticket.photoUrl)}
          />
        )}
        <p className="text-gray-800 text-base">
          {isLongText ? words.slice(0, TRUNCATE_WORDS).join(' ') + '...' : ticket.text}
        </p>
        {isLongText && (
          <button onClick={() => onTextClick?.(ticket)}
            className="mt-2 text-sm font-semibold text-gray-500">
            Lihat Detail
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
              <Icon path={CONFIG.ICONS.reporter} /><span>PELAPOR</span>
            </div>
            <div className="font-semibold text-gray-800">@{ticket.username || 'Anonim'}</div>
            <div className="text-xs text-gray-500">ID: {ticket.telegramUserId}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
              <Icon path={CONFIG.ICONS.pic} /><span>PIC</span>
            </div>
            <div className="font-semibold text-gray-800">{ticket.pic || 'Belum Ditentukan'}</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
            <Icon path={CONFIG.ICONS.clock} /><span>TIMELINE</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <span>{reportedDate}</span>
            <Icon path={CONFIG.ICONS.arrow} color="#6b7280" />
            {completedDate ? (
              <span className="font-semibold text-green-600">{completedDate}</span>
            ) : (
              <em className="text-gray-500">In Progress</em>
            )}
          </div>
        </div>
      </div>

      {/* Action Area */}
      {ticket.status !== 'Done' && (
        <div className="px-5 py-4 bg-gray-50 border-t rounded-b-2xl flex flex-col gap-3">
          {/* Dropdown Ubah Status & PIC */}
          <div className="flex gap-2">
            <select className="form-select form-select-sm"
              value={ticket.status} onChange={handleStatusChange}>
              {STATUS_LIST.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="form-select form-select-sm"
              value={ticket.pic || 'BelumDitentukan'} onChange={handleSetPic}>
              {picList.map(pic => (
                <option key={pic} value={pic}>
                  {pic === 'BelumDitentukan' ? 'Pilih PIC...' : pic.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Cepat Ubah Status */}
          <div className="flex flex-wrap gap-2">
            {STATUS_LIST.map(s => (
              <button
                key={s}
                onClick={() => handleQuickStatus(s)}
                disabled={loading}
                className={`px-3 py-1 rounded-xl text-sm ${
                  ticket.status === s ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Kirim Balasan */}
          <div className="flex items-center gap-2">
            <input type="file" id={`file-${ticket._id}`} hidden
              onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*" />
            <label htmlFor={`file-${ticket._id}`} className="btn btn-outline-secondary btn-sm">📎</label>
            <input type="text" value={balasan}
              onChange={(e) => setBalasan(e.target.value)}
              placeholder="Tulis balasan..." className="form-control form-control-sm flex-1" />
            <button type="button" onClick={handleReply}
              className="btn btn-dark btn-sm flex items-center gap-1">
              <Icon path={CONFIG.ICONS.send} color="#fff" size="1em" /> Kirim
            </button>
          </div>
          {selectedFile && <small className="text-gray-500 text-xs">File: {selectedFile.name}</small>}
        </div>
      )}
    </div>
  );
}

export default TicketCard;
