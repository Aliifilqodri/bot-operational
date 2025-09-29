import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { 
  FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, 
  FaSyncAlt, FaCheckCircle, FaBullhorn, FaRedoAlt
} from 'react-icons/fa';

import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';
import PlatformChart from '../components/PlatformChart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3300/api';

// **********************************************
// * CSS INLINE GAYA MODERN
// **********************************************
// Style untuk slider chart
const dashboardWrapperStyle = {
  display: 'flex',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  gap: '1.5rem',
  padding: '0.5rem 0 1.5rem 0.5rem', // Padding untuk bayangan & scrollbar
  marginBottom: '2rem',
};

// Style untuk card di dalam slider chart
const chartBoxStyle = {
  backgroundColor: 'white',
  padding: '1.25rem',
  borderRadius: '1rem', // Sudut lebih tumpul
  boxShadow: '0 8px 25px -8px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  flex: '0 0 300px',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
};

// --- PERUBAHAN BARU: Style untuk Grid Tiket Keren ---
const ticketGridStyle = {
  display: 'grid',
  // Membuat kolom otomatis, min 350px, maks 1fr (semua ruang yg tersedia)
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: '1.5rem', // Jarak antar kartu tiket
};

const filterGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: '150px',
  flexGrow: 1
};
// **********************************************

function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('processed');
  const [picFilter, setPicFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextUser, setSelectedTextUser] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleShowImage = (imageUrl, platform) => {
    if (platform === 'WhatsApp' && imageUrl === 'MEDIA_ATTACHED_VIEW_IN_WA') {
      alert('⚠️ Lampiran WhatsApp: Foto tidak dapat ditampilkan langsung. Mohon cek pesan asli di WhatsApp Web.');
    } else {
      setSelectedImageUrl(imageUrl);
      setShowImageModal(true);
    }
  };
  const handleCloseImage = () => setShowImageModal(false);

  const handleShowTextModal = (ticket) => {
    setSelectedText(ticket.text);
    setSelectedTextUser(ticket.username);
    setShowTextModal(true);
  };
  const handleCloseTextModal = () => setShowTextModal(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let statusForApi = 'all';
      if (activeView === 'processed') {
        statusForApi = 'Diproses,On Hold,Menunggu Approval';
      } else if (activeView === 'completed') {
        statusForApi = 'Done';
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        status: statusForApi,
        pic: picFilter,
        startDate,
        endDate,
        search: searchQuery,
      });

      const res = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setTickets(res.data.tickets);
      setTotalPages(res.data.totalPages);

      const updatedStats = {
        ...res.data.stats,
        platformData: res.data.stats.platformData || { Telegram: 0, WhatsApp: 0 },
      };
      setStats(updatedStats);
    } catch (err) {
      console.error('Gagal fetch data:', err);
      if (err.response && err.response.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  }, [currentPage, picFilter, startDate, endDate, searchQuery, activeView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setPicFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
    setActiveView('processed');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleExport = () => {
    window.location.href = `${API_URL}/tickets/export`;
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setCurrentPage(1);
  };

  if (loading && !stats) {
    return (
      <div className="container my-5 text-center">
        <h1>⏳ Memuat data...</h1>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="container my-5 text-center">
        <h1>❌ Gagal memuat data.</h1>
        <p>Periksa koneksi server atau coba refresh halaman.</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      {/* --- PERUBAHAN BARU: Menambahkan CSS Global untuk efek & scrollbar --- */}
      <style>{`
        body {
          background-color: #f8fafc; /* Warna background lebih soft */
        }
        .chart-slider::-webkit-scrollbar { height: 8px; }
        .chart-slider::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 10px; }
        .chart-slider::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        .chart-slider::-webkit-scrollbar-thumb:hover { background: #64748b; }
        
        /* Efek hover untuk kartu tiket */
        .ticket-card-wrapper:hover {
          transform: translateY(-5px) scale(1.02); /* Sedikit naik dan membesar */
          box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.15) !important; /* Bayangan lebih dramatis */
          z-index: 10;
        }
        .ticket-card-wrapper {
          transition: transform 0.3s ease, box-shadow 0.3s ease; /* Transisi super halus */
        }
      `}</style>
      <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div className="container-fluid container-lg">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <div>
              <h1 className="h2 mb-1 fw-bold" style={{color: '#1e293b'}}>📊 Operationals Dashboard</h1>
              <p className="mb-0 text-muted">Akses real-time dan kelola semua kendala dari berbagai platform.</p>
            </div>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>

          {/* Welcome Banner */}
          <div className="alert d-flex align-items-center p-3 mb-4 border-0 shadow-sm" role="alert" style={{ backgroundColor: '#eef2ff', borderRadius: '1rem' }}>
            <FaBullhorn className="me-3" style={{ fontSize: '1.8rem', opacity: '0.8', color: '#4338ca' }} />
            <div>
              <h5 className="alert-heading mb-0 fw-semibold" style={{color: '#312e81'}}>Selamat Bekerja!</h5>
              <p className="mb-0 text-muted">Mari capai target hari ini. Total Tiket: {stats.totalDiproses + stats.totalSelesai}</p>
            </div>
          </div>
          
          {/* Tombol Refresh */}
          <div className="d-flex justify-content-end mb-4">
            <button 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2" 
              onClick={fetchData} 
              disabled={loading}
            >
              <FaRedoAlt className={loading ? 'fa-spin' : ''} />
              {loading ? 'Memuat Ulang...' : 'Refresh Data'}
            </button>
          </div>

          {/* Dashboard Wrapper - Slider */}
          <div style={dashboardWrapperStyle} className="chart-slider">
            {[
              { title: 'STATUS TICKET', component: <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} /> },
              { title: 'TIKET PER PIC', component: <PicChart data={stats.picData} /> },
              { title: 'DISTRIBUSI PLATFORM', component: <PlatformChart data={stats.platformData} />, condition: stats.platformData && Object.keys(stats.platformData).length > 0 },
              { title: 'STATISTIK HARIAN', component: <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} /> },
              { title: 'CASE TERBANYAK', component: <CaseChart data={stats.caseData} />, condition: stats.caseData && Object.keys(stats.caseData).length > 0 },
            ].map((chart, index) => (
              <div style={chartBoxStyle} key={index}>
                <h6 className="fw-bold text-secondary mb-3 text-uppercase small">{chart.title}</h6>
                <div className='flex-grow-1'>
                  {chart.condition === false ? <div className="alert alert-light text-center mt-3">Tidak ada data.</div> : chart.component}
                </div>
              </div>
            ))}
          </div>
          
          <hr className='my-5' />

          {/* Filter & Ticket List */}
          <div className="mt-4">
            {/* Tabs View */}
            <div className="d-flex justify-content-center border-bottom mb-4 pb-3">
              <ul className="nav nav-pills nav-fill gap-2 bg-white p-2 rounded-pill shadow-sm">
                {[
                  { view: 'all', label: 'Semua Tiket', icon: <FaTicketAlt />, count: stats.totalDiproses + stats.totalSelesai, badge: 'bg-secondary' },
                  { view: 'processed', label: 'Tiket Diproses', icon: <FaSyncAlt />, count: stats.totalDiproses, badge: 'bg-warning text-dark' },
                  { view: 'completed', label: 'Tiket Selesai', icon: <FaCheckCircle />, count: stats.totalSelesai, badge: 'bg-success' }
                ].map(tab => (
                  <li className="nav-item" key={tab.view}>
                    <button
                      className={`nav-link d-flex align-items-center justify-content-center gap-2 fw-semibold ${activeView === tab.view ? 'active shadow-sm' : ''}`}
                      onClick={() => handleViewChange(tab.view)}
                    >
                      {tab.icon} {tab.label} <span className={`badge rounded-pill ${tab.badge}`}>{tab.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Filter Panel */}
            <div className="filter-panel d-flex flex-wrap align-items-end gap-3 p-3 mb-4 bg-white shadow-sm rounded-lg">
              {/* Konten filter tidak berubah, jadi saya persingkat di sini */}
              <div style={{...filterGroupStyle, flexGrow: 2}}>
                <label className="form-label small fw-semibold text-muted mb-1">Cari Tiket (Kode, Deskripsi, User)</label>
                <div className="input-group">
                  <span className="input-group-text"><FaSearch /></span>
                  <input type="text" className="form-control form-control-sm" placeholder="Cari..." value={searchQuery} onChange={handleSearchChange}/>
                </div>
              </div>
              <div style={filterGroupStyle}>
                <label className="form-label small fw-semibold text-muted mb-1">PIC</label>
                <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Semua PIC</option>
                  {stats.picList?.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                </select>
              </div>
              <div style={filterGroupStyle}><label className="form-label small fw-semibold text-muted mb-1">Dari Tanggal</label><input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/></div>
              <div style={filterGroupStyle}><label className="form-label small fw-semibold text-muted mb-1">Sampai Tanggal</label><input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/></div>
              <div className="filter-group d-flex gap-2 align-self-end">
                <button className="btn btn-outline-secondary btn-sm" onClick={handleResetFilters}>Reset</button>
                <button className="btn btn-success btn-sm" onClick={handleExport}><FaFileExcel className="me-1" /> Ekspor</button>
              </div>
            </div>

            {/* --- PERUBAHAN BARU: Ticket List sekarang menggunakan Grid --- */}
            <div style={ticketGridStyle}>
              {tickets.length > 0 ? tickets.map(ticket => (
                <div key={ticket._id} className="ticket-card-wrapper">
                  <TicketCard
                    ticket={ticket}
                    picList={stats.picList}
                    refreshData={fetchData}
                    onImageClick={(url) => handleShowImage(url, ticket.platform)}
                    onTextClick={handleShowTextModal}
                  />
                </div>
              )) : (
                <div className="alert alert-warning text-center" style={{gridColumn: '1 / -1'}}>
                  Tidak ada kendala yang cocok dengan filter.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination mt-5 d-flex justify-content-center gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                <span className="align-self-center">Halaman {currentPage} dari {totalPages}</span>
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Preview Gambar & Teks */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{ padding: 0 }}>
          <img src={selectedImageUrl} alt="Detail Kendala" style={{ width: '100%', height: 'auto' }} />
        </Modal.Body>
      </Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton><Modal.Title>Detail dari @{selectedTextUser}</Modal.Title></Modal.Header>
        <Modal.Body><p style={{ whiteSpace: 'pre-wrap' }}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;