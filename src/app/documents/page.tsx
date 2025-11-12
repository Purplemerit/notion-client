'use client';

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { documentsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2, Loader2 } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsAPI.getAll();
      setDocuments(data);
    } catch (error: any) {
      toast({
        title: 'Error Loading Documents',
        description: error.message || 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      toast({
        title: 'Missing Information',
        description: 'Please select a file and provide a title',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      // First upload the file
      const uploadResult = await documentsAPI.upload(selectedFile);

      // Then create the document record
      await documentsAPI.create({
        title,
        fileUrl: uploadResult.url,
        fileType: uploadResult.fileType || selectedFile.type,
        fileSize: uploadResult.fileSize || selectedFile.size,
      });

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      setShowUploadDialog(false);
      setTitle('');
      setSelectedFile(null);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentsAPI.delete(id);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Documents</h1>
            <Button
              className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
              onClick={() => setShowUploadDialog(!showUploadDialog)}
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload Document</span>
              <span className="sm:hidden ml-2">Upload</span>
            </Button>
          </div>

          {showUploadDialog && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload New Document</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter document title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="file">Select File</Label>
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-600 mt-2">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || !selectedFile || !title}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowUploadDialog(false);
                        setTitle('');
                        setSelectedFile(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                  <p className="mt-4 text-gray-600">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-400" />
                  <p className="mt-4 text-gray-600">No documents yet. Upload your first document!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="bg-purple-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {formatFileSize(doc.fileSize)} • Uploaded {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 flex-1 sm:flex-none"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Download className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(doc._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
