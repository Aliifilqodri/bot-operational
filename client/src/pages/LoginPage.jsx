// client/src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaHome, FaSignOutAlt, FaDatabase } from "react-icons/fa"; // Tambahkan icon baru
import api from "../api";
import toast from "react-hot-toast"; // Import toast untuk notifikasi

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("sso"); // State baru: 'sso' atau 'local'
  const navigate = useNavigate();

  const isSSOMode = loginMode === "sso";

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Tentukan endpoint berdasarkan mode login
    const endpoint = isSSOMode ? "/auth/sso-login" : "/auth/local-login";
    const loginType = isSSOMode ? "SSO" : "Lokal";

    try {
      const res = await api.post(endpoint, { username, password });

      localStorage.setItem("token", res.data.token);
      sessionStorage.setItem('justLoggedIn', 'true');
      
      toast.success(`Login ${loginType} berhasil!`);
      navigate("/dashboard");

    } catch (err) {
      const errorMessage = err.response?.data?.message || "Terjadi kesalahan pada server";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleLoginMode = () => {
    setLoginMode(isSSOMode ? "local" : "sso");
    setUsername("");
    setPassword("");
    setError("");
  };

  return (
    <div className="login-wrapper-formal">
      <div className="login-card-formal">
        <div className="text-center mb-4">
          <FaHome className="login-home-icon" />
          <h1 className="login-app-title">Dashboard Operational</h1>
        </div>

        <h2 className="login-title-formal">
          Masuk ({isSSOMode ? "SSO Mode" : "Local Mode"})
        </h2>
        
        {/* Tombol Toggle Login Mode */}
        <div className="text-center mb-4">
          <button 
            type="button" 
            onClick={toggleLoginMode} 
            className="toggle-mode-btn"
            disabled={loading}
          >
            {isSSOMode ? (
              <>
                <FaDatabase className="mr-2" /> Beralih ke Login Lokal
              </>
            ) : (
              <>
                <FaSignOutAlt className="mr-2" /> Beralih ke Login SSO
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group-formal">
            <FaUser className="icon-formal" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn-formal" disabled={loading}>
            {loading ? 'Memproses...' : (isSSOMode ? 'Masuk dengan SSO' : 'Masuk Lokal')}
          </button>
          
          {/* Opsional: Tampilkan error box */}
          {/* {error && <div className="error-box-formal">{error}</div>} */}
        </form>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Poppins', sans-serif;
        }

        .login-wrapper-formal {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          background: linear-gradient(135deg, #2c3e50, #212529); 
        }

        .login-card-formal {
          position: relative;
          z-index: 1;
          background: #ffffff;
          border-radius: 12px;
          padding: 40px 35px;
          width: 400px;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          border: 1px solid #e0e0e0;
          animation: fadeInUpFormal 0.8s ease forwards;
        }

        .login-home-icon {
          font-size: 3.5rem;
          color: #dc3545;
          margin-bottom: 10px;
        }

        .login-app-title {
          color: #343a40;
          font-weight: 700;
          font-size: 1.8rem;
          margin-bottom: 25px;
        }

        .login-title-formal {
          color: #495057;
          margin-bottom: 20px;
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
          color: #6c757d;
          font-size: 18px;
        }

        .input-group-formal input {
          width: 100%;
          padding: 12px 15px 12px 50px;
          border-radius: 8px;
          border: 1px solid #ced4da;
          outline: none;
          background: #f8f9fa;
          color: #343a40;
          font-size: 16px;
          transition: 0.3s ease;
        }

        .input-group-formal input::placeholder {
          color: #888;
        }

        .input-group-formal input:focus {
          border-color: #dc3545;
          box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
          background: #fff;
        }
        
        /* Tombol Toggle Mode */
        .toggle-mode-btn {
          background: #f0f0f0;
          color: #555;
          border: 1px solid #ccc;
          padding: 8px 15px;
          border-radius: 5px;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 15px;
          transition: background 0.3s, color 0.3s;
          display: inline-flex;
          align-items: center;
          font-weight: 500;
        }
        
        .toggle-mode-btn:hover:not(:disabled) {
          background: #e9ecef;
          color: #333;
        }
        
        .toggle-mode-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .mr-2 {
            margin-right: 8px;
        }

        .login-btn-formal {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(90deg, #dc3545, #a71d2a);
          color: #fff;
          font-weight: 600;
          font-size: 17px;
          cursor: pointer;
          transition: 0.3s ease;
          box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .login-btn-formal:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
          background: linear-gradient(90deg, #a71d2a, #dc3545);
        }

        .login-btn-formal:disabled {
          background: #6c757d;
          cursor: not-allowed;
          box-shadow: none;
        }

        .error-box-formal {
          margin-top: 20px;
          padding: 12px;
          border-radius: 8px;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
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