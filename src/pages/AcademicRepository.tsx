import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import SubjectTree from '@/components/academic/SubjectTree';
import LessonList from '@/components/academic/LessonList';
import LessonViewer from '@/components/academic/LessonViewer';
import { api, API_URL } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from '@/components/ui/sonner';
import ApiStatusBanner from '@/components/common/ApiStatusBanner';

interface Subject {
  id: string;
  name: string;
  chapters: {
    id: string;
    name: string;
    lessons: { id: string; name: string }[];
  }[];
}

interface LessonListItem {
  id: string;
  title: string;
  dateAdded: string;
}

interface LessonDetail {
  id: string;
  title: string;
  content?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  driveFileId?: string | null;
  files?: { id: string; file_url: string; file_name: string }[];
}

export default function AcademicRepository() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string | undefined>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonDetail | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newChapterName, setNewChapterName] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();
  const [uploadRequest, setUploadRequest] = useState<XMLHttpRequest | null>(null);
  const [showSubjects, setShowSubjects] = useState(true);
  const [showLessons, setShowLessons] = useState(true);

  const normalizeLesson = (data: any): LessonDetail => ({
    id: data.id,
    title: data.title,
    content: data.content,
    fileUrl: data.fileUrl ?? data.file_url ?? null,
    fileName: data.fileName ?? data.file_name ?? null,
    driveFileId: data.driveFileId ?? data.drive_file_id ?? null,
    files: data.files ?? [],
  });

  const loadSubjects = async () => {
    try {
      const response = await api.get<{ data: Subject[] }>("/api/subjects");
      setSubjects(response.data || []);
      if (!selectedSubjectId && response.data?.length) {
        setSelectedSubjectId(response.data[0].id);
      }
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load subjects from the backend.');
    }
  };

  const loadLessons = async (query: string) => {
    try {
      const path = query ? `/api/lessons?search=${encodeURIComponent(query)}` : "/api/lessons";
      const response = await api.get<{ data: LessonListItem[] }>(path);
      setLessons(response.data || []);
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load lessons from the backend.');
    }
  };

  const loadLessonDetail = async (lessonId: string) => {
    try {
      const response = await api.get<{ data: LessonDetail }>(`/api/lessons/${lessonId}`);
      setCurrentLesson(normalizeLesson(response.data));
      await api.post(`/api/lessons/${lessonId}/view`);
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load the selected lesson.');
    }
  };

  const loadDriveStatus = async () => {
    try {
      const response = await api.get<{ connected: boolean }>("/api/drive/status");
      setDriveConnected(Boolean(response.connected));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadSubjects();
    loadDriveStatus();
  }, []);

  useEffect(() => {
    loadLessons(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedLesson) {
      loadLessonDetail(selectedLesson);
      setIsEditing(false);
    } else {
      setCurrentLesson(undefined);
    }
  }, [selectedLesson]);

  useEffect(() => {
    const subject = subjects.find((item) => item.id === selectedSubjectId);
    if (subject?.chapters?.length) {
      setSelectedChapterId(subject.chapters[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      await api.post("/api/subjects", { name: newSubjectName.trim() });
      setNewSubjectName('');
      loadSubjects();
      toast('Subject added');
    } catch (error) {
      console.error(error);
      setError('Unable to create subject.');
    }
  };

  const handleCreateChapter = async () => {
    if (!newChapterName.trim() || !selectedSubjectId) return;
    try {
      await api.post("/api/chapters", { name: newChapterName.trim(), subject_id: selectedSubjectId });
      setNewChapterName('');
      loadSubjects();
      toast('Chapter added');
    } catch (error) {
      console.error(error);
      setError('Unable to create chapter.');
    }
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubjectId) return;
    try {
      await api.delete(`/api/subjects/${selectedSubjectId}`);
      setSelectedSubjectId('');
      setSelectedChapterId('');
      loadSubjects();
      loadLessons(searchQuery);
      toast('Subject deleted');
    } catch (error) {
      console.error(error);
      setError('Unable to delete subject.');
    }
  };

  const handleDeleteChapter = async () => {
    if (!selectedChapterId) return;
    try {
      await api.delete(`/api/chapters/${selectedChapterId}`);
      setSelectedChapterId('');
      loadSubjects();
      loadLessons(searchQuery);
      toast('Chapter deleted');
    } catch (error) {
      console.error(error);
      setError('Unable to delete chapter.');
    }
  };

  const handleCreateLesson = async () => {
    if (!newLessonTitle.trim() || !selectedChapterId) return;
    try {
      const response = await api.post<{ data: LessonDetail }>("/api/lessons", {
        chapter_id: selectedChapterId,
        title: newLessonTitle.trim(),
        content: '',
      });
      setNewLessonTitle('');
      loadSubjects();
      loadLessons(searchQuery);
      if (response.data?.id) {
        setSelectedLesson(response.data.id);
      }
      toast('Lesson added');
    } catch (error) {
      console.error(error);
      setError('Unable to create lesson.');
    }
  };

  const handleDeleteLesson = async () => {
    if (!currentLesson?.id) return;
    try {
      await api.delete(`/api/lessons/${currentLesson.id}`);
      setSelectedLesson(undefined);
      loadSubjects();
      loadLessons(searchQuery);
      toast('Lesson deleted');
    } catch (error) {
      console.error(error);
      setError('Unable to delete lesson.');
    }
  };

  const handleSaveLesson = async (payload: { title: string; content: string }) => {
    if (!currentLesson?.id) return;
    try {
      const response = await api.patch<{ data: LessonDetail }>(`/api/lessons/${currentLesson.id}`, payload);
      if (response.data) {
        const updatedLesson = normalizeLesson(response.data);
        setCurrentLesson(updatedLesson);
        // Update subjects tree to reflect changes
        loadSubjects();
        // Update lessons list to reflect changes
        loadLessons(searchQuery);
      }
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to save lesson changes.');
      toast('Failed to save lesson');
      throw error; // Re-throw to let the LessonViewer handle it
    }
  };

  const handleUploadFile = async (files: FileList) => {
    if (!currentLesson?.id) return;
    try {
      await loadDriveStatus();
      if (!driveConnected) {
        setError('Google Drive is not connected. Click "Connect Google Drive" first.');
        return;
      }
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));

      setIsUploading(true);
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();
      setUploadRequest(xhr);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        setIsUploading(false);
        setUploadRequest(null);
        setUploadProgress(undefined);
        if (xhr.status >= 200 && xhr.status < 300) {
          await loadLessonDetail(currentLesson.id);
          loadLessons(searchQuery);
          toast('Files uploaded');
        } else {
          const errorBody = JSON.parse(xhr.responseText || '{}');
          setError(errorBody?.error || `Upload failed (${xhr.status})`);
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setUploadRequest(null);
        setUploadProgress(undefined);
        setError('Upload failed');
      };

      xhr.onabort = () => {
        setIsUploading(false);
        setUploadRequest(null);
        setUploadProgress(undefined);
        toast('Upload canceled');
      };

      xhr.open('POST', `${API_URL}/api/lessons/${currentLesson.id}/upload`);
      if (getToken()) {
        xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      }
      xhr.send(formData);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Unable to upload file.');
    }
  };

  const handleCancelUpload = () => {
    if (uploadRequest) {
      uploadRequest.abort();
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!currentLesson?.id) return;
    try {
      await api.delete(`/api/lessons/${currentLesson.id}/files/${fileId}`);
      await loadLessonDetail(currentLesson.id);
      toast('File removed');
    } catch (error) {
      console.error(error);
      setError('Unable to remove file.');
    }
  };

  const handleConnectDrive = async () => {
    try {
      const response = await api.get<{ url: string }>("/api/drive/auth");
      if (response.url) {
        const width = 520;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          response.url,
          'google-drive-auth',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
      }
    } catch (error) {
      console.error(error);
      setError('Unable to start Google Drive connection.');
    }
  };

  const handleSelectLesson = (_subjectId: string, _chapterId: string, lessonId: string) => {
    setSelectedLesson(lessonId);
  };

  const filteredLessons = lessons;

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Academic Repository" />

        <ApiStatusBanner message={error} />

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lessons..."
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
            />
          </div>
        </div>

        {/* Repository Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="card-static p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Subject</h3>
            <input
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full input-minimal"
              placeholder="Subject name"
            />
            <button className="btn-primary w-full" onClick={handleCreateSubject}>Add Subject</button>
            <button className="btn-secondary w-full" onClick={handleDeleteSubject}>
              Delete Selected Subject
            </button>
          </div>
          <div className="card-static p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Chapter</h3>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-transparent border border-border rounded-lg p-2 text-foreground"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            <input
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              className="w-full input-minimal"
              placeholder="Chapter name"
            />
            <button className="btn-primary w-full" onClick={handleCreateChapter}>Add Chapter</button>
            <button className="btn-secondary w-full" onClick={handleDeleteChapter}>
              Delete Selected Chapter
            </button>
          </div>
          <div className="card-static p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Lesson</h3>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full bg-transparent border border-border rounded-lg p-2 text-foreground"
            >
              {subjects
                .find((subject) => subject.id === selectedSubjectId)?.chapters
                ?.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                ))}
            </select>
            <input
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              className="w-full input-minimal"
              placeholder="Lesson title"
            />
            <button className="btn-primary w-full" onClick={handleCreateLesson}>Add Lesson</button>
          </div>
        </div>

        {!driveConnected && (
          <div className="mb-6">
            <button className="btn-secondary" onClick={handleConnectDrive}>
              Connect Google Drive
            </button>
          </div>
        )}

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Subject Tree */}
          {showSubjects && (
            <div className="lg:col-span-3 card-static p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider px-2">
              Subjects
            </h3>
            <button className="btn-secondary mb-4" onClick={() => setShowSubjects(false)}>
              Hide Subjects
            </button>
            <SubjectTree
              subjects={subjects}
              onSelectLesson={handleSelectLesson}
              selectedLesson={selectedLesson}
            />
            </div>
          )}

          {/* Lesson List */}
          {showLessons && (
            <div className="lg:col-span-4 card-static p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              Lessons
            </h3>
            <button className="btn-secondary mb-4" onClick={() => setShowLessons(false)}>
              Hide Lessons
            </button>
            <LessonList
              lessons={filteredLessons}
              onSelect={setSelectedLesson}
              selectedId={selectedLesson}
            />
            </div>
          )}

          {/* Lesson Viewer */}
          <div
            className={
              showSubjects && showLessons
                ? 'lg:col-span-5'
                : showSubjects && !showLessons
                  ? 'lg:col-span-9'
                  : !showSubjects && showLessons
                    ? 'lg:col-span-8'
                    : 'lg:col-span-12'
            }
          >
            {!showSubjects && (
              <button className="btn-secondary mb-4" onClick={() => setShowSubjects(true)}>
                Show Subjects
              </button>
            )}
            {!showLessons && (
              <button className="btn-secondary mb-4 ml-2" onClick={() => setShowLessons(true)}>
                Show Lessons
              </button>
            )}
            <LessonViewer
              lessonId={currentLesson?.id}
              title={currentLesson?.title}
              content={currentLesson?.content}
              fileUrl={currentLesson?.fileUrl ?? null}
              fileName={currentLesson?.fileName ?? null}
              files={currentLesson?.files ?? []}
              onSave={currentLesson ? handleSaveLesson : undefined}
              onUpload={currentLesson ? handleUploadFile : undefined}
              onRemoveFile={currentLesson ? handleRemoveFile : undefined}
              onDelete={currentLesson ? handleDeleteLesson : undefined}
              isEditing={isEditing}
              onToggleEdit={setIsEditing}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onCancelUpload={handleCancelUpload}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
