import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { 
  FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, 
  FaSyncAlt, FaCheckCircle, FaBullhorn 
} from 'react-icons/fa';

import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';
import PlatformChart from '../components/PlatformChart'; // chart baru

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// **********************************************
// * CSS INLINE FOR CLEANER LAYOUT
// **********************************************
const dashboardWrapperStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', // Membuat 3-4 kolom responsif
    gap: '1.5rem',
    marginBottom: '2rem',
};

const chartBoxStyle = {
    backgroundColor: 'white',
    padding: '1.25rem',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
};

const chartBoxLargeStyle = {
    ...chartBoxStyle,
    gridColumn: 'span 2', // Membuat Case Terbanyak mengambil 2 kolom
};
// **********************************************

function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & state UI
  const [activeView, setActiveView] = useState('all');
  const [picFilter, setPicFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal preview
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextUser, setSelectedTextUser] = useState('');

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // Modal Gambar
  const handleShowImage = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };
  const handleCloseImage = () => setShowImageModal(false);

  // Modal Text
  const handleShowTextModal = (ticket) => {
    setSelectedText(ticket.text);
    setSelectedTextUser(ticket.username);
    setShowTextModal(true);
  };
  const handleCloseTextModal = () => setShowTextModal(false);

  // Ambil data dari backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Tentukan status filter
      let statusForApi;
      if (activeView === 'processed') {
        statusForApi = 'Diproses,On Hold,Menunggu Approval';
      } else if (activeView === 'completed') {
        statusForApi = 'Done,Selesai';
      } else {
        statusForApi = 'all';
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

      // Updated Stats (fallback biar tetap aman)
      const updatedStats = {
        ...res.data.stats,
        platformData: res.data.stats.platformData || {
          Telegram: res.data.stats.totalDiproses + res.data.stats.totalSelesai,
          WhatsApp: 0
        },
      };

      setStats(updatedStats);

    } catch (err) {
      console.error('Gagal fetch data:', err);
      if (err.response && err.response.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, picFilter, startDate, endDate, searchQuery, activeView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset filter
  const handleResetFilters = () => {
    setPicFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
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
        <p>Memuat statistik dan tiket.</p>
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
      <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', padding: '2rem 0' }}>
        <div className="container">

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <div>
              <h1 className="h2 mb-1 fw-bold">📊 Dashboard Kendala Operasional</h1>
              <p className="mb-0 text-muted">Monitor dan kelola semua tiket kendala secara real-time.</p>
            </div>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>

          {/* Welcome Banner */}
          <div className="alert alert-primary d-flex align-items-center p-3 mb-4 border-0 shadow-sm" role="alert" style={{ backgroundColor: '#eef2ff' }}>
            <FaBullhorn className="me-3 text-primary" style={{ fontSize: '1.8rem', opacity: '0.8' }} />
            <div>
              <h5 className="alert-heading mb-0 fw-semibold">Selamat Datang!</h5>
              <p className="mb-0 text-muted">Semangat menyelesaikan semua kendala hari ini. Anda pasti bisa! 💪😄</p>
            </div>
          </div>

          {/* Dashboard Wrapper - Menggunakan Grid Layout */}
          <div style={dashboardWrapperStyle}>

            {/* Baris 1: 4 Charts Kecil (Status, PIC, Platform, Daily) */}
            <div style={chartBoxStyle}>
              <h6 className="fw-bold">Status Ticket</h6>
              <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
            </div>

            <div style={chartBoxStyle}>
              <h6 className="fw-bold">Tiket per PIC</h6>
              <PicChart data={stats.picData} />
            </div>

            <div style={chartBoxStyle}>
              <h6 className="fw-bold">Distribusi Platform</h6>
              {stats.platformData && Object.keys(stats.platformData).length > 0 ? (
                <PlatformChart data={stats.platformData} />
              ) : (
                <div className="alert alert-info text-center">Tidak ada data platform.</div>
              )}
            </div>

            <div style={chartBoxStyle}>
              <h6 className="fw-bold">Statistik Harian</h6>
              <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
            </div>

            {/* Baris 2: Case Terbanyak (Mengambil 2 Kolom) */}
            <div style={chartBoxLargeStyle}>
              <h6 className="fw-bold">Case Terbanyak</h6>
              {stats.caseData && Object.keys(stats.caseData).length > 0 ? (
                <CaseChart data={stats.caseData} />
              ) : (
                <div className="alert alert-info text-center">Tidak ada data case.</div>
              )}
            </div>

          </div>

          {/* Filter & Ticket List Section */}
          <div className="mt-4">

            {/* Tabs View */}
            <div className="view-selector-wrapper d-flex justify-content-center border-bottom mb-4 pb-3">
              <ul className="nav nav-pills nav-fill gap-2">
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm' : ''}`}
                    onClick={() => handleViewChange('all')}
                  >
                    <FaTicketAlt />
                    Semua Tiket
                    <span className="badge rounded-pill bg-secondary">
                      {stats.totalDiproses + stats.totalSelesai}
                    </span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm' : ''}`}
                    onClick={() => handleViewChange('processed')}
                  >
                    <FaSyncAlt />
                    Tiket Diproses
                    <span className="badge rounded-pill bg-warning text-dark">
                      {stats.totalDiproses}
                    </span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'completed' ? 'active shadow-sm' : ''}`}
                    onClick={() => handleViewChange('completed')}
                  >
                    <FaCheckCircle />
                      Tiket Selesai
                    <span className="badge rounded-pill bg-success">
                      {stats.totalSelesai}
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Filter Panel */}
            <div className="filter-panel d-flex flex-wrap align-items-end gap-3 p-3 mb-3 bg-white shadow-sm rounded">
              <div className="filter-group flex-grow-1">
                <label className="form-label small fw-semibold text-muted mb-1">Cari Tiket (Kode, Deskripsi, User)</label>
                <div className="input-group">
                  <span className="input-group-text"><FaSearch /></span>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Ketik untuk mencari..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label className="form-label small fw-semibold text-muted mb-1">PIC</label>
                <select
                  className="form-select form-select-sm"
                  value={picFilter}
                  onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">Semua PIC</option>
                  {stats.picList && stats.picList.map(pic => (
                    <option key={pic} value={pic}>
                      {pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="form-label small fw-semibold text-muted mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                />
                </div>

              <div className="filter-group">
                <label className="form-label small fw-semibold text-muted mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                />
                </div>

              <div className="filter-group d-flex gap-2 align-self-end">
                <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>Reset Filter</button>
                <button className="btn btn-success btn-sm" onClick={handleExport}>
                  <FaFileExcel className="me-1" /> Ekspor
                </button>
              </div>
            </div>

            {/* Ticket List */}
            <div className="ticket-list mt-3">
              {tickets.length > 0 ? tickets.map(ticket => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  picList={stats.picList}
                  refreshData={fetchData}
                  onImageClick={handleShowImage}
                  onTextClick={handleShowTextModal}
                />
              )) : (
                <div className="alert alert-warning text-center">
                  Tidak ada kendala yang cocok dengan filter.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination mt-3 d-flex justify-content-center gap-2">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span className="align-self-center">Halaman {currentPage} dari {totalPages}</span>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Preview Gambar */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{ padding: 0 }}>
          <img src={selectedImageUrl} alt="Detail Kendala" style={{ width: '100%', height: 'auto' }} />
        </Modal.Body>
      </Modal>

      {/* Modal Preview Text */}
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail dari @{selectedTextUser}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ whiteSpace: 'pre-wrap' }}>{selectedText}</p>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;