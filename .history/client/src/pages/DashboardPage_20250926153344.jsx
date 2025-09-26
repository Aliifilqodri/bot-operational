import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt } from 'react-icons/fa';

import api from '../api'; // Gunakan instance API yang sudah dikonfigurasi
import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';

function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // State untuk pesan error

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [picFilter, setPicFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ticketsPerPage = 12; // Sesuaikan dengan limit di backend

  // Modal state
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

  // Fetch tickets & stats dari server
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Parameter untuk dikirim ke API
      const params = {
        page: currentPage,
        limit: ticketsPerPage,
        status: statusFilter,
        pic: picFilter,
        startDate,
        endDate,
      };

      // Gunakan 'api' yang sudah menyertakan token secara otomatis
      const res = await api.get('/tickets', { params });

      setTickets(res.data.tickets);
      setStats(res.data.stats);
      setTotalPages(res.data.totalPages);
      setError(''); // Hapus error jika berhasil
    } catch (err) {
      console.error('Gagal fetch data:', err);
      setError('Gagal memuat data. Mungkin sesi Anda telah berakhir, silakan login kembali.');
      setStats(null); // Reset stats jika gagal
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, picFilter, startDate, endDate]); // Dependency ditambahkan

  // Trigger fetch data saat filter atau halaman berubah
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setStatusFilter('all');
    setPicFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1); // Kembali ke halaman pertama
  };
  
  const handleExport = async () => {
    try {
        const response = await api.get('/tickets/export', {
            responseType: 'blob', // Penting untuk menangani file
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Daftar_Kendala.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        console.error('Gagal mengekspor data:', err);
        // Bisa tambahkan toast error di sini
    }
  };


  if (loading && !stats) return <div className="container my-5"><h1>Memuat data...</h1></div>;
  if (error) return <div className="container my-5"><h1 className="text-danger">{error}</h1></div>;
  if (!stats) return <div className="container my-5"><h1>Gagal memuat data statistik.</h1></div>;

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

        <div className="dashboard-wrapper">
            {/* Charts */}
            <div className="chart-box panel">
              <h6 className="fw-bold">Statistik Kendala</h6>
              <StatusChart data={{ statusCounts: stats.statusCounts }} statusList={stats.statusList}/>
            </div>
            <div className="chart-box">
              <h6 className="fw-bold">Tiket per Penanggung Jawab</h6>
              <PicChart data={stats.picData} />
            </div>
            <div className="chart-box">
              <h6 className="fw-bold">Case Terbanyak</h6>
              {stats.caseData && Object.keys(stats.caseData).length > 0 ?
                <CaseChart data={stats.caseData} /> :
                <div className="alert alert-info text-center">Tidak ada data case.</div>
              }
            </div>
            <div className="chart-box">
                <h6 className="fw-bold">Statistik Harian (Hari Ini vs Kemarin)</h6>
                <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />
            </div>


          <div style={{ gridColumn: '1 / -1' }}>
            {/* Filter Panel */}
            <div className="filter-panel d-flex flex-wrap align-items-end gap-2">
                {/* Status Filter */}
                <div className="filter-group">
                    <label>Status Tiket</label>
                    <select className="form-select form-select-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                        <option value="all">Semua Status</option>
                        {stats.statusList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* PIC Filter */}
                <div className="filter-group">
                    <label>PIC</label>
                    <select className="form-select form-select-sm" value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                        <option value="all">Semua PIC</option>
                        {stats.picList.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Belum Ditentukan' : pic.toUpperCase()}</option>)}
                    </select>
                </div>
              
              {/* Date Filter */}
              <div className="filter-group">
                <label>Dari Tanggal</label>
                <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} />
              </div>
              <div className="filter-group">
                <label>Sampai Tanggal</label>
                <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} />
              </div>

              {/* Reset & Export */}
              <div className="filter-group ms-auto d-flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>Reset</button>
                <button className="btn btn-success btn-sm" onClick={handleExport}><FaFileExcel className="me-1" /> Ekspor</button>
              </div>
            </div>

            {/* Tickets */}
            <div className="ticket-list mt-3">
              {tickets.length > 0 ? tickets.map(ticket => (
                <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} statusList={stats.statusList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal} />
              )) : <div className="alert alert-warning text-center">Tidak ada kendala yang cocok dengan filter.</div>}
            </div>

            {/* Pagination */}
            {totalPages > 1 &&
              <div className="pagination mt-3 d-flex justify-content-center gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
                <span className="align-self-center">Hal {currentPage} dari {totalPages}</span>
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
              </div>
            }
          </div>
        </div>
      </div>

      {/* Modal Gambar */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{ padding: 0 }}>
          <img src={selectedImageUrl} alt="Detail Kendala" style={{ width: '100%', height: 'auto' }} />
        </Modal.Body>
      </Modal>

      {/* Modal Teks */}
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail Kendala dari @{selectedTextUser}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ whiteSpace: 'pre-wrap' }}>{selectedText}</p>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;