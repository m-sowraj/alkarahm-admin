import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css'; // Make sure to import your custom CSS
import OrderManagement from './pages/Admin/orders';
import ProductManagement from './pages/Admin/product';
import UserManagement from './pages/Admin/user';
import CategoryManagement from './pages/Admin/category';
import { Toaster } from 'react-hot-toast'


function App() {
  return (
      <div className='josefin-sans'>
        <Toaster position="bottom-center" />
        <Router>
          <Routes>
            <Route path="/" element={<CategoryManagement />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/user" element={<UserManagement />} />
          </Routes>
        </Router>
      </div>
  );
}

export default App;
