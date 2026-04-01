// FILE: src/drafting/components/DraftResultRenderer.tsx
import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface DraftResultRendererProps {
  text: string;
  onChange: (value: string) => void;
}

export const DraftResultRenderer: React.FC<DraftResultRendererProps> = ({ text, onChange }) => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  return (
    <div className="quill-editor-container bg-white text-black min-h-[29.7cm] p-12">
      <ReactQuill 
        theme="snow" 
        value={text} 
        onChange={onChange} 
        modules={modules}
        className="h-full border-none"
      />
    </div>
  );
};