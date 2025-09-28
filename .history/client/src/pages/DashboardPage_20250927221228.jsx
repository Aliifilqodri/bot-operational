// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle, FaFilter, FaRedo } from 'react-icons/fa';

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
    if (currentPage === 1) {
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
        limit: 9, // Diubah menjadi 9 untuk grid 3 kolom yang lebih rapi
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

  if (loading && !stats) {
    return (
        <div className="d-flex justify-content-center align-items-center" style={{height: "100vh"}}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Memuat data...</span>
            </div>
            <h3 className="ms-3">Memuat data...</h3>
        </div>
    );
  }

  if (!stats) return <div className="container my-5 text-center"><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
        <div className="container-fluid p-4">

          {/* ====== HEADER ====== */}
          <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <h1 className="h3 mb-0 text-dark fw-bold">📊 Dashboard Kendala Operasional</h1>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </header>

          <main>
            {/* ====== STATS CARDS ====== */}
            <section className="row mb-4">
              <div className="col-md-6 col-xl-3 mb-3">
                <div className="card shadow-sm border-0 h-100" style={{borderLeft: '5px solid #0d6efd'}}>
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="text-primary text-uppercase fw-bold small">Total Tiket</h6>
                        <h2 className="fw-bolder mb-0">{stats.totalDiproses + stats.totalSelesai}</h2>
                      </div>
                      <FaTicketAlt className="fa-2x text-muted"/>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-xl-3 mb-3">
                <div className="card shadow-sm border-0 h-100" style={{borderLeft: '5px solid #ffc107'}}>
                  <div className="card-body">
                     <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="text-warning text-uppercase fw-bold small">Tiket Diproses</h6>
                        <h2 className="fw-bolder mb-0">{stats.totalDiproses}</h2>
                      </div>
                      <FaSyncAlt className="fa-2x text-muted"/>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-xl-3 mb-3">
                <div className="card shadow-sm border-0 h-100" style={{borderLeft: '5px solid #198754'}}>
                   <div className="card-body">
                     <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="text-success text-uppercase fw-bold small">Tiket Selesai</h6>
                        <h2 className="fw-bolder mb-0">{stats.totalSelesai}</h2>
                      </div>
                      <FaCheckCircle className="fa-2x text-muted"/>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-xl-3 mb-3">
                <div className="card shadow-sm border-0 h-100" style={{borderLeft: '5px solid #6c757d'}}>
                   <div className="card-body">
                     <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="text-secondary text-uppercase fw-bold small">Tiket Hari Ini</h6>
                        <h2 className="fw-bolder mb-0">{stats.statsToday.total}</h2>
                      </div>
                      <i className="bi bi-calendar-day fa-2x text-muted"></i>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            
            {/* ====== CHARTS ====== */}
            <section className="row mb-4">
              <div className="col-xl-6 mb-4">
                <div className="card shadow-sm h-100 border-0">
                  <div className="card-header bg-white py-3">
                    <h6 className="m-0 fw-bold text-primary">Status Pengerjaan Kendala</h6>
                  </div>
                  <div className="card-body d-flex align-items-center justify-content-center">
                    <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
                  </div>
                </div>
              </div>
              <div className="col-xl-6 mb-4">
                <div className="card shadow-sm h-100 border-0">
                  <div className="card-header bg-white py-3">
                    <h6 className="m-0 fw-bold text-primary">Distribusi Tiket per PIC</h6>
                  </div>
                   <div className="card-body d-flex align-items-center justify-content-center">
                    <PicChart data={stats.picData} />
                  </div>
                </div>
              </div>
              <div className="col-xl-6 mb-4">
                <div className="card shadow-sm h-100 border-0">
                   <div className="card-header bg-white py-3">
                    <h6 className="m-0 fw-bold text-primary">Jenis Case Terbanyak</h6>
                  </div>
                   <div className="card-body d-flex align-items-center justify-content-center">
                    {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                      <CaseChart data={stats.caseData}/> :
                      <div className="alert alert-info text-center w-100">Tidak ada data case.</div>
                    }
                  </div>
                </div>
              </div>
              <div className="col-xl-6 mb-4">
                <div className="card shadow-sm h-100 border-0">
                   <div className="card-header bg-white py-3">
                    <h6 className="m-0 fw-bold text-primary">Perbandingan Statistik Harian</h6>
                  </div>
                  <div className="card-body d-flex align-items-center justify-content-center">
                    <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
                  </div>
                </div>
              </div>
            </section>

            {/* ====== TICKET LIST & FILTERS ====== */}
            <section className="card shadow-sm border-0">
              <div className="card-header bg-white p-3 border-bottom-0">
                <ul className="nav nav-pills nav-fill gap-2">
                  <li className="nav-item">
                    <button className={`nav-link fw-bold d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active' : ''}`} onClick={() => handleViewChange('all')}>
                      <FaTicketAlt /> Semua Tiket <span className="badge rounded-pill bg-dark">{stats.totalDiproses + stats.totalSelesai}</span>
                    </button>
                  </li>
                  <li className="nav-item">
                    <button className={`nav-link fw-bold d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active' : ''}`} onClick={() => handleViewChange('processed')}>
                      <FaSyncAlt /> Tiket Diproses <span className="badge rounded-pill bg-dark">{stats.totalDiproses}</span>
                    </button>
                  </li>
                  <li className="nav-item">
                    <button className={`nav-link fw-bold d-flex align-items-center justify-content-center gap-2 ${activeView === 'completed' ? 'active' : ''}`} onClick={() => handleViewChange('completed')}>
                      <FaCheckCircle /> Tiket Selesai <span className="badge rounded-pill bg-dark">{stats.totalSelesai}</span>
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body bg-light">
                 <div className="d-flex flex-wrap align-items-center gap-3">
                  <div className="flex-grow-1">
                    <div className="input-group">
                      <span className="input-group-text"><FaSearch/></span>
                      <input type="text" className="form-control" placeholder="Cari berdasarkan Kode, Deskripsi, atau User..." value={searchQuery} onChange={handleSearchChange} />
                    </div>
                  </div>
                  <select className="form-select" style={{maxWidth: '200px'}} value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="all">Semua PIC</option>
                    {stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                  </select>
                  <input type="date" className="form-control" style={{maxWidth: '180px'}} value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
                  <input type="date" className="form-control" style={{maxWidth: '180px'}} value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
                  <div className="d-flex gap-2">
                    <button className="btn btn-secondary" onClick={handleResetFilters} title="Reset Filter"><FaRedo /></button>
                    <button className="btn btn-success d-flex align-items-center gap-2" onClick={handleExport}><FaFileExcel/> Ekspor</button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {loading ? (
                    <div className="text-center p-5"><div className="spinner-border"></div></div>
                ) : (
                    <div className="row g-4">
                    {tickets.length > 0 ? tickets.map(ticket => (
                        <div key={ticket._id} className="col-12 col-md-6 col-xl-4">
                            <TicketCard ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                        </div>
                    )) : (
                        <div className="col-12">
                            <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter.</div>
                        </div>
                    )}
                    </div>
                )}
              </div>
              {totalPages > 1 &&
                <div className="card-footer bg-white d-flex justify-content-center align-items-center gap-2 py-3">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                  <span className="fw-bold">Halaman {currentPage} dari {totalPages}</span>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
                </div>
              }
            </section>
          </main>

        </div>
      </div>

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