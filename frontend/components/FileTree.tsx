import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { FileNode } from '@/utils/extractFiles';

interface FileTreeProps {
  nodes: FileNode[],
  onFileClick: (file: FileNode) => void
}

export function FileTree({ nodes, onFileClick }: FileTreeProps) {
  return (
    <div className='file-tree'>
      {nodes.map((node, index) => (
        <FileTreeNode key={index} node={node} onFileClick={onFileClick} />
      ))}
    </div>
  )
}

interface FileTreeNodeProps {
  node: FileNode,
  onFileClick: (file: FileNode) => void
}

//Its job is to render ONE node (file or folder) and handle user interactions 
function FileTreeNode({ node, onFileClick }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen)
    } else {
      onFileClick(node)
    }
  }
  return (
    <div className='file-tree-node'>
      <div onClick={handleClick} className='flex items-center gap-2 px-2 py-1 hover:bg-gray-700 cursor-pointer'>
        {node.type === 'folder' ? (
          <>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Folder size={16} />
          </>
        ) : (
        <>
          <div className="w-4" /> {/* Spacer */}
          <File size={16} />
        </>
        )}
      <span className='text-sm'>{node.name}</span>
      </div>

      {node.type==='folder' && isOpen && node.children && (
        <div className='ml-4'>
          {node.children.map((child, index)=>(
            <FileTreeNode key={index} node={child} onFileClick={onFileClick}  />
          ))}
        </div>
      )}
    </div>
  )
}