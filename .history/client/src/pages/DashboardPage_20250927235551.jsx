// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
// --- PENAMBAHAN: Import ikon baru untuk navigasi tab ---
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

  if (loading && !stats) return <div className="container my-5"><h1>Memuat data...</h1></div>;
  if (!stats) return <div className="container my-5"><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="container my-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1>📊 Dashboard Kendala Operational</h1>
          <button className="btn btn-danger" onClick={handleLogout}>
            <FaSignOutAlt className="me-1" /> Logout
          </button>
        </div>

        {/* --- UCAPAN SELAMAT DATANG DAN SEMANGAT --- */}
        <div className="mb-4">
          <p className="mb-0">Selamat datang! Semangat menyelesaikan kendala hari ini 💪😄</p>
        </div>

        <div className="dashboard-wrapper">
          <div className="chart-box panel">
             <h6 className="fw-bold">Status Ticket</h6>
             <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
          </div>
          <div className="chart-box">
             <h6 className="fw-bold">Tiket per PIC</h6>
             <PicChart data={stats.picData} />
          </div>
          <div className="chart-box">
              <h6 className="fw-bold">Case Terbanyak</h6>
              {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                <CaseChart data={stats.caseData}/> :
                <div className="alert alert-info text-center">Tidak ada data case.</div>
              }
          </div>
          <div className="chart-box">
             <h6 className="fw-bold">Statistik Harian</h6>
             <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
           
            {/* --- PERUBAHAN TAMPILAN NAVIGASI TAB --- */}
            <div className="view-selector-wrapper d-flex justify-content-center border-bottom mb-4 pb-3">
              <ul className="nav nav-pills nav-fill gap-2">
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm' : ''}`}
                    onClick={() => handleViewChange('all')}
                  >
                    <FaTicketAlt />
                    Semua Tiket
                    <span className="badge rounded-pill bg-secondary">{stats ? stats.totalDiproses + stats.totalSelesai : '...'}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm' : ''}`}
                    onClick={() => handleViewChange('processed')}
                  >
                    <FaSyncAlt />
                    Tiket Diproses
                    <span className="badge rounded-pill bg-warning text-dark">{stats ? stats.totalDiproses : '...'}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'completed' ? 'active shadow-sm' : ''}`}
                    onClick={() => handleViewChange('completed')}
                  >
                    <FaCheckCircle />
                    Tiket Selesai
                    <span className="badge rounded-pill bg-success">{stats ? stats.totalSelesai : '...'}</span>
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="filter-panel d-flex flex-wrap align-items-end gap-3 p-3 mb-3">
              <div className="filter-group flex-grow-1">
                <label>Cari Tiket (Kode, Deskripsi, User)</label>
                <div className="input-group">
                  <span className="input-group-text"><FaSearch/></span>
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="Ketik untuk mencari..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>PIC</label>
                <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Semua PIC</option>
                  {stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Dari Tanggal</label>
                <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
              </div>
              <div className="filter-group">
                <label>Sampai Tanggal</label>
                <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
              </div>

              <div className="filter-group d-flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>Reset Filter</button>
                <button className="btn btn-success btn-sm" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor</button>
              </div>
            </div>

            <div className="ticket-list mt-3">
              {tickets.length > 0 ? tickets.map(ticket => (
                <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
              )) : <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter.</div>}
            </div>

            {totalPages > 1 &&
              <div className="pagination mt-3 d-flex justify-content-center gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                <span className="align-self-center">Halaman {currentPage} dari {totalPages}</span>
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
              </div>
            }
          </div>
        </div>
      </div>

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
