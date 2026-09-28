import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function AdminRegister() {
  const [formData, setFormData] = useState({
    adminId: '',
    name: '',
    email: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/admin/register', formData);
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userName', data.name);
      
      // Admin goes to Dashboard after successful registration/login
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container text-on-surface p-md">
      <div className="w-full max-w-[400px] bg-surface p-xl rounded-2xl shadow-lg border border-outline-variant my-md">
        <div className="flex flex-col items-center mb-xl">
          <span className="material-symbols-outlined text-[48px] text-primary mb-sm">admin_panel_settings</span>
          <h1 className="text-headline-md font-bold text-primary">Admin Registration</h1>
          <p className="text-body-md text-on-surface-variant text-center mt-xs">Create a new Admin account</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-sm rounded-lg mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined">error</span>
            <span className="text-body-sm font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-md">
          <div>
            <label className="block text-label-md font-bold mb-xs">Admin ID</label>
            <input 
              type="text"
              name="adminId"
              value={formData.adminId}
              onChange={handleChange}
              required
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="e.g., ADM-001"
            />
          </div>
          <div>
            <label className="block text-label-md font-bold mb-xs">Full Name</label>
            <input 
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-label-md font-bold mb-xs">Email</label>
            <input 
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-label-md font-bold mb-xs">Username</label>
            <input 
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Choose a username"
            />
          </div>
          <div>
            <label className="block text-label-md font-bold mb-xs">Password</label>
            <input 
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Create a password"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary py-sm rounded-full font-bold hover:brightness-110 transition-all flex justify-center items-center gap-sm disabled:opacity-50 mt-lg"
          >
            {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Register Admin'}
          </button>
        </form>

        <div className="mt-lg text-center text-body-md">
          <span className="text-on-surface-variant">Already have an account? </span>
          <Link to="/admin/login" className="text-primary font-bold hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
