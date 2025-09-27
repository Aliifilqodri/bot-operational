import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { 
  FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt, FaSyncAlt, FaCheckCircle, 
  FaTasks, FaSpinner, FaHourglassHalf, FaCheckDouble 
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
        // Menunggu Approval dipisah, jadi tidak lagi di sini
        statusForApi = 'Diproses,On Hold';
      } else if (activeView === 'completed') {
        statusForApi = 'Done';
      } else if (activeView === 'approval') {
        // Status baru untuk tab Menunggu Approval
        statusForApi = 'Menunggu Approval';
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
    // Tambahkan parameter filter ke URL ekspor agar data yang diekspor sesuai
    const params = new URLSearchParams({
      status: activeView === 'all' ? 'all' : (activeView === 'approval' ? 'Menunggu Approval' : (activeView === 'processed' ? 'Diproses,On Hold' : 'Done')),
      pic: picFilter,
      startDate,
      endDate,
      search: searchQuery,
    });
    window.location.href = `${API_URL}/tickets/export?${params.toString()}`;
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setCurrentPage(1);
  };

  if (loading && !stats) {
     return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{backgroundColor: '#f8f9fa'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Memuat data...</span>
        </div>
        <h3 className="ms-3">Memuat data...</h3>
      </div>
    );
  }

  if (!stats) return <div className="container my-5 alert alert-danger"><h1>Gagal memuat data. Coba refresh halaman.</h1></div>;

  // Asumsi stats dari API kini memiliki totalMenungguApproval dan totalHanyaDiproses
  const totalTickets = stats.totalHanyaDiproses + stats.totalMenungguApproval + stats.totalSelesai;
  
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div style={{ backgroundColor: '#f8f9fa' }}>
        <div className="container-fluid p-4">

          {/* --- HEADER --- */}
          <div className="d-flex justify-content-between align-items-center mb-4 px-3">
            <h1 className="h3 mb-0">📊 Dasbor Kendala Operasional</h1>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>

          {/* --- STATISTIK UTAMA (KPI CARDS) --- */}
          <div className="row g-4 mb-4">
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="fs-1 text-primary me-3"><FaTasks /></div>
                  <div>
                    <h2 className="mb-0 fw-bold">{totalTickets}</h2>
                    <p className="mb-0 text-muted">Total Tiket</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="fs-1 text-warning me-3"><FaSpinner /></div>
                  <div>
                    <h2 className="mb-0 fw-bold">{stats.totalHanyaDiproses || 0}</h2>
                    <p className="mb-0 text-muted">Sedang Diproses</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="fs-1 text-info me-3"><FaHourglassHalf /></div>
                  <div>
                    <h2 className="mb-0 fw-bold">{stats.totalMenungguApproval || 0}</h2>
                    <p className="mb-0 text-muted">Menunggu Approval</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="fs-1 text-success me-3"><FaCheckDouble /></div>
                  <div>
                    <h2 className="mb-0 fw-bold">{stats.totalSelesai}</h2>
                    <p className="mb-0 text-muted">Tiket Selesai</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- CHARTS --- */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white fw-bold">Pengerjaan Kendala</div><div className="card-body"><StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} /></div></div></div>
            <div className="col-lg-6"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white fw-bold">Distribusi per PIC</div><div className="card-body"><PicChart data={stats.picData} /></div></div></div>
            <div className="col-lg-6"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white fw-bold">Kategori Case Terbanyak</div><div className="card-body">{stats.caseData && Object.keys(stats.caseData).length > 0 ? <CaseChart data={stats.caseData}/> : <div className="alert alert-light text-center m-0">Tidak ada data case.</div>}</div></div></div>
            <div className="col-lg-6"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white fw-bold">Performa Harian</div><div className="card-body"><DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} /></div></div></div>
          </div>

          {/* --- AREA UTAMA TIKET --- */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {/* --- TABS --- */}
              <div className="d-flex justify-content-center border-bottom mb-4 pb-3">
                <ul className="nav nav-pills nav-fill gap-2 p-1 bg-light rounded-pill">
                  <li className="nav-item"><button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'all' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('all')}><FaTicketAlt /> Semua <span className="badge rounded-pill bg-secondary">{totalTickets}</span></button></li>
                  <li className="nav-item"><button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'processed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('processed')}><FaSyncAlt /> Diproses <span className="badge rounded-pill bg-warning text-dark">{stats.totalHanyaDiproses || 0}</span></button></li>
                  <li className="nav-item"><button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'approval' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('approval')}><FaHourglassHalf /> Approval <span className="badge rounded-pill bg-info text-dark">{stats.totalMenungguApproval || 0}</span></button></li>
                  <li className="nav-item"><button className={`nav-link d-flex align-items-center justify-content-center gap-2 ${activeView === 'completed' ? 'active shadow-sm' : ''}`} onClick={() => handleViewChange('completed')}><FaCheckCircle /> Selesai <span className="badge rounded-pill bg-success">{stats.totalSelesai}</span></button></li>
                </ul>
              </div>
              
              {/* --- FILTERS --- */}
              <div className="card border-light mb-4">
                <div className="card-body row g-3 align-items-end">
                  <div className="col-lg-4 col-md-12"><label className="form-label">Cari Tiket</label><div className="input-group"><span className="input-group-text"><FaSearch/></span><input type="text" className="form-control" placeholder="Kode, Deskripsi, User..." value={searchQuery} onChange={handleSearchChange}/></div></div>
                  <div className="col-lg-2 col-md-4"><label className="form-label">PIC</label><select className="form-select" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}><option value="all">Semua PIC</option>{stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}</select></div>
                  <div className="col-lg-2 col-md-4"><label className="form-label">Dari Tanggal</label><input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/></div>
                  <div className="col-lg-2 col-md-4"><label className="form-label">Sampai</label><input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/></div>
                  <div className="col-lg-2 col-md-12 d-flex gap-2"><button className="btn btn-secondary w-100" onClick={handleResetFilters}>Reset</button><button className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-1" onClick={handleExport}><FaFileExcel/> Ekspor</button></div>
                </div>
              </div>

              {/* --- TICKET GRID --- */}
              <div className="row g-4">
                {tickets.length > 0 ? tickets.map(ticket => (
                  <div key={ticket._id} className="col-12 col-lg-6 col-xxl-4 d-flex">
                    <TicketCard ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                  </div>
                )) : (<div className="col-12"><div className="alert alert-light text-center">Tidak ada kendala yang cocok dengan filter.</div></div>)}
              </div>

              {/* --- PAGINATION --- */}
              {totalPages > 1 &&
                <div className="pagination mt-4 d-flex justify-content-center align-items-center gap-2">
                  <button className="btn btn-outline-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Sebelumnya</button>
                  <span className="text-muted">Halaman {currentPage} dari {totalPages}</span>
                  <button className="btn btn-outline-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Berikutnya</button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg"><Modal.Body className="p-0"><img src={selectedImageUrl} alt="Detail Kendala" className="img-fluid" /></Modal.Body></Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered><Modal.Header closeButton><Modal.Title>Detail dari @{selectedTextUser}</Modal.Title></Modal.Header><Modal.Body><p style={{whiteSpace:'pre-wrap'}}>{selectedText}</p></Modal.Body></Modal>
    </>
  );
}

export default DashboardPage;