'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/AppLayout';
import { 
  List, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Palette,
  ArrowLeft,
  X,
  Download,
  Users,
  Save,
  FileText
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collectionsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CellContent {
  id: string;
  type: 'list' | 'image' | 'url' | null;
  data: string | string[];
  backgroundColor: string;
}

function CollectionEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const collectionId = searchParams.get('id');
  
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [cells, setCells] = useState<{ [key: string]: CellContent }>(() => {
    const initialCells: { [key: string]: CellContent } = {};
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        initialCells[`${i}-${j}`] = {
          id: `${i}-${j}`,
          type: null,
          data: [],
          backgroundColor: '#FFFFFF'
        };
      }
    }
    return initialCells;
  });

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempListItem, setTempListItem] = useState('');
  const [fileName, setFileName] = useState('Untitled Collection');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (collectionId) {
      loadCollection(collectionId);
    }
  }, [collectionId]);

  const loadCollection = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await collectionsAPI.getById(id);
      
      if (response.success && response.collection) {
        const collection = response.collection;
        setFileName(collection.name);
        setRows(collection.rows);
        setCols(collection.cols);
        setCells(collection.cells);
      }
    } catch (error) {
      console.error('Failed to load collection:', error);
      toast({
        title: "Error",
        description: "Failed to load collection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveCollection = async (status: 'draft' | 'published') => {
    if (!fileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a collection name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Generate thumbnail (first image in cells)
      let thumbnail: string | undefined;
      for (const cell of Object.values(cells)) {
        if (cell.type === 'image' && cell.data) {
          thumbnail = cell.data as string;
          break;
        }
      }

      const collectionData = {
        name: fileName,
        rows,
        cols,
        cells,
        status,
        thumbnail,
      };

      let response;
      if (collectionId) {
        // Update existing collection
        response = await collectionsAPI.update(collectionId, collectionData);
      } else {
        // Create new collection
        response = await collectionsAPI.create(collectionData);
      }

      if (response.success) {
        toast({
          title: "Success",
          description: `Collection ${status === 'draft' ? 'saved as draft' : 'published'} successfully`,
        });

        // Redirect to collection list after save
        setTimeout(() => {
          router.push('/collection');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Failed to save collection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save collection",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => saveCollection('draft');
  const handlePublish = () => saveCollection('published');

  const addColumn = () => {
    const newCols = cols + 1;
    setCols(newCols);
    
    const newCells = { ...cells };
    for (let i = 0; i < rows; i++) {
      newCells[`${i}-${cols}`] = {
        id: `${i}-${cols}`,
        type: null,
        data: [],
        backgroundColor: '#FFFFFF'
      };
    }
    setCells(newCells);
  };

  const addRow = () => {
    const newRows = rows + 1;
    setRows(newRows);
    
    const newCells = { ...cells };
    for (let j = 0; j < cols; j++) {
      newCells[`${rows}-${j}`] = {
        id: `${rows}-${j}`,
        type: null,
        data: [],
        backgroundColor: '#FFFFFF'
      };
    }
    setCells(newCells);
  };

  const updateCellType = (cellId: string, type: 'list' | 'image' | 'url') => {
    setCells(prev => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        type,
        data: type === 'list' ? [] : ''
      }
    }));
    setEditingCell(cellId);
  };

  const updateCellBackground = (cellId: string, color: string) => {
    setCells(prev => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        backgroundColor: color
      }
    }));
  };

  const addListItem = (cellId: string) => {
    if (!tempListItem.trim()) return;
    
    setCells(prev => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        data: [...(prev[cellId].data as string[]), tempListItem]
      }
    }));
    setTempListItem('');
  };

  const removeListItem = (cellId: string, index: number) => {
    setCells(prev => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        data: (prev[cellId].data as string[]).filter((_, i) => i !== index)
      }
    }));
  };

  const updateCellData = (cellId: string, data: string) => {
    setCells(prev => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        data
      }
    }));
  };

  const colors = [
    '#FFFFFF', '#F3F4F6', '#DBEAFE', '#FEF3C7', '#FEE2E2', 
    '#F3E8FF', '#D1FAE5', '#FFE4E6', '#E0E7FF', '#FCE7F3'
  ];

  const renderCellContent = (cell: CellContent) => {
    if (!cell.type) {
      return (
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-400 text-sm">Empty cell</span>
        </div>
      );
    }

    switch (cell.type) {
      case 'list':
        return (
          <div className="p-3 h-full overflow-y-auto">
            {(cell.data as string[]).length === 0 ? (
              <span className="text-gray-400 text-sm">No items yet</span>
            ) : (
              <ul className="space-y-2">
                {(cell.data as string[]).map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm group">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0"></span>
                    <span className="flex-1">{item}</span>
                    <button
                      onClick={() => removeListItem(cell.id, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      
      case 'image':
        return (
          <div className="p-3 h-full flex items-center justify-center">
            {cell.data ? (
              <img 
                src={cell.data as string} 
                alt="Cell content" 
                className="max-w-full max-h-full object-contain rounded"
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-gray-400 text-xs">No image URL</span>
              </div>
            )}
          </div>
        );
      
      case 'url':
        return (
          <div className="p-3 h-full flex items-center justify-center">
            {cell.data ? (
              <a 
                href={cell.data as string} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
              >
                {cell.data as string}
              </a>
            ) : (
              <div className="text-center">
                <LinkIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-gray-400 text-xs">No URL added</span>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 bg-white overflow-hidden flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-gray-100"
              disabled={isSaving}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Collection Name</label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="text-lg font-semibold border-2 border-gray-300 focus-visible:ring-2 focus-visible:ring-primary px-3 py-2 rounded-lg"
                style={{ minWidth: '320px' }}
                disabled={isLoading || isSaving}
                placeholder="Enter collection name..."
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="rounded-lg px-4 gap-2"
              onClick={handleSaveDraft}
              disabled={isSaving || isLoading}
            >
              <FileText className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button 
              className="bg-gray-800 text-white hover:bg-gray-900 rounded-lg px-4 gap-2"
              onClick={handlePublish}
              disabled={isSaving || isLoading}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </header>

        {/* Grid Container */}
        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-start gap-3">
              {/* Grid */}
              <div 
                className="grid gap-0 bg-gray-200 p-0"
                style={{
                  gridTemplateColumns: `repeat(${cols}, 224px)`,
                  gridTemplateRows: `repeat(${rows}, 56px)`,
                }}
              >
              {Array.from({ length: rows }).map((_, rowIndex) =>
                Array.from({ length: cols }).map((_, colIndex) => {
                  const cellId = `${rowIndex}-${colIndex}`;
                  const cell = cells[cellId];
                  
                  // Determine border radius based on position
                  let borderRadius = '0';
                  const isTopLeft = rowIndex === 0 && colIndex === 0;
                  const isTopRight = rowIndex === 0 && colIndex === cols - 1;
                  const isBottomLeft = rowIndex === rows - 1 && colIndex === 0;
                  const isBottomRight = rowIndex === rows - 1 && colIndex === cols - 1;
                  
                  if (isTopLeft) borderRadius = '8px 0 0 0';
                  else if (isTopRight) borderRadius = '0 8px 0 0';
                  else if (isBottomLeft) borderRadius = '0 0 0 8px';
                  else if (isBottomRight) borderRadius = '0 0 8px 0';
                  
                  return (
                    <div
                      key={cellId}
                      className="relative group bg-white overflow-hidden"
                      style={{ 
                        backgroundColor: cell.backgroundColor,
                        border: '1px solid #AAA',
                        borderRadius: borderRadius
                      }}
                    >
                      {/* Cell Content */}
                      {renderCellContent(cell)}

                      {/* Cell Actions Toolbar - Shows on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                            >
                              <List className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 bg-white">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Add List Items</h4>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Enter item..."
                                  value={editingCell === cellId ? tempListItem : ''}
                                  onChange={(e) => {
                                    setEditingCell(cellId);
                                    setTempListItem(e.target.value);
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      if (cell.type !== 'list') {
                                        updateCellType(cellId, 'list');
                                      }
                                      addListItem(cellId);
                                    }
                                  }}
                                  className="text-sm"
                                />
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    if (cell.type !== 'list') {
                                      updateCellType(cellId, 'list');
                                    }
                                    addListItem(cellId);
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 bg-white">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Add Image URL</h4>
                              <Input
                                placeholder="https://example.com/image.jpg"
                                value={cell.type === 'image' ? (cell.data as string) : ''}
                                onChange={(e) => {
                                  if (cell.type !== 'image') {
                                    updateCellType(cellId, 'image');
                                  }
                                  updateCellData(cellId, e.target.value);
                                }}
                                className="text-sm"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                            >
                              <LinkIcon className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 bg-white">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Add URL</h4>
                              <Input
                                placeholder="https://example.com"
                                value={cell.type === 'url' ? (cell.data as string) : ''}
                                onChange={(e) => {
                                  if (cell.type !== 'url') {
                                    updateCellType(cellId, 'url');
                                  }
                                  updateCellData(cellId, e.target.value);
                                }}
                                className="text-sm"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                            >
                              <Palette className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-3 bg-white">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Background Color</h4>
                              <div className="grid grid-cols-5 gap-2">
                                {colors.map((color) => (
                                  <button
                                    key={color}
                                    className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-600 transition-colors"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateCellBackground(cellId, color)}
                                  />
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Column Button */}
            <Button
              variant="ghost"
              onClick={addColumn}
              className="rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              style={{
                width: '32px',
                height: `${rows * 56 + (rows - 1) * 12 + 2}px`,
                flexShrink: 0,
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)'
              }}
              title="Add column"
            >
              <span className="text-sm font-medium">Add</span>
            </Button>
          </div>

          {/* Add Row Button */}
          <Button
            variant="ghost"
            onClick={addRow}
            className="rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            style={{
              width: `${cols * 224 + (cols - 1) * 12 + 2}px`,
              height: '32px',
              flexShrink: 0
            }}
            title="Add row"
          >
            <span className="text-sm font-medium">Add</span>
          </Button>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}

export default function CollectionEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    }>
      <CollectionEditorContent />
    </Suspense>
  );
}
