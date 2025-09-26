// client/src/components/TicketCard.jsx

import React, { useState } from 'react';
import api from '../api'; // PENTING: Menggunakan 'api' yang membawa token, bukan axios
import toast from 'react-hot-toast';

// --- DESIGN CONFIGURATION ---
const CONFIG = {
  COLORS: {
    diproses: { bg: '#fff7ed', text: '#f97316', border: '#fb923c' },
    selesai: { bg: '#f0fdf4', text: '#16a34a', border: '#4ade80' },
    done: { bg: '#f0fdf4', text: '#16a34a', border: '#4ade80' }, // Tambahkan 'done'
    'on hold': { bg: '#FEFCE8', text: '#A16207' },
    'waiting third party': { bg: '#F0F9FF', text: '#0284C7' },
    text: { primary: '#1f2937', secondary: '#6b7280', label: '#4b5563' },
    border: '#e5e7eb',
    actionBg: '#f9fafb',
  },
  ICONS: {
    group: "M17 20s5-4 5-8c0-3.866-3.582-7-8-7s-8 3.134-8 7c0 4 5 8 5 8h6zM8 9a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4z",
    reporter: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    pic: "M12 12a5 5 0 110-10 5 5 0 010 10zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    clock: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12H9v7h6v-2h-4V6z",
    check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    arrow: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3",
  }
};

const STATUS_LIST = ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'];

const Icon = ({ path, color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={color || 'currentColor'} style={{ width: '1.2em', height: '1.2em', flexShrink: 0 }}>
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);
// --- END OF CONFIGURATION ---


function TicketCard({ ticket, picList, refreshData, onImageClick, onTextClick }) {
  const [balasan, setBalasan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const statusKey = ticket.status.toLowerCase().replace(/\s/g, ''); // Menangani "On Hold" dll.
  const statusColors = CONFIG.COLORS[statusKey] || { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' };
  
  const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const reportedDate = formatDate(ticket.createdAt);
  const completedDate = ticket.completedAt ? formatDate(ticket.completedAt) : null;

  const handleSetPic = async (e) => {
    const selectedPic = e.target.value;
    toast.promise(
      api.patch(`/tickets/${ticket._id}/set-pic`, { pic: selectedPic }).then(() => refreshData()),
      {
        loading: `Menetapkan PIC...`,
        success: `PIC diubah menjadi ${selectedPic.toUpperCase()}`,
        error: 'Gagal mengubah PIC.',
      }
    );
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    toast.promise(
      api.patch(`/tickets/${ticket._id}/set-status`, { status: newStatus }).then(() => refreshData()),
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
      await api.post(`/tickets/${ticket._id}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Balasan berhasil terkirim!', { id: toastId });
      setBalasan('');
      setSelectedFile(null);
    } catch (err) {
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
      }}
    >
      {/* --- Header Kartu --- */}
      <div style={{
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: statusColors.bg,
        borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
      }}>
        <span style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600',
          backgroundColor: statusColors.text, color: '#ffffff',
        }}>
          {ticket.status}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: statusColors.text, fontSize: '0.85rem' }}>
          <Icon path={CONFIG.ICONS.group} />
          <span style={{ fontWeight: '500' }}>{ticket.groupName || 'N/A'}</span>
        </div>
      </div>
      
      {/* --- Body Kartu --- */}
      <div style={{ padding: '20px', lineHeight: 1.6, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {ticket.photoUrl && (
          <img
            src={ticket.photoUrl} alt="Bukti Kendala"
            style={{ width: '100%', borderRadius: '10px', cursor: 'pointer', marginBottom: '16px', objectFit: 'cover', height: '200px' }}
            onClick={() => onImageClick(ticket.photoUrl)}
          />
        )}
        <p style={{ margin: 0, fontSize: '1rem', color: CONFIG.COLORS.text.primary, flexGrow: 1 }}>
          {isLongText ? words.slice(0, TRUNCATE_WORDS).join(' ') + '...' : ticket.text}
        </p>
        {isLongText && (
          <button onClick={() => onTextClick(ticket)} style={{ all: 'unset', cursor: 'pointer', color: CONFIG.COLORS.text.label, fontWeight: '600', fontSize: '0.9rem', marginTop: '8px', alignSelf: 'flex-start' }}>
            Lihat Detail
          </button>
        )}
      </div>

      {/* --- Footer Kartu (Metadata) --- */}
      <div style={{
        padding: '20px', borderTop: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: '#fdfdfd',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* ... Kolom Pelapor & PIC ... */}
        </div>
        {/* ... Timeline ... */}
      </div>

      {/* --- Area Aksi --- */}
      {ticket.status !== 'Done' && (
        <div style={{
          padding: '20px', backgroundColor: CONFIG.COLORS.actionBg, borderTop: `1px solid ${CONFIG.COLORS.border}`,
          borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Baris 1: Ubah Status & PIC */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select className="form-select" value={ticket.status} onChange={handleStatusChange}>
                {STATUS_LIST.map(status => (<option key={status} value={status}>{status}</option>))}
              </select>
              <select className="form-select" value={ticket.pic || 'Belum Ditentukan'} onChange={handleSetPic}>
                {picList.map(pic => (<option key={pic} value={pic}>{pic.toUpperCase()}</option>))}
              </select>
            </div>
            
            {/* Baris 2: Kirim Balasan */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="file" id={`file-${ticket._id}`} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*"/>
              <label htmlFor={`file-${ticket._id}`} className="btn btn-outline-secondary">📎</label>
              <input type="text" value={balasan} onChange={(e) => setBalasan(e.target.value)} placeholder="Tulis balasan untuk user..." className="form-control" />
              <button type="button" onClick={handleReply} className="btn btn-dark">Kirim</button>
            </div>
            {selectedFile && <small className="text-muted">File: {selectedFile.name}</small>}
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketCard;