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

  const handleLogout = () => { localStorage.removeItem('token'); window.location.href = '/login'; };
  const handleShowImage = (imageUrl) => { setSelectedImageUrl(imageUrl); setShowImageModal(true); };
  const handleCloseImage = () => setShowImageModal(false);
  const handleShowTextModal = (ticket) => { setSelectedText(ticket.text); setSelectedTextUser(ticket.username); setShowTextModal(true); };
  const handleCloseTextModal = () => setShowTextModal(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let statusForApi = 'all';
      if (activeView === 'processed') statusForApi = 'Diproses,On Hold,Menunggu Approval';
      else if (activeView === 'completed') statusForApi = 'Done';
      
      const params = new URLSearchParams({ page: currentPage, limit: 9, status: statusForApi, pic: picFilter, startDate, endDate, search: searchQuery });
      const res = await axios.get(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` }, params });
      
      setTickets(res.data.tickets);
      setTotalPages(res.data.totalPages);
      setStats(res.data.stats);
    } catch (err) {
      if (err.response && err.response.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  }, [currentPage, picFilter, startDate, endDate, searchQuery, activeView]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResetFilters = () => { setPicFilter('all'); setStartDate(''); setEndDate(''); setSearchQuery(''); setCurrentPage(1); };
  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };
  const handleExport = () => { window.location.href = `${API_URL}/tickets/export`; };
  const handleViewChange = (view) => { setActiveView(view); setCurrentPage(1); };

  if (loading && !stats) {
     return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{backgroundColor: '#f8f9fa'}}>
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Memuat...</span></div>
      </div>
    );
  }
  if (!stats) return <div className="container my-5 alert alert-danger"><h1>Gagal memuat data.</h1></div>;

  const totalTickets = (stats.totalDiproses || 0) + (stats.totalSelesai || 0) + (stats.totalMenungguApproval || 0);
  const totalProcessed = (stats.totalDiproses || 0) + (stats.totalMenungguApproval || 0);

  return (
    <>
      <Toaster position="top-center" />
      <div style={{ backgroundColor: '#f8f9fa' }}>
        <div className="container py-4">
          
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-0">📊 Dasbor Kendala Operasional</h1>
              <p className="mb-0 text-muted">Monitor dan kelola semua tiket kendala secara real-time.</p>
            </div>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
          </div>

          {/* --- KARTU STATISTIK UTAMA --- */}
          <div className="row g-4 mb-4">
            <div className="col-lg-3 col-md-6"><div className="card border-0 shadow-sm h-100"><div className="card-body d-flex align-items-center"><div className="fs-1 text-primary me-3"><FaTasks /></div><div><h2 className="mb-0 fw-bold">{totalTickets}</h2><p className="mb-0 text-muted">Total Tiket</p></div></div></div></div>
            <div className="col-lg-3 col-md-6"><div className="card border-0 shadow-sm h-100"><div className="card-body d-flex align-items-center"><div className="fs-1 text-warning me-3"><FaSpinner /></div><div><h2 className="mb-0 fw-bold">{stats.totalDiproses || 0}</h2><p className="mb-0 text-muted">Diproses</p></div></div></div></div>
            <div className="col-lg-3 col-md-6"><div className="card border-0 shadow-sm h-100"><div className="card-body d-flex align-items-center"><div className="fs-1 text-info me-3"><FaHourglassHalf /></div><div><h2 className="mb-0 fw-bold">{stats.totalMenungguApproval || 0}</h2><p className="mb-0 text-muted">Menunggu Approval</p></div></div></div></div>
            <div className="col-lg-3 col-md-6"><div className="card border-0 shadow-sm h-100"><div className="card-body d-flex align-items-center"><div className="fs-1 text-success me-3"><FaCheckDouble /></div><div><h2 className="mb-0 fw-bold">{stats.totalSelesai || 0}</h2><p className="mb-0 text-muted">Selesai</p></div></div></div></div>
          </div>
          
          {/* --- AREA CHARTS --- */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white fw-bold">Statistik Pengerjaan</div><div className="card-body"><StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} /></div></div></div>
            <div className="col-lg-6"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white fw-bold">Distribusi per PIC</div><div className="card-body"><PicChart data={stats.picData} /></div></div></div>
          </div>

          {/* --- AREA UTAMA (FILTER & TIKET LIST) --- */}
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex justify-content-center border-bottom mb-4 pb-3">
                <ul className="nav nav-pills nav-fill gap-2 p-1 bg-light rounded-pill">
                  <li className="nav-item"><button className={`nav-link d-flex align-items-center gap-2 ${activeView === 'all' ? 'active' : ''}`} onClick={() => handleViewChange('all')}><FaTicketAlt /> Semua <span className="badge rounded-pill bg-secondary">{totalTickets}</span></button></li>
                  <li className="nav-item"><button className={`nav-link d-flex align-items-center gap-2 ${activeView === 'processed' ? 'active' : ''}`} onClick={() => handleViewChange('processed')}><FaSyncAlt /> Proses <span className="badge rounded-pill bg-warning text-dark">{totalProcessed}</span></button></li>
                  <li className="nav-item"><button className={`nav-link d-flex align-items-center gap-2 ${activeView === 'completed' ? 'active' : ''}`} onClick={() => handleViewChange('completed')}><FaCheckCircle /> Selesai <span className="badge rounded-pill bg-success">{stats.totalSelesai || 0}</span></button></li>
                </ul>
              </div>
              
              <div className="row g-3 align-items-end mb-4">
                <div className="col-lg-4 col-md-12"><label className="form-label">Cari Tiket</label><div className="input-group"><span className="input-group-text"><FaSearch/></span><input type="text" className="form-control" placeholder="Kode, deskripsi, user..." value={searchQuery} onChange={handleSearchChange}/></div></div>
                <div className="col-lg-2 col-md-4"><label className="form-label">PIC</label><select className="form-select" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}><option value="all">Semua PIC</option>{stats.picList && stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ada' : pic.toUpperCase()}</option>)}</select></div>
                <div className="col-lg-2 col-md-4"><label className="form-label">Dari</label><input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}/></div>
                <div className="col-lg-2 col-md-4"><label className="form-label">Sampai</label><input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}/></div>
                <div className="col-lg-2 col-md-12 d-flex gap-2"><button className="btn btn-secondary w-100" onClick={handleResetFilters}>Reset</button><button className="btn btn-success w-100" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor</button></div>
              </div>

              {/* --- GRID TIKET YANG RAPI --- */}
              <div className="row g-4">
                {tickets.length > 0 ? tickets.map(ticket => (
                  <div key={ticket._id} className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch">
                    <TicketCard ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
                  </div>
                )) : (
                  <div className="col-12"><div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter.</div></div>
                )}
              </div>

              {totalPages > 1 &&
                <div className="pagination mt-4 d-flex justify-content-center align-items-center gap-2">
                  <button className="btn btn-outline-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Sebelumnya</button>
                  <span className="text-muted">Halaman {currentPage} dari {totalPages}</span>
                  <button className="btn btn-outline-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Berikutnya</button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body className="p-0"><img src={selectedImageUrl} alt="Detail Kendala" className="img-fluid" /></Modal.Body>
      </Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton><Modal.Title>Detail dari @{selectedTextUser}</Modal.Title></Modal.Header>
        <Modal.Body><p style={{whiteSpace:'pre-wrap'}}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;