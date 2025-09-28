// client/src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle, FaChartPie, FaUsers, FaListAlt, FaCalendarDay } from 'react-icons/fa';

import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState('all');

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

  const handleShowImage = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
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
      const token = localStorage.getItem('token');
      
      let statusForApi;
      if (activeView === 'processed') {
        statusForApi = 'Diproses,On Hold,Menunggu Approval';
      } else if (activeView === 'completed') {
        statusForApi = 'Done';
      } else {
        statusForApi = 'all';
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: 12, // Tetap 12 untuk pagination yang konsisten
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
      setStats(res.data.stats);
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
  
  // --- Tampilan Loading Modern ---
  if (loading && !stats) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', backgroundColor: '#f8f9fa' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Memuat data...</span>
        </div>
        <h3 className="ms-3">Memuat data...</h3>
      </div>
    );
  }

  if (!stats) return <div className="container my-5"><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      {/* --- Latar Belakang Baru untuk Halaman --- */}
      <div className="bg-light" style={{ minHeight: '100vh' }}>
        <div className="container-fluid py-4 px-md-4">
          
          {/* --- Header Dashboard --- */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-0 fw-bold">📊 Dashboard Kendala Operasional</h2>
                <p className="text-muted mb-0">Monitor dan kelola semua tiket kendala secara real-time.</p>
              </div>
              <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
                <FaSignOutAlt /> <span className="d-none d-md-inline">Logout</span>
              </button>
            </div>
          </div>

          {/* --- Grid untuk Statistik Chart --- */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title text-muted fw-bold small text-uppercase"><FaChartPie className="me-2"/>Status Pengerjaan</h5>
                  <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title text-muted fw-bold small text-uppercase"><FaUsers className="me-2"/>Tiket per PIC</h5>
                  <PicChart data={stats.picData} />
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title text-muted fw-bold small text-uppercase"><FaListAlt className="me-2"/>Kasus Terbanyak</h5>
                  {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                    <CaseChart data={stats.caseData}/> :
                    <div className="alert alert-info text-center h-100 d-flex align-items-center justify-content-center">Tidak ada data.</div>
                  }
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title text-muted fw-bold small text-uppercase"><FaCalendarDay className="me-2"/>Statistik Harian</h5>
                  <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
                </div>
              </div>
            </div>
          </div>

          {/* --- Panel Utama untuk Filter dan Daftar Tiket --- */}
          <div className="card shadow-sm border-0">
            {/* --- Header Kartu dengan Navigasi Tab --- */}
            <div className="card-header bg-white border-0 pt-3">
              <ul className="nav nav-pills nav-fill gap-2">
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('all')}>
                    <FaTicketAlt /> Semua Tiket
                    <span className="badge rounded-pill bg-dark">{stats.totalDiproses + stats.totalSelesai}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('processed')}>
                    <FaSyncAlt /> Tiket Diproses
                    <span className="badge rounded-pill bg-warning text-dark">{stats.totalDiproses}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'completed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('completed')}>
                    <FaCheckCircle /> Tiket Selesai
                    <span className="badge rounded-pill bg-success">{stats.totalSelesai}</span>
                  </button>
                </li>
              </ul>
            </div>
            
            {/* --- Body Kartu dengan Filter dan Grid Tiket --- */}
            <div className="card-body">
              {/* --- Panel Filter --- */}
              <div className="bg-light-subtle p-3 rounded-3 mb-4">
                <div className="row g-2 align-items-end">
                  <div className="col-lg-3 col-md-12">
                    <label className="form-label small">Cari Tiket (Kode, Deskripsi, User)</label>
                    <div className="input-group">
                      <span className="input-group-text"><FaSearch/></span>
                      <input type="text" className="form-control form-control-sm" placeholder="Ketik untuk mencari..." value={searchQuery} onChange={handleSearchChange} />
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-3">
                    <label className="form-label small">PIC</label>
                    <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                      <option value="all">Semua PIC</option>
                      {stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="col-lg-2 col-md-3">
                    <label className="form-label small">Dari Tanggal</label>
                    <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
                  </div>
                  <div className="col-lg-2 col-md-3">
                    <label className="form-label small">Sampai Tanggal</label>
                    <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
                  </div>
                  <div className="col-lg-3 col-md-3 d-flex gap-2 justify-content-end">
                    <button className="btn btn-secondary btn-sm flex-grow-1" onClick={handleResetFilters}>Reset</button>
                    <button className="btn btn-success btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1" onClick={handleExport}><FaFileExcel/> Ekspor</button>
                  </div>
                </div>
              </div>
              
              {/* --- PERUBAHAN UTAMA: GRID TIKET --- */}
              <div className="row g-3">
                {tickets.length > 0 ? (
                  tickets.map(ticket => (
                    <div className="col-12 col-md-6 col-lg-4 col-xl-3" key={ticket._id}>
                      <TicketCard ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                    </div>
                  ))
                ) : (
                  <div className="col-12">
                    <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter.</div>
                  </div>
                )}
              </div>
            </div>

            {/* --- Footer Kartu untuk Pagination --- */}
            {totalPages > 1 &&
              <div className="card-footer bg-white d-flex justify-content-center align-items-center py-3">
                <div className="btn-group">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                    Sebelumnya
                  </button>
                  <button className="btn btn-sm btn-secondary" disabled style={{minWidth: '120px'}}>
                    Hal. {currentPage} / {totalPages}
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                    Berikutnya
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      {/* --- Modal Tetap Sama --- */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{ padding: 0 }}><img src={selectedImageUrl} alt="Detail Kendala" style={{ width: '100%', height: 'auto' }} /></Modal.Body>
      </Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton><Modal.Title>Detail dari @{selectedTextUser}</Modal.Title></Modal.Header>
        <Modal.Body><p style={{ whiteSpace: 'pre-wrap' }}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;