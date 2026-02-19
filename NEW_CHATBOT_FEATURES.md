# New Chatbot Features Documentation

## 🎉 New Features Added

### 1. File Upload Support
Upload documents and ask the AI questions about them!

**Supported Formats:**
- PDF (`.pdf`)
- Word Documents (`.doc`, `.docx`)
- PowerPoint Presentations (`.ppt`, `.pptx`)
- Text Files (`.txt`)

**How to Use:**
1. Click the upload button (📤) in the chatbot
2. Select your file (max 10MB)
3. Wait for processing confirmation
4. Ask questions about the uploaded content

**Example Questions:**
- "Summarize this document"
- "What are the key points in this presentation?"
- "Explain the main concepts from this PDF"

### 2. Content Scope Selector
Control what content the AI has access to - saves tokens and gives faster, more focused responses!

**Scope Options:**

#### 📚 All Repository Content
- Full access to ALL subjects, chapters, and lessons
- Best for: General questions across your entire academic repository
- Example: "Compare Chapter 3 and Chapter 5 of BLD"

#### 📖 Current Lesson Only
- Only accesses the lesson you're currently viewing
- Best for: Focused questions about current study material
- Saves tokens: Fastest responses
- Example: "Explain this lesson in simpler terms"

#### 🎓 Specific Subject
- Select dropdown to choose one subject
- Access all chapters and lessons in that subject
- Best for: Subject-specific questions
- Example: "What topics are covered in Business Law?"

#### 📑 Specific Chapter
- Select subject, then select one chapter
- Access only lessons in that specific chapter
- Best for: Chapter-focused study
- Example: "Summarize all lessons in Chapter 4"

#### 📄 Uploaded File Only
- Only available when you've uploaded a file
- AI focuses exclusively on your uploaded document
- Ignores repository content
- Best for: Document-specific questions
- Example: "What's the conclusion of this research paper?"

## Benefits

### Token Savings
- **All Repository:** ~10,000+ tokens per request
- **Specific Subject:** ~3,000-5,000 tokens
- **Specific Chapter:** ~1,000-2,000 tokens
- **Current Lesson:** ~500-1,000 tokens
- **Uploaded File:** Depends on file size

Result: **More efficient API usage** = More questions per day!

### Faster Responses
Smaller context = Faster AI processing:
- All Repository: 4-8 seconds
- Current Lesson: 2-4 seconds
- Uploaded File: 2-5 seconds (depending on size)

### Better Accuracy
Focused context helps AI give more precise answers:
- Less confusion from unrelated content
- More relevant citations
- Clearer explanations

## Technical Details

### Backend Endpoints

#### POST `/api/parse-file`
Parses uploaded files and extracts text content.

**Request:** `multipart/form-data` with file
**Response:** 
```json
{
  "success": true,
  "text": "extracted text content...",
  "fileName": "document.pdf"
}
```

#### POST `/api/chat` (Updated)
Now accepts additional parameters:

```json
{
  "message": "Your question",
  "context": { "lessonTitle": "...", "lessonContent": "..." },
  "contentScope": "all|current|subject|chapter|file",
  "selectedSubjectId": "uuid",
  "selectedChapterId": "uuid",
  "uploadedFileText": "file content...",
  "uploadedFileName": "file.pdf",
  "conversationHistory": []
}
```

### File Parsing Libraries
- **pdf-parse:** Extract text from PDFs
- **mammoth:** Parse Word documents
- **multer:** Handle file uploads

### Caching Strategy
Cache keys now include:
- Message content
- Context
- Content scope
- Selected subject/chapter
- Uploaded file content

This ensures cache hits only for truly identical queries.

## Usage Tips

### For Daily Study
1. Use **Current Lesson** scope while studying
2. Switch to **Specific Chapter** for chapter reviews
3. Use **All Repository** for exam prep and comparisons

### For Document Analysis
1. Upload your document (notes, papers, slides)
2. Switch scope to **Uploaded File Only**
3. Ask questions exclusively about that document
4. Remove file when done to return to repository mode

### For Efficient API Usage
1. Start with narrowest scope needed
2. Expand scope only if answer is insufficient
3. Use cache by asking similar questions
4. Current lesson scope uses least tokens

## Example Workflow

### Scenario: Studying Chapter 4 of BLD

1. **Select scope:** "Specific Chapter"
2. **Choose:** BLD → Chapter 4
3. **Ask:** "What are the main topics in this chapter?"
4. **Ask:** "Explain the concept of free consent"
5. **Ask:** "Give me examples from the lessons"

Result: Fast, focused answers using only Chapter 4 content (~1,500 tokens per request vs 10,000+ for full repository).

### Scenario: Analyzing a PDF Lecture

1. **Upload PDF** of professor's lecture notes
2. **Select scope:** "Uploaded File Only"
3. **Ask:** "Summarize the key points"
4. **Ask:** "What examples are provided?"
5. **Ask:** "How does this relate to my Chapter 3?" (Switch to "All" or "Specific Chapter" first!)

## Troubleshooting

### File Upload Issues
- **Error: File too large** → Compress or split file (10MB limit)
- **Error: Unsupported format** → Convert to PDF or TXT
- **Error: Could not extract text** → File may be corrupted or image-based PDF (needs OCR)

### Content Scope Issues
- **"No subjects found"** → Check if repository has content loaded
- **Chapter dropdown empty** → Select a subject first
- **Answers seem generic** → Verify correct scope is selected

### Performance Tips
- Smaller scopes = Faster responses
- PDF processing takes 2-5 seconds
- Large files may take longer to upload
- Cache works across different scopes if query identical

## Future Enhancements

Potential improvements:
- OCR support for image-based PDFs
- Multi-file upload
- File content search
- Persistent file storage
- Image/diagram analysis
- Audio file transcription
