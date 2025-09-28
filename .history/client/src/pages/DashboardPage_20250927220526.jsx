// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle, FaChartBar, FaUserFriends, FaClipboardList, FaCalendarDay } from 'react-icons/fa';

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

  // STYLE: Menambahkan latar belakang modern ke halaman saat komponen dimuat
  useEffect(() => {
    document.body.style.backgroundColor = '#f0f2f5';
    return () => {
      document.body.style.backgroundColor = ''; // Membersihkan style saat komponen di-unmount
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
      
      let statusForApi = 'all';
      if (activeView === 'processed') {
        statusForApi = 'Diproses,On Hold,Menunggu Approval';
      } else if (activeView === 'completed') {
        statusForApi = 'Done';
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: 12, // Anda bisa sesuaikan limit ini agar pas dengan grid (misal 8 atau 12)
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
    const exportParams = new URLSearchParams({
        status: activeView === 'all' ? 'all' : (activeView === 'processed' ? 'Diproses,On Hold,Menunggu Approval' : 'Done'),
        pic: picFilter,
        startDate,
        endDate,
        search: searchQuery,
    }).toString();
    window.location.href = `${API_URL}/tickets/export?${exportParams}`;
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setCurrentPage(1);
  };

  if (loading && !stats) return <div className="d-flex justify-content-center align-items-center vh-100" style={{backgroundColor: '#f0f2f5'}}><h1>Memuat data...</h1></div>;
  if (!stats) return <div className="d-flex justify-content-center align-items-center vh-100" style={{backgroundColor: '#f0f2f5'}}><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  return (
    <>
      <Toaster position="top-center" />
      {/* LAYOUT: Mengubah kontainer menjadi fluid untuk layout yang lebih luas */}
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bolder text-dark">📊 Dashboard Kendala Operasional</h1>
          <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>

        {/* UPDATE: Tampilan Statistik dengan layout Grid dan style Card */}
        <div className="row g-4 mb-4">
          <div className="col-12 col-md-6 col-lg-3">
            <div className="bg-white p-3 rounded-3 shadow-sm h-100">
              <h6 className="text-muted text-uppercase small mb-3"><FaChartBar className="me-2"/>Statistik Pengerjaan</h6>
              <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="bg-white p-3 rounded-3 shadow-sm h-100">
              <h6 className="text-muted text-uppercase small mb-3"><FaUserFriends className="me-2"/>Tiket per PIC</h6>
              <PicChart data={stats.picData} />
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="bg-white p-3 rounded-3 shadow-sm h-100">
              <h6 className="text-muted text-uppercase small mb-3"><FaClipboardList className="me-2"/>Case Terbanyak</h6>
              {stats.caseData && Object.keys(stats.caseData).length > 0 ? 
                <CaseChart data={stats.caseData}/> :
                <div className="alert alert-info text-center m-0">Tidak ada data.</div>
              }
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="bg-white p-3 rounded-3 shadow-sm h-100">
               <h6 className="text-muted text-uppercase small mb-3"><FaCalendarDay className="me-2"/>Statistik Harian</h6>
               <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
            </div>
          </div>
        </div>
        
        {/* UPDATE: Panel utama sekarang memiliki style Card */}
        <div className="bg-white p-4 rounded-3 shadow-sm">
            <div className="view-selector-wrapper d-flex justify-content-center border-bottom mb-4 pb-3">
              <ul className="nav nav-pills nav-fill gap-2">
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('all')}>
                    <FaTicketAlt /> Semua Tiket
                    <span className="badge rounded-pill bg-secondary">{stats.totalDiproses + stats.totalSelesai}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('processed')}>
                    <FaSyncAlt /> Tiket Diproses
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
            
            <div className="filter-panel d-flex flex-wrap align-items-end gap-3 mb-4">
              <div className="filter-group flex-grow-1">
                <label className="form-label small">Cari Tiket (Kode, Deskripsi, User)</label>
                <div className="input-group">
                  <span className="input-group-text"><FaSearch/></span>
                  <input type="text" className="form-control" placeholder="Ketik untuk mencari..." value={searchQuery} onChange={handleSearchChange} />
                </div>
              </div>

              <div className="filter-group">
                <label className="form-label small">PIC</label>
                <select className="form-select" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Semua PIC</option>
                  {stats.picList?.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label className="form-label small">Dari Tanggal</label>
                <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/>
              </div>
              <div className="filter-group">
                <label className="form-label small">Sampai Tanggal</label>
                <input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/>
              </div>

              <div className="filter-group d-flex gap-2">
                <button className="btn btn-secondary" onClick={handleResetFilters}>Reset</button>
                <button className="btn btn-success" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor</button>
              </div>
            </div>

            {/* MAJOR CHANGE: Mengubah Ticket List menjadi Grid yang responsif */}
            <div className="row g-4">
              {tickets.length > 0 ? tickets.map(ticket => (
                <div key={ticket._id} className="col-12 col-sm-6 col-lg-4 col-xl-3 d-flex align-items-stretch">
                  <TicketCard ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                </div>
              )) : (
                <div className="col-12">
                  <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter.</div>
                </div>
              )}
            </div>

            {totalPages > 1 &&
              <div className="pagination mt-4 d-flex justify-content-center align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Sebelumnya</button>
                <span className="text-muted">Halaman {currentPage} dari {totalPages}</span>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Berikutnya</button>
              </div>
            }
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