import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, provider, signInWithPopup } from "../firebase/firebase"; // Import Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
import logo from "../images/logo.png";
import { toast } from "react-hot-toast";

const LoginPage = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 🔥 Fetch user role from Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("role", userData.role);
        localStorage.setItem("username", userData.name);

        // ✅ Redirect based on role
        if (userData.role === "Super admin") {
          window.location.href = "/category";
        } else {
          window.location.href = "/";
          toast.warn("Logged in Failed!");
        }

        toast.success("Logged in successfully!");
      } else {
        setError("User not found in database. Contact admin.");
      }
    } catch (error) {
      setError("Error logging in. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-14 text-4xl">
      Alkaramh
      </div>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login to Your Account
          </h2>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
