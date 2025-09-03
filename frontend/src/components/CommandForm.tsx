import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, HelpCircle, Plus, Minus, Info, Code, Edit3 } from 'lucide-react';
import { 
  SlashCommand, 
  SlashCommandCreate, 
  SlashCommandUpdate,
  COMMAND_SCOPES,
  DEFAULT_MODELS,
  COMMON_TOOLS
} from '../types/commands';
import { useCreateCommand, useUpdateCommand } from '../hooks/useCommands';

interface CommandFormProps {
  command?: SlashCommand | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CommandForm: React.FC<CommandFormProps> = ({
  command,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<SlashCommandCreate>({
    name: '',
    description: '',
    content: '',
    scope: 'user',
    namespace: '',
    argumentHint: '',
    allowedTools: [],
    model: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToolInput, setShowToolInput] = useState(false);
  const [newTool, setNewTool] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [rawContent, setRawContent] = useState('');
  const [useInheritModel, setUseInheritModel] = useState(true);

  const createCommand = useCreateCommand();
  const updateCommand = useUpdateCommand();

  const isEditing = !!command;

  // Generate markdown content from form data
  const generateMarkdownContent = (data: SlashCommandCreate): string => {
    const frontmatter: string[] = [];
    
    if (data.description) {
      frontmatter.push(`description: ${data.description}`);
    }
    if (data.argumentHint) {
      frontmatter.push(`argument-hint: ${data.argumentHint}`);
    }
    if (data.namespace) {
      frontmatter.push(`namespace: ${data.namespace}`);
    }
    if (data.allowedTools && data.allowedTools.length > 0) {
      frontmatter.push(`allowed-tools: ${data.allowedTools.join(', ')}`);
    }
    if (data.model) {
      frontmatter.push(`model: ${data.model}`);
    }

    if (frontmatter.length > 0) {
      return `---\n${frontmatter.join('\n')}\n---\n\n${data.content}`;
    }
    return data.content;
  };

  // Parse markdown content to form data
  const parseMarkdownContent = (content: string): Partial<SlashCommandCreate> => {
    const frontmatterMatch = content.match(/^---\n(.*?)\n---\n\n?(.*)/s);
    
    if (!frontmatterMatch) {
      return { content };
    }

    const [, frontmatterStr, bodyContent] = frontmatterMatch;
    const result: Partial<SlashCommandCreate> = { content: bodyContent };

    frontmatterStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case 'description':
          result.description = value;
          break;
        case 'argument-hint':
          result.argumentHint = value;
          break;
        case 'namespace':
          result.namespace = value;
          break;
        case 'allowed-tools':
          result.allowedTools = value.split(',').map(tool => tool.trim()).filter(Boolean);
          break;
        case 'model':
          result.model = value;
          break;
      }
    });

    return result;
  };

  useEffect(() => {
    if (command) {
      const data = {
        name: command.name,
        description: command.description,
        content: command.content,
        scope: command.scope,
        namespace: command.namespace || '',
        argumentHint: command.argumentHint || '',
        allowedTools: command.allowedTools || [],
        model: command.model || '',
      };
      setFormData(data);
      setUseInheritModel(!data.model);
      setRawContent(generateMarkdownContent(data));
    } else {
      // Initialize empty rawContent for new commands
      setRawContent(generateMarkdownContent(formData));
    }
  }, [command]);

  // Update rawContent when formData changes (in form mode)
  useEffect(() => {
    if (!isCodeMode) {
      setRawContent(generateMarkdownContent(formData));
    }
  }, [formData, isCodeMode]);

  // Handle mode switching
  const handleModeSwitch = (newMode: boolean) => {
    if (newMode) {
      // Switching to code mode - generate markdown from form
      setRawContent(generateMarkdownContent(formData));
    } else {
      // Switching to form mode - parse markdown to form
      const parsed = parseMarkdownContent(rawContent);
      setFormData({
        ...formData,
        ...parsed
      });
      // Update useInheritModel based on model field
      setUseInheritModel(!parsed.model);
    }
    setIsCodeMode(newMode);
  };

  // Handle raw content change
  const handleRawContentChange = (content: string) => {
    setRawContent(content);
    // Real-time sync to form data
    const parsed = parseMarkdownContent(content);
    setFormData({
      ...formData,
      ...parsed
    });
    // Update useInheritModel based on model field
    setUseInheritModel(!parsed.model);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '命令名称不能为空';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = '命令名称只能包含字母、数字、下划线和短划线';
    }

    if (!formData.content.trim()) {
      newErrors.content = '命令内容不能为空';
    }

    if (!formData.scope) {
      newErrors.scope = '请选择命令作用域';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const submitData = {
        ...formData,
        namespace: formData.namespace.trim() || undefined,
        argumentHint: formData.argumentHint.trim() || undefined,
        allowedTools: formData.allowedTools.length > 0 ? formData.allowedTools : undefined,
        model: formData.model.trim() || undefined,
      };

      if (isEditing) {
        const updateData: SlashCommandUpdate = {
          description: submitData.description,
          content: submitData.content,
          argumentHint: submitData.argumentHint,
          allowedTools: submitData.allowedTools,
          model: submitData.model,
        };
        await updateCommand.mutateAsync({ id: command.id, updates: updateData });
      } else {
        await createCommand.mutateAsync(submitData);
      }

      onSuccess();
    } catch (error: any) {
      setErrors({ submit: error.message || '保存失败' });
    }
  };

  const handleAddTool = () => {
    if (newTool.trim() && !formData.allowedTools.includes(newTool.trim())) {
      setFormData({
        ...formData,
        allowedTools: [...formData.allowedTools, newTool.trim()]
      });
      setNewTool('');
    }
  };

  const handleRemoveTool = (tool: string) => {
    setFormData({
      ...formData,
      allowedTools: formData.allowedTools.filter(t => t !== tool)
    });
  };

  const handleAddCommonTool = (tool: string) => {
    if (!formData.allowedTools.includes(tool)) {
      setFormData({
        ...formData,
        allowedTools: [...formData.allowedTools, tool]
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? '编辑命令' : '新建命令'}
            </h2>
            {/* Mode Switch */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => handleModeSwitch(false)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  !isCodeMode 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>表单</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch(true)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isCodeMode 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>代码</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              form="command-form"
              disabled={createCommand.isPending || updateCommand.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>
                {createCommand.isPending || updateCommand.isPending
                  ? '保存中...'
                  : isEditing
                  ? '保存更改'
                  : '创建命令'}
              </span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form id="command-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {isCodeMode ? (
              /* Code Mode */
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Markdown 源代码
                  </label>
                  <textarea
                    value={rawContent}
                    onChange={(e) => handleRawContentChange(e.target.value)}
                    placeholder={`---
description: 优化代码性能和可读性
argument-hint: [filename] [options]
namespace: frontend
allowed-tools: Read, Write, Edit
model: claude-3-5-sonnet-20241022
---

分析这段代码的性能问题并提供优化建议：

使用参数：$ARGUMENTS
使用第一个参数：$1
使用第二个参数：$2

引用文件：@src/utils/helpers.js
执行命令：!\`git status\``}
                    rows={25}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="mt-2 text-sm text-gray-500">
                    <p><strong>Frontmatter 支持的字段：</strong></p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li><code>description</code> - 命令描述</li>
                      <li><code>argument-hint</code> - 参数提示</li>
                      <li><code>namespace</code> - 命名空间</li>
                      <li><code>allowed-tools</code> - 允许的工具（逗号分隔）</li>
                      <li><code>model</code> - 指定模型</li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              /* Form Mode */
              <>
            {/* Error Message */}
            {errors.submit && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{errors.submit}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Command Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  命令名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isEditing}
                  placeholder="optimize"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  只能包含字母、数字、下划线和短划线
                </p>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  指定模型
                </label>
                <div className="flex items-center space-x-3">
                  {/* Inherit Option */}
                  <div className="flex items-center">
                    <input
                      id="inherit-model"
                      type="checkbox"
                      checked={useInheritModel}
                      onChange={(e) => {
                        setUseInheritModel(e.target.checked);
                        if (e.target.checked) {
                          setFormData({ ...formData, model: '' });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="inherit-model" className="ml-2 text-sm text-gray-700 whitespace-nowrap">
                      继承对话设置
                    </label>
                  </div>
                  
                  {/* Custom Model Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="sonnet"
                      disabled={useInheritModel}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  为此命令指定特定的 AI 模型。
                </p>
              </div>

              {/* Namespace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  命名空间
                </label>
                <input
                  type="text"
                  value={formData.namespace}
                  onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                  placeholder="frontend"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  用于组织命令，可以包含 / 分隔符
                </p>
              </div>

              {/* Argument Hint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  参数提示
                </label>
                <input
                  type="text"
                  value={formData.argumentHint}
                  onChange={(e) => setFormData({ ...formData, argumentHint: e.target.value })}
                  placeholder="[filename] [options]"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  在自动完成时显示的参数提示
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="优化代码性能和可读性"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                命令的简短描述，如果不填写将使用内容的第一行
              </p>
            </div>

            {/* Allowed Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                允许的工具
              </label>
              
              {/* Current Tools */}
              {formData.allowedTools.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.allowedTools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                    >
                      <span>{tool}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTool(tool)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Common Tools */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">常用工具：</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TOOLS.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleAddCommonTool(tool)}
                      disabled={formData.allowedTools.includes(tool)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded border"
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tool Input */}
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    placeholder="Bash(git add:*)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTool}
                  disabled={!newTool.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  添加
                </button>
              </div>
              
              <div className="mt-1 flex items-start space-x-1 text-sm text-gray-500">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  指定命令可以使用的工具。格式如 "Bash(git add:*)" 表示只允许特定的 bash 命令。
                  留空则继承对话权限。
                </span>
              </div>
            </div>

            {/* Command Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                命令内容 *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={`分析这段代码的性能问题并提供优化建议：

使用参数：$ARGUMENTS
使用第一个参数：$1
使用第二个参数：$2

引用文件：@src/utils/helpers.js
执行命令：!\`git status\``}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
              <div className="mt-2 text-sm text-gray-500 space-y-1">
                <p><strong>支持的功能：</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>$ARGUMENTS</code> - 获取所有参数</li>
                  <li><code>$1, $2, ...</code> - 获取指定位置的参数</li>
                  <li><code>@filepath</code> - 引用文件内容</li>
                  <li><code>!`command`</code> - 执行 bash 命令并包含输出</li>
                </ul>
              </div>
            </div>
              </>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};