'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  Link as LinkIcon,
  Unlink,
  Search,
  Filter,
  Tag,
  Loader2,
  Plus,
  File,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Agent {
  id: string;
  profession: string;
  customProfession?: string;
}

interface KnowledgeBaseFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  specialty?: string;
  customSpecialty?: string;
  tags: string[];
  extractedText?: string;
  createdAt: string;
  agents?: { agentId: string; addedAt: string }[];
  linkedAt?: string;
}

const SPECIALTIES = [
  { value: 'GENERAL_PRACTICE', label: 'General Practice' },
  { value: 'DENTAL', label: 'Dental' },
  { value: 'OPTOMETRY', label: 'Optometry' },
  { value: 'DERMATOLOGY', label: 'Dermatology' },
  { value: 'CARDIOLOGY', label: 'Cardiology' },
  { value: 'PSYCHIATRY', label: 'Psychiatry' },
  { value: 'PEDIATRICS', label: 'Pediatrics' },
  { value: 'ORTHOPEDIC', label: 'Orthopedic' },
  { value: 'PHYSIOTHERAPY', label: 'Physiotherapy' },
  { value: 'CHIROPRACTIC', label: 'Chiropractic' },
];

const PROFESSION_LABELS: Record<string, string> = {
  GENERAL_PRACTICE: 'General Practice',
  DENTAL: 'Dental',
  OPTOMETRY: 'Optometry',
  DERMATOLOGY: 'Dermatology',
  CARDIOLOGY: 'Cardiology',
  PSYCHIATRY: 'Psychiatry',
  PEDIATRICS: 'Pediatrics',
  ORTHOPEDIC: 'Orthopedic',
  PHYSIOTHERAPY: 'Physiotherapy',
  CHIROPRACTIC: 'Chiropractic',
  CUSTOM: 'Custom',
};

export function DocpenKnowledgeBaseTraining() {
  const tPlaceholders = useTranslations('placeholders');
  const tToasts = useTranslations('toasts.general');
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<KnowledgeBaseFile | null>(null);
  const [deleteFile, setDeleteFile] = useState<KnowledgeBaseFile | null>(null);
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    specialty: '',
    tags: '',
    agentId: '',
  });

  // Link form state
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  useEffect(() => {
    fetchFiles();
    fetchAgents();
  }, []);

  const fetchFiles = async () => {
    try {
      let url = '/api/docpen/knowledge-base';
      if (filterSpecialty && filterSpecialty !== 'all') {
        url += `?specialty=${filterSpecialty}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      toast.error(tToasts('knowledgeBaseLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/docpen/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(f => ({ ...f, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      if (uploadForm.specialty) formData.append('specialty', uploadForm.specialty);
      if (uploadForm.tags) formData.append('tags', uploadForm.tags);
      if (uploadForm.agentId) formData.append('agentId', uploadForm.agentId);

      const response = await fetch('/api/docpen/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success(tToasts('fileUploaded'));
      setShowUploadDialog(false);
      setUploadForm({ file: null, specialty: '', tags: '', agentId: '' });
      fetchFiles();
    } catch (error) {
      toast.error(tToasts('fileUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteFile) return;

    try {
      const response = await fetch(
        `/api/docpen/knowledge-base?fileId=${deleteFile.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Delete failed');

      toast.success('File deleted');
      setDeleteFile(null);
      fetchFiles();
    } catch (error) {
      toast.error(tToasts('fileDeleteFailed'));
    }
  };

  const handleLinkFile = (file: KnowledgeBaseFile) => {
    setSelectedFile(file);
    setSelectedAgents(file.agents?.map(a => a.agentId) || []);
    setShowLinkDialog(true);
  };

  const handleSaveLinks = async () => {
    if (!selectedFile) return;

    const currentLinks = selectedFile.agents?.map(a => a.agentId) || [];
    const toLink = selectedAgents.filter(id => !currentLinks.includes(id));
    const toUnlink = currentLinks.filter(id => !selectedAgents.includes(id));

    try {
      // Link new agents
      for (const agentId of toLink) {
        await fetch('/api/docpen/knowledge-base/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            fileId: selectedFile.id,
            action: 'link',
          }),
        });
      }

      // Unlink removed agents
      for (const agentId of toUnlink) {
        await fetch('/api/docpen/knowledge-base/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            fileId: selectedFile.id,
            action: 'unlink',
          }),
        });
      }

      toast.success('Agent links updated');
      setShowLinkDialog(false);
      fetchFiles();
    } catch (error) {
      toast.error(tToasts('linksUpdateFailed'));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter(file => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !file.fileName.toLowerCase().includes(query) &&
        !file.tags.some(t => t.toLowerCase().includes(query))
      ) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Knowledge Base Training</h3>
          <p className="text-sm text-muted-foreground">
            Upload specialty-specific documents to train your voice agents
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tPlaceholders('input.searchFiles')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSpecialty} onValueChange={val => {
          setFilterSpecialty(val);
          setTimeout(fetchFiles, 0);
        }}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={tPlaceholders('select.allSpecialties')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {SPECIALTIES.map(spec => (
              <SelectItem key={spec.value} value={spec.value}>
                {spec.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">No Training Documents</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upload documents to train your voice agents with specialty knowledge
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(file => (
            <Card key={file.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{file.fileName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {file.specialty && (
                        <Badge variant="outline" className="text-xs">
                          {PROFESSION_LABELS[file.specialty] || file.specialty}
                        </Badge>
                      )}
                      {file.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {file.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{file.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                    {file.agents && file.agents.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Linked to {file.agents.length} agent{file.agents.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleLinkFile(file)}
                  >
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Link Agents
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteFile(file)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Training Document</DialogTitle>
            <DialogDescription>
              Upload a document to train your voice agents with specialty knowledge.
              Supported formats: TXT, DOCX, PDF
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Document</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.docx,.pdf,.doc"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {uploadForm.file ? (
                  <div className="flex items-center justify-center gap-2">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">{uploadForm.file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a file or drag and drop
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Specialty */}
            <div className="space-y-2">
              <Label>Specialty (Optional)</Label>
              <Select
                value={uploadForm.specialty || undefined}
                onValueChange={val => setUploadForm(f => ({ ...f, specialty: val === 'none' ? '' : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tPlaceholders('select.specialty')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SPECIALTIES.map(spec => (
                    <SelectItem key={spec.value} value={spec.value}>
                      {spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <Input
                placeholder="e.g., guidelines, dosage, protocols (comma separated)"
                value={uploadForm.tags}
                onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>

            {/* Link to Agent */}
            <div className="space-y-2">
              <Label>Link to Agent (Optional)</Label>
              <Select
                value={uploadForm.agentId || undefined}
                onValueChange={val => setUploadForm(f => ({ ...f, agentId: val === 'none' ? '' : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tPlaceholders('select.agent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {PROFESSION_LABELS[agent.profession] || agent.profession}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadForm.file || uploading}
            >
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Agents Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Voice Agents</DialogTitle>
            <DialogDescription>
              Select which voice agents should have access to &quot;{selectedFile?.fileName}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No voice agents available. Start a Docpen session to create one.
              </p>
            ) : (
              agents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <Checkbox
                    id={agent.id}
                    checked={selectedAgents.includes(agent.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAgents(prev => [...prev, agent.id]);
                      } else {
                        setSelectedAgents(prev => prev.filter(id => id !== agent.id));
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-600" />
                    <label
                      htmlFor={agent.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {PROFESSION_LABELS[agent.profession] || agent.profession}
                      {agent.customProfession && ` - ${agent.customProfession}`}
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLinks} disabled={agents.length === 0}>
              Save Links
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteFile?.fileName}&quot;? This will
              also remove it from any linked voice agents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
