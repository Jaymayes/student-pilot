import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { BillingLink } from "@/components/BillingLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, CreditCard, FileText, Users, Lock } from "lucide-react";

export default function Help() {
  return (
    <div className="min-h-screen bg-background-gray">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="text-primary text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Help & FAQ</h1>
          <p className="text-lg text-gray-600">
            Everything you need to know about using ScholarLink
          </p>
        </div>

        <div className="space-y-8">
          {/* Getting Started */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I complete my profile?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Complete your profile by visiting the Profile page and filling out all sections:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li>Personal information (name, email, phone)</li>
                      <li>Academic details (GPA, school, graduation year)</li>
                      <li>Demographics and background information</li>
                      <li>Areas of interest and career goals</li>
                      <li>Upload required documents (transcript, essays)</li>
                    </ul>
                    <p className="text-gray-600 mt-2">
                      A complete profile helps our AI find better scholarship matches for you.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>How does scholarship matching work?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Our AI-powered matching system analyzes your profile and compares it against thousands of scholarships to find the best matches based on:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li>Academic performance and GPA requirements</li>
                      <li>Field of study and career interests</li>
                      <li>Demographics and background criteria</li>
                      <li>Location and residency requirements</li>
                      <li>Financial need and income thresholds</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I apply for scholarships?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Apply for scholarships by following these steps:
                    </p>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-600">
                      <li>Browse matched scholarships on the Search page</li>
                      <li>Click on scholarships that interest you</li>
                      <li>Review requirements and deadlines</li>
                      <li>Click "Start Application" to begin</li>
                      <li>Use our auto-fill feature to populate forms</li>
                      <li>Get essay assistance from our AI coach</li>
                      <li>Submit your application before the deadline</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Credits & Billing */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
                Credits & Billing
                <Badge variant="outline" className="ml-2">Important</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="credit-1">
                  <AccordionTrigger>How to purchase credits</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600 mb-4">
                      Credits power our AI features like essay assistance and advanced scholarship matching. Purchase credits through our secure billing portal:
                    </p>
                    
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">Ready to purchase credits?</p>
                          <p className="text-sm text-blue-700">$1 = 1000 credits • Secure Stripe checkout</p>
                        </div>
                        <BillingLink variant="button" source="help-faq" campaign="credit-purchase" />
                      </div>
                    </div>

                    <p className="text-gray-600">
                      <strong>Credit Packages Available:</strong>
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li>Starter: $5 (5,000 credits) + 5% bonus</li>
                      <li>Plus: $15 (15,000 credits) + 10% bonus</li>
                      <li>Pro: $35 (35,000 credits) + 15% bonus</li>
                      <li>Premium: $60 (60,000 credits) + 18% bonus</li>
                      <li>Enterprise: $100 (100,000 credits) + 20% bonus</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="credit-2">
                  <AccordionTrigger>View your ledger and transaction history</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600 mb-4">
                      Track all your credit purchases, usage, and balance through the billing portal:
                    </p>
                    
                    <div className="space-y-2 text-gray-600">
                      <p>• <strong>Real-time Balance:</strong> See your current credit balance</p>
                      <p>• <strong>Transaction History:</strong> Complete record of purchases and usage</p>
                      <p>• <strong>Usage Analytics:</strong> Understand how credits are being used</p>
                      <p>• <strong>CSV Export:</strong> Download transaction data for records</p>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <BillingLink variant="button" source="help-faq" campaign="view-ledger">
                        View Billing Portal
                      </BillingLink>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="credit-3">
                  <AccordionTrigger>What do credits cost for different features?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600 mb-4">
                      Credits are consumed based on AI model usage:
                    </p>
                    
                    <div className="space-y-3">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Essay Analysis & Feedback</h4>
                        <p className="text-sm text-gray-600">GPT-4o model usage:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
                          <li>Input: 20 credits per 1,000 tokens (~750 words)</li>
                          <li>Output: 60 credits per 1,000 tokens generated</li>
                          <li>Typical essay review: 50-150 credits</li>
                        </ul>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Scholarship Matching</h4>
                        <p className="text-sm text-gray-600">AI-powered matching analysis:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
                          <li>Profile analysis: 30-50 credits</li>
                          <li>Match scoring: 10-20 credits per scholarship</li>
                          <li>Reason generation: 20-40 credits per match</li>
                        </ul>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      * Credit usage varies based on content length and complexity
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Features & Usage */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Features & Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="feature-1">
                  <AccordionTrigger>How does the Essay Assistant work?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      The Essay Assistant uses advanced AI to help you write compelling scholarship essays:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li><strong>Prompt Analysis:</strong> Understand what the prompt is asking</li>
                      <li><strong>Structure Guidance:</strong> Get recommendations for essay organization</li>
                      <li><strong>Content Suggestions:</strong> Receive ideas for what to include</li>
                      <li><strong>Grammar & Style:</strong> Improve writing quality and flow</li>
                      <li><strong>Feedback Loop:</strong> Iterative improvements based on drafts</li>
                    </ul>
                    <p className="text-gray-600 mt-2">
                      <em>Note: Essay assistance requires credits for AI processing.</em>
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="feature-2">
                  <AccordionTrigger>What is the Document Vault?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      The Document Vault is your secure storage system for all scholarship-related documents:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li>Upload transcripts, recommendation letters, and essays</li>
                      <li>Organize documents by category and scholarship</li>
                      <li>Auto-fill applications using stored information</li>
                      <li>Version control for essay drafts</li>
                      <li>Secure, encrypted cloud storage</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="feature-3">
                  <AccordionTrigger>How do I track application deadlines?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Stay on top of deadlines with our comprehensive tracking system:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li>Dashboard shows upcoming deadlines for the next 30 days</li>
                      <li>Color-coded urgency levels (red for urgent, yellow for upcoming)</li>
                      <li>Email reminders sent before deadlines</li>
                      <li>Calendar integration for personal planning</li>
                      <li>Progress tracking for each application</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-600" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="privacy-1">
                  <AccordionTrigger>How is my data protected?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      We take data security seriously and implement multiple layers of protection:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li><strong>Encryption:</strong> All data encrypted in transit and at rest</li>
                      <li><strong>Access Control:</strong> Role-based access with strong authentication</li>
                      <li><strong>Regular Audits:</strong> Security assessments and vulnerability scanning</li>
                      <li><strong>Compliance:</strong> SOC 2 Type II and GDPR compliant</li>
                      <li><strong>Data Minimization:</strong> We only collect necessary information</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="privacy-2">
                  <AccordionTrigger>Who can see my scholarship applications?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Your application data is completely private and only accessible to:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                      <li><strong>You:</strong> Full access to all your data</li>
                      <li><strong>Scholarship Organizations:</strong> Only applications you submit to them</li>
                      <li><strong>ScholarLink Support:</strong> Limited access for technical support (with permission)</li>
                    </ul>
                    <p className="text-gray-600 mt-2">
                      We never share your personal information with third parties without explicit consent.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle>Still Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Email Support</p>
                    <p className="text-sm text-gray-600">Get detailed help via email</p>
                  </div>
                  <a
                    href="mailto:support@scholarlink.com"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Contact Support
                  </a>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Live Chat</p>
                    <p className="text-sm text-gray-600">Available Monday-Friday, 9 AM - 6 PM EST</p>
                  </div>
                  <button className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary/90 transition-colors">
                    Start Chat
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}