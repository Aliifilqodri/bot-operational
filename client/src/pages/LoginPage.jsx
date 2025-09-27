// client/src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// --- Perubahan: Mengganti ikon FaHome untuk rumah ---
import { FaUser, FaLock, FaHome } from "react-icons/fa"; 
import api from "../api";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { username, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan");
    }
  };

  // --- DIHAPUS: useEffect untuk canvas partikel ---
  // Kode canvas partikel dihapus untuk tampilan formal
  // useEffect(() => { /* ... kode partikel ... */ }, []);

  return (
    <div className="login-wrapper-formal"> {/* Mengubah nama kelas untuk styling baru */}
      {/* --- DIHAPUS: canvas elemen --- */}
      {/* <canvas id="neonCanvas" className="neon-canvas"></canvas> */}

      <div className="login-card-formal"> {/* Mengubah nama kelas untuk styling baru */}
        {/* --- PENAMBAHAN: Ikon Rumah & Judul Dashboard --- */}
        <div className="text-center mb-4">
          <FaHome className="login-home-icon" /> {/* Ikon rumah */}
          <h1 className="login-app-title">Dashboard Operational</h1> {/* Judul aplikasi */}
        </div>

        <h2 className="login-title-formal">Masuk ke Sistem</h2> {/* Judul login yang lebih formal */}
        <form onSubmit={handleLogin}>
          <div className="input-group-formal">
            <FaUser className="icon-formal" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group-formal">
            <FaLock className="icon-formal" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn-formal">
            Masuk
          </button>
          {error && <div className="error-box-formal">{error}</div>}
        </form>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Poppins', sans-serif; /* Menggunakan Poppins atau Roboto untuk kesan formal */
        }

        .login-wrapper-formal {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          /* Latar belakang formal dengan gradien abu-abu gelap */
          background: linear-gradient(135deg, #2c3e50, #212529); 
        }

        .login-card-formal {
          position: relative;
          z-index: 1;
          background: #ffffff; /* Kartu putih */
          border-radius: 12px;
          padding: 40px 35px;
          width: 400px;
          max-width: 90%; /* Responsif */
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); /* Bayangan lebih gelap dan formal */
          border: 1px solid #e0e0e0; /* Border halus */
          animation: fadeInUpFormal 0.8s ease forwards;
        }

        .login-home-icon {
          font-size: 3.5rem; /* Ukuran ikon rumah */
          color: #dc3545; /* Warna merah */
          margin-bottom: 10px;
        }

        .login-app-title {
          color: #343a40; /* Warna teks gelap */
          font-weight: 700;
          font-size: 1.8rem;
          margin-bottom: 25px;
        }

        .login-title-formal {
          color: #495057; /* Warna judul login */
          margin-bottom: 28px;
          font-weight: 600;
          font-size: 1.4rem;
        }

        .input-group-formal {
          position: relative;
          margin-bottom: 20px;
        }

        .input-group-formal .icon-formal {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          color: #6c757d; /* Warna ikon abu-abu */
          font-size: 18px;
        }

        .input-group-formal input {
          width: 100%;
          padding: 12px 15px 12px 50px; /* Padding kiri lebih besar untuk ikon */
          border-radius: 8px;
          border: 1px solid #ced4da; /* Border input default */
          outline: none;
          background: #f8f9fa; /* Latar belakang input sedikit abu-abu */
          color: #343a40;
          font-size: 16px;
          transition: 0.3s ease;
        }

        .input-group-formal input::placeholder {
          color: #888;
        }

        .input-group-formal input:focus {
          border-color: #dc3545; /* Border merah saat fokus */
          box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25); /* Glow merah saat fokus */
          background: #fff;
        }

        .login-btn-formal {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(90deg, #dc3545, #a71d2a); /* Gradien merah */
          color: #fff;
          font-weight: 600;
          font-size: 17px;
          cursor: pointer;
          transition: 0.3s ease;
          box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
        }

        .login-btn-formal:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
          background: linear-gradient(90deg, #a71d2a, #dc3545); /* Efek hover gradien terbalik */
        }

        .error-box-formal {
          margin-top: 20px;
          padding: 12px;
          border-radius: 8px;
          background: #f8d7da; /* Latar belakang error merah muda */
          border: 1px solid #f5c6cb;
          color: #721c24; /* Teks error merah gelap */
          font-size: 14px;
          font-weight: 500;
        }

        @keyframes fadeInUpFormal {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;