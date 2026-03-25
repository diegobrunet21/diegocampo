import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Users, Building2, GitCompare,
  Plus, DollarSign, LogOut, Menu, X, Zap } from "lucide-react";
import AIAssistant from "@/components/listings/ListingAIAssistant";

const navItems = [
{ name: "Dashboard", page: "Dashboard", icon: LayoutDashboard, roles: ["broker", "agent"] },
{ name: "Buyers", page: "Buyers", icon: Users, roles: ["broker", "agent"] },
{ name: "Listings", page: "Listings", icon: Building2, roles: ["broker", "agent"] },
{ name: "Matches", page: "Matches", icon: GitCompare, roles: ["broker", "agent"] },
{ name: "Quick Add", page: "QuickAdd", icon: Plus, roles: ["broker", "agent"] },
{ name: "Capital", page: "Capital", icon: DollarSign, roles: ["broker", "loan_officer", "agent"] }];


export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, [currentPageName]);

  // Onboarding: no chrome
  if (currentPageName === "Onboarding") {
    return (
      <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
        {children}
      </div>);

  }

  // Not yet loaded or not logged in: just render children (platform handles auth redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <p className="text-blue-200 text-sm font-medium">Loading DealMapper…</p>
        </div>
      </div>);

  }

  const filteredNav = navItems.filter((item) => !user.app_role || item.roles.includes(user.app_role));
  const roleLabel = (user.app_role || "user").replace(/_/g, " ");
  const initials = (user.full_name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0f1e" }}>
      {/* Mobile overlay */}
      {sidebarOpen &&
      <div className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      }

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "#0d1526", borderRight: "1px solid rgba(99,179,237,0.12)" }}>

        {/* Logo */}
        <div className="h-16 flex items-center px-5 shrink-0" style={{ borderBottom: "1px solid rgba(99,179,237,0.10)" }}>
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Deal<span className="text-cyan-400">Mapper</span>
            </span>
          </Link>
          <button className="ml-auto lg:hidden text-slate-300 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                active ?
                "text-white bg-blue-500/20 border border-blue-400/40" :
                "text-slate-200 hover:text-white hover:bg-white/10 border border-transparent"}`
                }>

                {active &&
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-r-full" />
                }
                <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-300" : "text-blue-200/70"}`} />
                <span>{item.name}</span>
              </Link>);

          })}
        </nav>

        {/* User footer */}
        <div className="p-3 shrink-0" style={{ borderTop: "1px solid rgba(99,179,237,0.10)" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gradient-to-br from-blue-500 to-violet-500">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.full_name || "User"}</p>
              <p className="text-[10px] text-blue-300/70 capitalize">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-300 hover:text-red-200 transition-all text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
              title="Sign Out">

              <LogOut className="w-3.5 h-3.5" />
              <span>Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="h-14 lg:hidden flex items-center px-4 shrink-0"
          style={{ background: "#0d1526", borderBottom: "1px solid rgba(99,179,237,0.10)" }}>

          <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm text-white">Deal<span className="text-cyan-400">Mapper</span></span>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-red-300 hover:text-red-200 transition-all text-xs font-semibold"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>

            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </header>

        <main className="text-slate-50 p-4 flex-1 overflow-auto md:p-6 lg:p-8">
          {children}
        </main>
        <AIAssistant />
      </div>
    </div>);

}