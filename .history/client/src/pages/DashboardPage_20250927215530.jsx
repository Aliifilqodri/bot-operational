// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle } from 'react-icons/fa';

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

  // State untuk navigasi tab
  const [activeView, setActiveView] = useState('all');

  // State untuk filter
  const [picFilter, setPicFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // State untuk modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextUser, setSelectedTextUser] = useState('');

  // --- EFEK BACKGROUND GRADIENT ---
  // Menambahkan background ke body saat komponen ini dimuat
  useEffect(() => {
    document.body.style.backgroundColor = '#f0f2f5';
    document.body.style.backgroundImage = 'linear-gradient(to bottom right, #f8f9fa, #e9ecef)';
    // Cleanup function untuk mengembalikan style saat komponen di-unmount
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.backgroundImage = '';
    };
  }, []);


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
    if(!loading) setLoading(true); // Tampilkan loading setiap fetch
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

  // --- Tampilan Loading yang Lebih Baik ---
  if (!stats) {
    return (
      <div className="d-flex vh-100 justify-content-center align-items-center flex-column">
        <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="mt-3">Memuat Data...</h4>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="container my-4">
        
        {/* --- HEADER HALAMAN --- */}
        <div className="p-4 mb-4 bg-white rounded-3 shadow-sm">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="display-6 fw-bold">Dashboard Operasional</h1>
              <p className="text-muted">Pantau dan kelola semua laporan kendala secara terpusat.</p>
            </div>
            <button className="btn btn-outline-danger" onClick={handleLogout}>
              <FaSignOutAlt className="me-2" /> Logout
            </button>
          </div>
        </div>

        {/* --- GRID STATISTIK --- */}
        <div className="dashboard-wrapper">
          <div className="chart-box bg-white p-3 rounded-3 shadow-sm">
            <h6 className="fw-bold text-muted mb-3">Statistik Pengerjaan</h6>
            <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
          </div>
          <div className="chart-box bg-white p-3 rounded-3 shadow-sm">
            <h6 className="fw-bold text-muted mb-3">Tiket per PIC</h6>
            <PicChart data={stats.picData} />
          </div>
          <div className="chart-box bg-white p-3 rounded-3 shadow-sm">
             <h6 className="fw-bold text-muted mb-3">Klasifikasi Kasus</h6>
             {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
               <CaseChart data={stats.caseData}/> :
               <div className="alert alert-info text-center h-100 d-flex align-items-center justify-content-center">Tidak ada data.</div>
             }
          </div>
          <div className="chart-box bg-white p-3 rounded-3 shadow-sm">
            <h6 className="fw-bold text-muted mb-3">Statistik Harian</h6>
            <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
          </div>
        </div>

        {/* --- PANEL UTAMA KONTEN (FILTER & TIKET) --- */}
        <div className="mt-4 bg-white p-4 rounded-3 shadow-sm">
            {/* Navigasi Tab */}
            <div className="view-selector-wrapper d-flex justify-content-center border-bottom mb-4 pb-3">
              <ul className="nav nav-pills nav-fill gap-2">
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('all')}>
                    <FaTicketAlt /> Semua Tiket
                    <span className="badge rounded-pill bg-dark">{stats.totalDiproses + stats.totalSelesai}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('processed')}>
                    <FaSyncAlt className={loading && activeView === 'processed' ? 'fa-spin' : ''} /> Tiket Diproses
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
            
            {/* Panel Filter */}
            <div className="filter-panel bg-light p-3 rounded-3 mb-4 border">
              <div className="d-flex flex-wrap align-items-end gap-3">
                <div className="filter-group flex-grow-1">
                  <label className="form-label small fw-bold">Cari Tiket</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaSearch/></span>
                    <input type="text" className="form-control form-control-sm" placeholder="Kode, Deskripsi, User..." value={searchQuery} onChange={handleSearchChange}/>
                  </div>
                </div>
                <div className="filter-group">
                  <label className="form-label small fw-bold">PIC</label>
                  <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="all">Semua PIC</option>
                    {stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label className="form-label small fw-bold">Dari Tanggal</label>
                  <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
                </div>
                <div className="filter-group">
                  <label className="form-label small fw-bold">Sampai Tanggal</label>
                  <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
                </div>
                <div className="filter-group d-flex gap-2">
                  <button className="btn btn-outline-secondary btn-sm" onClick={handleResetFilters}>Reset</button>
                  <button className="btn btn-success btn-sm" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor</button>
                </div>
              </div>
            </div>

            {/* Daftar Tiket */}
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Memuat tiket...</span>
                </div>
              </div>
            ) : (
              <div className="ticket-list">
                {tickets.length > 0 ? tickets.map(ticket => (
                  <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                )) : <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter yang diterapkan.</div>}
              </div>
            )}


            {/* Pagination */}
            {totalPages > 1 &&
              <div className="pagination mt-4 d-flex justify-content-center gap-2 align-items-center">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                <span className="text-muted small">Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong></span>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
              </div>
            }
        </div>
      </div>

      {/* Modal (tidak ada perubahan) */}
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
A
export default DashboardPage;