import { Link } from "wouter";
import { BillingLink } from "@/components/BillingLink";
import { GraduationCap } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-50 border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="text-primary h-6 w-6" />
              <span className="text-lg font-bold text-primary">ScholarLink</span>
            </div>
            <p className="text-sm text-gray-600 max-w-xs">
              Empowering students to discover and apply for scholarships with AI-powered assistance and comprehensive application management.
            </p>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/scholarships">
                  <span className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    Find Scholarships
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/essay-assistant">
                  <span className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    Essay Assistant
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/documents">
                  <span className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    Document Vault
                  </span>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Account */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/profile">
                  <span className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    My Profile
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/applications">
                  <span className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    My Applications
                  </span>
                </Link>
              </li>
              <li>
                <BillingLink variant="footer" source="footer" />
              </li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/help">
                  <span className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    Help Center
                  </span>
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            © {currentYear} ScholarLink. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 sm:mt-0">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
              Status
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
              API Docs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}