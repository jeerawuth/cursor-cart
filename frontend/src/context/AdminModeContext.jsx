import React, { createContext, useContext, useState } from 'react';

const AdminModeContext = createContext();

export const AdminModeProvider = ({ children }) => {
  const [isCustomerView, setIsCustomerView] = useState(false);

  const toggleCustomerView = () => {
    setIsCustomerView(prev => !prev);
  };

  return (
    <AdminModeContext.Provider value={{ isCustomerView, toggleCustomerView }}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => {
  const context = useContext(AdminModeContext);
  if (!context) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
};
