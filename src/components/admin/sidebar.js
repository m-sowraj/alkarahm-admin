import { LayoutDashboard, Package, Users, FileText, LogOut , BookPlus, Settings  } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-green-500 text-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Nilgiris Store</h1>
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
            <a href="/" className="flex items-center space-x-2 p-2 hover:bg-green-600 rounded">
              <BookPlus className="h-5 w-5" />
              <span>Categories</span>
            </a>
          </li>
          <li>
            <a href="/products" className="flex items-center space-x-2 p-2 hover:bg-green-600 rounded">
              <Package className="h-5 w-5" />
              <span>Products</span>
            </a>
          </li>
          <li>
            <a href="/orders" className="flex items-center space-x-2 p-2 hover:bg-green-600 rounded">
              <FileText className="h-5 w-5" />
              <span>Orders</span>
            </a>
          </li>
          <li>
            <a href="/user" className="flex items-center space-x-2 p-2 hover:bg-green-600 rounded">
              <Users className="h-5 w-5" />
              <span>Users</span>
            </a>
          </li>
        </ul>
      </nav>
      {/* <div className="mt-auto">
        <button className="flex items-center space-x-2 p-2 hover:bg-green-600 rounded w-full">
          <LogOut className="h-5 w-5" />
          <span>Log out</span>
        </button>
      </div> */}
    </aside>
  );
}
