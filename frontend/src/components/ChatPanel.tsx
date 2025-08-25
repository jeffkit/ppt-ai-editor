import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useAIChat, useSessions, useCreateSession, useDeleteSession } from '../hooks/useAI';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessageRenderer } from './ChatMessageRenderer';

export const ChatPanel: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messages,
    isAiTyping,
    currentSlideIndex,
    slides,
    currentSessionId,
    addMessage,
    updateMessage,
    addTextPartToMessage,
    addToolPartToMessage,
    updateToolPartInMessage,
    setAiTyping,
    setCurrentSessionId,
    clearMessages
  } = useAppStore();
  
  const queryClient = useQueryClient();
  const aiChatMutation = useAIChat();
  const { data: sessionsData } = useSessions();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  useEffect(() => {
    console.log('isAiTyping changed:', isAiTyping);
  }, [isAiTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiTyping) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    addMessage({
      content: userMessage,
      role: 'user'
    });

    // Prepare context
    const context = {
      currentSlide: currentSlideIndex,
      allSlides: slides
    };

    setAiTyping(true);

    try {
      // Add initial AI message placeholder
      let aiMessageId: string | null = null;
      let currentToolId: string | null = null;
      
      console.log('Sending chat request:', { message: userMessage, context, sessionId: currentSessionId });

      // Use SSE streaming chat
      await aiChatMutation.mutateAsync({
        message: userMessage,
        context,
        sessionId: currentSessionId,
        onMessage: (data) => {
          console.log('Received SSE message:', data);
          const eventData = data as { 
            type: string; 
            sessionId?: string; 
            subtype?: string; 
            message?: { content: unknown[] }; 
            permission_denials?: Array<{ tool_name: string; tool_input: Record<string, unknown> }> 
          };
          
          if (eventData.type === 'connected') {
            console.log('Setting session ID:', eventData.sessionId);
            setCurrentSessionId(eventData.sessionId || null);
          } 
          else if (eventData.type === 'system' && eventData.subtype === 'init') {
            // Claude Code SDK initialization
            if (!aiMessageId) {
              const message = {
                content: '🔄 正在初始化 Claude Code SDK...',
                role: 'assistant' as const
              };
              addMessage(message);
              // Get the ID of the message we just added
              const state = useAppStore.getState();
              aiMessageId = state.messages[state.messages.length - 1].id;
            }
          }
          else if (eventData.type === 'assistant') {
            // Add AI message placeholder if not added yet
            if (!aiMessageId) {
              const message = {
                content: '',
                role: 'assistant' as const
              };
              addMessage(message);
              // Get the ID of the message we just added
              const state = useAppStore.getState();
              aiMessageId = state.messages[state.messages.length - 1].id;
            }

            // Handle tool use and text content
            if (eventData.message?.content && aiMessageId) {
              for (const block of eventData.message.content as Array<{ type: string; text?: string; name?: string; input?: unknown }>) {
                if (block.type === 'text') {
                  // Add text as a separate part
                  if (block.text) {
                    addTextPartToMessage(aiMessageId, block.text);
                  }
                } else if (block.type === 'tool_use') {
                  // Add tool usage as a separate part
                  if (block.name) {
                    const toolData = {
                      toolName: block.name,
                      toolInput: (block.input as Record<string, unknown>) || {},
                      isExecuting: true
                    };
                    addToolPartToMessage(aiMessageId, toolData);
                  }
                  
                  // Store the tool ID for later updates
                  const state = useAppStore.getState();
                  const currentMessage = state.messages.find(m => m.id === aiMessageId);
                  if (currentMessage?.messageParts) {
                    const lastPart = currentMessage.messageParts[currentMessage.messageParts.length - 1];
                    if (lastPart.type === 'tool' && lastPart.toolData) {
                      currentToolId = lastPart.toolData.id;
                    }
                  }
                }
              }
            }
          }
          else if (eventData.type === 'user') {
            // Tool results
            if (eventData.message?.content && aiMessageId) {
              for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean }>) {
                if (block.type === 'tool_result' && currentToolId) {
                  // Update the corresponding tool with results
                  const toolResult = typeof block.content === 'string' 
                    ? block.content 
                    : Array.isArray(block.content)
                      ? block.content.map((c: { text?: string }) => c.text || String(c)).join('')
                      : JSON.stringify(block.content);
                  
                  updateToolPartInMessage(aiMessageId, currentToolId, {
                    toolResult,
                    isError: block.is_error || false,
                    isExecuting: false
                  });
                  
                  currentToolId = null; // Reset for next tool
                }
              }
            }
          }
          else if (eventData.type === 'result') {
            console.log('Received result, stopping AI typing...');
            // Force state update immediately
            setTimeout(() => {
              setAiTyping(false);
              console.log('AI typing status should be false now');
            }, 0);
            
            // Handle different result types
            let finalMessage = '';
            if (eventData.subtype === 'success') {
              finalMessage = '';
            } else if (eventData.subtype === 'error_max_turns') {
              finalMessage = '\n\n⏱️ **达到最大轮次限制**';
              if (eventData.permission_denials && eventData.permission_denials.length > 0) {
                finalMessage += '\n\n⚠️ **权限拒绝的操作**:';
                eventData.permission_denials.forEach((denial: { tool_name: string; tool_input: Record<string, unknown> }, index: number) => {
                  finalMessage += `\n${index + 1}. ${denial.tool_name}: \`${denial.tool_input.command || denial.tool_input.description || JSON.stringify(denial.tool_input)}\``;
                });
                finalMessage += '\n\n💡 某些操作需要用户权限确认才能执行。';
              }
            } else if (eventData.subtype === 'error_during_execution') {
              finalMessage = '\n\n❌ **执行过程中出现错误**';
            } else {
              finalMessage = '\n\n✅ **处理完成**';
            }
            
            // Remove cost and timing info display
            // if (data.total_cost_usd) {
            //   finalMessage += `\n\n📊 **统计信息**: 成本 $${data.total_cost_usd.toFixed(4)}, 耗时 ${data.duration_ms}ms`;
            // }
            
            // Update final message content
            if (aiMessageId && finalMessage) {
              addTextPartToMessage(aiMessageId, finalMessage);
            }
            
            // Refresh sessions list
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
          }
        },
        onError: (error) => {
          console.error('SSE error:', error);
          setAiTyping(false);
          // Add error message if no AI message was created yet
          if (!aiMessageId) {
            addMessage({
              content: '抱歉，处理您的请求时出现了错误。请稍后再试。',
              role: 'assistant'
            });
          } else {
            // Update existing message with error
            updateMessage(aiMessageId, {
              content: '抱歉，处理您的请求时出现了错误。请稍后再试。'
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      setAiTyping(false);
      addMessage({
        content: '抱歉，无法连接到AI服务。请检查网络连接或稍后再试。',
        role: 'assistant'
      });
    }
  };

  const handleNewSession = async () => {
    try {
      const result = await createSession.mutateAsync(undefined);
      setCurrentSessionId(result.sessionId);
      clearMessages();
      setShowSessions(false);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSwitchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    clearMessages();
    setShowSessions(false);
    // TODO: Load session messages
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSession.mutateAsync(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        clearMessages();
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-400 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-semibold mb-1">AI PPT助手</h1>
            <p className="text-sm opacity-90">
              {currentSessionId ? `会话: ${currentSessionId}` : '与AI聊天来编辑你的演示文稿'}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              title="会话历史"
            >
              <Clock className="w-5 h-5" />
            </button>
            <button
              onClick={handleNewSession}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              title="新建会话"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sessions dropdown */}
      {showSessions && (
        <div className="border-b border-gray-200 bg-gray-50 max-h-60 overflow-y-auto">
          <div className="p-3">
            <h3 className="font-medium text-gray-700 mb-2">会话历史</h3>
            {sessionsData?.sessions?.length > 0 ? (
              <div className="space-y-1">
                {sessionsData.sessions.map((session: { id: string; title: string; messageCount: number; lastUpdated: string }) => (
                  <div
                    key={session.id}
                    onClick={() => handleSwitchSession(session.id)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      currentSessionId === session.id ? 'bg-blue-100 border-blue-300' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.messageCount} 条消息 • {new Date(session.lastUpdated).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除会话"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">暂无会话历史</p>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 px-5 py-5 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="px-4"
          >
            <div
              className={`text-sm leading-relaxed break-words overflow-hidden ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white p-3 rounded-lg'
                  : 'text-gray-800'
              }`}
            >
              <ChatMessageRenderer message={message} />
            </div>
          </div>
        ))}
        
        {isAiTyping && (
          <div className="flex justify-center py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-5 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的消息..."
              rows={1}
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAiTyping}
              style={{ maxHeight: '100px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isAiTyping}
            className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title={`发送消息 (输入: ${inputMessage.trim() ? '有' : '无'}, AI状态: ${isAiTyping ? '处理中' : '空闲'})`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};