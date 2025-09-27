import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

// --- CONFIG DESAIN ---
const CONFIG = {
  COLORS: {
    'diproses': { bg: '#fffbeb', text: '#d97706', border: '#fbbf24' },
    'on hold': { bg: '#fefce8', text: '#ca8a04', border: '#facc15' },
    'menunggu approval': { bg: '#f0f9ff', text: '#0284c7', border: '#38bdf8' },
    'done': { bg: '#f0fdf4', text: '#16a34a', border: '#4ade80' },
    text: { primary: '#1f2937', secondary: '#6b7280', label: '#4b5563' },
    border: '#e5e7eb',
    actionBg: '#f9fafb',
    replyBg: '#f3f4f6' // Warna baru untuk bubble chat balasan
  },
  ICONS: {
    group: "M17 20s5-4 5-8c0-3.866-3.582-7-8-7s-8 3.134-8 7c0 4 5 8 5 8h6zM8 9a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4z",
    reporter: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    pic: "M12 12a5 5 0 110-10 5 5 0 010 10zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    clock: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12H9v7h6v-2h-4V6z",
    send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    arrow: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3",
    paperclip: "M6.5 7a3.5 3.5 0 0 0-3.5 3.5v9a3.5 3.5 0 0 0 3.5 3.5h11a3.5 3.5 0 0 0 3.5-3.5v-13a3.5 3.5 0 0 0-3.5-3.5h-13a.5.5 0 0 0 0 1h13a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5h-11a2.5 2.5 0 0 1-2.5-2.5v-9a2.5 2.5 0 0 1 2.5-2.5h10.5a.5.5 0 0 0 0-1H6.5z",
  }
};

const STATUS_LIST = ['Diproses', 'On Hold', 'Menunggu Approval', 'Done'];

const Icon = ({ path, color, size = '1.2em' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={color || 'currentColor'} style={{ width: size, height: size, flexShrink: 0 }}>
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

function TicketCard({ ticket, picList, refreshData, onImageClick, onTextClick }) {
  const [balasan, setBalasan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const statusKey = ticket.status.toLowerCase();
  const statusColors = CONFIG.COLORS[statusKey] || { bg: '#f3f4f6', text: '#4b5563' };

  const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const reportedDate = formatDate(ticket.createdAt);
  const completedDate = ticket.status.toLowerCase() === 'done' && ticket.completedAt ? formatDate(ticket.completedAt) : null;

  const handleSetPic = (e) => {
    // ... (fungsi sama seperti sebelumnya)
  };

  const handleStatusChange = (e) => {
    // ... (fungsi sama seperti sebelumnya)
  };

  const handleReply = async () => {
    // ... (fungsi sama seperti sebelumnya)
  };

  const TRUNCATE_WORDS = 6;
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
      {/* --- PERUBAHAN UTAMA: minHeight dihapus, diganti dengan konten dinamis --- */}
      <div style={{ padding: '20px', lineHeight: 1.6, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Deskripsi utama */}
        <div>
          <p style={{ margin: 0, fontSize: '1rem', color: CONFIG.COLORS.text.primary, wordBreak: 'break-word' }}>
            {ticket.text || <em style={{color: CONFIG.COLORS.text.secondary}}>(Tidak ada deskripsi)</em>}
          </p>
        </div>

        {/* --- BAGIAN BARU: Pratinjau Balasan --- */}
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          {ticket.replies && ticket.replies.length > 0 && (
            <div style={{ borderTop: `1px dashed ${CONFIG.COLORS.border}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Ambil 2 balasan terakhir */}
              {ticket.replies.slice(-2).map((reply, index) => (
                <div key={index} style={{ backgroundColor: CONFIG.COLORS.replyBg, borderRadius: '8px', padding: '8px 12px', fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: '600', color: CONFIG.COLORS.text.primary, marginBottom: '2px' }}>
                    {reply.author === 'user' ? `@${ticket.username}` : 'Tim Support'}
                  </div>
                  <p style={{ margin: 0, color: CONFIG.COLORS.text.secondary }}>{reply.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Tombol Aksi (Selengkapnya / Lampiran) */}
        {(ticket.photoUrl || isLongText) && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {ticket.photoUrl && (
              <button 
                onClick={() => onImageClick(ticket.photoUrl)} 
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#f9fafb', border: `1px solid ${CONFIG.COLORS.border}`, color: CONFIG.COLORS.text.label, fontWeight: '500', fontSize: '0.9rem', transition: 'background-color 0.2s' }}
              >
                <Icon path={CONFIG.ICONS.paperclip} size="1.1em" />
                Lihat Lampiran
              </button>
            )}
            {isLongText && (
              <button onClick={() => onTextClick(ticket)} style={{ all: 'unset', cursor: 'pointer', color: '#007bff', fontWeight: '600', fontSize: '0.9rem' }}>
                Selengkapnya...
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '20px', borderTop: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: '#fdfdfd' }}>
        {/* ... (Isi Footer sama seperti sebelumnya) ... */}
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
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px dashed ${CONFIG.COLORS.border}` }}>
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
           {/* ... (Isi Action Area sama seperti sebelumnya) ... */}
        </div>
      )}
    </div>
  );
}

export default TicketCard;