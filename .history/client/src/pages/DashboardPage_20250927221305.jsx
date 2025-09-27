// client/src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';

// Import ikon yang tersedia
import { 
  FaFileExcel, 
  FaSignOutAlt, 
  FaSearch, 
  FaTicketAlt, 
  FaSyncAlt, 
  FaCheckCircle, 
  FaFilter,
  FaCalendarAlt,
  FaUserCog,
  FaChartBar,
  FaExclamationTriangle,
  FaThumbsUp,
  FaClock,
  FaList,
  FaTh
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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
        limit: viewMode === 'grid' ? 12 : 10,
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
  }, [currentPage, picFilter, startDate, endDate, searchQuery, activeView, viewMode]);

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

  const getViewIcon = () => {
    switch(activeView) {
      case 'processed': return <FaSyncAlt className="text-warning" />;
      case 'completed': return <FaCheckCircle className="text-success" />;
      default: return <FaTicketAlt className="text-primary" />;
    }
  };

  const getViewColor = () => {
    switch(activeView) {
      case 'processed': return 'warning';
      case 'completed': return 'success';
      default: return 'primary';
    }
  };

  if (loading && !stats) return (
    <div className="container my-5">
      <div className="d-flex justify-content-center align-items-center" style={{height: '50vh'}}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}></div>
          <h3 className="text-muted">Memuat dashboard...</h3>
        </div>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="container my-5">
      <div className="alert alert-danger text-center">
        <FaExclamationTriangle className="me-2" />
        Gagal memuat data. Silakan refresh halaman.
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-center" />
      
      {/* Header dengan gradient */}
      <div className="bg-primary bg-gradient text-white py-4 shadow-sm">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-1">
                <FaChartBar className="me-2" />
                Dashboard Kendala Operational
              </h1>
              <p className="mb-0 opacity-75">Monitor dan kelola tiket kendala operasional secara real-time</p>
            </div>
            <button className="btn btn-light btn-sm" onClick={handleLogout}>
              <FaSignOutAlt className="me-1" /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container my-4">
        {/* Statistik Ringkas */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-subtitle text-muted">Total Tiket</h6>
                    <h3 className="card-title text-primary">{stats.totalDiproses + stats.totalSelesai}</h3>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <FaTicketAlt className="text-primary" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-subtitle text-muted">Dalam Proses</h6>
                    <h3 className="card-title text-warning">{stats.totalDiproses}</h3>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <FaSyncAlt className="text-warning" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-subtitle text-muted">Selesai</h6>
                    <h3 className="card-title text-success">{stats.totalSelesai}</h3>
                  </div>
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <FaCheckCircle className="text-success" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-subtitle text-muted">PIC Aktif</h6>
                    <h3 className="card-title text-info">{stats.picList ? stats.picList.length : 0}</h3>
                  </div>
                  <div className="bg-info bg-opacity-10 p-3 rounded">
                    <FaUserCog className="text-info" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="row g-3 mb-4">
          <div className="col-lg-3 col-md-6">
            <div className="card chart-box border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-bottom-0">
                <h6 className="fw-bold mb-0 text-primary">
                  <FaChartBar className="me-2" />
                  Statistik Status
                </h6>
              </div>
              <div className="card-body">
                <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card chart-box border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-bottom-0">
                <h6 className="fw-bold mb-0 text-primary">
                  <FaUserCog className="me-2" />
                  Tiket per PIC
                </h6>
              </div>
              <div className="card-body">
                <PicChart data={stats.picData} />
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card chart-box border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-bottom-0">
                <h6 className="fw-bold mb-0 text-primary">
                  <FaExclamationTriangle className="me-2" />
                  Case Terbanyak
                </h6>
              </div>
              <div className="card-body">
                {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                  <CaseChart data={stats.caseData}/> :
                  <div className="alert alert-info text-center py-2">Tidak ada data case.</div>
                }
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card chart-box border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-bottom-0">
                <h6 className="fw-bold mb-0 text-primary">
                  <FaCalendarAlt className="me-2" />
                  Statistik Harian
                </h6>
              </div>
              <div className="card-body">
                <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-light">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div className="d-flex align-items-center">
                {getViewIcon()}
                <h5 className="mb-0 ms-2 text-capitalize">
                  Tiket {activeView === 'all' ? 'Semua' : activeView === 'processed' ? 'Diproses' : 'Selesai'}
                  <span className={`badge bg-${getViewColor()} ms-2`}>
                    {activeView === 'all' ? stats.totalDiproses + stats.totalSelesai : 
                     activeView === 'processed' ? stats.totalDiproses : stats.totalSelesai}
                  </span>
                </h5>
              </div>
              
              <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                <div className="btn-group btn-group-sm" role="group">
                  <button 
                    className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <FaTh />
                  </button>
                  <button 
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <FaList />
                  </button>
                </div>
                
                {/* Navigation Tabs */}
                <ul className="nav nav-pills">
                  <li className="nav-item">
                    <button
                      className={`nav-link btn-sm ${activeView === 'all' ? 'active' : ''}`}
                      onClick={() => handleViewChange('all')}
                    >
                      <FaTicketAlt className="me-1" />
                      Semua
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link btn-sm ${activeView === 'processed' ? 'active' : ''}`}
                      onClick={() => handleViewChange('processed')}
                    >
                      <FaSyncAlt className="me-1" />
                      Diproses
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link btn-sm ${activeView === 'completed' ? 'active' : ''}`}
                      onClick={() => handleViewChange('completed')}
                    >
                      <FaCheckCircle className="me-1" />
                      Selesai
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* Filter Panel */}
            <div className="filter-panel card mb-4 border-0 bg-light">
              <div className="card-body">
                <div className="row g-3 align-items-end">
                  <div className="col-lg-4 col-md-6">
                    <label className="form-label fw-semibold">
                      <FaSearch className="me-1" />
                      Cari Tiket
                    </label>
                    <div className="input-group input-group-sm">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Kode, deskripsi, atau user..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                      />
                    </div>
                  </div>

                  <div className="col-lg-2 col-md-6">
                    <label className="form-label fw-semibold">
                      <FaUserCog className="me-1" />
                      PIC
                    </label>
                    <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                      <option value="all">Semua PIC</option>
                      {stats.picList && stats.picList.map(pic => 
                        <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>
                      )}
                    </select>
                  </div>

                  <div className="col-lg-2 col-md-6">
                    <label className="form-label fw-semibold">
                      <FaCalendarAlt className="me-1" />
                      Dari Tanggal
                    </label>
                    <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
                  </div>

                  <div className="col-lg-2 col-md-6">
                    <label className="form-label fw-semibold">
                      <FaCalendarAlt className="me-1" />
                      Sampai Tanggal
                    </label>
                    <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
                  </div>

                  <div className="col-lg-2 col-md-12">
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary btn-sm flex-fill" onClick={handleResetFilters}>
                        <FaFilter className="me-1" />
                        Reset
                      </button>
                      <button className="btn btn-success btn-sm flex-fill" onClick={handleExport}>
                        <FaFileExcel className="me-1"/>
                        Ekspor
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket List/Grid */}
            <div className={`ticket-container ${viewMode === 'grid' ? 'row g-3' : 'd-grid gap-2'}`}>
              {tickets.length > 0 ? tickets.map(ticket => (
                <div key={ticket._id} className={viewMode === 'grid' ? 'col-xl-3 col-lg-4 col-md-6' : ''}>
                  <TicketCard 
                    ticket={ticket} 
                    picList={stats.picList} 
                    refreshData={fetchData} 
                    onImageClick={handleShowImage} 
                    onTextClick={handleShowTextModal}
                    viewMode={viewMode}
                  />
                </div>
              )) : (
                <div className="text-center py-5">
                  <FaExclamationTriangle size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">Tidak ada tiket yang cocok dengan filter</h5>
                  <p className="text-muted">Coba ubah filter atau pencarian Anda</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="text-muted">
                  Menampilkan {tickets.length} tiket
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <button 
                    className="btn btn-outline-primary btn-sm" 
                    onClick={() => setCurrentPage(p => p - 1)} 
                    disabled={currentPage === 1}
                  >
                    Sebelumnya
                  </button>
                  <span className="mx-2 text-muted">
                    Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                  </span>
                  <button 
                    className="btn btn-outline-primary btn-sm" 
                    onClick={() => setCurrentPage(p => p + 1)} 
                    disabled={currentPage === totalPages}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detail Gambar Kendala</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{padding:0}}>
          <img src={selectedImageUrl} alt="Detail Kendala" style={{width:'100%', height:'auto'}}/>
        </Modal.Body>
      </Modal>
      
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaThumbsUp className="me-2" />
            Detail Laporan dari @{selectedTextUser}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="bg-light p-3 rounded">
            <p style={{whiteSpace:'pre-wrap', margin: 0}}>{selectedText}</p>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;