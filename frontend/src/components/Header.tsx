import React, { useState } from 'react';
import { Menu, X, LogOut, MapIcon, Home, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

export default function Header() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo & Title */}
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
            onClick={() => navigate('/')}
          >
            <MapIcon className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Multi-Building Indoor Wayfinder</h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn && user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm">Welcome, {user.name}</span>
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-blue-600 rounded-lg transition"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
                >
                  Login
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-blue-700 px-4 py-3 border-t border-blue-600 space-y-3">
            {isLoggedIn && user ? (
              <>
                <div className="text-sm pb-3 border-b border-blue-600">
                  Welcome, {user.name}
                </div>
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate('/');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-600 rounded-lg transition"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <button
                  onClick={() => {
                    setIsLoginModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
                >
                  Login
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
