// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle, FaRedo } from 'react-icons/fa';

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
      if (activeView === 'processed') statusForApi = 'Diproses,On Hold,Menunggu Approval';
      else if (activeView === 'completed') statusForApi = 'Done';
      else statusForApi = 'all';

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
      if (err.response && err.response.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  }, [currentPage, picFilter, startDate, endDate, searchQuery, activeView]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  if (loading && !stats) return <div className="container my-5 text-center"><h2>🔄 Memuat data...</h2></div>;
  if (!stats) return <div className="container my-5 text-center"><h2>⚠️ Gagal memuat data. Refresh halaman.</h2></div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="container my-5">
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 style={{ fontWeight: '700', color: '#0d6efd' }}>📊 Dashboard Kendala Operational</h1>
          <button className="btn btn-danger d-flex align-items-center gap-2" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>

        {/* CHARTS */}
        <div className="dashboard-wrapper row g-3">
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm p-3 h-100">
              <h6 className="fw-bold">Status Tiket</h6>
              <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm p-3 h-100">
              <h6 className="fw-bold">Tiket per PIC</h6>
              <PicChart data={stats.picData} />
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm p-3 h-100">
              <h6 className="fw-bold">Case Terbanyak</h6>
              {stats.caseData && Object.keys(stats.caseData).length > 0 ? <CaseChart data={stats.caseData}/> :
              <div className="alert alert-info text-center mb-0">Tidak ada data case.</div>}
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm p-3 h-100">
              <h6 className="fw-bold">Statistik Harian</h6>
              <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
            </div>
          </div>
        </div>

        {/* NAVIGASI TAB & FILTER */}
        <div className="card shadow-sm mt-4 p-3">
          {/* TAB NAV */}
          <div className="view-selector-wrapper d-flex justify-content-center mb-3">
            <ul className="nav nav-pills nav-fill gap-2 w-100">
              <li className="nav-item">
                <button
                  className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm bg-primary text-white' : ''}`}
                  onClick={() => handleViewChange('all')}
                >
                  <FaTicketAlt /> Semua Tiket
                  <span className="badge bg-light text-dark">{stats.totalDiproses + stats.totalSelesai}</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm bg-warning text-dark' : ''}`}
                  onClick={() => handleViewChange('processed')}
                >
                  <FaSyncAlt /> Tiket Diproses
                  <span className="badge bg-light text-dark">{stats.totalDiproses}</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'completed' ? 'active shadow-sm bg-success text-white' : ''}`}
                  onClick={() => handleViewChange('completed')}
                >
                  <FaCheckCircle /> Tiket Selesai
                  <span className="badge bg-light text-dark">{stats.totalSelesai}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* FILTER PANEL */}
          <div className="filter-panel row g-3 align-items-end mb-3">
            <div className="col-md-4">
              <label>Cari Tiket</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text"><FaSearch /></span>
                <input type="text" className="form-control" placeholder="Kode, Deskripsi, User..." value={searchQuery} onChange={handleSearchChange} />
              </div>
            </div>

            <div className="col-md-2">
              <label>PIC</label>
              <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">Semua PIC</option>
                {stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="col-md-2">
              <label>Dari Tanggal</label>
              <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} />
            </div>

            <div className="col-md-2">
              <label>Sampai Tanggal</label>
              <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} />
            </div>

            <div className="col-md-2 d-flex gap-2">
              <button className="btn btn-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1" onClick={handleResetFilters}><FaRedo /> Reset</button>
              <button className="btn btn-success btn-sm w-100 d-flex align-items-center justify-content-center gap-1" onClick={handleExport}><FaFileExcel /> Ekspor</button>
            </div>
          </div>

          {/* LIST TIKET */}
          <div className="ticket-list row g-3">
            {tickets.length > 0 ? tickets.map(ticket => (
              <div key={ticket._id} className="col-md-6 col-lg-4">
                <TicketCard ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
              </div>
            )) : <div className="alert alert-warning text-center">Tidak ada kendala sesuai filter.</div>}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 &&
            <div className="pagination d-flex justify-content-center align-items-center gap-3 mt-4">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
              <span>Halaman {currentPage} dari {totalPages}</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
            </div>
          }
        </div>
      </div>

      {/* MODAL IMAGE */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{padding:0}}>
          <img src={selectedImageUrl} alt="Detail Kendala" style={{width:'100%', height:'auto'}}/>
        </Modal.Body>
      </Modal>

      {/* MODAL TEKS */}
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail dari @{selectedTextUser}</Modal.Title>
        </Modal.Header>
        <Modal.Body><p style={{whiteSpace:'pre-wrap'}}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;
