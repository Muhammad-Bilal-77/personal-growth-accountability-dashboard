import { useState } from 'react';
import { Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import SubjectTree from '@/components/academic/SubjectTree';
import LessonList from '@/components/academic/LessonList';
import LessonViewer from '@/components/academic/LessonViewer';

const mockSubjects = [
  {
    id: 'math',
    name: 'Mathematics',
    chapters: [
      {
        id: 'algebra',
        name: 'Algebra',
        lessons: [
          { id: 'linear-eq', name: 'Linear Equations' },
          { id: 'quadratic', name: 'Quadratic Functions' },
        ],
      },
      {
        id: 'calculus',
        name: 'Calculus',
        lessons: [
          { id: 'derivatives', name: 'Introduction to Derivatives' },
          { id: 'integrals', name: 'Basic Integration' },
        ],
      },
    ],
  },
  {
    id: 'science',
    name: 'Natural Sciences',
    chapters: [
      {
        id: 'physics',
        name: 'Physics',
        lessons: [
          { id: 'mechanics', name: 'Classical Mechanics' },
          { id: 'thermodynamics', name: 'Thermodynamics' },
        ],
      },
    ],
  },
  {
    id: 'languages',
    name: 'Languages',
    chapters: [
      {
        id: 'arabic',
        name: 'Arabic',
        lessons: [
          { id: 'grammar', name: 'Grammar Fundamentals' },
          { id: 'vocabulary', name: 'Essential Vocabulary' },
        ],
      },
    ],
  },
];

const mockLessons = [
  { id: 'linear-eq', title: 'Linear Equations', dateAdded: 'Jan 15, 2024' },
  { id: 'quadratic', title: 'Quadratic Functions', dateAdded: 'Jan 18, 2024' },
  { id: 'derivatives', title: 'Introduction to Derivatives', dateAdded: 'Jan 22, 2024' },
  { id: 'integrals', title: 'Basic Integration', dateAdded: 'Jan 25, 2024' },
  { id: 'mechanics', title: 'Classical Mechanics', dateAdded: 'Jan 28, 2024' },
];

export default function AcademicRepository() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string | undefined>();

  const handleSelectLesson = (_subjectId: string, _chapterId: string, lessonId: string) => {
    setSelectedLesson(lessonId);
  };

  const filteredLessons = mockLessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentLesson = mockLessons.find(l => l.id === selectedLesson);

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Academic Repository" />

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

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Subject Tree */}
          <div className="lg:col-span-3 card-static p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider px-2">
              Subjects
            </h3>
            <SubjectTree
              subjects={mockSubjects}
              onSelectLesson={handleSelectLesson}
              selectedLesson={selectedLesson}
            />
          </div>

          {/* Lesson List */}
          <div className="lg:col-span-4 card-static p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              Lessons
            </h3>
            <LessonList
              lessons={filteredLessons}
              onSelect={setSelectedLesson}
              selectedId={selectedLesson}
            />
          </div>

          {/* Lesson Viewer */}
          <div className="lg:col-span-5">
            <LessonViewer
              title={currentLesson?.title}
              content={currentLesson ? `<p>Welcome to ${currentLesson.title}.</p><p>This lesson covers fundamental concepts and practical applications. The content area supports rich text formatting, embedded images, and attached documents for comprehensive learning.</p><p>Key topics include:</p><ul><li>Core principles and definitions</li><li>Step-by-step problem solving</li><li>Practice exercises</li><li>Additional resources</li></ul>` : undefined}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
