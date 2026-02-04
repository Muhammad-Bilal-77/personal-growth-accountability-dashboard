import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  chapters: {
    id: string;
    name: string;
    lessons: {
      id: string;
      name: string;
    }[];
  }[];
}

interface SubjectTreeProps {
  subjects: Subject[];
  onSelectLesson: (subjectId: string, chapterId: string, lessonId: string) => void;
  selectedLesson?: string;
}

export default function SubjectTree({ subjects, onSelectLesson, selectedLesson }: SubjectTreeProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const toggleSubject = (id: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSubjects(newSet);
  };

  const toggleChapter = (id: string) => {
    const newSet = new Set(expandedChapters);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedChapters(newSet);
  };

  return (
    <div className="space-y-2">
      {subjects.map((subject) => (
        <div key={subject.id} className="animate-fade-in opacity-0" style={{ animationDelay: '100ms' }}>
          <button
            onClick={() => toggleSubject(subject.id)}
            className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors text-left"
          >
            {expandedSubjects.has(subject.id) ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <BookOpen className="w-5 h-5 text-foreground" />
            <span className="font-medium text-foreground">{subject.name}</span>
          </button>
          
          {expandedSubjects.has(subject.id) && (
            <div className="ml-6 space-y-1">
              {subject.chapters.map((chapter) => (
                <div key={chapter.id}>
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    {expandedChapters.has(chapter.id) ? (
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground">{chapter.name}</span>
                  </button>
                  
                  {expandedChapters.has(chapter.id) && (
                    <div className="ml-5 space-y-1">
                      {chapter.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => onSelectLesson(subject.id, chapter.id, lesson.id)}
                          className={cn(
                            'w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left text-sm',
                            selectedLesson === lesson.id
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          <FileText className="w-4 h-4" />
                          <span>{lesson.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
