import { useEffect, useState, useRef, FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { Send, Loader2, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import type { RootState } from '@/store';
import { Main } from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');

type Message = {
  _id: string;
  chatId: string;
  senderType: 'vendor' | 'admin';
  senderId: string;
  text: string;
  createdAt: string;
};

type ChatSession = {
  _id: string;
  vendorId: any;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
};

export function LiveChatPage() {
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase();
  const isVendor = role === 'vendor';
  const isAdmin = role === 'admin' || role === 'superadmin';
  
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  );
  const authUser = useSelector((state: RootState) => state.auth?.user);
  const myVendorId = String(
      authUser?.id ||
      authUser?._id ||
      authUser?.vendor_id ||
      authUser?.vendorId ||
      vendorProfile?._id ||
      vendorProfile?.id ||
      vendorProfile?.vendor_id ||
      ''
  ).trim();

  const currentUserId = String(authUser?._id || authUser?.id || '').trim();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(isVendor ? myVendorId : null);
  const [activeVendorName, setActiveVendorName] = useState<string>('');
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Socket
  useEffect(() => {
    const newSocket = io(API_BASE, {
      transports: ['websocket', 'polling'],
    });
    setSocket(newSocket);

    newSocket.on('receive_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      // Update chat list last message
      if (isAdmin) {
        setChats((prev) => prev.map(c => 
          c._id === message.chatId ? { ...c, lastMessage: message.text, lastMessageAt: message.createdAt } : c
        ).sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAdmin]);

  // Load Admin Chats
  useEffect(() => {
    if (isAdmin) {
      const loadChats = async () => {
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
      void loadChats();
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
          const chatRes = await api.get(`/chat/vendor?vendorId=${myVendorId}`);
          currentChatId = chatRes.data?.data?._id;
          if (currentChatId) setActiveChatId(currentChatId);
        }

        if (currentChatId && socket) {
          socket.emit('join_chat', currentChatId);
          const msgRes = await api.get(`/chat/${currentChatId}/messages`);
          setMessages(msgRes.data?.data || []);
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
    if (!newMessage.trim() || !socket || !activeChatId) return;

    socket.emit('send_message', {
      chatId: activeChatId,
      senderType: isVendor ? 'vendor' : 'admin',
      senderId: currentUserId || myVendorId,
      text: newMessage.trim(),
    });

    setNewMessage('');
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
                      const isMine = (isVendor && msg.senderType === 'vendor') || (isAdmin && msg.senderType === 'admin');
                      return (
                        <div key={msg._id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%] rounded-2xl px-4 py-2", isMine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border shadow-sm rounded-tl-sm")}>
                            {!isMine && (
                               <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                                 {msg.senderType}
                               </div>
                            )}
                            <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                            <div className={cn("text-[10px] mt-1 text-right", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {formatTime(msg.createdAt)}
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
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={loadingMessages || !activeChatId}
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || loadingMessages || !activeChatId}>
                    <Send className="w-4 h-4" />
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
