import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, Loader2, Upload, File, Trash2, Menu, Plus, History, Save, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { marked } from 'marked';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  preview: string;
}

interface Subject {
  id: string;
  name: string;
  chapters?: { id: string; name: string }[];
}

interface AcademicChatbotProps {
  context?: {
    lessonTitle?: string;
    lessonContent?: string;
    subjectName?: string;
    chapterName?: string;
  };
  subjects?: Subject[];
  externalSelectedText?: string;
  onExternalTextProcessed?: () => void;
}

export default function AcademicChatbot({ context, subjects, externalSelectedText, onExternalTextProcessed }: AcademicChatbotProps) {
  // Helper function to parse markdown and make it visually appealing
  const parseMarkdown = (content: string) => {
    // Configure marked for better formatting
    marked.setOptions({
      breaks: true, // Convert \n to <br>
      gfm: true, // GitHub Flavored Markdown
    });
    
    return marked.parse(content);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hi! I\'m your academic assistant. I can help you understand lessons, answer questions, and provide explanations.\n\n**Quick tips:**\n- Upload files (PDF, DOCX, PPTX) to ask questions about them\n- **Select any text** in my responses to ask follow-up questions\n- Use the content filter to focus on specific subjects or chapters\n\nHow can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileText, setUploadedFileText] = useState<string>('');
  const [contentScope, setContentScope] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedText, setSelectedText] = useState<string>('');
  const [showAskAbout, setShowAskAbout] = useState(false);
  const [askAboutPosition, setAskAboutPosition] = useState({ x: 0, y: 0 });
  const [contextText, setContextText] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('active');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Hide "Ask AI about this" button when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setShowAskAbout(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle external text selection (from LessonViewer)
  useEffect(() => {
    if (externalSelectedText && externalSelectedText.trim()) {
      setContextText(externalSelectedText);
      setIsMinimized(false); // Expand the chatbot
      toast.success('Text selected from lesson. Ask your question!');
      inputRef.current?.focus();
      
      // Notify parent that text was processed
      if (onExternalTextProcessed) {
        onExternalTextProcessed();
      }
    }
  }, [externalSelectedText, onExternalTextProcessed]);

  // Handle text selection in AI responses
  const handleTextSelection = (e: React.MouseEvent) => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length > 0) {
        setSelectedText(text);
        
        // Get the position of the selection
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        
        if (rect) {
          setAskAboutPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom // Use viewport coordinates directly
          });
          setShowAskAbout(true);
        }
      } else {
        setShowAskAbout(false);
      }
    }, 10);
  };

  // Handle "Ask AI about this" click
  const handleAskAboutSelection = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling
    if (selectedText) {
      setContextText(selectedText);
      setShowAskAbout(false);
      toast.success('Text selected as context. Ask your question now!');
      inputRef.current?.focus();
    }
  };

  // Clear context
  const handleClearContext = () => {
    setContextText('');
    toast.info('Context cleared');
  };

  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const stored = localStorage.getItem('academic_chat_history');
      if (stored) {
        const history = JSON.parse(stored) as ChatHistory[];
        setChatHistory(history.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // Save current chat to localStorage
  const saveCurrentChat = () => {
    if (messages.length <= 1) {
      toast.info('No conversation to save');
      return;
    }

    setIsSaving(true);
    try {
      // Generate title from first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage 
        ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
        : `Chat ${new Date().toLocaleString()}`;

      const chatId = currentChatId === 'active' ? `chat_${Date.now()}` : currentChatId;
      
      const chatData: ChatHistory = {
        id: chatId,
        title,
        messageCount: messages.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preview: firstUserMessage?.content.substring(0, 100) || 'No preview',
      };

      // Save messages separately
      localStorage.setItem(`academic_chat_${chatId}`, JSON.stringify({
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
      }));

      // Update history list
      const stored = localStorage.getItem('academic_chat_history');
      const history: ChatHistory[] = stored ? JSON.parse(stored) : [];
      const existingIndex = history.findIndex(h => h.id === chatId);
      
      if (existingIndex >= 0) {
        history[existingIndex] = chatData;
      } else {
        history.push(chatData);
      }
      
      localStorage.setItem('academic_chat_history', JSON.stringify(history));
      
      setCurrentChatId(chatId);
      toast.success('Chat saved successfully!');
      loadChatHistory();
    } catch (error) {
      console.error('Failed to save chat:', error);
      toast.error('Failed to save chat');
    } finally {
      setIsSaving(false);
    }
  };

  // Load specific chat from localStorage
  const loadChat = (chatId: string) => {
    try {
      const stored = localStorage.getItem(`academic_chat_${chatId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.timestamp),
        })));
        setCurrentChatId(chatId);
        setLastSaved(null); // Reset for loaded chats (will autosave if modified)
        toast.success('Chat loaded successfully!');
        setShowSidebar(false);
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
      toast.error('Failed to load chat');
    }
  };

  // Delete chat from localStorage
  const deleteChat = (chatId: string) => {
    try {
      localStorage.removeItem(`academic_chat_${chatId}`);
      
      const stored = localStorage.getItem('academic_chat_history');
      if (stored) {
        const history: ChatHistory[] = JSON.parse(stored);
        const filtered = history.filter(h => h.id !== chatId);
        localStorage.setItem('academic_chat_history', JSON.stringify(filtered));
      }
      
      toast.success('Chat deleted successfully!');
      loadChatHistory();
      
      if (currentChatId === chatId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  // Start a new chat
  const startNewChat = () => {
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content: 'Hi! I\'m your academic assistant. I can help you understand lessons, answer questions, and provide explanations.\n\n**Quick tips:**\n- Upload files (PDF, DOCX, PPTX) to ask questions about them\n- **Select any text** in my responses to ask follow-up questions\n- Use the content filter to focus on specific subjects or chapters\n\nHow can I help you today?',
        timestamp: new Date(),
      },
    ]);
    setCurrentChatId('active');
    setUploadedFile(null);
    setUploadedFileText('');
    setContextText('');
    setShowSidebar(false);
    setLastSaved(null);
    toast.success('Started new chat!');
  };

  // Auto-save active chat whenever messages change
  useEffect(() => {
    if (messages.length > 1 && currentChatId === 'active') {
      setIsAutoSaving(true);
      const timer = setTimeout(async () => {
        try {
          // Save to localStorage
          localStorage.setItem('academic_chat_active', JSON.stringify({
            messages: messages.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp.toISOString(),
            })),
            updatedAt: new Date().toISOString(),
          }));
          
          // Try to save to Google Drive as backup (silent fail)
          try {
            await api.post('/api/chat/auto-save', {
              messages: messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
              })),
            });
          } catch (driveError) {
            // Silent fail for Drive - localStorage is primary
            console.log('Drive backup skipped (offline or not configured)');
          }
          
          setLastSaved(new Date());
          setIsAutoSaving(false);
        } catch (error) {
          console.error('Failed to auto-save:', error);
          setIsAutoSaving(false);
        }
      }, 2000); // 2 second debounce
      
      return () => {
        clearTimeout(timer);
        setIsAutoSaving(false);
      };
    }
  }, [messages, currentChatId]);

  // Load active chat and history on mount
  useEffect(() => {
    loadChatHistory();
    
    // Load active chat if exists
    try {
      const stored = localStorage.getItem('academic_chat_active');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.timestamp),
          })));
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt));
          }
          toast.success('Previous conversation restored');
        }
      }
    } catch (error) {
      console.error('Failed to load active chat:', error);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, Word, PowerPoint, and text files are supported');
      return;
    }

    setUploadedFile(file);
    setIsLoading(true);
    
    toast.info(`Uploading ${file.name}...`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use raw fetch for file upload (FormData needs special handling)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/parse-file`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || errorData.details || 'Failed to upload file');
      }
      
      const data = await response.json();
      
      if (data.success && data.text) {
        setUploadedFileText(data.text);
        const extractedBy = data.extractedBy ? ` (${data.extractedBy})` : '';
        toast.success(`File "${file.name}" uploaded successfully${extractedBy}`);
        
        // Auto-switch to file-only mode
        setContentScope('file');
      } else {
        throw new Error('Failed to parse file');
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to process file. Please try again.');
      setUploadedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFileText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Include context text in the user's message if present
    const fullMessage = contextText 
      ? `Context: "${contextText}"\n\nQuestion: ${input.trim()}`
      : input.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post<{ message: string; success: boolean }>('/api/chat', {
        message: fullMessage,
        context: context,
        conversationHistory: messages.slice(-5).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        uploadedFileText: uploadedFileText || undefined,
        uploadedFileName: uploadedFile?.name || undefined,
        contentScope: contentScope,
        selectedSubjectId: selectedSubjectId || undefined,
        selectedChapterId: selectedChapterId || undefined,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message || 'I apologize, but I couldn\'t process that request.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Clear context after successful send
      if (contextText) {
        setContextText('');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content: 'Conversation cleared. How can I help you?',
        timestamp: new Date(),
      },
    ]);
  };

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card 
      className={`fixed ${isExpanded ? 'inset-4' : 'bottom-4 right-4 w-96 h-[500px]'} shadow-2xl z-50 flex flex-col transition-all duration-300`}
    >
      {/* Chat History Sidebar */}
      {showSidebar && (
        <div className="absolute inset-y-0 left-0 w-64 bg-background border-r shadow-lg z-10 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Chat History</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSidebar(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-2">
            {chatHistory.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No saved chats yet
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                      chat.id === currentChatId ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                          <p className="text-sm font-medium truncate">{chat.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {chat.preview}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chat.messageCount} messages • {new Date(chat.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this chat?')) {
                            deleteChat(chat.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSidebar(!showSidebar)}
            title="Chat History"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={startNewChat}
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Academic Assistant</CardTitle>
            {isAutoSaving && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {!isAutoSaving && lastSaved && messages.length > 1 && (
              <div className="text-xs text-muted-foreground" title={`Last saved at ${lastSaved.toLocaleTimeString()}`}>
                ✓ Saved
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={saveCurrentChat}
            disabled={isSaving || messages.length <= 1}
            title="Save Chat"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
        {/* "Ask AI about this" popup button */}
        {showAskAbout && (
          <div
            className="fixed z-[9999] bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-xl text-sm font-medium cursor-pointer hover:bg-primary/90 transition-all hover:scale-105 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              left: `${askAboutPosition.x}px`,
              top: `${askAboutPosition.y + 10}px`,
              transform: 'translateX(-50%)'
            }}
            onClick={handleAskAboutSelection}
            onMouseDown={(e) => e.preventDefault()} // Prevent text deselection
          >
            <Bot className="h-4 w-4" />
            <span>Ask AI about this</span>
            <span className="text-xs opacity-75">→</span>
          </div>
        )}

        <ScrollArea className="flex-1 p-4" ref={scrollRef} onMouseUp={handleTextSelection}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                    style={{ userSelect: 'text' }}
                  >
                    {message.role === 'assistant' ? (
                      <div 
                        className="text-sm break-words prose prose-sm max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 select-text"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                        title="Select text to ask AI about specific parts"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[80%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg p-3 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          {/* File upload status */}
          {uploadedFile && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-muted rounded-md">
              <File className="h-4 w-4 text-primary" />
              <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRemoveFile}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Content scope selector */}
          <div className="mb-3 space-y-2">
            <Select value={contentScope} onValueChange={setContentScope}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Content Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Repository Content</SelectItem>
                <SelectItem value="current">Current Lesson Only</SelectItem>
                <SelectItem value="subject">Specific Subject</SelectItem>
                <SelectItem value="chapter">Specific Chapter</SelectItem>
                {uploadedFile && <SelectItem value="file">Uploaded File Only</SelectItem>}
              </SelectContent>
            </Select>
            
            {/* Subject selector */}
            {contentScope === 'subject' && subjects && subjects.length > 0 && (
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Chapter selector */}
            {contentScope === 'chapter' && subjects && subjects.length > 0 && (
              <>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSubjectId && subjects.find(s => s.id === selectedSubjectId)?.chapters && (
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.find(s => s.id === selectedSubjectId)?.chapters?.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>
          
          {/* Message input */}
          <div className="space-y-2">
            {/* Context indicator */}
            {contextText && (
              <div className="flex items-center gap-2 bg-muted p-2 rounded-md text-xs">
                <div className="flex-1">
                  <span className="font-semibold text-primary">Context attached:</span>
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    "{contextText.length > 100 ? contextText.substring(0, 100) + '...' : contextText}"
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={handleClearContext}
                  title="Clear context"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <div className="flex space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                size="icon"
                variant="outline"
                title="Upload file"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {uploadedFile ? (
                `File: ${uploadedFile.name}`
              ) : context?.lessonTitle ? (
                `Context: ${context.lessonTitle}`
              ) : (
                'No specific context'
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="text-xs h-7"
            >
              Clear chat
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
