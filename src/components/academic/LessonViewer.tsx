import { Upload, Save, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface LessonViewerProps {
  title?: string;
  content?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  files?: { id: string; file_url: string; file_name: string }[];
  onSave?: (payload: { title: string; content: string }) => void;
  onUpload?: (files: FileList) => void;
  onRemoveFile?: (fileId: string) => void;
  onDelete?: () => void;
  isEditing?: boolean;
  onToggleEdit?: (value: boolean) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  onCancelUpload?: () => void;
  lessonId?: string;
}

export default function LessonViewer({
  title,
  content,
  fileUrl,
  fileName,
  files = [],
  onSave,
  onUpload,
  onRemoveFile,
  onDelete,
  isEditing = false,
  onToggleEdit,
  isUploading = false,
  uploadProgress,
  onCancelUpload,
  lessonId,
}: LessonViewerProps) {
  const [draftTitle, setDraftTitle] = useState(title ?? '');
  const [draftContent, setDraftContent] = useState(content ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Get localStorage key for this lesson
  const getLocalStorageKey = () => lessonId ? `lesson_draft_${lessonId}` : null;

  // Save draft to localStorage
  const saveDraftToLocalStorage = (titleValue: string, contentValue: string) => {
    const key = getLocalStorageKey();
    if (!key) return;
    
    try {
      localStorage.setItem(key, JSON.stringify({
        title: titleValue,
        content: contentValue,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  // Load draft from localStorage
  const loadDraftFromLocalStorage = () => {
    const key = getLocalStorageKey();
    if (!key) return null;
    
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  };

  // Clear localStorage draft
  const clearLocalStorageDraft = () => {
    const key = getLocalStorageKey();
    if (!key) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Restore from localStorage on mount
  useEffect(() => {
    if (!isEditing || !lessonId) return;

    const draft = loadDraftFromLocalStorage();
    if (draft) {
      // Check if draft is newer than current content
      const draftTime = new Date(draft.timestamp).getTime();
      const now = new Date().getTime();
      const hoursDiff = (now - draftTime) / (1000 * 60 * 60);
      
      // If draft is less than 24 hours old and different from current content
      if (hoursDiff < 24 && (draft.title !== title || draft.content !== content)) {
        setDraftTitle(draft.title);
        setDraftContent(draft.content);
        setHasUnsavedChanges(true);
      }
    }
  }, [lessonId, isEditing]);

  useEffect(() => {
    setDraftTitle(title ?? '');
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setHasUnsavedChanges(false);
    }
  }, [title]);

  useEffect(() => {
    if (!isEditing) {
      setDraftContent(content ?? '');
      if (!isInitialMount.current) {
        setHasUnsavedChanges(false);
      }
    }
  }, [content, isEditing]);

  useEffect(() => {
    if (!isEditing || !editorRef.current) return;
    if (editorRef.current.innerHTML !== (draftContent || '')) {
      editorRef.current.innerHTML = draftContent || '';
    }
  }, [isEditing, draftContent]);

  // Save to localStorage on every change (immediate)
  useEffect(() => {
    if (!isEditing || !lessonId) return;
    
    // Save to localStorage immediately when content changes
    saveDraftToLocalStorage(draftTitle, draftContent);
  }, [draftTitle, draftContent, isEditing, lessonId]);

  // Auto-save to database after inactivity
  useEffect(() => {
    if (!isEditing || !onSave || !hasUnsavedChanges) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save after 3 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, 3000);

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [draftTitle, draftContent, isEditing, hasUnsavedChanges]);

  // Save to database before user leaves the page
  useEffect(() => {
    if (!isEditing || !onSave || !hasUnsavedChanges) return;

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Try to save before leaving
        if (!isSaving) {
          e.preventDefault();
          e.returnValue = ''; // Show browser confirmation dialog
          
          // Attempt to save synchronously
          try {
            await handleAutoSave();
          } catch (error) {
            console.error('Failed to save before unload:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditing, hasUnsavedChanges, isSaving]);

  const handleAutoSave = async () => {
    if (!onSave || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave({ title: draftTitle, content: draftContent });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      // Clear localStorage after successful database save
      clearLocalStorageDraft();
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!onSave || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave({ title: draftTitle, content: draftContent });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      // Clear localStorage after successful database save
      clearLocalStorageDraft();
      // Exit edit mode and return to read mode
      if (onToggleEdit) {
        onToggleEdit(false);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (value: string) => {
    setDraftTitle(value);
    setHasUnsavedChanges(true);
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setDraftContent(editorRef.current.innerHTML);
      setHasUnsavedChanges(true);
    }
  };

  const handleCancel = () => {
    // If there are unsaved changes, confirm before discarding
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) {
        return; // User chose to keep editing
      }
    }
    
    // Clear localStorage draft when user cancels
    clearLocalStorageDraft();
    // Reset to original content
    setDraftTitle(title ?? '');
    setDraftContent(content ?? '');
    setHasUnsavedChanges(false);
    // Toggle edit mode off
    if (onToggleEdit) {
      onToggleEdit(false);
    }
  };

  const applyCommand = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      setDraftContent(editorRef.current.innerHTML);
      setHasUnsavedChanges(true);
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastSaved.toLocaleTimeString();
  };
  if (!title) {
    return (
      <div className="card-static h-full flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">Select a lesson to view</p>
          <p className="text-sm">Choose from the subject tree on the left</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-static h-full p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {isEditing && (
            <div className="flex items-center gap-2 mt-1 text-sm">
              {isSaving && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              {!isSaving && lastSaved && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved {formatLastSaved()}
                </span>
              )}
              {!isSaving && hasUnsavedChanges && (
                <span className="text-amber-600">
                  Unsaved changes
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          {onToggleEdit && (
            <button
              className="btn-secondary flex items-center gap-2 text-sm"
              onClick={isEditing ? handleCancel : () => onToggleEdit(true)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          )}
          {onSave && isEditing && (
            <button
              className="btn-primary flex items-center gap-2 text-sm"
              onClick={handleManualSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {onSave && isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Title</label>
              <input
                value={draftTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full input-minimal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Content</label>
              <div className="flex flex-wrap gap-2 mb-3">
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('bold')}>
                  <Bold className="w-4 h-4" />
                </button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('italic')}>
                  <Italic className="w-4 h-4" />
                </button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('underline')}>
                  <Underline className="w-4 h-4" />
                </button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('justifyLeft')}>
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('justifyCenter')}>
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('justifyRight')}>
                  <AlignRight className="w-4 h-4" />
                </button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('insertUnorderedList')}>
                  <List className="w-4 h-4" />
                </button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => applyCommand('insertOrderedList')}>
                  <ListOrdered className="w-4 h-4" />
                </button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                className="min-h-[220px] w-full bg-transparent border border-border rounded-lg p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
              />
            </div>
            {onUpload && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Upload Files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) onUpload(e.target.files);
                    }}
                  />
                </label>
                {isUploading && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all"
                        style={{ width: `${Math.max(5, uploadProgress ?? 15)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {uploadProgress ? `${uploadProgress}%` : 'Uploading...'}
                    </span>
                    {onCancelUpload && (
                      <button type="button" className="text-xs text-muted-foreground underline" onClick={onCancelUpload}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {(fileUrl || files.length > 0) && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Files</p>
                <div className="flex flex-wrap gap-2">
                  {fileUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary text-sm"
                      >
                        {fileName || 'Open file'}
                      </a>
                    </div>
                  )}
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-2">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary text-sm"
                      >
                        {file.file_name}
                      </a>
                      {onRemoveFile && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline"
                          onClick={() => onRemoveFile(file.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="prose prose-stone max-w-none">
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <p className="text-muted-foreground">
                This lesson content is a placeholder. In a full implementation, 
                this area would display rich text content, notes, and attached resources.
              </p>
            )}
            {(fileUrl || files.length > 0) && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {fileUrl && (
                    <a className="btn-secondary text-sm" href={fileUrl} target="_blank" rel="noreferrer">
                      {fileName || 'Open attached file'}
                    </a>
                  )}
                  {files.map((file) => (
                    <a
                      key={file.id}
                      className="btn-secondary text-sm"
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {file.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
