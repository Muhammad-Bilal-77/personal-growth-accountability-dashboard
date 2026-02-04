import { Upload } from 'lucide-react';

interface LessonViewerProps {
  title?: string;
  content?: string;
}

export default function LessonViewer({ title, content }: LessonViewerProps) {
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
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Upload className="w-4 h-4" />
          Attach File
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="prose prose-stone max-w-none">
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p className="text-muted-foreground">
              This lesson content is a placeholder. In a full implementation, 
              this area would display rich text content, notes, and attached resources.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
