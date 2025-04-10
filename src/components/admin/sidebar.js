import { LayoutDashboard, Package, Users, FileText, LogOut , BookPlus, Settings  } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

export default function Sidebar() {
  const { language, toggleLanguage } = useLanguage();

  const handleToggleLanguage = () => {
    toggleLanguage();
  };

  return (
    <aside className="w-64 bg-green-600 text-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Alkaramh</h1>
      </div>
      <nav>
        <ul className="space-y-2">
          {/* <li>
            <a href="/" className="flex items-center space-x-2 hover:bg-green-60 p-2 rounded">
              <LayoutDashboard className="h-5 w-5" />
              <span>Main Dashboard</span>
            </a>
          </li> */}
          <li>
            <a href="/category" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded">
              <BookPlus className="h-5 w-5" />
              <span>Categories</span>
            </a>
          </li>
          <li>
            <a href="/products" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded">
              <Package className="h-5 w-5" />
              <span>Products</span>
            </a>
          </li>
          <li>
            <a href="/orders" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded">
              <FileText className="h-5 w-5" />
              <span>Orders</span>
            </a>
          </li>
          <li>
            <a href="/user" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded">
              <Users className="h-5 w-5" />
              <span>Users</span>
            </a>
          </li>
        </ul>
      </nav>
      // <div className="mt-5 bg-green-800 text-sm rounded-full">
      //   <button className="flex items-center space-x-2 p-2 hover:bg-green-900 w-full rounded-full" onClick={handleToggleLanguage}>
      //     <Settings className="h-5 w-5" />
      //     <span>{language === "en" ? "Switch to Arabic" : "Switch to English"}</span>
      //   </button>
      // </div>
      {/* <div className="mt-auto">
        <button className="flex items-center space-x-2 p-2 hover:bg-green-600 rounded w-full">
          <LogOut className="h-5 w-5" />
          <span>Log out</span>
        </button>
      </div> */}
    </aside>
  );
}
