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
  User as UserIcon 
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/scholarships", label: "Search", icon: Search },
    { path: "/applications", label: "Applications", icon: FileText },
    { path: "/documents", label: "Documents", icon: Folder },
    { path: "/profile", label: "Profile", icon: UserIcon },
  ];

  if (isMobile) {
    return (
      <>
        {/* Top Navigation */}
        <nav className="bg-surface shadow-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <GraduationCap className="text-primary text-2xl" />
                <span className="text-xl font-bold text-primary">ScholarLink</span>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  className="relative text-gray-600 hover:text-primary transition-colors"
                  data-testid="button-notifications"
                >
                  <Bell className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </button>
                <button 
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="text-gray-600 hover:text-primary"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 px-4 py-2 z-40">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <button 
                    className={`flex flex-col items-center py-2 ${
                      isActive ? 'text-primary' : 'text-gray-400'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs mt-1">{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <nav className="bg-surface shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <GraduationCap className="text-primary text-2xl" />
              <span className="text-xl font-bold text-primary">ScholarLink</span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <span 
                    className={`text-sm font-medium transition-colors cursor-pointer ${
                      isActive 
                        ? 'text-primary border-b-2 border-primary pb-4' 
                        : 'text-gray-600 hover:text-primary'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <button 
              className="relative text-gray-600 hover:text-primary transition-colors"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getInitials(user?.firstName || undefined, user?.lastName || undefined)}
                </span>
              </div>
              <span className="text-sm font-medium">
                {user?.firstName || 'User'}
              </span>
              <button 
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <ChevronDown className="text-gray-400 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
