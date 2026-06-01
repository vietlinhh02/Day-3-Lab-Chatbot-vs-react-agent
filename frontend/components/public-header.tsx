"use client";

import Link from "next/link";
import { Buildings, List, X } from "phosphor-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/login", label: "Đăng nhập" },
  { href: "#features", label: "Tính năng" },
  { href: "#pricing", label: "Bảng giá" },
  { href: "#contact", label: "Liên hệ" },
];

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#eef0f3] bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0052ff]">
            <Buildings size={16} className="text-white" />
          </div>
          <span className="text-base font-semibold text-[#0a0b0d] tracking-tight">
            Crewwise
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#5b616e] hover:text-[#0a0b0d] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              className="rounded-full text-sm font-medium text-[#0a0b0d] hover:bg-[#f7f7f7]"
            >
              Đăng nhập
            </Button>
          </Link>
          <Link href="/login">
            <Button className="rounded-full bg-[#0052ff] text-white text-sm font-semibold hover:bg-[#003ecc]">
              Bắt đầu
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[#5b616e] hover:bg-[#f7f7f7]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#eef0f3] bg-white px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-[#5b616e] hover:text-[#0a0b0d] py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#eef0f3] flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button
                variant="ghost"
                className="w-full rounded-full text-sm font-medium"
              >
                Đăng nhập
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button className="w-full rounded-full bg-[#0052ff] text-white text-sm font-semibold hover:bg-[#003ecc]">
                Bắt đầu
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
