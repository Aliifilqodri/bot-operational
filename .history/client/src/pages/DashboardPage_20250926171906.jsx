// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { Modal, Tabs, Tab } from 'react-bootstrap';
import { FaFileExcel, FaSignOutAlt } from 'react-icons/fa';

import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';

const API_URL = 'http://localhost:3000/api/tickets';

function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');
  const [picFilter, setPicFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 10;

  // Modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextUser, setSelectedTextUser] = useState('');

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token'); // hapus JWT
    window.location.href = '/login'; // redirect ke login
  };

  const handleShowImage = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };
  const handleCloseImage = () => {
    setShowImageModal(false);
    setSelectedImageUrl('');
  };

  const handleShowTextModal = (ticket) => {
    setSelectedText(ticket.text);
    setSelectedTextUser(ticket.username);
    setShowTextModal(true);
  };
  const handleCloseTextModal = () => {
    setShowTextModal(false);
    setSelectedText('');
    setSelectedTextUser('');
  };

  // Fetch tickets & stats
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.tickets);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Gagal fetch data:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh tiap 30 detik
    return () => clearInterval(interval);
  }, [fetchData]);

  // Reset filter
  const handleResetFilters = () => {
    setStatusFilter('all');
    setPicFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Filtering
  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
    const picMatch = picFilter === 'all' || ticket.pic === picFilter;

    let dateMatch = true;
    const ticketDate = new Date(ticket.createdAt);
    ticketDate.setHours(0,0,0,0);

    if(startDate){
      const start = new Date(startDate); start.setHours(0,0,0,0);
      if(ticketDate < start) dateMatch = false;
    }
    if(endDate){
      const end = new Date(endDate); end.setHours(0,0,0,0);
      if(ticketDate > end) dateMatch = false;
    }

    return statusMatch && picMatch && dateMatch;
  });

  // Pagination
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export Excel
  const handleExport = () => {
    window.location.href = 'http://localhost:3000/api/tickets/export';
  };

  if(loading && !stats) return <div className="container my-5"><h1>Memuat data...</h1></div>;
  if(!stats) return <div className="container my-5"><h1>Gagal memuat data statistik.</h1></div>;

  // Pisahkan tiket Proses & Selesai
  const prosesTickets = tickets.filter(t => 
    ['diproses', 'on hold', 'waiting third party'].includes(t.status.toLowerCase())
  );
  const selesaiTickets = tickets.filter(t => t.status.toLowerCase() === 'done');

  return (
    <>
      <Toaster position="top-center"/>
      <div className="container my-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1>📊 Dashboard Kendala Operational</h1>
          <button className="btn btn-danger" onClick={handleLogout}>
            <FaSignOutAlt className="me-1"/> Logout
          </button>
        </div>

        <div className="dashboard-wrapper">
          <div className="chart-box panel">
            <h6 className="fw-bold">Statistik Kendala</h6>
            <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }}/>
          </div>

          <div className="chart-box">
            <h6 className="fw-bold">Tiket per Penanggung Jawab</h6>
            <PicChart data={stats.picData}/>
          </div>

          <div className="chart-box">
            <h6 className="fw-bold">Case Terbanyak</h6>
            {stats.caseData && Object.keys(stats.caseData).length>0 ? 
              <CaseChart data={stats.caseData}/> :
              <div className="alert alert-info text-center">Tidak ada data case tersedia.</div>
            }
          </div>

          <div className="chart-box">
            <h6 className="fw-bold">Statistik Harian (Hari Ini vs Kemarin)</h6>
            <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday}/>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            {/* Filter Panel */}
            <div className="filter-panel d-flex flex-wrap align-items-end gap-2">
              {/* Status Filter */}
              <div className="filter-group">
                <label>Status Tiket</label>
                <div className="filter-buttons btn-group">
                  {['all','Diproses','Selesai'].map(s => (
                    <button key={s} className={statusFilter===s?'active btn':'btn'} 
                      onClick={()=>{setStatusFilter(s); setCurrentPage(1);}}>
                      {s==='all'?'Semua':s}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIC Filter */}
              <div className="filter-group">
                <label>PIC</label>
                <select className="form-select form-select-sm" value={picFilter} onChange={e=>{setPicFilter(e.target.value); setCurrentPage(1);}}>
                  <option value="all">Semua PIC</option>
                  <option value="Belum Ditentukan">Belum Ditentukan</option>
                  {stats.picList.map(pic => <option key={pic} value={pic}>{pic.toUpperCase()}</option>)}
                </select>
              </div>

              {/* Date Filter */}
              <div className="filter-group">
                <label>Dari Tanggal</label>
                <input type="date" className="form-control form-control-sm" value={startDate} onChange={e=>{setStartDate(e.target.value); setCurrentPage(1);}}/>
              </div>
              <div className="filter-group">
                <label>Sampai Tanggal</label>
                <input type="date" className="form-control form-control-sm" value={endDate} onChange={e=>{setEndDate(e.target.value); setCurrentPage(1);}}/>
              </div>

              {/* Reset & Export */}
              <div className="filter-group ms-auto d-flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>Reset Filter</button>
                <button className="btn btn-success btn-sm" onClick={handleExport}><FaFileExcel className="me-1"/> Ekspor Excel</button>
              </div>
            </div>

            {/* Tabs untuk Proses & Selesai */}
            <Tabs defaultActiveKey="proses" className="mt-3">
              <Tab eventKey="proses" title={`Proses (${prosesTickets.length})`}>
                {prosesTickets.length>0 ? 
                  prosesTickets.map(ticket=>(
                    <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal}/>
                  )) : <div className="alert alert-danger text-center">Tidak ada tiket dalam proses.</div>
                }
              </Tab>

              <Tab eventKey="selesai" title={`Selesai (${selesaiTickets.length})`}>
                {selesaiTickets.length>0 ? 
                  selesaiTickets.map(ticket=>(
                    <TicketCard key={ticket._id} ticket={ticket} picList={stats.picList} refreshData={fetchData} onImageClick={handleShowImage} onTextClick={handleShowTextModal}/>
                  )) : <div className="alert alert-info text-center">Tidak ada tiket selesai.</div>
                }
              </Tab>
            </Tabs>

            {/* Pagination */}
            {totalPages>1 &&
              <div className="pagination mt-3 d-flex justify-content-center gap-2">
                <button className="btn btn-sm btn-secondary" onClick={()=>paginate(currentPage-1)} disabled={currentPage===1}>Prev</button>
                {Array.from({length: totalPages}, (_,i)=>(<button key={i} className={`btn btn-sm ${currentPage===i+1?'btn-primary':'btn-outline-primary'}`} onClick={()=>paginate(i+1)}>{i+1}</button>))}
                <button className="btn btn-sm btn-secondary" onClick={()=>paginate(currentPage+1)} disabled={currentPage===totalPages}>Next</button>
              </div>
            }
          </div>
        </div>
      </div>

      {/* Modal Gambar */}
      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{padding:0}}>
          <img src={selectedImageUrl} alt="Detail Kendala" style={{width:'100%', height:'auto'}}/>
        </Modal.Body>
      </Modal>

      {/* Modal Teks */}
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail Kendala dari @{selectedTextUser}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{whiteSpace:'pre-wrap'}}>{selectedText}</p>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default DashboardPage;
