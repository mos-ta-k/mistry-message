import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import UserMessageView from "./components/UserMessageView";
import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./components/AdminLogin";
import { api } from "./services/api";

export default function App() {
  const [currentView, setCurrentView] = useState("user"); // 'user' | 'admin'
  const [targetHandle, setTargetHandle] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check URL pathname for custom link, e.g., /u/:username
  const parseUrlRoute = () => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const toParam = searchParams.get("to");

    if (path.startsWith("/u/")) {
      const handle = path.slice(3).replace(/\/$/, "").trim();
      setTargetHandle(handle);
      setCurrentView("user");
    } else if (toParam) {
      setTargetHandle(toParam.trim());
      setCurrentView("user");
    } else if (searchParams.get("view") === "admin") {
      setCurrentView("admin");
      setTargetHandle("");
    } else if (path === "/admin") {
      setCurrentView("admin");
      setTargetHandle("");
    } else {
      setTargetHandle("");
    }
  };

  useEffect(() => {
    parseUrlRoute();
    window.addEventListener("popstate", parseUrlRoute);
    return () => window.removeEventListener("popstate", parseUrlRoute);
  }, []);

  // Check if admin is authenticated on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.restoreSession();
        if (data?.user) {
          setAdminUser(data.user);
          if (window.location.pathname === '/' && !window.location.search) {
            setCurrentView('admin');
          }
        }
      } catch (err) {
        console.warn("Session expired:", err.message);
        if (!api.getToken()) setAdminUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (user) => {
    window.history.replaceState({}, '', '/?view=admin');
    setTargetHandle('');
    setAdminUser(user);
    setCurrentView("admin");
  };

  const handleLogout = async () => {
    await api.logout();
    window.history.replaceState({}, '', '/');
    setTargetHandle('');
    setAdminUser(null);
    setCurrentView("user");
  };

  const handleSessionExpired = () => {
    api.setToken(null);
    setAdminUser(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-main)",
      }}
    >
      <Navbar
        currentView={currentView}
        setView={(v) => {
          if (v === "user") {
            window.history.pushState({}, "", "/");
            setTargetHandle("");
          } else if (v === "admin") {
            window.history.pushState({}, "", "/?view=admin");
            setTargetHandle("");
          }
          setCurrentView(v);
        }}
        adminUser={adminUser}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1 }}>
        {currentView === "user" && (
          <UserMessageView targetHandle={targetHandle} />
        )}

        {currentView === "admin" &&
          (adminUser ? (
            <AdminDashboard
              adminUser={adminUser}
              onUserUpdated={setAdminUser}
              onSessionExpired={handleSessionExpired}
            />
          ) : (
            <AdminLogin onLoginSuccess={handleLoginSuccess} />
          ))}
      </main>
    </div>
  );
}
