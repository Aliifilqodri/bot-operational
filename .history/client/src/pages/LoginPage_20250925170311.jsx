// client/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import api from '../api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  // === Partikel Neon Interaktif ===
  useEffect(() => {
    const canvas = document.getElementById('neonCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        color: `hsl(${Math.random()*360}, 100%, 50%)`,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="login-wrapper">
      <canvas id="neonCanvas" className="neon-canvas"></canvas>

      <div className="login-card">
        <h2 className="login-title">🚀 Masuk ke Dashboard</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <FaUser className="icon" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <FaLock className="icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">
            Masuk
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>

      <style>{`
        .login-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          background: #0f0f0f;
        }

        .neon-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .login-card {
          position: relative;
          z-index: 1;
          backdrop-filter: blur(15px);
          background: rgba(0,0,0,0.4);
          border-radius: 20px;
          padding: 50px 40px;
          width: 380px;
          text-align: center;
          box-shadow: 0 0 40px #0ff, 0 0 80px #0ff;
          border: 1px solid #0ff;
          animation: fadeInUp 1s ease forwards;
        }

        .login-title {
          color: #0ff;
          margin-bottom: 30px;
          font-weight: bold;
          text-shadow: 0 0 15px #0ff;
        }

        .input-group {
          position: relative;
          margin-bottom: 25px;
        }

        .input-group .icon {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          color: #0ffaa0;
          font-size: 18px;
        }

        .input-group input {
          width: 100%;
          padding: 12px 15px 12px 45px;
          border-radius: 12px;
          border: none;
          outline: none;
          background: rgba(0,255,255,0.1);
          color: #fff;
          font-size: 16px;
          box-shadow: 0 0 10px #0ff4;
          transition: 0.3s;
        }

        .input-group input::placeholder {
          color: #0ff8;
        }

        .input-group input:focus {
          background: rgba(0,255,255,0.2);
          box-shadow: 0 0 25px #0ff;
          transform: scale(1.02);
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(90deg, #0ff, #1e3c72);
          color: #fff;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: 0.4s;
          box-shadow: 0 0 20px #0ff4;
        }

        .login-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 40px #0ff, 0 0 60px #0ff;
        }

        .error {
          color: #ff4d4d;
          margin-top: 15px;
          font-weight: 500;
        }

        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
