import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Plus,
  Folder,
  AlertCircle
} from "lucide-react";
import type { UploadResult } from '@uppy/core';

interface Document {
  id: string;
  studentId: string;
  type: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

const DOCUMENT_TYPES = [
  { value: "transcript", label: "Transcript", icon: "📄" },
  { value: "resume", label: "Resume/CV", icon: "📝" },
  { value: "essay", label: "Essay", icon: "✍️" },
  { value: "letter_of_recommendation", label: "Letter of Recommendation", icon: "📋" },
  { value: "diploma", label: "Diploma/Certificate", icon: "🎓" },
  { value: "financial_aid", label: "Financial Aid Document", icon: "💰" },
  { value: "other", label: "Other", icon: "📎" },
];

export default function Documents() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    type: "",
  });
  const [typeFilter, setTypeFilter] = useState("all");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch documents
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    retry: false,
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Create document record mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: {
      type: string;
      title: string;
      fileName: string;
      filePath: string;
      fileSize: number;
    }) => {
      return await apiRequest("POST", "/api/documents", documentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploadDialogOpen(false);
      setUploadForm({ title: "", type: "" });
      toast({
        title: "Success",
        description: "Document uploaded successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save document record",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL as string;
      
      try {
        // Set ACL policy for the uploaded file
        const aclResponse = await apiRequest("PUT", "/api/documents/upload", {
          fileURL: uploadURL
        });
        const aclData = await aclResponse.json();
        
        // Create document record
        createDocumentMutation.mutate({
          type: uploadForm.type,
          title: uploadForm.title,
          fileName: uploadedFile.name || 'untitled',
          filePath: aclData.objectPath,
          fileSize: uploadedFile.size || 0,
        });
      } catch (error) {
        if (isUnauthorizedError(error as Error)) {
          toast({
            title: "Unauthorized",
            description: "You are logged out. Logging in again...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 500);
          return;
        }
        toast({
          title: "Error",
          description: "Failed to process uploaded file",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownload = (document: Document) => {
    window.open(document.filePath, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (type: string) => {
    const docType = DOCUMENT_TYPES.find(t => t.value === type);
    return docType?.icon || "📎";
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'transcript':
        return 'bg-blue-100 text-blue-800';
      case 'resume':
        return 'bg-green-100 text-green-800';
      case 'essay':
        return 'bg-purple-100 text-purple-800';
      case 'letter_of_recommendation':
        return 'bg-yellow-100 text-yellow-800';
      case 'diploma':
        return 'bg-orange-100 text-orange-800';
      case 'financial_aid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter documents
  const filteredDocuments = documents?.filter(doc => 
    typeFilter === "all" || doc.type === typeFilter
  ) || [];

  // Sort documents by upload date (newest first)
  const sortedDocuments = filteredDocuments.sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  const documentCounts = DOCUMENT_TYPES.reduce((acc, type) => {
    acc[type.value] = documents?.filter(doc => doc.type === type.value).length || 0;
    return acc;
  }, {} as Record<string, number>);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-gray">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-gray">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-documents-title">
              Document Vault
            </h1>
            <p className="text-gray-600">
              Store and manage your important documents securely.
            </p>
          </div>
          
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-700" data-testid="button-upload-document">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="document-title">Document Title</Label>
                  <Input
                    id="document-title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Official Transcript - Fall 2024"
                    data-testid="input-document-title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="document-type">Document Type</Label>
                  <Select 
                    value={uploadForm.type} 
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {uploadForm.title && uploadForm.type && (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Upload className="w-4 h-4" />
                      <span>Choose File to Upload</span>
                    </div>
                  </ObjectUploader>
                )}

                {(!uploadForm.title || !uploadForm.type) && (
                  <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Please fill in all fields before uploading.</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border border-gray-200 sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Folder className="w-5 h-5" />
                  <span>Document Types</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={typeFilter === "all" ? "default" : "ghost"}
                  onClick={() => setTypeFilter("all")}
                  className="w-full justify-between"
                  data-testid="filter-all-documents"
                >
                  <span>All Documents</span>
                  <Badge variant="secondary">{documents?.length || 0}</Badge>
                </Button>
                
                {DOCUMENT_TYPES.map(type => (
                  <Button
                    key={type.value}
                    variant={typeFilter === type.value ? "default" : "ghost"}
                    onClick={() => setTypeFilter(type.value)}
                    className="w-full justify-between text-left"
                    data-testid={`filter-${type.value}`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{type.icon}</span>
                      <span className="truncate">{type.label}</span>
                    </span>
                    <Badge variant="secondary">{documentCounts[type.value]}</Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Documents List */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="text-documents-count">
                {sortedDocuments.length} Documents
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="p-6">
                    <div className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                        <div className="flex space-x-2">
                          <Skeleton className="w-8 h-8" />
                          <Skeleton className="w-8 h-8" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : sortedDocuments.length > 0 ? (
              <div className="space-y-4">
                {sortedDocuments.map((document) => (
                  <Card key={document.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-2xl">
                            {getDocumentIcon(document.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-gray-900 truncate" data-testid="text-document-title">
                                {document.title}
                              </h3>
                              <Badge className={`text-xs ${getTypeBadgeColor(document.type)}`}>
                                {DOCUMENT_TYPES.find(t => t.value === document.type)?.label || document.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate" data-testid="text-document-filename">
                              {document.fileName}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span data-testid="text-document-size">
                                {formatFileSize(document.fileSize)}
                              </span>
                              <span data-testid="text-document-date">
                                Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            data-testid="button-download-document"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            className="p-2 text-gray-400 hover:text-green-600"
                            data-testid="button-view-document"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(document.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            disabled={deleteMutation.isPending}
                            data-testid="button-delete-document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <Folder className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {typeFilter === "all" ? "No documents yet" : `No ${DOCUMENT_TYPES.find(t => t.value === typeFilter)?.label.toLowerCase()} documents`}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {typeFilter === "all" 
                      ? "Upload your first document to get started." 
                      : "Upload documents of this type to see them here."
                    }
                  </p>
                  <Button
                    onClick={() => setUploadDialogOpen(true)}
                    className="bg-primary hover:bg-blue-700"
                    data-testid="button-upload-first-document"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
