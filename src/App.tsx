import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Layout, MessageSquare, Bot, Calendar, Send, Inbox, LogOut, QrCode, Menu as MenuIcon, X, User, Lock, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong.</h1>
          <p className="text-zinc-400 mb-8">Please refresh the page or contact support if the problem persists.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-emerald-600 px-6 py-2 rounded-lg font-medium"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active ? "bg-emerald-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Auth States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, businessName }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Connection failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;

  if (!user) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-2">WhatsAuto SaaS</h1>
          <p className="text-zinc-400 text-center mb-8">
            {authMode === "login" ? "Welcome back! Log in to your dashboard." : "Create your business account to get started."}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <div className="relative">
                <Briefcase className="absolute left-4 top-3.5 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                  required
                />
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-zinc-500" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-zinc-500" size={18} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              {authMode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              className="text-emerald-500 hover:text-emerald-400 text-sm font-medium"
            >
              {authMode === "login" ? "Don't have an account? Register" : "Already have an account? Log In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-zinc-950 text-white flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col"
            >
              <div className="p-6 flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <span className="text-xl font-bold">WhatsAuto</span>
              </div>

              <div className="flex-1 px-4 space-y-2 overflow-y-auto">
                <SidebarItem icon={QrCode} label="Connection" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
                <SidebarItem icon={Bot} label="Bot Builder" active={activeTab === "bot"} onClick={() => setActiveTab("bot")} />
                <SidebarItem icon={Calendar} label="Bookings" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
                <SidebarItem icon={Send} label="Broadcast" active={activeTab === "broadcast"} onClick={() => setActiveTab("broadcast")} />
                <SidebarItem icon={Inbox} label="Team Inbox" active={activeTab === "inbox"} onClick={() => setActiveTab("inbox")} />
              </div>

              <div className="p-4 border-t border-zinc-800">
                <div className="flex items-center space-x-3 mb-4 px-2">
                  <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold">
                    {user.businessName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.businessName}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-zinc-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between px-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-400 hover:text-white">
              {isSidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-zinc-400">Status: <span className="text-emerald-500">Online</span></span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-8">
            {activeTab === "dashboard" && <ConnectionView userId={user.id} />}
            {activeTab === "bot" && <BotBuilder userId={user.id} token={token!} />}
            {activeTab === "bookings" && <BookingsView userId={user.id} token={token!} />}
            {activeTab === "broadcast" && <BroadcastView userId={user.id} token={token!} />}
            {activeTab === "inbox" && <InboxView userId={user.id} token={token!} />}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Views
const ConnectionView = ({ userId }: { userId: string }) => {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState("disconnected");

  useEffect(() => {
    const socket = io();
    socket.emit("init-session", userId);
    socket.on("qr", (data) => setQr(data.qr));
    socket.on("status", (data) => setStatus(data.status));
    return () => { socket.disconnect(); };
  }, [userId]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">WhatsApp Connection</h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        {status === "connected" ? (
          <div className="py-12">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="text-emerald-500" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-emerald-500 mb-2">Connected Successfully</h3>
            <p className="text-zinc-400">Your WhatsApp is active and ready for automation.</p>
          </div>
        ) : qr ? (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl inline-block">
              <img src={qr} alt="QR Code" className="w-64 h-64" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Scan QR Code</h3>
              <p className="text-zinc-400">Open WhatsApp on your phone, go to Linked Devices, and scan this code.</p>
            </div>
          </div>
        ) : (
          <div className="py-12">
            <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-zinc-400">Generating session...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BotBuilder = ({ userId, token }: { userId: string, token: string }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [reply, setReply] = useState("");
  const [type, setType] = useState("keyword");

  const fetchRules = async () => {
    const res = await fetch("/api/rules", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRules(data);
  };

  useEffect(() => { fetchRules(); }, [token]);

  const handleAddRule = async () => {
    if (!keyword || !reply) return;
    await fetch("/api/rules", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ keyword, reply, type })
    });
    setKeyword("");
    setReply("");
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/rules/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchRules();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Bot Builder</h2>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Keyword</label>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="e.g. hi"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="keyword">Auto Reply</option>
              <option value="menu">Menu Chatbot</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Reply Message</label>
          <textarea 
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-600 h-24"
            placeholder="Type your reply..."
          ></textarea>
        </div>
        <button 
          onClick={handleAddRule}
          className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl font-semibold transition-colors"
        >
          Add Rule
        </button>
      </div>
      
      <div className="grid gap-4">
        {rules.map((rule, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{rule.type}</span>
                <span className="text-emerald-500 font-semibold">"{rule.keyword}"</span>
              </div>
              <p className="text-zinc-400 whitespace-pre-line">{rule.reply}</p>
            </div>
            <button 
              onClick={() => handleDelete(rule.id)}
              className="p-2 hover:bg-red-900/20 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const BookingsView = ({ userId, token }: { userId: string, token: string }) => {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/bookings", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json()).then(setBookings);
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-8">Recent Bookings</h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {bookings.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No bookings yet</td></tr>
            ) : (
              bookings.map((b, i) => (
                <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{b.customerPhone}</td>
                  <td className="px-6 py-4 text-zinc-400">{b.date}</td>
                  <td className="px-6 py-4 text-zinc-400">{b.time}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      b.status === "Confirmed" ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BroadcastView = ({ userId, token }: { userId: string, token: string }) => {
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message || !contacts) return;
    setSending(true);
    try {
      const contactList = contacts.split(",").map(c => c.trim().includes("@") ? c.trim() : `${c.trim()}@s.whatsapp.net`);
      await fetch("/api/broadcast", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message, contacts: contactList })
      });
      alert("Broadcast sent!");
      setMessage("");
      setContacts("");
    } catch (err) {
      alert("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-8">Broadcast Marketing</h2>
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Message Content</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 h-32 focus:ring-2 focus:ring-emerald-600 outline-none"
            placeholder="Type your broadcast message here..."
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Contacts (comma separated phone numbers)</label>
          <input 
            type="text"
            value={contacts}
            onChange={(e) => setContacts(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600"
            placeholder="e.g. 1234567890, 0987654321"
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
        >
          <Send size={18} />
          <span>{sending ? "Sending..." : "Send Broadcast"}</span>
        </button>
      </div>
    </div>
  );
};

const InboxView = ({ userId, token }: { userId: string, token: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  useEffect(() => {
    const socket = io();
    socket.on("new-message", (msg) => {
      if (msg.userId === userId) {
        setMessages(prev => [msg, ...prev]);
      }
    });
    return () => { socket.disconnect(); };
  }, [userId]);

  const handleSendReply = async () => {
    if (!selectedContact || !replyText) return;
    try {
      const response = await fetch("/api/reply", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ to: selectedContact, text: replyText })
      });
      if (response.ok) {
        setMessages(prev => [{ userId, from: selectedContact, text: replyText, timestamp: Date.now(), isFromMe: true }, ...prev]);
        setReplyText("");
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const filteredMessages = selectedContact ? messages.filter(m => m.from === selectedContact || m.fromPhone === selectedContact) : [];

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Team Inbox</h2>
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex">
        {/* Contact List */}
        <div className="w-80 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <input type="text" placeholder="Search chats..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm outline-none" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {Array.from(new Set(messages.map(m => m.from || m.fromPhone))).map((contact: any, i) => (
              <button 
                key={i} 
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-4 flex items-center space-x-3 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800/50 ${selectedContact === contact ? "bg-zinc-800" : ""}`}
              >
                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold">
                  {(contact as string).slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact}</p>
                  <p className="text-xs text-zinc-500 truncate">Last message...</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-zinc-950/50">
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {!selectedContact ? (
              <div className="h-full flex items-center justify-center text-zinc-500">
                Select a chat to view messages
              </div>
            ) : (
              filteredMessages.map((m, i) => (
                <div key={i} className={`flex ${m.isFromMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                    m.isFromMe ? "bg-emerald-600 text-white rounded-tr-none" : "bg-zinc-800 text-zinc-200 rounded-tl-none"
                  }`}>
                    <p>{m.text}</p>
                    <p className="text-[10px] opacity-50 mt-1">{new Date(m.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {selectedContact && (
            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
                  placeholder="Type a reply..." 
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none" 
                />
                <button 
                  onClick={handleSendReply}
                  className="p-2 bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
