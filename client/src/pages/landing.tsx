import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { GraduationCap, Search, FileText, Folder, PenTool, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background-gray">
      {/* Header */}
      <nav className="bg-surface shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="text-primary text-2xl" />
              <span className="text-xl font-bold text-primary">ScholarLink</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-blue-700"
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Your Scholarship Journey
            <br />
            <span className="text-primary">Starts Here</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover scholarships tailored to your profile, manage applications effortlessly, 
            and get expert essay assistance—all in one powerful platform.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-blue-700 text-lg px-8 py-4"
            data-testid="button-get-started"
          >
            Start Your Journey
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-gray-600">
            Comprehensive tools to maximize your scholarship opportunities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Search className="text-primary text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Matching</h3>
              <p className="text-gray-600">
                Get personalized scholarship recommendations based on your academic profile, 
                interests, and eligibility criteria.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
                <FileText className="text-secondary text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Tracking</h3>
              <p className="text-gray-600">
                Stay organized with deadline reminders, progress tracking, 
                and application status updates all in one place.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                <PenTool className="text-purple-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Essay Assistant</h3>
              <p className="text-gray-600">
                Get AI-powered writing assistance, outline generation, 
                and feedback to craft compelling scholarship essays.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
                <Folder className="text-accent text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Vault</h3>
              <p className="text-gray-600">
                Securely store and manage transcripts, resumes, recommendation letters, 
                and other important documents.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                <Shield className="text-red-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy First</h3>
              <p className="text-gray-600">
                Your personal information is protected with enterprise-grade security 
                and privacy controls.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <GraduationCap className="text-gray-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Success Focused</h3>
              <p className="text-gray-600">
                Join thousands of students who have secured scholarships 
                using our comprehensive platform.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Find Your Perfect Scholarship?
            </h2>
            <p className="text-blue-100 text-lg mb-8">
              Join thousands of students who have already started their journey to educational funding success.
            </p>
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => window.location.href = '/api/login'}
              className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-4"
              data-testid="button-join-now"
            >
              Join ScholarLink Today
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
