import React, { useState } from 'react';
import { Search, Filter, Download, Share2, MoreHorizontal, FileText, Image as ImageIcon, File, ChevronLeft } from 'lucide-react';

interface FilesViewProps {
  onBack?: () => void;
  isMobile?: boolean;
}

const FilesView: React.FC<FilesViewProps> = ({ onBack, isMobile }) => {
  const files = [
    {
      id: 1,
      name: 'Project Proposal.pdf',
      type: 'pdf',
      size: '2.5 MB',
      modified: '2025-01-15T14:30:00Z',
      shared: true
    },
    {
      id: 2,
      name: 'Meeting Notes.docx',
      type: 'doc',
      size: '1.2 MB',
      modified: '2025-01-15T13:00:00Z',
      shared: false
    },
    {
      id: 3,
      name: 'Presentation.pptx',
      type: 'ppt',
      size: '4.8 MB',
      modified: '2025-01-14T15:30:00Z',
      shared: true
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-4 mb-4">
          {isMobile && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-semibold">Files</h1>
        </div>
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search files..."
              className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
            <Filter size={18} className="mr-2" />
            Filter
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(file => (
            <div
              key={file.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {file.type === 'pdf' ? (
                    <FileText className="text-red-500" size={24} />
                  ) : file.type === 'doc' ? (
                    <File className="text-blue-500" size={24} />
                  ) : (
                    <ImageIcon className="text-purple-500" size={24} />
                  )}
                  <div>
                    <h3 className="font-medium truncate max-w-[200px]">{file.name}</h3>
                    <p className="text-sm text-gray-500">{file.size}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Modified {new Date(file.modified).toLocaleDateString()}
                </span>
                <div className="flex space-x-2">
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download size={16} />
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilesView;