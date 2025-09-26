// client/src/components/TicketCard.jsx
import React, { useState } from 'react';
import api from '../api'; // axios instance yang sudah membawa token
import toast from 'react-hot-toast';

// --- CONFIG DESAIN ---
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
  ICONS: {
    group: "M17 20s5-4 5-8c0-3.866-3.582-7-8-7s-8 3.134-8 7c0 4 5 8 5 8h6zM8 9a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4z",
    reporter: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    pic: "M12 12a5 5 0 110-10 5 5 0 010 10zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    clock: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12H9v7h6v-2h-4V6z",
    send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    arrow: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3",
  }
};

// --- STATUS DROPDOWN DAN MAPPING KE BACKEND ---
const STATUS_LIST = ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'];

const Icon = ({ path, color, size = '1.2em' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={color || 'currentColor'} style={{ width: size, height: size, flexShrink: 0 }}>
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

function TicketCard({ ticket, picList, refreshData, onImageClick, onTextClick }) {
  const [balasan, setBalasan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // --- WARNA STATUS ---
  const statusKey = ticket.status.toLowerCase();
  const statusColors = CONFIG.COLORS[statusKey] || { bg: '#f3f4f6', text: '#4b5563' };

  const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const reportedDate = formatDate(ticket.createdAt);
  const completedDate = ticket.status.toLowerCase() === 'done' && ticket.completedAt ? formatDate(ticket.completedAt) : null;

  // --- HANDLE PIC ---
  const handleSetPic = (e) => {
    const selectedPic = e.target.value;
    toast.promise(
      api.patch(`/tickets/${ticket._id}/set-pic`, { pic: selectedPic }).then(() => refreshData()),
      {
        loading: 'Menetapkan PIC...',
        success: `PIC ditetapkan: ${selectedPic}`,
        error: 'Gagal menetapkan PIC.',
      }
    );
  };

  // --- HANDLE STATUS (FIX 400 BAD REQUEST) ---
  const handleStatusChange = (e) => {
    const newStatusDisplay = e.target.value; // "Diproses", "On Hold", dll
    if (!STATUS_LIST.includes(newStatusDisplay)) return toast.error('Status tidak valid.');

    toast.promise(
      api.patch(`/tickets/${ticket._id}/set-status`, { status: newStatusDisplay }).then(() => refreshData()),
      {
        loading: 'Mengubah status...',
        success: `Status diubah menjadi ${newStatusDisplay}`,
        error: 'Gagal mengubah status.',
      }
    );
  };

  // --- HANDLE BALASAN ---
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
      refreshData();
    } catch (err) {
      console.error("Gagal mengirim balasan:", err);
      toast.error('Gagal mengirim balasan.', { id: toastId });
    }
  };

  const TRUNCATE_WORDS = 20;
  const words = (ticket.text || "").split(' ');
  const isLongText = words.length > TRUNCATE_WORDS;

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 8px rgba(0,0,0,0.02),0 10px 20px rgba(0,0,0,0.06)', border: `1px solid ${CONFIG.COLORS.border}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header */}
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: statusColors.bg, borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: statusColors.text, color: '#fff' }}>{ticket.status}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: statusColors.text, fontSize: '0.85rem' }}>
          <Icon path={CONFIG.ICONS.group} />
          <span style={{ fontWeight: '500' }}>{ticket.groupName || 'N/A'}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', lineHeight: 1.6, flexGrow: 1 }}>
        {ticket.photoUrl && (
          <img src={ticket.photoUrl} alt="Bukti Kendala" style={{ width: '100%', borderRadius: '10px', cursor: 'pointer', marginBottom: '16px', objectFit: 'cover', maxHeight: '300px' }} onClick={() => onImageClick(ticket.photoUrl)} />
        )}
        <p style={{ margin: 0, fontSize: '1rem', color: CONFIG.COLORS.text.primary, wordBreak: 'break-word' }}>
          {isLongText ? words.slice(0, TRUNCATE_WORDS).join(' ') + '...' : ticket.text}
        </p>
        {isLongText && <button onClick={() => onTextClick(ticket)} style={{ all: 'unset', cursor: 'pointer', color: CONFIG.COLORS.text.label, fontWeight: '600', fontSize: '0.9rem', marginTop: '8px' }}>Lihat Detail</button>}
      </div>

      {/* Footer */}
      <div style={{ padding: '20px', borderTop: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: '#fdfdfd' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: CONFIG.COLORS.text.label, fontSize: '0.8rem', marginBottom: '4px' }}><Icon path={CONFIG.ICONS.reporter} /><span>PELAPOR</span></div>
            <div style={{ fontWeight: '600', color: CONFIG.COLORS.text.primary }}>@{ticket.username || 'Anonim'}</div>
            <div style={{ fontSize: '0.8rem', color: CONFIG.COLORS.text.secondary }}>ID: {ticket.telegramUserId}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: CONFIG.COLORS.text.label, fontSize: '0.8rem', marginBottom: '4px' }}><Icon path={CONFIG.ICONS.pic} /><span>PIC</span></div>
            <div style={{ fontWeight: '600', color: CONFIG.COLORS.text.primary }}>{ticket.pic || 'Belum Ditentukan'}</div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: CONFIG.COLORS.text.label, fontSize: '0.8rem', marginBottom: '4px' }}><Icon path={CONFIG.ICONS.clock} /><span>TIMELINE</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: CONFIG.COLORS.text.primary }}>
            <span>{reportedDate}</span>
            <Icon path={CONFIG.ICONS.arrow} color={CONFIG.COLORS.text.secondary} />
            {completedDate ? <span style={{ fontWeight: '600', color: CONFIG.COLORS.done?.text || CONFIG.COLORS.text.primary }}>{completedDate}</span> : <em style={{ color: CONFIG.COLORS.text.secondary }}>In Progress</em>}
          </div>
        </div>
      </div>

      {/* Action Area */}
      {ticket.status.toLowerCase() !== 'done' && (
        <div style={{ marginTop: 'auto', padding: '20px', backgroundColor: CONFIG.COLORS.actionBg, borderTop: `1px solid ${CONFIG.COLORS.border}`, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Baris 1: Ubah Status & PIC */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select form-select-sm"
                value={STATUS_LIST.includes(ticket.status) ? ticket.status : 'Diproses'}
                onChange={handleStatusChange}
              >
                {STATUS_LIST.map(status => (<option key={status} value={status}>{status}</option>))}
              </select>
              <select className="form-select form-select-sm" value={ticket.pic || 'Belum Ditentukan'} onChange={handleSetPic}>
                <option value="Belum Ditentukan">Pilih PIC...</option>
                {picList.filter(pic => pic !== 'Belum Ditentukan').map(pic => (<option key={pic} value={pic}>{pic.toUpperCase()}</option>))}
              </select>
            </div>

            {/* Baris 2: Kirim Balasan */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="file" id={`file-${ticket._id}`} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*" />
              <label htmlFor={`file-${ticket._id}`} className="btn btn-outline-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>📎</label>
              <input type="text" value={balasan} onChange={(e) => setBalasan(e.target.value)} placeholder="Tulis balasan untuk user..." className="form-control form-control-sm" />
              <button type="button" onClick={handleReply} className="btn btn-dark btn-sm" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon path={CONFIG.ICONS.send} color="#fff" size="1em" /> Kirim
              </button>
            </div>
            {selectedFile && <small className="text-muted" style={{ fontSize: '0.75rem' }}>File: {selectedFile.name}</small>}
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketCard;
