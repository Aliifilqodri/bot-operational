import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const CONFIG = {
  COLORS: {
    'diproses': { bg: '#fffbeb', text: '#d97706' },
    'on hold': { bg: '#fefce8', text: '#ca8a04' },
    'menunggu approval': { bg: '#f0f9ff', text: '#0284c7' },
    'done': { bg: '#f0fdf4', text: '#16a34a' },
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
    paperclip: "M6.5 7a3.5 3.5 0 0 0-3.5 3.5v9a3.5 3.5 0 0 0 3.5 3.5h11a3.5 3.5 0 0 0 3.5-3.5v-13a3.5 3.5 0 0 0-3.5-3.5h-13a.5.5 0 0 0 0 1h13a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5h-11a2.5 2.5 0 0 1-2.5-2.5v-9a2.5 2.5 0 0 1 2.5-2.5h10.5a.5.5 0 0 0 0-1H6.5z",
    checkCircle: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
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
  const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const handleSetPic = (e) => { toast.promise(api.patch(`/tickets/${ticket._id}/set-pic`, { pic: e.target.value }).then(() => refreshData()),{ loading: '...', success: `PIC: ${e.target.value}`, error: 'Gagal.' }); };
  const handleStatusChange = (e) => { toast.promise(api.patch(`/tickets/${ticket._id}/set-status`, { status: e.target.value }).then(() => refreshData()),{ loading: '...', success: `Status: ${e.target.value}`, error: 'Gagal.' }); };
  const handleReply = async () => {
    if (!balasan.trim()) return toast.error('Balasan kosong.');
    const formData = new FormData();
    formData.append('balasan', balasan);
    if (selectedFile) formData.append('photo', selectedFile);
    toast.promise(api.post(`/tickets/${ticket._id}/reply`, formData).then(() => { setBalasan(''); setSelectedFile(null); refreshData(); }), { loading: 'Mengirim...', success: 'Terkirim!', error: 'Gagal.'});
  };

  const TRUNCATE_WORDS = 10;
  const words = (ticket.text || "").split(' ');
  const isLongText = words.length > TRUNCATE_WORDS;

  return (
    // Kunci #1: 'height: 100%' membuat kartu ini bisa "mendengarkan" perintah dari dasbor untuk meregang
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: `1px solid ${CONFIG.COLORS.border}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${CONFIG.COLORS.border}`, backgroundColor: statusColors.bg, borderTopLeftRadius: '16px', borderTopRightRadius: '16px', flexShrink: 0 }}>
        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: statusColors.text, color: '#fff' }}>{ticket.status}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: statusColors.text, fontSize: '0.85rem' }}>
          <Icon path={CONFIG.ICONS.group} />
          <span style={{ fontWeight: '500' }}>{ticket.groupName || 'N/A'}</span>
        </div>
      </div>

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '1rem', color: CONFIG.COLORS.text.primary, wordBreak: 'break-word', lineHeight: 1.6 }}>
            {isLongText ? words.slice(0, TRUNCATE_WORDS).join(' ') + '…' : ticket.text || <em style={{color: CONFIG.COLORS.text.secondary}}>(Tidak ada deskripsi)</em>}
          </p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '36px' }}>
            {ticket.photoUrl && (
              <button onClick={() => onImageClick(ticket.photoUrl)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#f9fafb', border: `1px solid ${CONFIG.COLORS.border}`, color: CONFIG.COLORS.text.label, fontWeight: '500', fontSize: '0.9rem' }}>
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
        </div>

        <div style={{ borderTop: `1px solid ${CONFIG.COLORS.border}`, paddingTop: '20px', marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: CONFIG.COLORS.text.label, fontSize: '0.8rem', marginBottom: '4px' }}><Icon path={CONFIG.ICONS.reporter} /><span>PELAPOR</span></div>
              <div style={{ fontWeight: '600', color: CONFIG.COLORS.text.primary }}>@{ticket.username || 'Anonim'}</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: CONFIG.COLORS.text.label, fontSize: '0.8rem', marginBottom: '4px' }}><Icon path={CONFIG.ICONS.pic} /><span>PIC</span></div>
              <div style={{ fontWeight: '600', color: CONFIG.COLORS.text.primary }}>{ticket.pic || 'Belum Ditentukan'}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', color: CONFIG.COLORS.text.primary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon path={CONFIG.ICONS.clock} size="1.1em" /> <span>{formatDate(ticket.createdAt)}</span></span>
              <Icon path={CONFIG.ICONS.arrow} color={CONFIG.COLORS.text.secondary} />
              <span style={{ fontWeight: '600', color: statusColors.text }}>{ticket.status.toLowerCase() === 'done' ? formatDate(ticket.completedAt) : 'In Progress'}</span>
            </div>
          </div>
        </div>
      </div>

      {ticket.status.toLowerCase() !== 'done' ? (
        <div style={{ padding: '20px', backgroundColor: CONFIG.COLORS.actionBg, borderTop: `1px solid ${CONFIG.COLORS.border}`, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select className="form-select form-select-sm" value={STATUS_LIST.includes(ticket.status) ? ticket.status : 'Diproses'} onChange={handleStatusChange}>
                {STATUS_LIST.map(status => (<option key={status} value={status}>{status}</option>))}
              </select>
              <select className="form-select form-select-sm" value={ticket.pic || 'Belum Ditentukan'} onChange={handleSetPic}>
                <option value="Belum Ditentukan">Pilih PIC...</option>
                {picList.filter(pic => pic !== 'Belum Ditentukan').map(pic => (<option key={pic} value={pic}>{pic.toUpperCase()}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="file" id={`file-${ticket._id}`} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*" />
              <label htmlFor={`file-${ticket._id}`} className="btn btn-outline-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>📎</label>
              <input type="text" value={balasan} onChange={(e) => setBalasan(e.target.value)} placeholder="Tulis balasan..." className="form-control form-control-sm" />
              <button type="button" onClick={handleReply} className="btn btn-dark btn-sm" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon path={CONFIG.ICONS.send} color="#fff" size="1em" /> Kirim
              </button>
            </div>
            {selectedFile && <small className="text-muted" style={{ fontSize: '0.75rem' }}>File: {selectedFile.name}</small>}
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', backgroundColor: CONFIG.COLORS.actionBg, borderTop: `1px solid ${CONFIG.COLORS.border}`, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', flexShrink: 0, minHeight: '115px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: CONFIG.COLORS.done.text }}>
            <Icon path={CONFIG.ICONS.checkCircle} size="1.5em"/>
            <span style={{fontWeight: 500, fontSize: '1rem'}}>Tiket Telah Selesai</span>
        </div>
      )}
    </div>
  );
}

export default TicketCard;