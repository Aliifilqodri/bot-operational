// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle, FaFilter } from 'react-icons/fa';

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

  // --- State untuk Navigasi Tab ---
  const [activeView, setActiveView] = useState('all');

  // --- State untuk Filter ---
  const [picFilter, setPicFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- State untuk Paginasi ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- State untuk Modal ---
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextUser, setSelectedTextUser] = useState('');

  // --- Ganti background body saat komponen ini aktif ---
  useEffect(() => {
    document.body.classList.add('bg-light');
    return () => {
      document.body.classList.remove('bg-light');
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
        limit: 12, // Jumlah tiket per halaman
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

  if (loading && !stats) return <div className="vh-100 d-flex justify-content-center align-items-center bg-light"><h1>Memuat data...</h1></div>;
  if (!stats) return <div className="vh-100 d-flex justify-content-center align-items-center bg-light"><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="container-fluid p-4">
        
        {/* --- HEADER --- */}
        <header className="card shadow-sm mb-4">
          <div className="card-body d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold text-primary">📊 Dashboard Kendala Operational</h1>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
              <FaSignOutAlt className="me-2" /> Logout
            </button>
          </div>
        </header>

        {/* --- AREA DIAGRAM/CHART --- */}
        <section className="row g-4 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="card-title text-muted fw-bold">Statistik Status (Filter Aktif)</h6>
                <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="card-title text-muted fw-bold">Beban Kerja per PIC</h6>
                <PicChart data={stats.picData} />
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                  <h6 className="card-title text-muted fw-bold">Kategori Kendala Teratas</h6>
                  {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                    <CaseChart data={stats.caseData}/> :
                    <div className="d-flex align-items-center justify-content-center h-100">Tidak ada data.</div>
                  }
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                 <h6 className="card-title text-muted fw-bold">Produktivitas Harian</h6>
                 <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
              </div>
            </div>
          </div>
        </section>

        {/* --- AREA KONTEN UTAMA (FILTER + TIKET) --- */}
        <main className="card shadow-sm">
          <div className="card-header bg-white border-0 pt-3">
             {/* --- NAVIGASI TAB --- */}
            <div className="view-selector-wrapper d-flex justify-content-center mb-3">
              <ul className="nav nav-pills nav-fill gap-3">
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm' : 'btn-outline-primary'}`} onClick={() => handleViewChange('all')}>
                    <FaTicketAlt /> Semua Tiket <span className="badge rounded-pill bg-dark">{stats ? stats.totalDiproses + stats.totalSelesai : '...'}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm' : 'btn-outline-warning text-dark'}`} onClick={() => handleViewChange('processed')}>
                    <FaSyncAlt /> Diproses <span className="badge rounded-pill bg-warning text-dark">{stats ? stats.totalDiproses : '...'}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'completed' ? 'active shadow-sm' : 'btn-outline-success'}`} onClick={() => handleViewChange('completed')}>
                    <FaCheckCircle /> Selesai <span className="badge rounded-pill bg-success">{stats ? stats.totalSelesai : '...'}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="card-body">
            {/* --- PANEL FILTER --- */}
            <div className="filter-panel d-flex flex-wrap align-items-end gap-3 p-3 mb-4 rounded" style={{backgroundColor: '#f8f9fa'}}>
              <div className="filter-group flex-grow-1">
                <label className="form-label small fw-bold">Cari Tiket (Kode, Deskripsi, User)</label>
                <div className="input-group">
                  <span className="input-group-text"><FaSearch/></span>
                  <input type="text" className="form-control form-control-sm" placeholder="Ketik untuk mencari..." value={searchQuery} onChange={handleSearchChange}/>
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
                <button className="btn btn-secondary btn-sm" onClick={handleResetFilters} title="Reset Filter"><FaFilter /></button>
                <button className="btn btn-success btn-sm" onClick={handleExport} title="Ekspor ke Excel"><FaFileExcel /></button>
              </div>
            </div>

            {/* --- GRID TIKET --- */}
            <div className="ticket-grid">
              <div className="row g-4">
                {tickets.length > 0 ? tickets.map(ticket => (
                  <div className="col-12 col-md-6 col-xl-4" key={ticket._id}>
                     <TicketCard ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                  </div>
                )) : (
                  <div className="col-12">
                    <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter yang dipilih.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- PAGINASI --- */}
          {totalPages > 1 &&
            <div className="card-footer bg-white d-flex justify-content-center">
              <div className="pagination mt-3 d-flex justify-content-center align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                <span className="fw-bold small text-muted">Halaman {currentPage} dari {totalPages}</span>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
              </div>
            </div>
          }
        </main>
      </div>

      {/* --- MODALS --- */}
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