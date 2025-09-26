// client/src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
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

  // === Background Partikel Neon Elegan ===
  useEffect(() => {
    const canvas = document.getElementById("neonCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        dx: (Math.random() - 0.5) * 1.5,
        dy: (Math.random() - 0.5) * 1.5,
        color: `hsla(${Math.random() * 360}, 70%, 60%, 0.8)`,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="login-wrapper">
      <canvas id="neonCanvas" className="neon-canvas"></canvas>

      <div className="login-card">
        <h2 className="login-title">Masuk ke Dashboard</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <FaUser className="icon" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <FaLock className="icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">
            Masuk
          </button>
          {error && <div className="error-box">{error}</div>}
        </form>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

        * {
          font-family: 'Inter', sans-serif;
        }

        .login-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          background: linear-gradient(135deg, #0a0f1f, #081229);
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
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 45px 40px;
          width: 380px;
          text-align: center;
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.25);
          border: 1px solid rgba(0, 255, 255, 0.2);
          animation: fadeInUp 1s ease forwards;
        }

        .login-title {
          color: #e6f7ff;
          margin-bottom: 28px;
          font-weight: 700;
          font-size: 1.5rem;
          text-shadow: 0 0 10px rgba(0,255,255,0.3);
        }

        .input-group {
          position: relative;
          margin-bottom: 22px;
        }

        .input-group .icon {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          color: #00e0ff;
          font-size: 18px;
          opacity: 0.8;
        }

        .input-group input {
          width: 100%;
          padding: 12px 15px 12px 45px;
          border-radius: 10px;
          border: 1px solid rgba(0,255,255,0.3);
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 15px;
          transition: 0.3s;
        }

        .input-group input::placeholder {
          color: #b8c6d8;
        }

        .input-group input:focus {
          background: rgba(0, 255, 255, 0.12);
          border-color: #00e0ff;
          box-shadow: 0 0 15px rgba(0,255,255,0.5);
        }

        .login-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(90deg, #00e0ff, #0072ff);
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: 0.35s;
          box-shadow: 0 0 15px rgba(0, 224, 255, 0.3);
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 224, 255, 0.5);
        }

        .error-box {
          margin-top: 18px;
          padding: 10px;
          border-radius: 8px;
          background: rgba(255, 77, 77, 0.1);
          border: 1px solid rgba(255,77,77,0.3);
          color: #ff6b6b;
          font-size: 14px;
          font-weight: 500;
        }

        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(25px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
