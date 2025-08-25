import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
import type { ToolExecution, WriteToolInput } from './types';

interface WriteToolProps {
  execution: ToolExecution;
}

export const WriteTool: React.FC<WriteToolProps> = ({ execution }) => {
  const input = execution.toolInput as WriteToolInput;

  // 提取文件名作为副标题
  const getSubtitle = () => {
    if (!input.file_path) return undefined;
    const fileName = input.file_path.split('/').pop() || input.file_path;
    return fileName;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label="文件路径" value={input.file_path} />
        <ToolInput 
          label="文件内容" 
          value={input.content.length > 500 ? 
            input.content.substring(0, 500) + '\n...(内容已截断)' : 
            input.content
          } 
          isCode={true} 
        />
        {input.content.length > 500 && (
          <div className="text-xs text-gray-500 mt-1">
            总长度: {input.content.length} 字符
          </div>
        )}
      </div>
      
      {execution.toolResult && !execution.isError && (
        <ToolOutput result={execution.toolResult} />
      )}
    </BaseToolComponent>
  );
};