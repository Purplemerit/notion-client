
'use client';

import React from "react";
import { Home, Mail, Users, BarChart3, Settings, LogOut, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authAPI } from "@/lib/api";
import Image from "next/image";

export default function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    // authAPI.logout() handles the redirect automatically
    authAPI.logout();
  };

  const navItems = [
    { href: "/admin/home", icon: Home },
    { href: "/admin/email", icon: Mail },
    { href: "/admin/contact", icon: Users, extraStyle: { marginTop: 63 } },
    { href: "/admin/kanban", icon: BarChart3 },
    { href: "/admin/community", icon: BookOpen },
  ];
  return (
    <aside
      style={{
        display: "flex",
        width: 106,
        height: "100vh",
        padding: "24px 0",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        borderRadius: "0 24px 24px 0",
        border: "2px solid #F1F1F1",
        background: "linear-gradient(174deg, #C9C4EE 0%, #EFEDFA 56.33%, #E1DEF6 100%)",
      }}
    >
      {/* Top Section */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, width: "100%" }}>
        {/* Logo Section */}
        <div>
          <Image 
            src="/purplemerit.svg" 
            alt="Purple Merit Logo" 
            width={40} 
            height={40}
            priority
           />
          <div style={{ textAlign: "center", lineHeight: 1.2 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#4A3F8F" }}>Purple</div>
            <div style={{ fontSize: 14, fontWeight: 400, color: "#AEA1E4" }}>Merit</div>
          </div>
        </div>

        {/* Navigation Icons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", paddingTop: 32 }}>
          {navItems.map((item, idx) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "flex",
                    width: 74,
                    padding: "8px 10px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 16,
                    background: isActive ? "#AEA1E4" : "transparent",
                    cursor: "pointer",
                    ...item.extraStyle,
                  }}
                >
                  <Icon
                    size={24}
                    color={isActive ? "#fff" : "#4A3F8F"}
                    strokeWidth={2}
                    style={{ width: 24, height: 24, flexShrink: 0, ...(isActive ? { filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.25))' } : {}) }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingBottom: 24 }}>
        {/* Settings Icon */}
        <Link href="/admin/settings" style={{ textDecoration: "none" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <Settings
              size={24}
              color={pathname?.startsWith('/admin/settings') ? "#8B7BE8" : "#4A3F8F"}
              strokeWidth={2}
              style={{ width: 24, height: 24, flexShrink: 0 }}
            />
          </div>
        </Link>

        {/* Logout Icon */}
        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <LogOut 
            size={24} 
            color="#4A3F8F" 
            strokeWidth={2} 
            style={{ width: 24, height: 24, flexShrink: 0 }} 
          />
        </div>
      </div>
    </aside>
  );
}
