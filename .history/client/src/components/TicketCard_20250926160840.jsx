// client/src/components/TicketCard.jsx
import React, { useState } from 'react';
import api from '../api'; // PENTING: Gunakan 'api' yang sudah dikonfigurasi dengan token
import toast from 'react-hot-toast';

// --- DESIGN CONFIGURATION ---
const CONFIG = {
  COLORS: {
    'diproses': { bg: '#fffbeb', text: '#d97706', border: '#fbbf24' },
    'on hold': { bg: '#fefce8', text: '#ca8a04', border: '#facc15' },
    'waiting third party': { bg: '#f0f9ff', text: '#0284c7', border: '#38bdf8' },
    'done': { bg: '#f0fdf4', text: '#16a34a', border: '#4ade80' },
    text: { primary: '#1f2937', secondary: '#6b7280', label: '#4b5563' },
    border: '#e5e7eb',
    actionBg: '#f9fafb',
  },
  ICONS: { /* ... Ikon Anda tidak berubah ... */ }
};
const STATUS_LIST = ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'];
const Icon = ({ path, color, size = '1.2em' }) => ( /* ... Komponen Ikon Anda tidak berubah ... */ );
// --- END OF CONFIGURATION ---

function TicketCard({ ticket, picList, refreshData, onImageClick, onTextClick }) {
  const [balasan, setBalasan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const statusKey = ticket.status.toLowerCase();
  const statusColors = CONFIG.COLORS[statusKey] || { bg: '#f3f4f6', text: '#4b5563' };

  const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const reportedDate = formatDate(ticket.createdAt);
  const completedDate = ticket.status === 'Done' && ticket.completedAt ? formatDate(ticket.completedAt) : null;

  // --- Fungsi Handler (INI BAGIAN YANG DIPERBAIKI) ---

  const handleSetPic = (e) => {
    const selectedPic = e.target.value;
    toast.promise(
      // MENGGUNAKAN 'api'
      api.patch(`/tickets/${ticket._id}/set-pic`, { pic: selectedPic }).then(() => {
        refreshData();
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
      // MENGGUNAKAN 'api'
      api.patch(`/tickets/${ticket._id}/set-status`, { status: newStatus }).then(() => {
        refreshData();
      }),
      {
        loading: 'Mengubah status...',
        success: `Status diubah menjadi ${newStatus}`,
        error: 'Gagal mengubah status.',
      }
    );
  };

  const handleReply = async () => {
    if (!balasan.trim()) return toast.error('Balasan tidak boleh kosong.');
    
    const formData = new FormData();
    formData.append('balasan', balasan);
    if (selectedFile) formData.append('photo', selectedFile);

    const toastId = toast.loading('Mengirim balasan...');
    try {
      // MENGGUNAKAN 'api'
      await api.post(`/tickets/${ticket._id}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Balasan berhasil terkirim!', { id: toastId });
      setBalasan('');
      setSelectedFile(null);
    } catch (err) {
      console.error("Gagal mengirim balasan:", err);
      toast.error('Gagal mengirim balasan.', { id: toastId });
    }
  };

  const TRUNCATE_WORDS = 20;
  const words = (ticket.text || "").split(' ');
  const isLongText = words.length > TRUNCATE_WORDS;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.02), 0 10px 20px rgba(0,0,0,0.06)',
        border: `1px solid ${CONFIG.COLORS.border}`,
        transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      // ... (onMouseEnter dan onMouseLeave tidak berubah)
    >
      {/* --- Header Kartu --- */}
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: statusColors.bg, borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
        {/* ... Isi Header ... */}
      </div>

      {/* --- Body Kartu --- */}
      <div style={{ padding: '20px', lineHeight: 1.6, flexGrow: 1 }}>
        {/* ... Isi Body ... */}
      </div>

      {/* --- Footer Kartu (Metadata) --- */}
      <div style={{ padding: '20px', borderTop: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: '#fdfdfd' }}>
        {/* ... Isi Footer ... */}
      </div>

      {/* --- Area Aksi --- */}
      {ticket.status !== 'Done' && (
        <div style={{ marginTop: 'auto', padding: '20px', backgroundColor: CONFIG.COLORS.actionBg, borderTop: `1px solid ${CONFIG.COLORS.border}`, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          {/* ... Isi Area Aksi ... */}
        </div>
      )}
    </div>
  );
}

export default TicketCard;