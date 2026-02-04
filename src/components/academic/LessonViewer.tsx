import { Upload, Save, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered } from 'lucide-react';
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
}: LessonViewerProps) {
  const [draftTitle, setDraftTitle] = useState(title ?? '');
  const [draftContent, setDraftContent] = useState(content ?? '');
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTitle(title ?? '');
  }, [title]);

  useEffect(() => {
    if (!isEditing) {
      setDraftContent(content ?? '');
    }
  }, [content, isEditing]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = draftContent || '';
    }
  }, [isEditing, draftContent]);

  const applyCommand = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      setDraftContent(editorRef.current.innerHTML);
    }
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
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
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
              onClick={() => onToggleEdit(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          )}
          {onSave && isEditing && (
            <button
              className="btn-primary flex items-center gap-2 text-sm"
              onClick={() => onSave({ title: draftTitle, content: draftContent })}
            >
              <Save className="w-4 h-4" />
              Save
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
                onChange={(e) => setDraftTitle(e.target.value)}
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
                onInput={() => {
                  if (editorRef.current) setDraftContent(editorRef.current.innerHTML);
                }}
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
