// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { Modal, Spinner } from 'react-bootstrap';
import { 
  FaFileExcel, 
  FaSignOutAlt, 
  FaSearch, 
  FaTicketAlt, 
  FaSyncAlt, 
  FaCheckCircle,
  FaFilter,
  FaUndo,
  FaInbox // Ikon untuk empty state
} from 'react-icons/fa';

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

  // State untuk navigasi utama (tab)
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

  // --- Fungsi-fungsi Handler ---
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
  
  const handleViewChange = (view) => {
    setActiveView(view);
    setCurrentPage(1); // Reset ke halaman pertama saat ganti view
  };

  // --- Fungsi Fetch Data Utama ---
  const fetchData = useCallback(async (isRefresh = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Tentukan status yang akan dikirim ke API berdasarkan view aktif
      let statusForApi;
      if (activeView === 'processed') {
        statusForApi = 'Diproses,On Hold,Menunggu Approval';
      } else if (activeView === 'completed') {
        statusForApi = 'Done';
      } else {
        statusForApi = 'all'; // Untuk 'all' tickets
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
      if(isRefresh) {
        toast.success('Data berhasil diperbarui!');
      }
    } catch (err) {
      console.error('Gagal fetch data:', err);
      toast.error('Gagal mengambil data dari server.');
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

  // --- Fungsi Handler untuk Filter ---
  const handleResetFilters = () => {
    setPicFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
    toast.info('Filter telah direset.');
  };
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleExport = () => {
    toast.loading('Mempersiapkan file Excel...');
    // Logika export tetap sama, namun tambahkan notifikasi
    window.location.href = `${API_URL}/tickets/export`;
  };
  
  // --- Tampilan Loading & Gagal Muat ---
  if (!stats) {
    return (
      <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
        {loading ? (
          <>
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }}/>
            <h4 className="mt-3">Memuat Data Dashboard...</h4>
          </>
        ) : (
          <>
            <h1 className="display-4">Gagal Memuat Data</h1>
            <p className="lead">Terjadi kesalahan saat menghubungi server. Silakan coba lagi nanti.</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh Halaman</button>
          </>
        )}
      </div>
    );
  }

  // --- Tampilan Utama Dashboard ---
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="bg-light min-vh-100">
        <div className="container-fluid p-4">
          
          {/* --- Page Header --- */}
          <header className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0 text-dark fw-bold">📊 Dashboard Kendala Operasional</h1>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </header>

          {/* --- Chart Grid --- */}
          <section className="row g-4 mb-4">
            <div className="col-xl-3 col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <h6 className="card-title text-muted">Statistik Pengerjaan</h6>
                  <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <h6 className="card-title text-muted">Tiket per PIC</h6>
                  <PicChart data={stats.picData} />
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <h6 className="card-title text-muted">Klasifikasi Kasus</h6>
                  {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                    <CaseChart data={stats.caseData}/> :
                    <div className="d-flex align-items-center justify-content-center h-100 text-center">Tidak ada data.</div>
                  }
                </div>
              </div>
            </div>
             <div className="col-xl-3 col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                   <h6 className="card-title text-muted">Statistik Harian</h6>
                   <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
                </div>
              </div>
            </div>
          </section>
          
          {/* --- Main Content Card (Tabs, Filter, Ticket List) --- */}
          <div className="card shadow border-0">
            <div className="card-header bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                 <ul className="nav nav-pills">
                    <li className="nav-item">
                      <button className={`nav-link ${activeView === 'all' ? 'active' : ''}`} onClick={() => handleViewChange('all')}>
                        <FaTicketAlt className="me-2"/>Semua Tiket <span className="badge bg-secondary ms-1">{stats.totalDiproses + stats.totalSelesai}</span>
                      </button>
                    </li>
                    <li className="nav-item">
                       <button className={`nav-link ${activeView === 'processed' ? 'active' : ''}`} onClick={() => handleViewChange('processed')}>
                         <FaSyncAlt className="me-2"/>Diproses <span className="badge bg-warning text-dark ms-1">{stats.totalDiproses}</span>
                      </button>
                    </li>
                    <li className="nav-item">
                       <button className={`nav-link ${activeView === 'completed' ? 'active' : ''}`} onClick={() => handleViewChange('completed')}>
                         <FaCheckCircle className="me-2"/>Selesai <span className="badge bg-success ms-1">{stats.totalSelesai}</span>
                      </button>
                    </li>
                 </ul>
                 <button className="btn btn-sm btn-light" onClick={() => fetchData(true)} disabled={loading}>
                    {loading ? <Spinner as="span" animation="border" size="sm" /> : <FaSyncAlt />}
                    <span className="ms-2 d-none d-md-inline">Refresh Data</span>
                 </button>
              </div>
            </div>
            
            <div className="card-body p-4">
              {/* --- Filter Panel --- */}
              <div className="filter-panel d-flex flex-wrap align-items-end gap-3 p-3 mb-4 bg-light rounded-3">
                 <div className="filter-group flex-grow-1">
                    <label className="form-label small">Cari Tiket</label>
                    <div className="input-group">
                      <span className="input-group-text"><FaSearch/></span>
                      <input type="text" className="form-control form-control-sm" placeholder="Kode, Deskripsi, User..." value={searchQuery} onChange={handleSearchChange} />
                    </div>
                 </div>
                 <div className="filter-group">
                    <label className="form-label small">PIC</label>
                    <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                      <option value="all">Semua PIC</option>
                      {stats.picList?.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
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
                    <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={handleResetFilters}><FaUndo/> Reset</button>
                    <button className="btn btn-success btn-sm d-flex align-items-center gap-1" onClick={handleExport}><FaFileExcel/> Ekspor</button>
                 </div>
              </div>
              
              {/* --- Ticket List / Empty State --- */}
              {loading ? (
                  <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Memuat tiket...</p>
                  </div>
              ) : tickets.length > 0 ? (
                <div className="ticket-list">
                  {tickets.map(ticket => (
                    <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                  ))}
                </div>
              ) : (
                <div className="text-center p-5 border rounded-3">
                   <FaInbox size={50} className="text-muted mb-3" />
                   <h5 className="fw-bold">Tidak Ada Tiket Ditemukan</h5>
                   <p className="text-muted">Coba ubah atau reset filter Anda untuk melihat hasil.</p>
                </div>
              )}
            </div>

            {/* --- Pagination --- */}
            {totalPages > 1 && (
              <div className="card-footer bg-white d-flex justify-content-center align-items-center p-3">
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                    &laquo; Sebelumnya
                  </button>
                   <button className="btn btn-outline-secondary" disabled>
                     Halaman {currentPage} dari {totalPages}
                   </button>
                  <button className="btn btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                    Berikutnya &raquo;
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* --- Modals --- */}
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