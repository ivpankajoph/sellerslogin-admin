import { useEffect, useState, useRef, FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { Send, Loader2, MessageSquare, User, Paperclip, X, FileText, Download, Pencil, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import type { RootState } from '@/store';
import { Main } from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/api(?:\/v1)?\/?$/, '');

type Message = {
  _id: string;
  chatId: string;
  senderType: 'vendor' | 'admin';
  senderId: string;
  text: string;
  createdAt: string;
  attachment?: ChatAttachment | null;
  isDeleted?: boolean;
  editedAt?: string | null;
};

type ChatSession = {
  _id: string;
  vendorId: any;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
};

type ChatAttachment = {
  type: 'image' | 'video' | 'file';
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

const getAttachmentSummary = (attachment?: ChatAttachment | null) => {
  if (!attachment) return '';
  if (attachment.type === 'image') return 'Image shared';
  if (attachment.type === 'video') return 'Video shared';
  return `File shared: ${attachment.name}`;
};

export function LiveChatPage() {
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase();
  const isVendor = role === 'vendor';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const queryClient = useQueryClient();
  
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  );
  const authUser = useSelector((state: RootState) => state.auth?.user);
  const myVendorId = String(
      authUser?.vendor_id ||
      authUser?.vendorId ||
      vendorProfile?._id ||
      vendorProfile?.id ||
      vendorProfile?.vendor_id ||
      authUser?._id ||
      authUser?.id ||
      ''
  ).trim();

  const currentUserId = String(authUser?.actor_id || authUser?._id || authUser?.id || '').trim();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(isVendor ? myVendorId : null);
  const [activeVendorName, setActiveVendorName] = useState<string>('');
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatsRef = useRef<ChatSession[]>([]);
  const activeChatIdRef = useRef<string | null>(activeChatId);
  const messagesRef = useRef<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAdminChats = async () => {
    if (!isAdmin) return;
    setLoadingChats(true);
    try {
      const res = await api.get('/chat/admin');
      setChats(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load chats');
    } finally {
      setLoadingChats(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const getMySenderType = () => (isVendor ? 'vendor' : 'admin');

  const isOwnMessage = (message: Message) =>
    message.senderType === getMySenderType() &&
    String(message.senderId || '') === String(currentUserId || myVendorId || '');

  const updateChatPreview = (chatId: string, preview: string, timestamp: string) => {
    if (!isAdmin) return;

    setChats((prev) =>
      prev
        .map((chat) =>
          chat._id === chatId
            ? {
                ...chat,
                lastMessage: preview,
                lastMessageAt: timestamp,
              }
            : chat
        )
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    );
  };

  const getMessagePreview = (message?: Partial<Message> | null) => {
    if (!message) return 'No messages';
    if (message.isDeleted) return 'Message deleted';
    return message.text || getAttachmentSummary(message.attachment) || 'No messages';
  };

  // Handle Socket
  useEffect(() => {
    const newSocket = io(API_BASE, {
      transports: ['websocket', 'polling'],
    });
    setSocket(newSocket);

    newSocket.on('receive_message', (message: Message) => {
      const isIncomingForCurrentUser =
        (isAdmin && message.senderType === 'vendor') ||
        (isVendor && message.senderType === 'admin');

      setMessages((prev) => {
        if (message.chatId !== activeChatIdRef.current) return prev;
        if (prev.some((item) => item._id === message._id)) return prev;
        return [...prev, message];
      });

      if (isIncomingForCurrentUser) {
        const vendorLabel =
          activeVendorName ||
          getChatLabel(
            chatsRef.current.find((chat) => chat._id === message.chatId)?.vendorId
          );
        const finalSenderLabel = isAdmin ? vendorLabel : 'Admin Support';
        const notificationText = message.text || getAttachmentSummary(message.attachment);

        toast.message(`New message from ${finalSenderLabel}`, {
          description: notificationText,
        });

        void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications', 'latest'] });
      }

      // Update chat list last message
      if (isAdmin) {
        const existingChat = chatsRef.current.find((chat) => chat._id === message.chatId);
        if (!existingChat) {
          void loadAdminChats();
          return;
        }

        updateChatPreview(message.chatId, message.text || getAttachmentSummary(message.attachment), message.createdAt);
      }
    });

    newSocket.on('message_updated', (message: Message) => {
      setMessages((prev) => prev.map((item) => (item._id === message._id ? { ...item, ...message } : item)));

      if (isAdmin) {
        const nextMessages = messagesRef.current.map((item) => (item._id === message._id ? { ...item, ...message } : item));
        const chatMessages = [...nextMessages]
          .filter((item) => item.chatId === message.chatId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const latestMessage = chatMessages[chatMessages.length - 1];
        updateChatPreview(message.chatId, getMessagePreview(latestMessage), latestMessage?.createdAt || message.createdAt);
      }
    });

    newSocket.on('message_deleted', (message: Pick<Message, '_id' | 'chatId' | 'text' | 'attachment' | 'isDeleted'>) => {
      const nextMessages = messagesRef.current.map((item) =>
        item._id === message._id
          ? {
              ...item,
              text: '',
              attachment: null,
              isDeleted: true,
              editedAt: null,
            }
          : item
      );

      setMessages(nextMessages);

      if (isAdmin) {
        const chatMessages = [...nextMessages]
          .filter((item) => item.chatId === message.chatId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const latestActive = chatMessages[chatMessages.length - 1];

        updateChatPreview(
          message.chatId,
          getMessagePreview(latestActive),
          latestActive?.createdAt || new Date().toISOString()
        );
      }
    });

    newSocket.on('chat_error', (payload: { message?: string }) => {
      toast.error(payload?.message || 'Live chat action failed');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [activeVendorName, isAdmin, isVendor, queryClient]);

  // Load Admin Chats
  useEffect(() => {
    if (isAdmin) {
      void loadAdminChats();
    }
  }, [isAdmin]);

  // Load specific Chat (For Vendor it runs once, for Admin when they click a chat)
  useEffect(() => {
    if ((isVendor && !myVendorId) || (!isVendor && !activeChatId)) return;

    const loadActiveChat = async () => {
      setLoadingMessages(true);
      try {
        let currentChatId = activeChatId;

        // If vendor, we need to fetch/create their active chat first
        if (isVendor) {
          const chatRes = await api.get('/chat/vendor');
          currentChatId = chatRes.data?.data?._id;
          if (currentChatId) setActiveChatId(currentChatId);
        }

        if (currentChatId && socket) {
          socket.emit('join_chat', currentChatId);
          const msgRes = await api.get(`/chat/${currentChatId}/messages`);
          setMessages(msgRes.data?.data || []);
          setEditingMessageId(null);
          setEditingMessageText('');
        }
      } catch (error) {
        toast.error('Failed to load chat history');
      } finally {
        setLoadingMessages(false);
      }
    };

    void loadActiveChat();
  }, [isAdmin, isVendor, activeChatId, myVendorId, socket]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!socket || !activeChatId || uploadingAttachment) return;

    const sendCurrentMessage = async () => {
      const trimmedMessage = newMessage.trim();
      if (!trimmedMessage && !selectedFile) return;

      let attachment: ChatAttachment | null = null;

      if (selectedFile) {
        setUploadingAttachment(true);
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          const uploadResponse = await api.post(`/chat/${activeChatId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          attachment = uploadResponse.data?.data || null;
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Failed to upload attachment');
          return;
        } finally {
          setUploadingAttachment(false);
        }
      }

      socket.emit('join_chat', activeChatId);
      socket.emit('send_message', {
        chatId: activeChatId,
        senderType: getMySenderType(),
        senderId: currentUserId || myVendorId,
        text: trimmedMessage,
        attachment,
      });

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    void sendCurrentMessage();
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message._id);
    setEditingMessageText(message.text || '');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const handleSaveEdit = (message: Message) => {
    if (!socket || !activeChatId) return;
    const trimmedText = editingMessageText.trim();
    if (!trimmedText && !message.attachment) {
      toast.error('Message text cannot be empty');
      return;
    }

    socket.emit('edit_message', {
      chatId: activeChatId,
      messageId: message._id,
      senderId: currentUserId || myVendorId,
      senderType: getMySenderType(),
      text: trimmedText,
    });

    handleCancelEdit();
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !activeChatId) return;

    socket.emit('delete_message', {
      chatId: activeChatId,
      messageId,
      senderId: currentUserId || myVendorId,
      senderType: getMySenderType(),
    });

    if (editingMessageId === messageId) {
      handleCancelEdit();
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  const getChatLabel = (vendorData: any) => {
    if (!vendorData) return 'Unknown Vendor';
    return vendorData.store_name || vendorData.name || vendorData.email || 'Unknown Vendor';
  }

  const resolveAttachmentUrl = (url?: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMessageSenderLabel = (message: Message) => {
    if (message.senderType === 'vendor') {
      const chat = chatsRef.current.find((item) => item._id === message.chatId);
      return activeVendorName || getChatLabel(chat?.vendorId);
    }

    return 'Admin Support';
  };

  return (
    <Main className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      <div className="flex flex-1 overflow-hidden bg-background border rounded-lg shadow-sm">
        
        {/* Admin Sidebar List */}
        {isAdmin && (
          <div className="w-1/3 border-r bg-card flex flex-col">
            <div className="px-4 py-4 border-b">
              <h2 className="text-lg font-semibold tracking-tight">Active Chats</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingChats ? (
                <div className="flex items-center justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : chats.length === 0 ? (
                <div className="p-6 text-sm text-center text-muted-foreground">No active chats</div>
              ) : (
                <div className="flex flex-col">
                  {chats.map((chat) => (
                    <button
                      key={chat._id}
                      onClick={() => {
                        setActiveChatId(chat._id);
                        setActiveVendorId(chat.vendorId?._id);
                        setActiveVendorName(getChatLabel(chat.vendorId));
                      }}
                      className={cn(
                        "flex items-start gap-3 p-4 border-b text-left hover:bg-muted/50 transition-colors",
                        activeChatId === chat._id ? "bg-muted" : ""
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">{getChatLabel(chat.vendorId)}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(chat.lastMessageAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || 'No messages'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex flex-col flex-1 bg-background relative">
          {(!isVendor && !activeChatId) ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p>Select a chat from the sidebar to start messaging</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center px-6 py-4 border-b bg-card">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {isAdmin ? `Chat with ${activeVendorName || 'Vendor'}` : 'Live Chat Support'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? `Vendor ID: ${activeVendorId}` : 'We typically reply within a few minutes.'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto bg-muted/20">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                    <div className="p-4 rounded-full bg-muted">
                      <Send className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">No messages yet</h3>
                      <p className="text-sm text-muted-foreground">Send a message to start the conversation.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isMine = isOwnMessage(msg);
                      const isEditing = editingMessageId === msg._id;
                      return (
                        <div key={msg._id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                          <div className={cn("group max-w-[75%] rounded-[26px] px-4 py-3", isMine ? "bg-primary text-primary-foreground rounded-tr-xl" : "bg-card border shadow-sm rounded-tl-xl")}>
                            {!isMine && (
                               <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                                 {getMessageSenderLabel(msg)}
                               </div>
                            )}
                            {msg.isDeleted ? (
                              <p className={cn("text-sm italic", isMine ? "text-primary-foreground/85" : "text-muted-foreground")}>
                                Message deleted
                              </p>
                            ) : (
                              <>
                                {msg.text ? (
                                  <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                ) : null}
                                {msg.attachment ? (
                                  <div className={cn("mt-2", msg.text ? "" : "mt-0")}>
                                    {msg.attachment.type === 'image' ? (
                                      <a
                                        href={resolveAttachmentUrl(msg.attachment.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={resolveAttachmentUrl(msg.attachment.url)}
                                          alt={msg.attachment.name}
                                          crossOrigin="anonymous"
                                          className="block max-h-64 w-full min-w-[220px] rounded-2xl border object-contain bg-white"
                                        />
                                      </a>
                                    ) : msg.attachment.type === 'video' ? (
                                      <video
                                        controls
                                        preload="metadata"
                                        playsInline
                                        crossOrigin="anonymous"
                                        className="block max-h-64 w-full min-w-[220px] rounded-2xl border bg-black"
                                        src={resolveAttachmentUrl(msg.attachment.url)}
                                      />
                                    ) : (
                                      <a
                                        href={resolveAttachmentUrl(msg.attachment.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cn(
                                          "flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm",
                                          isMine ? "border-primary-foreground/30 bg-primary-foreground/10" : "bg-background"
                                        )}
                                      >
                                        <FileText className="h-4 w-4 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate font-medium">{msg.attachment.name}</div>
                                          <div className="text-xs opacity-70">{formatFileSize(msg.attachment.size)}</div>
                                        </div>
                                        <Download className="h-4 w-4 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                ) : null}
                              </>
                            )}
                            {!isEditing && isMine && !msg.isDeleted ? (
                              <div className="mt-3 flex items-center justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                {msg.text ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(msg)}
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[11px]",
                                      isMine ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[11px]",
                                    isMine ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            ) : null}
                            <div className={cn("text-[10px] mt-2 text-right", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {formatTime(msg.createdAt)}
                              {msg.editedAt ? ' • edited' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-background border-t">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setSelectedFile(nextFile);
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingMessages || !activeChatId || uploadingAttachment}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 space-y-2">
                    {editingMessageId ? (
                      <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-medium">Editing message</div>
                          <div className="truncate text-muted-foreground">{editingMessageText || 'Update your text and save'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="ml-3 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Cancel edit"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    {selectedFile ? (
                      <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{selectedFile.name}</div>
                          <div className="text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="ml-3 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Remove attachment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    <Input
                      value={editingMessageId ? editingMessageText : newMessage}
                      onChange={(e) => editingMessageId ? setEditingMessageText(e.target.value) : setNewMessage(e.target.value)}
                      placeholder={editingMessageId ? "Update your message..." : "Type your message..."}
                      className="flex-1"
                      disabled={loadingMessages || !activeChatId || uploadingAttachment}
                    />
                  </div>
                  <Button
                    type={editingMessageId ? 'button' : 'submit'}
                    size="icon"
                    onClick={
                      editingMessageId
                        ? () => {
                            const targetMessage = messages.find((item) => item._id === editingMessageId);
                            if (targetMessage) {
                              handleSaveEdit(targetMessage);
                            }
                          }
                        : undefined
                    }
                    disabled={
                      editingMessageId
                        ? (!editingMessageText.trim() && !messages.find((item) => item._id === editingMessageId)?.attachment) || loadingMessages || !activeChatId || uploadingAttachment
                        : (!newMessage.trim() && !selectedFile) || loadingMessages || !activeChatId || uploadingAttachment
                    }
                  >
                    {editingMessageId ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </Main>
  );
}
