import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Settings, Video, Info, Shield, Menu, X } from "lucide-react";

export const Navbar = ({ currentRoute, setRoute }) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Compressor", route: "#/app", icon: Video },
    { label: "Settings", route: "#/settings", icon: Settings },
    { label: "About", route: "#/about", icon: Info },
    { label: "Privacy", route: "#/privacy", icon: Shield },
  ];

  const navigateTo = (route) => {
    setRoute(route);
    window.location.hash = route;
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="navbar-container flex h-16 items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigateTo("#/")}
          className="flex items-center space-x-3.5 group hover:opacity-90 transition-opacity"
        >
          <div className="relative flex h-9 w-9 items-center justify-center">
            {/* Dark Mode Glow: extremely soft, white/radial, blur 32px */}
            <div className="absolute inset-[-18px] rounded-full hidden dark:block bg-radial-glow-dark filter blur-[32px] animate-aurora-glow pointer-events-none z-0" />
            {/* Light Mode Glow: soft, dark/radial, blur 28px */}
            <div className="absolute inset-[-18px] rounded-full dark:hidden bg-radial-glow-light filter blur-[28px] animate-aurora-glow pointer-events-none z-0" />

            {/* Logo Badge & Icon */}
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background dark:bg-foreground dark:text-background group-hover:scale-105 transition-all shadow-md">
              <svg
                className="h-5 w-5"
                viewBox="0 0 512 512"
                fill="none"
                stroke="currentColor"
              >
                <rect x="32" y="32" width="448" height="448" rx="96" strokeWidth="36" strokeLinejoin="round" />
                <path d="M38 216 H180 L120 110 L220 256 L120 402 L180 296 H38 Z" fill="currentColor" />
                <path d="M474 216 H332 L392 110 L292 256 L392 402 L332 296 H474 Z" fill="currentColor" />
                <path d="M242 190 Q226 256 242 322" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
                <path d="M270 190 Q286 256 270 322" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <span className="font-sans text-[22px] font-extrabold tracking-tight text-foreground select-none">
            Compressly
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => navigateTo(item.route)}
                className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-sans text-sm font-medium transition-all ${
                  isActive
                    ? "bg-foreground/5 text-foreground dark:bg-foreground/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 dark:hover:bg-foreground/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-border mx-2" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>

        {/* Mobile Menu Buttons */}
        <div className="flex items-center space-x-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md px-4 py-4 space-y-2 animate-in fade-in slide-in-from-top-5 duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => navigateTo(item.route)}
                className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 font-sans text-base font-medium transition-all ${
                  isActive
                    ? "bg-foreground/5 text-foreground dark:bg-foreground/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 dark:hover:bg-foreground/5"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
