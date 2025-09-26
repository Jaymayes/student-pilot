import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/user";
import { 
  GraduationCap, 
  Bell, 
  ChevronDown, 
  Menu, 
  Home, 
  Search, 
  FileText, 
  Folder, 
  User as UserIcon,
  CreditCard,
  X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useResponsive } from "@/utils/responsive";
import { FocusManager, AriaUtils } from "@/utils/accessibility";

export function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Enhanced navigation items with accessibility attributes
  const navItems = [
    { path: "/", label: "Dashboard", icon: Home, description: "View your scholarship dashboard and overview" },
    { path: "/scholarships", label: "Search", icon: Search, description: "Search and discover scholarships" },
    { path: "/applications", label: "Applications", icon: FileText, description: "Manage your scholarship applications" },
    { path: "/documents", label: "Documents", icon: Folder, description: "Upload and manage documents" },
    { path: "/billing", label: "Credits", icon: CreditCard, description: "Manage credits and billing" },
    { path: "/profile", label: "Profile", icon: UserIcon, description: "Edit your profile and preferences" },
  ];

  // Handle mobile menu toggle with focus management
  const toggleMobileMenu = () => {
    setShowMobileMenu(prev => {
      const newState = !prev;
      
      // Focus management for accessibility
      if (newState) {
        setTimeout(() => {
          const firstMenuItem = mobileMenuRef.current?.querySelector('a');
          firstMenuItem?.focus();
        }, 100);
      } else {
        menuButtonRef.current?.focus();
      }
      
      return newState;
    });
  };

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMobileMenu) {
        setShowMobileMenu(false);
        menuButtonRef.current?.focus();
      }
    };

    if (showMobileMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showMobileMenu]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMobileMenu && 
          mobileMenuRef.current && 
          !mobileMenuRef.current.contains(e.target as Node) &&
          !menuButtonRef.current?.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMobileMenu]);

  if (isMobile || isTablet) {
    return (
      <>
        {/* Skip Link for Screen Readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Skip to main content
        </a>

        {/* Top Navigation */}
        <nav 
          className="bg-surface shadow-md border-b border-gray-200 sticky top-0 z-50"
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary focus:rounded-md">
                <GraduationCap className="text-primary text-2xl" aria-hidden="true" />
                <span className="text-xl font-bold text-primary">ScholarLink</span>
              </Link>

              {/* Header Actions */}
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <button 
                  className="relative p-2 text-gray-600 hover:text-primary transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Notifications (3 unread)"
                  data-testid="button-notifications"
                >
                  <Bell className="h-6 w-6" />
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    3
                  </span>
                </button>

                {/* Mobile Menu Toggle */}
                <button 
                  ref={menuButtonRef}
                  onClick={toggleMobileMenu}
                  className="p-2 text-gray-600 hover:text-primary transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={showMobileMenu ? "Close menu" : "Open menu"}
                  aria-expanded={showMobileMenu}
                  aria-controls="mobile-menu"
                  data-testid="button-mobile-menu"
                >
                  {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {showMobileMenu && (
            <div
              ref={mobileMenuRef}
              id="mobile-menu"
              className="absolute top-full left-0 right-0 bg-surface border-b border-gray-200 shadow-lg z-40"
              role="menu"
              aria-label="Navigation menu"
            >
              <div className="px-4 py-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <div
                        role="menuitem"
                        tabIndex={index === 0 ? 0 : -1}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] ${
                          isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                        data-testid={`nav-${item.label.toLowerCase()}`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Enhanced Bottom Navigation for Mobile */}
        {isMobile && (
          <nav
            className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 px-2 py-1 z-40 safe-area-bottom"
            role="navigation"
            aria-label="Bottom navigation"
          >
            <div className="flex justify-around">
              {navItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <button 
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-w-[60px] min-h-[50px] ${
                        isActive ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      aria-label={`${item.label}: ${item.description}`}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs mt-1 leading-tight">{item.label}</span>
                    </button>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Overlay for mobile menu */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          />
        )}
      </>
    );
  }

  // Desktop Navigation
  return (
    <>
      {/* Skip Link for Screen Readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      <nav 
        className="bg-surface shadow-md border-b border-gray-200 sticky top-0 z-50"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary focus:rounded-md">
              <GraduationCap className="text-primary text-2xl" aria-hidden="true" />
              <span className="text-xl font-bold text-primary">ScholarLink</span>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <span 
                      className={`text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:rounded-md px-2 py-1 cursor-pointer ${
                        isActive 
                          ? 'text-primary border-b-2 border-primary pb-4' 
                          : 'text-gray-600 hover:text-primary'
                      }`}
                      role="link"
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button 
                className="relative p-2 text-gray-600 hover:text-primary transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Notifications (3 unread)"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                <span 
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  aria-hidden="true"
                >
                  3
                </span>
              </button>

              {/* Profile Menu */}
              {user && (
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => window.location.href = "/api/logout"}
                    variant="outline"
                    size="sm"
                    className="focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="button-logout"
                  >
                    Logout
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.firstName}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
