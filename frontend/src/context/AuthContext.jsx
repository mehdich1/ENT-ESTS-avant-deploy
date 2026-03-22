import { createContext, useContext, useState } from 'react';
import { login } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    return token ? { token, username } : null;
  });

  const handleLogin = async (username, password) => {
    const data = await login(username, password);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token); // ← ajouté
    localStorage.setItem('username', username);
    setUser({ token: data.access_token, username });
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);