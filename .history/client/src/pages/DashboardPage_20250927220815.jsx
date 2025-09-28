import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal, Spinner } from 'react-bootstrap';
import { 
    FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, 
    FaCheckCircle, FaChartBar, FaUserFriends, FaClipboardList, FaCalendarAlt, FaRedo
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

  // --- Set Judul Halaman ---
  useEffect(() => {
    document.title = "Dashboard Kendala Operasional";
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
    if (currentPage === 1) { // Hanya tampilkan loading utama saat pertama kali load
        setLoading(true);
    }
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
        limit: 12, // Anda bisa sesuaikan limit ini
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
            <div className="text-center">
                <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }}/>
                <h3 className="mt-3">Memuat Data Dashboard...</h3>
            </div>
        </div>
    );
  }

  if (!stats) return <div className="container my-5 alert alert-danger"><h1>Gagal memuat data statistik. Coba refresh halaman.</h1></div>;

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
        <div className="container-fluid p-4">

          {/* --- HEADER --- */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <h2 className="mb-0 fw-bold text-primary">📊 Dashboard Kendala Operasional</h2>
              <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
          
          {/* --- GRID STATISTIK --- */}
          <div className="row g-4 mb-4">
            <div className="col-xl-3 col-md-6">
              <div className="card shadow-sm border-0 h-100 text-center">
                <div className="card-body">
                  <h5 className="card-title fw-bold"><FaChartBar className="me-2 text-primary"/>Status Pengerjaan</h5>
                  <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card shadow-sm border-0 h-100 text-center">
                <div className="card-body">
                  <h5 className="card-title fw-bold"><FaUserFriends className="me-2 text-success"/>Tiket per PIC</h5>
                  <PicChart data={stats.picData} />
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card shadow-sm border-0 h-100 text-center">
                <div className="card-body">
                   <h5 className="card-title fw-bold"><FaClipboardList className="me-2 text-warning"/>Kasus Terbanyak</h5>
                   {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                     <CaseChart data={stats.caseData}/> :
                     <div className="d-flex align-items-center justify-content-center h-100"><span className="badge bg-info-subtle text-info-emphasis">Tidak ada data case</span></div>
                   }
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card shadow-sm border-0 h-100 text-center">
                <div className="card-body">
                  <h5 className="card-title fw-bold"><FaCalendarAlt className="me-2 text-danger"/>Aktivitas Harian</h5>
                  <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
                </div>
              </div>
            </div>
          </div>

          {/* --- KONTEN UTAMA (FILTER & TIKET) --- */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
            
              {/* --- NAVIGASI TAB VIEW --- */}
              <div className="d-flex justify-content-center border-bottom mb-4 pb-3">
                <ul className="nav nav-pills nav-fill gap-3">
                  <li className="nav-item">
                    <button className={`nav-link d-flex align-items-center justify-content-center gap-2 py-2 px-3 ${activeView === 'all' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('all')}>
                      <FaTicketAlt /> Semua Tiket <span className="badge rounded-pill bg-dark-subtle text-dark-emphasis">{stats.totalDiproses + stats.totalSelesai}</span>
                    </button>
                  </li>
                  <li className="nav-item">
                    <button className={`nav-link d-flex align-items-center justify-content-center gap-2 py-2 px-3 ${activeView === 'processed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('processed')}>
                      <FaSyncAlt /> Tiket Diproses <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">{stats.totalDiproses}</span>
                    </button>
                  </li>
                  <li className="nav-item">
                    <button className={`nav-link d-flex align-items-center justify-content-center gap-2 py-2 px-3 ${activeView === 'completed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('completed')}>
                      <FaCheckCircle /> Tiket Selesai <span className="badge rounded-pill bg-success-subtle text-success-emphasis">{stats.totalSelesai}</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* --- PANEL FILTER --- */}
              <div className="filter-panel bg-light p-3 rounded-3 mb-4 border">
                <div className="row g-3 align-items-end">
                    <div className="col-xl-4 col-lg-12">
                        <label className="form-label fw-semibold">Cari Tiket (Kode, Deskripsi, User)</label>
                        <div className="input-group">
                            <span className="input-group-text"><FaSearch/></span>
                            <input type="text" className="form-control" placeholder="Ketik untuk mencari..." value={searchQuery} onChange={handleSearchChange} />
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4">
                        <label className="form-label fw-semibold">PIC</label>
                        <select className="form-select" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                            <option value="all">Semua PIC</option>
                            {stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div className="col-xl-2 col-md-4">
                        <label className="form-label fw-semibold">Dari Tanggal</label>
                        <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
                    </div>
                    <div className="col-xl-2 col-md-4">
                        <label className="form-label fw-semibold">Sampai Tanggal</label>
                        <input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
                    </div>
                    <div className="col-xl-2 col-lg-12 d-flex justify-content-end gap-2">
                        <button className="btn btn-outline-secondary w-100" onClick={handleResetFilters} title="Reset Filter"><FaRedo/></button>
                        <button className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleExport}><FaFileExcel/> Ekspor</button>
                    </div>
                </div>
              </div>

              {/* --- GRID TIKET --- */}
              {loading && tickets.length === 0 ? (
                 <div className="text-center p-5"><Spinner animation="border" variant="secondary" /></div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.2rem' }}>
                    {tickets.length > 0 ? tickets.map(ticket => (
                      <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                    )) : <div className="alert alert-warning text-center" style={{gridColumn: '1 / -1'}}>Tidak ada kendala yang cocok dengan filter.</div>}
                  </div>

                  {totalPages > 1 &&
                    <div className="pagination mt-4 d-flex justify-content-center align-items-center gap-2">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</button>
                      <span className="fw-semibold">Halaman {currentPage} dari {totalPages}</span>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
                    </div>
                  }
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* --- MODAL --- */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body className="p-0"><img src={selectedImageUrl} alt="Detail Kendala" style={{width:'100%', height:'auto'}}/></Modal.Body>
      </Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton><Modal.Title>Detail dari @{selectedTextUser}</Modal.Title></Modal.Header>
        <Modal.Body><p style={{whiteSpace:'pre-wrap'}}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;