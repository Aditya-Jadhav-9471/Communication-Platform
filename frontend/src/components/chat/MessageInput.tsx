import React, { useState, useRef } from 'react';
import { Paperclip, Send, Smile, X, Image, FileText, Reply } from 'lucide-react';
import api from '../../api/axios';
import { Message } from '../../types/message';

interface MessageInputProps {
  onSendMessage: (content: string, attachments: Array<{ id: string; type: 'file' | 'image'; name: string; url: string; size?: number }>) => void;
  replyingTo?: Message;
  onCancelReply?: () => void;
  activeChat: string | null;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  replyingTo,
  onCancelReply,
  activeChat,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && attachments.length === 0 || uploading || !activeChat) {
      return;
    }
  
    let uploadedFiles: Array<{ id: string; type: 'file' | 'image'; name: string; url: string; size?: number }> = [];
  
    if (attachments.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        attachments.forEach(file => formData.append('attachments', file));
        
        const response = await api.post(`/channels/${activeChat}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
  
        uploadedFiles = response.data.uploadedFiles;
      } catch (error) {
        console.error('Error uploading files:', error);
        setUploading(false);
        return;
      }
      setUploading(false);
    }
  
    // Modified: Pass only the replyingTo.id
    onSendMessage(message.trim(), uploadedFiles, replyingTo ? replyingTo.id : undefined);
    setMessage('');
    setAttachments([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit
      setAttachments(prev => [...prev, ...newFiles]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getFileIcon = (file: File) => {
    const isImage = file.type.startsWith('image/');
    return isImage ? <Image size={18} /> : <FileText size={18} />;
  };
  
  return (
    <div className="p-4 bg-white border-t border-gray-100">
      {replyingTo && (
        <div className="mb-3 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2 border-l-2 border-blue-500">
          <div className="flex items-center space-x-2">
            <Reply size={16} className="text-blue-500" />
            <div>
              <div className="text-sm font-medium text-gray-800">{replyingTo.sender.name}</div>
              <div className="text-sm text-gray-600 truncate">{replyingTo.content}</div>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 hover:bg-gray-200/70 rounded-full transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div 
              key={index}
              className="bg-gray-50 rounded-xl px-4 py-2 flex items-center text-sm border border-gray-200 group hover:border-gray-300 transition-colors"
            >
              <span className="text-gray-500 mr-2">{getFileIcon(file)}</span>
              <span className="truncate max-w-[150px] font-medium">{file.name}</span>
              <button 
                onClick={() => removeAttachment(index)}
                className="ml-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-full transition-all"
                disabled={uploading}
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <div className="min-h-[52px] max-h-[120px] rounded-xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 border border-gray-200 transition-all">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full resize-none bg-transparent px-5 py-3 pr-24 outline-none placeholder:text-gray-500 text-base max-h-[120px]"
              rows={1}
              disabled={uploading}
            />
            
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              <button
                type="button"
                onClick={triggerFileInput}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-200/70 transition-colors"
                aria-label="Attach file"
                disabled={uploading}
              >
                <Paperclip size={20} />
              </button>
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-200/70 transition-colors"
                aria-label="Add emoji"
                disabled={uploading}
              >
                <Smile size={20} />
              </button>
            </div>
          </div>
        </div>
        
        <button 
          type="submit"
          disabled={(!message.trim() && attachments.length === 0) || uploading}
          className="h-[52px] w-[52px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed transition-colors flex-shrink-0 flex items-center justify-center group"
          aria-label="Send message"
        >
          <Send size={20} className="text-white transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        />
      </form>
      
      {isEmojiPickerOpen && (
        <div className="absolute bottom-24 right-6 bg-white border border-gray-200 rounded-xl shadow-lg p-2">
          <div className="grid grid-cols-6 gap-1.5 p-1">
            {['😊', '👍', '❤️', '🎉', '🔥', '👏', '🤔', '😂', '🙌', '👋', '💪', '🙏'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setMessage(prev => prev + emoji);
                  setIsEmojiPickerOpen(false);
                }}
                className="text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={uploading}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;