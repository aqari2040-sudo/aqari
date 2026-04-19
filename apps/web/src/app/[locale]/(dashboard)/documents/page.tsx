'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Search,
  ExternalLink,
  File,
  FolderOpen,
  X,
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  property_id?: string;
  uploaded_by: string;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
  name_ar: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DocumentsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const isAr = locale === 'ar';
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // Upload form state
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPropertyId, setUploadPropertyId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const labels = {
    title: isAr ? 'المستندات' : 'Documents',
    upload: isAr ? 'رفع مستند' : 'Upload Document',
    search: isAr ? 'بحث...' : 'Search...',
    name: isAr ? 'الاسم' : 'Name',
    description: isAr ? 'الوصف' : 'Description',
    property: isAr ? 'العقار (اختياري)' : 'Property (optional)',
    allProperties: isAr ? 'جميع العقارات' : 'All Properties',
    file: isAr ? 'الملف' : 'File',
    chooseFile: isAr ? 'اختر ملفاً' : 'Choose file',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    save: isAr ? 'حفظ' : 'Save',
    delete: isAr ? 'حذف' : 'Delete',
    edit: isAr ? 'تعديل' : 'Edit',
    view: isAr ? 'عرض' : 'View',
    uploadDate: isAr ? 'تاريخ الرفع' : 'Upload Date',
    size: isAr ? 'الحجم' : 'Size',
    noDocuments: isAr ? 'لا توجد مستندات بعد' : 'No documents yet',
    uploading: isAr ? 'جاري الرفع...' : 'Uploading...',
    namePlaceholder: isAr ? 'مثال: مخطط الموقع' : 'e.g. Site Plan',
    descriptionPlaceholder: isAr ? 'وصف اختياري للمستند' : 'Optional description',
    confirmDelete: isAr ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this document?',
    editDocument: isAr ? 'تعديل المستند' : 'Edit Document',
    pdfOnly: isAr ? 'PDF، صور' : 'PDF, images',
  };

  // Fetch documents
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', search, propertyFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (propertyFilter) params.property_id = propertyFilter;
      const res = await apiClient.get('/documents', { params });
      return res.data;
    },
  });

  // Fetch properties for dropdown
  const { data: propsData } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const res = await apiClient.get('/properties', { params: { limit: 100 } });
      return res.data;
    },
  });

  const properties: Property[] = propsData?.data ?? [];
  const documents: Document[] = docsData?.data ?? [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      apiClient.patch(`/documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowEditDialog(false);
      setEditingDoc(null);
    },
  });

  const handleDelete = (doc: Document) => {
    if (window.confirm(labels.confirmDelete)) {
      deleteMutation.mutate(doc.id);
    }
  };

  const handleEditOpen = (doc: Document) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditDescription(doc.description ?? '');
    setShowEditDialog(true);
  };

  const handleEditSave = () => {
    if (!editingDoc) return;
    updateMutation.mutate({
      id: editingDoc.id,
      data: { name: editName, description: editDescription },
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) return;

    setIsUploading(true);
    setUploadError('');

    try {
      // Upload file to Supabase Storage in 'contracts' bucket under 'documents/' folder
      const ext = selectedFile.name.split('.').pop() ?? 'bin';
      const fileName = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('contracts')
        .upload(fileName, selectedFile, { upsert: false });

      if (uploadErr) {
        setUploadError(uploadErr.message);
        setIsUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(uploadData.path);

      // Save document record in backend
      await apiClient.post('/documents', {
        name: uploadName.trim(),
        description: uploadDescription.trim() || undefined,
        file_url: urlData.publicUrl,
        file_type: selectedFile.type || ext,
        file_size: selectedFile.size,
        property_id: uploadPropertyId || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });

      // Reset form
      setUploadName('');
      setUploadDescription('');
      setUploadPropertyId('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadDialog(false);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message ?? err?.message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-8 w-8 text-sheen-gold/70" />;
    if (fileType.includes('pdf')) return <FileText className="h-8 w-8 text-red-400" />;
    if (fileType.includes('image')) return <File className="h-8 w-8 text-blue-400" />;
    return <File className="h-8 w-8 text-sheen-gold/70" />;
  };

  if (user?.role !== 'owner') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">{isAr ? 'غير مصرح لك بعرض هذه الصفحة' : 'You are not authorized to view this page.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-sheen-gold" />
          <h1 className="text-2xl font-bold text-sheen-cream">{labels.title}</h1>
        </div>
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="bg-sheen-gold text-sheen-black hover:bg-sheen-gold/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {labels.upload}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.search}
            className="ps-9 bg-white/5 border-white/10 text-sheen-cream placeholder:text-gray-500"
          />
        </div>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-sheen-cream focus:outline-none"
        >
          <option value="">{labels.allProperties}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {isAr ? p.name_ar : p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Documents Grid */}
      {docsLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sheen-gold border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <FolderOpen className="h-16 w-16 text-gray-600" />
          <p className="text-gray-400 text-lg">{labels.noDocuments}</p>
          <Button
            onClick={() => setShowUploadDialog(true)}
            variant="outline"
            className="border-sheen-gold/30 text-sheen-gold hover:bg-sheen-gold/10 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {labels.upload}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="bg-white/5 border-white/10 hover:border-sheen-gold/30 transition-colors"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{getFileIcon(doc.file_type)}</div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold text-sheen-cream line-clamp-2 leading-tight">
                      {doc.name}
                    </CardTitle>
                    {doc.description && (
                      <p className="mt-1 text-xs text-gray-400 line-clamp-2">{doc.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatDate(doc.created_at, locale)}</span>
                  <span>{formatBytes(doc.file_size)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-white/10 text-sheen-cream hover:bg-white/10 text-xs"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 me-1" />
                    {labels.view}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-sheen-gold hover:bg-sheen-gold/10 px-2"
                    onClick={() => handleEditOpen(doc)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-red-400 hover:bg-red-400/10 px-2"
                    onClick={() => handleDelete(doc)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-xl bg-sheen-black border border-white/10 shadow-2xl"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-sheen-cream flex items-center gap-2">
                <Upload className="h-5 w-5 text-sheen-gold" />
                {labels.upload}
              </h2>
              <button
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadError('');
                }}
                className="text-gray-400 hover:text-sheen-cream transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="space-y-4 px-6 py-5">
              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {labels.file} <span className="text-red-400">*</span>
                </label>
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 p-6 cursor-pointer hover:border-sheen-gold/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <>
                      <FileText className="h-8 w-8 text-sheen-gold" />
                      <p className="text-sm text-sheen-cream font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-500" />
                      <p className="text-sm text-gray-400">{isAr ? 'انقر لاختيار ملف' : 'Click to choose a file'}</p>
                      <p className="text-xs text-gray-500">{labels.pdfOnly}</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {labels.name} <span className="text-red-400">*</span>
                </label>
                <Input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder={labels.namePlaceholder}
                  className="bg-white/5 border-white/10 text-sheen-cream placeholder:text-gray-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {labels.description}
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder={labels.descriptionPlaceholder}
                  rows={3}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-sheen-cream placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-sheen-gold/50 resize-none"
                />
              </div>

              {/* Property */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {labels.property}
                </label>
                <select
                  value={uploadPropertyId}
                  onChange={(e) => setUploadPropertyId(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-sheen-cream focus:outline-none focus:ring-1 focus:ring-sheen-gold/50"
                >
                  <option value="">{labels.allProperties}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.name_ar : p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {uploadError && (
                <p className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                  {uploadError}
                </p>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
              <Button
                variant="outline"
                className="border-white/10 text-gray-300 hover:bg-white/5"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadError('');
                }}
                disabled={isUploading}
              >
                {labels.cancel}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadName.trim() || isUploading}
                className="bg-sheen-gold text-sheen-black hover:bg-sheen-gold/90 flex items-center gap-2 min-w-[100px]"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-sheen-black border-t-transparent" />
                    {labels.uploading}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {labels.upload}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-xl bg-sheen-black border border-white/10 shadow-2xl"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-sheen-cream flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-sheen-gold" />
                {labels.editDocument}
              </h2>
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingDoc(null);
                }}
                className="text-gray-400 hover:text-sheen-cream transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {labels.name} <span className="text-red-400">*</span>
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-white/5 border-white/10 text-sheen-cream"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {labels.description}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-sheen-cream placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-sheen-gold/50 resize-none"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
              <Button
                variant="outline"
                className="border-white/10 text-gray-300 hover:bg-white/5"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingDoc(null);
                }}
                disabled={updateMutation.isPending}
              >
                {labels.cancel}
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={!editName.trim() || updateMutation.isPending}
                className="bg-sheen-gold text-sheen-black hover:bg-sheen-gold/90 flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sheen-black border-t-transparent" />
                ) : null}
                {labels.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
