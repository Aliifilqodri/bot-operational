import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { Modal } from 'react-bootstrap';
import { io } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import {
  FaFileExcel, FaSignOutAlt, FaSearch, FaTicketAlt,
  FaSyncAlt, FaCheckCircle, FaBullhorn, FaRedoAlt, FaFilter,
  FaChartBar, FaUserTie, FaDesktop
} from 'react-icons/fa';

import TicketCard from '../components/TicketCard';
import StatusChart from '../components/StatusChart';
import PicChart from '../components/PicChart';
import CaseChart from '../components/CaseChart';
import DailyChart from '../components/DailyChart';
import PlatformChart from '../components/PlatformChart';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


// ====================================================================
// ===== BAGIAN UI: Komponen-komponen kecil untuk tampilan
// ====================================================================

// Komponen Header Dasbor
const DashboardHeader = ({ username, handleLogout }) => {
  // Fungsi untuk membuat huruf pertama kapital
  const capitalize = (s) => s && s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div style={styles.header.container}>
      <div>
        <h1 style={styles.header.title}>Selamat Bekerja, {capitalize(username)}! 👋</h1>
        <p style={styles.header.subtitle}>Mari selesaikan tiket hari ini dan raih target bersama. Semangat selalu! 💪</p>
      </div>
      <button style={styles.buttons.logout} onClick={handleLogout}>
        <FaSignOutAlt />
        <span className="d-none d-md-inline ms-2">Logout</span>
      </button>
    </div>
  );
};

// Komponen Slider Statistik (Tidak ada perubahan)
const StatsSlider = ({ stats }) => (
  <section>
    <h2 style={styles.sectionTitle}>Performance Summary</h2>
    <div style={styles.statsSlider.container} className="chart-slider">
      {[
        { title: 'TICKET STATUS', component: <StatusChart data={{ totalDiproses: stats.totalDiproses, totalSelesai: stats.totalSelesai }} />, icon: <FaChartBar /> },
        { title: 'TICKETS BY PIC', component: <PicChart data={stats.picData} />, icon: <FaUserTie /> },
        { title: 'PLATFORM DISTRIBUTION', component: <PlatformChart data={stats.platformData} />, condition: stats.platformData && Object.keys(stats.platformData).length > 0, icon: <FaDesktop /> },
        { title: 'DAILY STATS', component: <DailyChart today={stats.statsToday} yesterday={stats.statsYesterday} />, icon: <FaChartBar /> },
        { title: 'TOP CASES', component: <CaseChart data={stats.caseData} />, condition: stats.caseData && Object.keys(stats.caseData).length > 0, icon: <FaTicketAlt /> },
      ].map((chart, index) => {
        const canRender = !chart.hasOwnProperty('condition') || chart.condition;
        return (
          <div style={styles.statsSlider.card} key={index}>
            <div style={styles.statsSlider.cardHeader}>
              {chart.icon}
              <h6 style={styles.statsSlider.cardTitle}>{chart.title}</h6>
            </div>
            <div style={styles.statsSlider.cardBody}>
              {canRender ? chart.component : <div style={styles.statsSlider.noData}>No data available.</div>}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

// ====================================================================
// ===== KOMPONEN UTAMA: DashboardPage
// ====================================================================

function DashboardPage() {
  // --- STATE MANAGEMENT ---
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(''); // State untuk nama pengguna
  const [activeView, setActiveView] = useState('processed');
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

  // --- LOGIC & SIDE EFFECTS ---
  
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

  // Fungsi fetch data utama
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let statusForApi = 'all';
      if (activeView === 'processed') {
        statusForApi = 'Open,Diproses,Waiting Third Party';
      } else if (activeView === 'completed') {
        statusForApi = 'Done';
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
      const res = await api.get(`/tickets`, { params }); 

      setTickets(res.data.tickets);
      setTotalPages(res.data.totalPages);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Gagal fetch data:', err);
      if (err.response && err.response.status === 401) handleLogout();
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentPage, picFilter, startDate, endDate, searchQuery, activeView]);

  // 1. Gunakan useRef untuk menyimpan referensi ke fungsi fetchData terbaru
  const fetchDataRef = useRef(fetchData);

  // Setiap kali fetchData berubah (karena filternya berubah), update referensi di ref
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);


  // === UTAMA: Mengatur User, Fetch Awal, dan Socket.IO ===
  useEffect(() => {
    // A. Ambil Username dari Token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        // Menggunakan field username dari payload JWT (yang sekarang sudah diatur ke displayName)
        setUsername(decodedToken.username); 
      } catch (error) {
        console.error("Invalid token:", error);
        handleLogout(); 
        return; 
      }
    } else {
        handleLogout();
        return;
    }

    // B. Notifikasi Selamat Datang (hanya saat login pertama kali)
    if (sessionStorage.getItem('justLoggedIn')) {
      toast.success('Welcome back!', {
        icon: '👋',
        duration: 4000,
        style: { background: '#333', color: '#fff' }
      });
      sessionStorage.removeItem('justLoggedIn');
    }
    
    // C. Setup Socket.IO untuk Real-Time
    const socket = io(SOCKET_SERVER_URL);
    
    // Panggil fetchData melalui ref saat koneksi berhasil untuk data awal
    socket.on('connect', () => {
        console.log('✅ Connected to WebSocket server');
        fetchDataRef.current(true); 
    });
    
    socket.on('connect_error', (err) => {
      console.error('❌ Gagal terhubung ke WebSocket:', err.message);
      toast.error("Gagal terhubung ke server real-time.");
    });

    socket.on('newTicket', (newTicket) => {
        toast(`New Ticket Received: #${newTicket.ticketCode}`, { icon: '🔔' });
        // Panggil melalui ref untuk mendapatkan fungsi fetchData dengan state filter/page terbaru
        fetchDataRef.current(false); 
    });

    socket.on('ticketUpdated', (updatedTicket) => {
        toast.info(`Ticket #${updatedTicket.ticketCode} was updated.`, { icon: '🔄' });
        // Panggil melalui ref
        fetchDataRef.current(false); 
    });

    socket.on('disconnect', () => console.log('❌ Disconnected from WebSocket server'));

    // Fungsi cleanup: Putuskan koneksi saat komponen di-unmount
    return () => {
      console.log('🔌 Disconnecting WebSocket');
      socket.disconnect();
    };
    
  }, []); // Dependency array KOSONG. Hanya dijalankan sekali saat mount.


  // === Tambahan: Panggil fetchData saat filter/page berubah ===
  // Efek ini menangani saat user mengubah filter/page secara manual
  useEffect(() => {
      // Panggil fetchData hanya saat stats sudah dimuat (bukan pada initial render)
      if(stats) {
          fetchData(true);
      }
  }, [picFilter, startDate, endDate, searchQuery, activeView, currentPage, fetchData]);


  const handleResetFilters = () => {
    setPicFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
    setActiveView('processed');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleExport = () => {
    window.location.href = `${api.defaults.baseURL}/tickets/export`;
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setCurrentPage(1);
  };


  // --- [UI RENDERING] ---

  if (loading && !stats) {
    return <div style={styles.loader}><h1>⏳ Loading Dashboard...</h1></div>;
  }
  if (!stats) {
    return <div style={styles.loader}><h1>❌ Failed to load data. Please check server connection.</h1></div>;
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <style>{`
        body { background-color: ${styles.colors.background}; font-family: ${styles.fontFamily}; }
        .chart-slider::-webkit-scrollbar { height: 8px; }
        .chart-slider::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 10px; }
        .chart-slider::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        .chart-slider::-webkit-scrollbar-thumb:hover { background: #64748b; }
        .ticket-card-wrapper { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .ticket-card-wrapper:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
          z-index: 10;
        }
      `}</style>
      
      <div style={styles.pageContainer}>
        <div style={styles.mainContent}>
          
          {/* MENGIRIM 'username' SEBAGAI PROP */}
          <DashboardHeader username={username} handleLogout={handleLogout} />
          
          <StatsSlider stats={stats} />
          
          <section className="mt-5">
            <div style={styles.ticketSection.header}>
              <h2 style={styles.sectionTitle}>Ticket Management</h2>
              <button style={styles.buttons.refresh} onClick={() => fetchData(true)} disabled={loading}>
                <FaRedoAlt className={loading ? 'fa-spin' : ''} />
                <span className="d-none d-md-inline ms-2">{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
            
            <div style={styles.filterBar.container}>
              <div style={styles.filterBar.inputGroup}>
                <FaSearch style={styles.filterBar.inputIcon} />
                <input type="text" style={styles.filterBar.input} placeholder="Search tickets by code, description, user..." value={searchQuery} onChange={handleSearchChange} />
              </div>
              <select style={styles.filterBar.select} value={picFilter} onChange={e => { setPicFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">All PICs</option>
                {stats.picList?.map(pic => <option key={pic} value={pic}>{pic === 'BelumDitentukan' ? 'Not Assigned' : pic.toUpperCase()}</option>)}
              </select>
              <input type="date" style={styles.filterBar.date} value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} />
              <input type="date" style={styles.filterBar.date} value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} />
              <button style={styles.buttons.secondary} onClick={handleResetFilters}><FaFilter className="me-1" /> Reset</button>
              <button style={styles.buttons.success} onClick={handleExport}><FaFileExcel className="me-1" /> Export</button>
            </div>

            <div style={styles.viewToggle.container}>
              {[
                { view: 'all', label: 'All Tickets', icon: <FaTicketAlt />, count: stats.totalDiproses + stats.totalSelesai },
                { view: 'processed', label: 'Active Tickets', icon: <FaSyncAlt />, count: stats.totalDiproses },
                { view: 'completed', label: 'Completed', icon: <FaCheckCircle />, count: stats.totalSelesai }
              ].map(tab => (
                <button
                  key={tab.view}
                  style={activeView === tab.view ? styles.viewToggle.buttonActive : styles.viewToggle.button}
                  onClick={() => handleViewChange(tab.view)}
                >
                  {tab.icon} {tab.label} <span style={styles.viewToggle.badge}>{tab.count}</span>
                </button>
              ))}
            </div>

            <div style={styles.ticketGrid}>
              {tickets.length > 0 ? tickets.map(ticket => (
                <div key={ticket._id} className="ticket-card-wrapper">
                  <TicketCard
                    ticket={ticket}
                    picList={stats.picList}
                    refreshData={() => fetchData(false)}
                    onImageClick={handleShowImage}
                    onTextClick={handleShowTextModal}
                  />
                </div>
              )) : (
                <div style={styles.noTicketsFound}>
                  No tickets found matching your criteria.
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div style={styles.pagination.container}>
                <button style={styles.buttons.secondary} onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</button>
                <span style={styles.pagination.text}>Page {currentPage} of {totalPages}</span>
                <button style={styles.buttons.secondary} onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal show={showImageModal} onHide={handleCloseImage} centered size="lg">
        <Modal.Body style={{ padding: 0 }}>
          <img src={selectedImageUrl} alt="Ticket Detail" style={{ width: '100%', height: 'auto', borderRadius: '0.5rem' }} />
        </Modal.Body>
      </Modal>
      <Modal show={showTextModal} onHide={handleCloseTextModal} centered>
        <Modal.Header closeButton><Modal.Title>Detail from @{selectedTextUser}</Modal.Title></Modal.Header>
        <Modal.Body><p style={{ whiteSpace: 'pre-wrap' }}>{selectedText}</p></Modal.Body>
      </Modal>
    </>
  );
}


// ====================================================================
// ===== BAGIAN STYLE: Semua style (Tidak ada perubahan)
// ====================================================================

const styles = {
  colors: {
    primary: '#4f46e5',
    primaryDark: '#4338ca',
    background: '#f1f5f9',
    card: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    danger: '#dc3545',
    success: '#16a34a',
  },
  fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: '1rem',
  },
  mainContent: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '2rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1.5rem',
  },
  header: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '2rem',
    },
    title: { fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: 0 },
    subtitle: { fontSize: '1rem', color: '#64748b', margin: 0, paddingTop: '0.25rem' },
  },
  statsSlider: {
    container: {
      display: 'flex',
      gap: '1.5rem',
      overflowX: 'auto',
      padding: '0.5rem 0.5rem 1.5rem 0.5rem',
    },
    card: {
      flex: '0 0 320px',
      backgroundColor: '#ffffff',
      borderRadius: '1rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#64748b',
      marginBottom: '1rem',
    },
    cardTitle: {
      margin: 0,
      fontSize: '0.875rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    cardBody: {
      flexGrow: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    noData: {
      color: '#94a3b8',
      fontSize: '0.875rem',
    }
  },
  ticketSection: {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
    },
  },
  filterBar: {
    container: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      backgroundColor: '#ffffff',
      padding: '1rem',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      marginBottom: '1.5rem',
    },
    inputGroup: { flex: '1 1 300px', position: 'relative' },
    inputIcon: { position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: '#94a3b8' },
    input: { width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' },
    select: { flex: '1 1 150px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' },
    date: { flex: '1 1 150px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' },
  },
  viewToggle: {
    container: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '2rem',
      backgroundColor: '#e2e8f0',
      padding: '0.25rem',
      borderRadius: '9999px',
      width: 'fit-content',
      margin: '0 auto 2.5rem auto',
    },
    button: {
      padding: '0.5rem 1.25rem',
      border: 'none',
      backgroundColor: 'transparent',
      borderRadius: '9999px',
      color: '#334155',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    buttonActive: {
      padding: '0.5rem 1.25rem',
      border: 'none',
      backgroundColor: '#ffffff',
      borderRadius: '9999px',
      color: '#4f46e5',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    },
    badge: {
      backgroundColor: 'rgba(0,0,0,0.05)',
      color: '#475569',
      padding: '0.125rem 0.5rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
    }
  },
  ticketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '1.5rem',
  },
  noTicketsFound: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    color: '#64748b',
  },
  pagination: {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      marginTop: '2.5rem',
    },
    text: { color: '#64748b', fontWeight: '500' },
  },
  buttons: {
    base: {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      border: '1px solid transparent',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.2s ease',
    },
    logout: {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      border: '1px solid #ef4444',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'transparent',
      color: '#ef4444',
      transition: 'all 0.2s ease',
    },
    refresh: {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      border: '1px solid #64748b',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'transparent',
      color: '#64748b',
      transition: 'all 0.2s ease',
    },
    secondary: {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      border: '1px solid #cbd5e1',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      color: '#334155',
      transition: 'all 0.2s ease',
    },
    success: {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      border: '1px solid #16a34a',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#16a34a',
      color: '#ffffff',
      transition: 'all 0.2s ease',
    },
  },
  loader: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    color: '#334155',
  }
};


export default DashboardPage;