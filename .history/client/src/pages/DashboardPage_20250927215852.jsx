// client/src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle, FaFilter, FaTachometerAlt } from 'react-icons/fa';

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

  // --- State untuk Navigasi & Filter ---
  const [activeView, setActiveView] = useState('all');
  const [picFilter, setPicFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- State untuk Pagination & Modal ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextUser, setSelectedTextUser] = useState('');

  // --- Fungsi Handler (tidak berubah signifikan) ---
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

  if (loading && !stats) return <div className="d-flex justify-content-center align-items-center vh-100" style={{backgroundColor: '#f4f7f9'}}><h1>Memuat data...</h1></div>;
  if (!stats) return <div className="d-flex justify-content-center align-items-center vh-100" style={{backgroundColor: '#f4f7f9'}}><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  // --- STRUKTUR JSX BARU DENGAN TAMPILAN MODERN ---
  return (
    <>
      <Toaster position="top-center" />
      <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', padding: '2rem 1.5rem' }}>
        
        {/* --- Header Utama --- */}
        <header className="card shadow-sm border-0 mb-4">
            <div className="card-body d-flex justify-content-between align-items-center">
                <h1 className="h4 mb-0 d-flex align-items-center gap-3">
                    <FaTachometerAlt className="text-primary"/> 
                    Dashboard Kendala Operasional
                </h1>
                <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                    <FaSignOutAlt className="me-2" /> Logout
                </button>
            </div>
        </header>
        
        {/* --- Grid Statistik Chart --- */}
        <div className="row g-4 mb-4">
            <div className="col-lg-6 col-xl-3">
                <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                        <h6 className="card-title text-muted small">Statistik Pengerjaan</h6>
                        <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
                    </div>
                </div>
            </div>
            <div className="col-lg-6 col-xl-3">
                <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                        <h6 className="card-title text-muted small">Tiket per PIC</h6>
                        <PicChart data={stats.picData} />
                    </div>
                </div>
            </div>
            <div className="col-lg-6 col-xl-3">
                <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                        <h6 className="card-title text-muted small">Jenis Case Terbanyak</h6>
                        {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                            <CaseChart data={stats.caseData}/> :
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">Tidak ada data.</div>
                        }
                    </div>
                </div>
            </div>
            <div className="col-lg-6 col-xl-3">
                 <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                        <h6 className="card-title text-muted small">Statistik Harian</h6>
                        <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
                    </div>
                </div>
            </div>
        </div>
        
        {/* --- Panel Kontrol: Navigasi & Filter --- */}
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-3">
                <ul className="nav nav-pills nav-fill gap-2">
                    {[
                        { view: 'all', icon: <FaTicketAlt />, label: 'Semua Tiket', count: stats.totalDiproses + stats.totalSelesai, badge: 'bg-secondary' },
                        { view: 'processed', icon: <FaSyncAlt />, label: 'Tiket Diproses', count: stats.totalDiproses, badge: 'bg-warning text-dark' },
                        { view: 'completed', icon: <FaCheckCircle />, label: 'Tiket Selesai', count: stats.totalSelesai, badge: 'bg-success' }
                    ].map(item => (
                        <li className="nav-item" key={item.view}>
                            <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === item.view ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange(item.view)}>
                                {item.icon} {item.label} <span className={`badge rounded-pill ${item.badge}`}>{stats ? item.count : '...'}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="card-body bg-light">
                 <div className="filter-panel d-flex flex-wrap align-items-end gap-3">
                    <div className="filter-group flex-grow-1" style={{minWidth: '250px'}}>
                        <label className="form-label small">Cari Tiket (Kode, Deskripsi, User)</label>
                        <div className="input-group">
                            <span className="input-group-text"><FaSearch/></span>
                            <input type="text" className="form-control form-control-sm" placeholder="Ketik untuk mencari..." value={searchQuery} onChange={handleSearchChange} />
                        </div>
                    </div>
                    <div className="filter-group" style={{minWidth: '150px'}}>
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
                    <div className="ms-auto d-flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}><FaFilter className="me-1"/> Reset</button>
                        <button className="btn btn-success btn-sm" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor</button>
                    </div>
                </div>
            </div>
            
            {/* --- Grid Daftar Tiket --- */}
            <div className="card-footer bg-white">
                <div className="row g-4 py-3">
                    {tickets.length > 0 ? tickets.map(ticket => (
                        <div className="col-12 col-md-6 col-lg-4 col-xl-3" key={ticket._id}>
                            <TicketCard 
                                ticket={ticket} 
                                picList={stats.picList} 
                                refreshData={fetchData} 
                                onImageClick={handleShowImage} 
                                onTextClick={handleShowTextModal} 
                            />
                        </div>
                    )) : (
                        <div className="col-12">
                            <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter yang diterapkan.</div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Pagination --- */}
            {totalPages > 1 &&
                <div className="card-footer bg-white d-flex justify-content-center pt-3 border-0">
                     <div className="pagination d-flex justify-content-center align-items-center gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                        <span className="text-muted small">Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong></span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
                    </div>
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

export default DashboardPage;