import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';
import { AdminModeProvider } from './context/AdminModeContext';

function App() {
  return (
    <AdminModeProvider>
      <Navbar />
      <div className="main-content">
        <AppRoutes />
      </div>
    </AdminModeProvider>
  );
}

export default App;
