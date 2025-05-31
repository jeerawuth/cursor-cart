import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';
import { AdminModeProvider } from './context/AdminModeContext';

function App() {
  return (
    <AdminModeProvider>
      <Navbar />
      <AppRoutes />
    </AdminModeProvider>
  );
}

export default App;
