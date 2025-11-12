'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input as UiInput } from '@/components/ui/input';
import { Search, Folder, MoreVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collectionsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Collection {
  _id: string;
  name: string;
  rows: number;
  cols: number;
  status: 'draft' | 'published';
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CollectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentDrafts, setRecentDrafts] = useState<Collection[]>([]);
  const [savedCollections, setSavedCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      
      // Load recent drafts
      const draftsResponse = await collectionsAPI.getRecentDrafts(5);
      if (draftsResponse.success) {
        setRecentDrafts(draftsResponse.drafts || []);
      }

      // Load published collections
      const publishedResponse = await collectionsAPI.getPublished();
      if (publishedResponse.success) {
        setSavedCollections(publishedResponse.collections || []);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast({
        title: "Error",
        description: "Failed to load collections",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '/');
  };

  const calculateSize = (collection: Collection) => {
    // Simple size estimation
    return '4mb'; // Placeholder - can be calculated based on actual data
  };

  const filteredCollections = savedCollections.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper for image upload to base64
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>, collection: Collection) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(collection._id);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        await collectionsAPI.update(collection._id, { thumbnail: base64 });
        toast({ title: 'Thumbnail updated!' });
        loadCollections();
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to update thumbnail', variant: 'destructive' });
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await collectionsAPI.delete(id);
      toast({ title: 'Collection deleted!' });
      setDeleteDialogOpen(null);
      loadCollections();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete collection', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 bg-white p-8 overflow-y-auto">
        {/* Row 1: Collections Title and Search Bar */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center" style={{ gap: '64px' }}>
            <h1 className="text-3xl font-bold text-gray-800">Collections</h1>
            <div className="relative" style={{ width: '528px', height: '40px', flexShrink: 0 }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-white h-full w-full"
                style={{
                  borderRadius: '24px',
                  border: '1px solid #E6E6E6',
                  background: '#FFF',
                  boxShadow: '0 4px 4px 0 rgba(221, 221, 221, 0.25)'
                }}
              />
            </div>
          </div>
        </header>

        {/* Row 2: Recent Drafts */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Drafts</h2>
          <div className="flex gap-4 overflow-x-auto">
            {/* Create New Card */}
            <Card 
              className="border-2 border-dashed border-gray-300 bg-white hover:border-gray-400 transition-colors cursor-pointer"
              style={{
                width: '160px',
                height: '200px',
                borderRadius: '16px',
                flexShrink: 0
              }}
              onClick={() => router.push('/collection/editor')}
            >
              <CardContent className="flex flex-col items-center justify-center h-full p-4">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center mb-3">
                  <Plus className="h-6 w-6 text-gray-400" />
                </div>
                <span className="text-sm text-gray-500 font-medium">Create New</span>
              </CardContent>
            </Card>

            {/* Recent Draft Cards */}
            {isLoading ? (
              <div className="text-gray-500">Loading drafts...</div>
            ) : recentDrafts.length === 0 ? (
              <div className="text-gray-500 text-sm">No drafts yet. Create one to get started!</div>
            ) : (
              recentDrafts.map((draft) => (
                <Card 
                  key={draft._id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  style={{
                    width: '160px',
                    height: '200px',
                    borderRadius: '16px',
                    border: '1px solid #E8E8E8',
                    background: 'rgba(135, 135, 135, 0.06)',
                    flexShrink: 0
                  }}
                  onClick={() => router.push(`/collection/editor?id=${draft._id}`)}
                >
                  <CardContent className="p-4 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <Folder className="h-8 w-8 text-gray-600" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                        <MoreVertical className="h-4 w-4 text-gray-600" />
                      </Button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2 truncate">{draft.name}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{calculateSize(draft)}</span>
                        <span>{formatDate(draft.updatedAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Row 4: Saved Collections */}
        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Saved Collections</h2>
          {isLoading ? (
            <div className="text-gray-500">Loading collections...</div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-gray-500 text-sm">
              {searchQuery ? 'No collections found matching your search.' : 'No saved collections yet. Create and publish one!'}
            </div>
          ) : (
            <div
              className="grid gap-[40px]"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(224px, 1fr))'
              }}
            >
              {filteredCollections.map((collection) => (
                <Card 
                  key={collection._id} 
                  className="border-gray-200 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  style={{
                    width: '224px',
                    height: '240px',
                    borderRadius: '16px',
                    flexShrink: 0
                  }}
                >
                  <div 
                    className="relative h-40"
                    style={{
                      backgroundImage: collection.thumbnail ? `url(${collection.thumbnail})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: '50%',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: '#D9D9D9'
                    }}
                    onClick={() => router.push(`/collection/editor?id=${collection._id}`)}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 bg-white/80 hover:bg-white" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4 text-gray-700" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <label className="w-full cursor-pointer flex items-center">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleThumbnailChange(e, collection)}
                              disabled={uploadingId === collection._id}
                            />
                            <span className="w-full">{uploadingId === collection._id ? 'Uploading...' : 'Insert Thumbnail'}</span>
                          </label>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteDialogOpen(collection._id)} className="text-red-600 focus:text-red-700">Delete Collection</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardContent className="p-4" onClick={() => router.push(`/collection/editor?id=${collection._id}`)}>
                    <p className="text-sm font-medium text-gray-800 mb-2 truncate">{collection.name}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{calculateSize(collection)}</span>
                      <span>{formatDate(collection.updatedAt)}</span>
                    </div>
                  </CardContent>
                  <Dialog open={deleteDialogOpen === collection._id} onOpenChange={open => setDeleteDialogOpen(open ? collection._id : null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Collection?</DialogTitle>
                      </DialogHeader>
                      <div>Are you sure you want to delete <b>{collection.name}</b>? This action cannot be undone.</div>
                      <DialogFooter>
                        <Button variant="secondary" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDeleteCollection(collection._id)}>Delete</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
