import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, X } from "lucide-react";
import Sidebar from "../../components/admin/sidebar";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebase.js"; // Ensure correct Firebase import
import { useLanguage } from "../../LanguageContext.js";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { language } = useLanguage(); // Get current language from context
  const translations = {
    en: {
      title: "Users",
      searchPlaceholder: "Search users...",
      addUser: "Add User",
      mobileNumber: "Mobile Number",
      name: "Name",
      email: "Email",
      role: "Role",
      signInMethod: "Sign In Method",
      enableNotifications: "Enable Notifications",
      password: "Password",
      saveChanges: "Save Changes",
      addUserModalTitle: "Add New User",
      editUserModalTitle: "Edit User",
      noUsers: "No users found.",
      userRoleAdmin: "Admin",
      userRoleUser: "User",
      google: "Google",
      emailSignIn: "Email",
      facebook: "Facebook",
      edit: "Edit",
      actions: "Actions",
    },
    ar: {
      title: "المستخدمون",
      searchPlaceholder: "ابحث عن المستخدمين...",
      addUser: "إضافة مستخدم",
      mobileNumber: "رقم الهاتف المحمول",
      name: "الاسم",
      email: "البريد الإلكتروني",
      role: "الدور",
      signInMethod: "طريقة تسجيل الدخول",
      enableNotifications: "تمكين الإشعارات",
      password: "كلمة المرور",
      saveChanges: "حفظ التغييرات",
      addUserModalTitle: "إضافة مستخدم جديد",
      editUserModalTitle: "تعديل المستخدم",
      noUsers: "لا يوجد مستخدمون.",
      userRoleAdmin: "مدير",
      userRoleUser: "مستخدم",
      google: "جوجل",
      emailSignIn: "البريد الإلكتروني",
      facebook: "فيسبوك",
      edit: "تعديل",
      actions: "الإجراءات",
    }
  };

  
  const t = translations[language] || translations.en; 

  
  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔥 Fetch Users from Firestore
  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser({ ...user });
    setIsAddingUser(false);
  };

  const handleAddUser = () => {
    setSelectedUser({
      id: "",
      email: "",
      name: "",
      signInMethod: "",
      isNotificationEnabled: false,
      createdAt: new Date(),
    });
    setIsAddingUser(true);
  };

  // 🔥 Save or Update User in Firestore
  const handleSaveUser = async (user) => {
    try {
      if (!user.name.trim() || !user.email.trim()) {
        console.error("User name and email are required");
        return;
      }

      let updatedUsers = [...users];

      if (isAddingUser) {
        const docRef = await addDoc(collection(db, "users"), user);
        user.id = docRef.id;
        updatedUsers.push(user);
      } else {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, user);
        updatedUsers = updatedUsers.map((u) => (u.id === user.id ? { ...u, ...user } : u));
      }

      setUsers(updatedUsers); // Update UI instantly
      setSelectedUser(null);
      setIsAddingUser(false);
      console.log("User saved successfully");
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  // 🔥 Filter Users Safely
  const filteredUsers = users.filter((user) =>
    [user.name, user.email, user.signInMethod]
      .filter(Boolean) // Remove undefined/null values
      .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-gray-100">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-50 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">{t.title}</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <button
                onClick={handleAddUser}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
              >
                <Plus size={20} className="mr-2" />
                {t.addUser }
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-gray-100 p-6">
        <div className="bg-white rounded-lg shadow h-full flex flex-col">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.name}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.email}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.role}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      {t.noUsers}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-medium text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                            user.role === 'User ' ? 'bg-green-100 text-green-800' : 
                            'bg-blue-100 text-blue-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                         onClick={() => handleUserClick(user)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-600 text-sm font-medium transition-colors duration-200"
                        >
                          <Edit size={16} className="inline-block mr-1" />
                          {t.edit}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {(selectedUser  || isAddingUser ) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {isAddingUser  ? t.addUserModalTitle : t.editUserModalTitle}
              </h2>
              <button
                onClick={() => {
                  setSelectedUser (null);
                  setIsAddingUser (false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveUser (selectedUser );
                }}
              >
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">{t.basicInformation}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.mobileNumber}</label>
                        <input
                          type="text"
                          value={selectedUser .mobileNumber || ""}
                          onChange={(e) => setSelectedUser ({ ...selectedUser , mobileNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.name}</label>
                        <input
                          type="text"
                          value={selectedUser .name || ""}
                          onChange={(e) => setSelectedUser ({ ...selectedUser , name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
         
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                        <input
                          type="email"
                          value={selectedUser.email || ""}
                          onChange={(e) => setSelectedUser ({...selectedUser , email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.role}</label>
                        <select
                          value={selectedUser .role || ""}
                          onChange={(e) => setSelectedUser ({ ...selectedUser , role: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="" disabled>{t.selectRole}</option>
                          <option value="Admin">{t.userRoleAdmin}</option>
                          <option value="User">{t.userRoleUser }</option>
                        </select>
                      </div>
                    </div>
         
                    {/* Additional Information - Always Visible */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.signInMethod}</label>
                      <select
                        value={selectedUser .signInMethod || ""}
                        onChange={(e) => setSelectedUser ({...selectedUser , signInMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="" disabled>{t.selectSignInMethod}</option>
                        <option value="google">{t.google}</option>
                        <option value="email">{t.emailSignIn}</option>
                        <option value="facebook">{t.facebook}</option>
                      </select>
                    </div>
         
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUser .isNotificationEnabled || false}
                        onChange={(e) => setSelectedUser ({ ...selectedUser , isNotificationEnabled: e.target.checked })}
                        className="mr-2"
                      />
                      <label className="block text-sm font-medium text-gray-700">{t.enableNotifications}</label>
                    </div>
         
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
                      <input
                        type="password"
                        value={selectedUser .password || ""}
                        onChange={(e) => setSelectedUser ({ ...selectedUser , password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
         
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors duration-200"
                    >
                      {isAddingUser  ? t.addUser  : t.saveChanges}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}