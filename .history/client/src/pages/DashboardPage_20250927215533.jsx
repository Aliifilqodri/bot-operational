// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
// --- Ikon yang Digunakan ---
import { 
  FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, 
  FaSyncAlt, FaCheckCircle, FaChartPie, FaUsers, FaCalendarDay 
} from 'react-icons/fa';

import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function DashboardPage() {
  // --- State Management (Tidak ada perubahan) ---
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

  // --- Functions (Tidak ada perubahan logika) ---
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

  if (loading && !stats) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <h1>Memuat data dashboard...</h1>
    </div>
  );
  if (!stats) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <h1>Gagal memuat data. Coba refresh halaman.</h1>
    </div>
  );
  
  // --- TAMPILAN UTAMA (PEROMBAKAN BESAR) ---
  return (
    <>
      <Toaster position="top-center" />
      <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
        <div className="container-fluid p-4">
          
          {/* Bagian Header Utama */}
          <header className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 fw-bold">Dashboard Kendala Operasional</h1>
              <p className="text-muted">Analisis dan manajemen tiket kendala secara real-time.</p>
            </div>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </header>

          {/* Bagian Metrik Utama (KPI) */}
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card text-white bg-primary h-100 shadow-sm border-0">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title">TOTAL TIKET</h6>
                    <h2 className="display-6 fw-bold">{stats.totalDiproses + stats.totalSelesai}</h2>
                  </div>
                  <FaTicketAlt size={40} className="opacity-50" />
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-dark bg-warning h-100 shadow-sm border-0">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title">TIKET DIPROSES</h6>
                    <h2 className="display-6 fw-bold">{stats.totalDiproses}</h2>
                  </div>
                  <FaSyncAlt size={40} className="opacity-50" />
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-white bg-success h-100 shadow-sm border-0">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title">TIKET SELESAI</h6>
                    <h2 className="display-6 fw-bold">{stats.totalSelesai}</h2>
                  </div>
                  <FaCheckCircle size={40} className="opacity-50" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Panel Utama (Filter + Daftar Tiket) */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white p-3 border-bottom-0">
              {/* Navigasi Tab Tampilan */}
              <ul className="nav nav-pills nav-fill gap-2">
                {[
                  { view: 'all', label: 'Semua Tiket', icon: <FaTicketAlt />, count: stats.totalDiproses + stats.totalSelesai, color: 'bg-secondary' },
                  { view: 'processed', label: 'Tiket Diproses', icon: <FaSyncAlt />, count: stats.totalDiproses, color: 'bg-warning text-dark' },
                  { view: 'completed', label: 'Tiket Selesai', icon: <FaCheckCircle />, count: stats.totalSelesai, color: 'bg-success' }
                ].map(item => (
                  <li className="nav-item" key={item.view}>
                    <button
                      className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === item.view ? 'active shadow-sm' : ''}`}
                      onClick={() => handleViewChange(item.view)}
                    >
                      {item.icon} {item.label}
                      <span className={`badge rounded-pill ${item.color}`}>{item.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-body">
              {/* Panel Filter */}
              <div className="filter-panel bg-light rounded p-3 mb-4 d-flex flex-wrap align-items-end gap-3">
                  <div className="filter-group flex-grow-1">
                    <label className="form-label small">Cari Tiket (Kode, Deskripsi, User)</label>
                    <div className="input-group">
                      <span className="input-group-text"><FaSearch/></span>
                      <input type="text" className="form-control form-control-sm" placeholder="Ketik untuk mencari..." value={searchQuery} onChange={handleSearchChange}/>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label className="form-label small">PIC</label>
                    <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                      <option value="all">Semua PIC</option>
                      {stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="form-label small">Dari Tanggal</label>
                    <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
                  </div>
                  <div className="filter-group">
                    <label className="form-label small">Sampai Tanggal</label>
                    <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
                  </div>
                  <div className="filter-group d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleResetFilters}>Reset</button>
                    <button className="btn btn-sm btn-success" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor</button>
                  </div>
              </div>
              
              {/* Daftar Tiket */}
              <div className="ticket-list">
                {tickets.length > 0 ? tickets.map(ticket => (
                  <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                )) : <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter.</div>}
              </div>
              
              {/* Paginasi */}
              {totalPages > 1 &&
                <div className="pagination mt-4 d-flex justify-content-center gap-2 align-items-center">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                  <span className="text-muted small">Halaman {currentPage} dari {totalPages}</span>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
                </div>
              }
            </div>
          </div>
          
          {/* Bagian Chart Tambahan */}
          <h2 className="h4 fw-bold mt-5 mb-3">Analisis Mendalam</h2>
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title fw-bold d-flex align-items-center gap-2"><FaChartPie/> Statistik Status Pengerjaan</h6>
                  <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title fw-bold d-flex align-items-center gap-2"><FaUsers/> Tiket per Penanggung Jawab (PIC)</h6>
                  <PicChart data={stats.picData} />
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title fw-bold d-flex align-items-center gap-2"><FaTicketAlt/> Kategori Kasus Terbanyak</h6>
                  {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                    <CaseChart data={stats.caseData}/> :
                    <div className="alert alert-info text-center mt-3">Tidak ada data case.</div>
                  }
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title fw-bold d-flex align-items-center gap-2"><FaCalendarDay/> Statistik Harian (Hari Ini vs Kemarin)</h6>
                  <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Modal (Tidak ada perubahan) */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{padding:0}}><img src={selectedImageUrl} alt="Detail Kendala" style={{width:'100%', height:'auto'}}/></Modal.Body>
      </Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton><Modal.Title>Detail dari @{selectedTextUser}</Modal.Title></Modal.Header>
        <Modal.Body><p style={{whiteSpace:'pre-wrap'}}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;