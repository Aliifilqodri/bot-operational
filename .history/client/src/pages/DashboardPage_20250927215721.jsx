// client/src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal, Collapse } from 'react-bootstrap'; // Import Collapse
import { 
  FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, 
  FaCheckCircle, FaFilter, FaBoxOpen, FaChevronDown, FaChevronUp 
} from 'react-icons/fa';

import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function DashboardPage() {
  // State yang sudah ada (tidak berubah)
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

  // --- BARU: State untuk mengontrol visibilitas panel filter ---
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Semua fungsi handler dan fetch data tetap sama (tidak ada perubahan logika)
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

  // --- Tampilan Loading yang lebih modern ---
  if (loading && !stats) {
    return (
      <div className="d-flex vh-100 bg-light justify-content-center align-items-center">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Memuat data...</span>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="container my-5"><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="bg-light min-vh-100 py-4">
        <div className="container">
          
          {/* --- HEADER --- */}
          <header className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-0">Dashboard Operasional</h1>
              <p className="text-muted mb-0">Monitor dan kelola semua kendala secara terpusat.</p>
            </div>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
              <FaSignOutAlt className="me-2" /> Logout
            </button>
          </header>

          {/* --- PANEL STATISTIK RINGKAS --- */}
          <section className="row g-4 mb-4">
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="card-title text-muted">Statistik Pengerjaan</h6>
                  <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
                </div>
              </div>
            </div>
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="card-title text-muted">Tiket per PIC</h6>
                  <PicChart data={stats.picData} />
                </div>
              </div>
            </div>
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="card-title text-muted">Jenis Kasus Terbanyak</h6>
                  {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                    <CaseChart data={stats.caseData}/> :
                    <div className="d-flex align-items-center justify-content-center h-100 text-muted">Tidak ada data.</div>
                  }
                </div>
              </div>
            </div>
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="card-title text-muted">Aktivitas Harian</h6>
                  <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
                </div>
              </div>
            </div>
          </section>

          {/* --- PANEL UTAMA TIKET --- */}
          <main className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center">
              {/* --- Navigasi Tab --- */}
              <ul className="nav nav-pills card-header-pills">
                <li className="nav-item">
                  <button className={`nav-link ${activeView === 'all' ? 'active' : ''}`} onClick={() => handleViewChange('all')}>
                    <FaTicketAlt className="me-1" /> Semua <span className="badge bg-secondary ms-1">{stats.totalDiproses + stats.totalSelesai}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeView === 'processed' ? 'active' : ''}`} onClick={() => handleViewChange('processed')}>
                    <FaSyncAlt className="me-1" /> Diproses <span className="badge bg-warning text-dark ms-1">{stats.totalDiproses}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeView === 'completed' ? 'active' : ''}`} onClick={() => handleViewChange('completed')}>
                    <FaCheckCircle className="me-1" /> Selesai <span className="badge bg-success ms-1">{stats.totalSelesai}</span>
                  </button>
                </li>
              </ul>
              {/* Tombol untuk membuka/menutup filter */}
              <button 
                className="btn btn-outline-secondary btn-sm mt-2 mt-md-0" 
                onClick={() => setIsFilterVisible(!isFilterVisible)}
                aria-controls="filter-collapse-panel"
                aria-expanded={isFilterVisible}
              >
                <FaFilter className="me-2" />
                Filter & Opsi
                {isFilterVisible ? <FaChevronUp className="ms-2" /> : <FaChevronDown className="ms-2" />}
              </button>
            </div>

            <div className="card-body p-0">
              {/* --- Panel Filter yang bisa disembunyikan --- */}
              <Collapse in={isFilterVisible}>
                <div id="filter-collapse-panel">
                  <div className="filter-panel bg-light d-flex flex-wrap align-items-end gap-3 p-3">
                    <div className="filter-group flex-grow-1" style={{minWidth: '200px'}}>
                      <label className="form-label small">Cari Tiket</label>
                      <div className="input-group">
                        <span className="input-group-text"><FaSearch/></span>
                        <input type="text" className="form-control form-control-sm" placeholder="Kode, Deskripsi, User..." value={searchQuery} onChange={handleSearchChange}/>
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
                      <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>Reset</button>
                      <button className="btn btn-success btn-sm" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor</button>
                    </div>
                  </div>
                </div>
              </Collapse>

              {/* --- Daftar Tiket --- */}
              <div className="ticket-list p-3">
                {loading ? (
                   <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
                ) : tickets.length > 0 ? (
                  tickets.map(ticket => (
                    <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                  ))
                ) : (
                  <div className="text-center p-5 border-dashed rounded-3">
                    <FaBoxOpen size={50} className="text-muted mb-3" />
                    <h5 className="text-muted">Tidak Ada Tiket Ditemukan</h5>
                    <p className="small">Silakan ubah filter atau pilih tab lain untuk melihat data.</p>
                  </div>
                )}
              </div>
            </div>

            {/* --- Pagination --- */}
            {totalPages > 1 &&
              <div className="card-footer bg-white d-flex justify-content-center align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                <span className="text-muted small">Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong></span>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
              </div>
            }
          </main>
        </div>
      </div>

      {/* --- Modals (tidak ada perubahan) --- */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body className="p-0"><img src={selectedImageUrl} alt="Detail Kendala" className="img-fluid"/></Modal.Body>
      </Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton><Modal.Title>Detail dari @{selectedTextUser}</Modal.Title></Modal.Header>
        <Modal.Body><p style={{whiteSpace:'pre-wrap'}}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;