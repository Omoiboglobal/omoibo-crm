import React, { useState, useEffect, useRef } from 'react';
import { getAIAgents, getAIConversations, createAIConversation, getAIConversation, sendAIMessage, deleteAIConversation, getAIInsight } from '../../api/client';
import { Loading, fmtDate } from '../../components/ui';
import { Bot, Send, Plus, Trash2, Zap, MessageSquare, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPT_COLORS = { SALES: '#3B82F6', FINANCE: '#059669', INVENTORY: '#7C3AED', HR: '#D97706', EXECUTIVE: '#1B3A6B', ADMINISTRATION: '#64748B', LOGISTICS: '#EA580C', FACILITY: '#0891B2' };
const DEPT_BG = { SALES: '#EFF6FF', FINANCE: '#ECFDF5', INVENTORY: '#F5F3FF', HR: '#FFFBEB', EXECUTIVE: '#EEF2FF', ADMINISTRATION: '#F1F5F9', LOGISTICS: '#FFF7ED', FACILITY: '#E0F2FE' };

const QUICK_INSIGHTS = [
  { type: 'daily_brief', label: '📋 Daily Brief', desc: 'What needs my attention today?' },
  { type: 'sales_summary', label: '📊 Sales Summary', desc: 'How is the pipeline performing?' },
  { type: 'finance_summary', label: '💰 Finance Summary', desc: 'Financial health overview' },
  { type: 'inventory_alerts', label: '📦 Inventory Alerts', desc: 'Low stock and reorder needs' },
  { type: 'overdue_invoices', label: '⚠️ Overdue Invoices', desc: 'Which invoices need collection?' },
];

export default function AIPage() {
  const [agents, setAgents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [view, setView] = useState('agents'); // agents, chat, insight
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([getAIAgents(), getAIConversations()]);
      setAgents(a.data.data); setConversations(c.data.data);
    } catch {}
    setLoading(false);
  };

  const startConversation = async (agent) => {
    try {
      const conv = await createAIConversation({ agentId: agent.id, title: `Chat with ${agent.name}` });
      setActiveConv(conv.data.data);
      setSelectedAgent(agent);
      setMessages([]);
      setView('chat');
      loadAll();
    } catch { toast.error('Failed to start conversation'); }
  };

  const loadConversation = async (conv) => {
    try {
      const full = await getAIConversation(conv.id);
      setActiveConv(full.data.data);
      setSelectedAgent(full.data.data.agent);
      setMessages(full.data.data.messages || []);
      setView('chat');
    } catch { toast.error('Failed to load conversation'); }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !activeConv || sending) return;
    const userMsg = { role: 'USER', content: input, createdAt: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const msgText = input;
    setInput('');
    setSending(true);
    try {
      const res = await sendAIMessage({ conversationId: activeConv.id, message: msgText });
      const aiMsg = res.data.data.message;
      setMessages(prev => [...prev, { role: 'ASSISTANT', content: aiMsg.content, createdAt: aiMsg.createdAt }]);
    } catch (err) {
      toast.error('AI error: ' + (err.response?.data?.error || 'Failed'));
      setMessages(prev => prev.filter(m => m !== userMsg));
    }
    setSending(false);
  };

  const handleDeleteConv = async (id) => {
    try {
      await deleteAIConversation(id);
      if (activeConv?.id === id) { setActiveConv(null); setMessages([]); setView('agents'); }
      loadAll();
    } catch { toast.error('Failed'); }
  };

  const getQuickInsight = async (type) => {
    setInsightLoading(true);
    setInsight(null);
    setView('insight');
    try {
      const res = await getAIInsight({ type });
      setInsight(res.data.data.insight);
    } catch { setInsight('Unable to generate insight. Please try again.'); }
    setInsightLoading(false);
  };

  if (loading) return <div className="page"><Loading text="Loading AI Agents..." /></div>;

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title">AI Assistant</h1>
        <p className="page-subtitle">Intelligent agents with access to your CRM data — ask anything</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 'calc(100vh - 200px)', minHeight: 500 }}>

        {/* ── LEFT PANEL ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Quick Insights */}
          <div className="card">
            <div className="card-header" style={{ padding: '12px 16px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="var(--warning)" /> Quick Insights</span>
            </div>
            <div style={{ padding: '4px 0' }}>
              {QUICK_INSIGHTS.map(qi => (
                <button key={qi.type} onClick={() => getQuickInsight(qi.type)} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{qi.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{qi.desc}</div>
                  </div>
                  <ChevronRight size={12} color="var(--text3)" />
                </button>
              ))}
            </div>
          </div>

          {/* AI Agents */}
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ padding: '12px 16px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={14} /> AI Agents</span>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {agents.map(agent => (
                <button key={agent.id} onClick={() => startConversation(agent)} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: DEPT_BG[agent.department] || '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={16} color={DEPT_COLORS[agent.department] || '#64748B'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.description}</div>
                  </div>
                  <Plus size={12} color="var(--text3)" />
                </button>
              ))}
            </div>
          </div>

          {/* Past Conversations */}
          {conversations.length > 0 && (
            <div className="card" style={{ maxHeight: 200, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ padding: '10px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}><MessageSquare size={12} /> Recent Chats</span>
              </div>
              <div style={{ overflow: 'auto' }}>
                {conversations.slice(0, 8).map(conv => (
                  <div key={conv.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                    <button onClick={() => loadConversation(conv)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.title || conv.agent?.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{conv._count?.messages || 0} messages</div>
                    </button>
                    <button onClick={() => handleDeleteConv(conv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN PANEL ───────────────────────────────────────────────────────── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Insight View */}
          {view === 'insight' && (
            <>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={16} color="var(--warning)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>AI Insight</span>
                <button onClick={() => setView('agents')} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>← Back</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                {insightLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🤔</div>
                    <div style={{ color: 'var(--text3)', fontSize: 13 }}>Analysing your CRM data...</div>
                  </div>
                ) : insight ? (
                  <div style={{ maxWidth: 680, margin: '0 auto' }}>
                    <div style={{ background: 'linear-gradient(135deg, var(--primary), #2E5FA3)', borderRadius: 12, padding: '16px 20px', color: '#fff', marginBottom: 16 }}>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>AI Analysis — {new Date().toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '20px 24px', lineHeight: 1.7, fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{insight}</div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {QUICK_INSIGHTS.map(qi => (
                        <button key={qi.type} onClick={() => getQuickInsight(qi.type)} className="btn btn-outline btn-sm">{qi.label}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {/* Chat View */}
          {view === 'chat' && activeConv && (
            <>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: DEPT_BG[selectedAgent?.department] || '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={16} color={DEPT_COLORS[selectedAgent?.department] || '#64748B'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedAgent?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{selectedAgent?.department} · Has access to live CRM data</div>
                </div>
                <button onClick={() => setView('agents')} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>← Agents</button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Hi! I'm {selectedAgent?.name}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 13, maxWidth: 400, margin: '0 auto' }}>{selectedAgent?.description}. I have access to your live CRM data. Ask me anything!</div>
                    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                      {(selectedAgent?.capabilities || []).map(cap => (
                        <button key={cap} onClick={() => { setInput(cap.replace(/_/g, ' ')); }} className="btn btn-outline btn-sm" style={{ textTransform: 'capitalize' }}>{cap.replace(/_/g, ' ')}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'USER' ? 'flex-end' : 'flex-start', gap: 10 }}>
                    {msg.role === 'ASSISTANT' && (
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: DEPT_BG[selectedAgent?.department] || '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                        <Bot size={14} color={DEPT_COLORS[selectedAgent?.department] || '#64748B'} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '72%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'USER' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'USER' ? 'var(--primary)' : 'var(--surface2)',
                      color: msg.role === 'USER' ? '#fff' : 'var(--text)',
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      boxShadow: 'var(--shadow)',
                    }}>
                      {msg.content}
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{fmtDate(msg.createdAt)}</div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={14} /></div>
                    <div style={{ padding: '12px 16px', background: 'var(--surface2)', borderRadius: '14px 14px 14px 4px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', animation: 'bounce 1s infinite', animationDelay: `${i * 0.2}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={`Ask ${selectedAgent?.name} anything...`}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--surface2)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    disabled={sending}
                  />
                  <button type="submit" disabled={!input.trim() || sending} className="btn btn-primary" style={{ padding: '10px 16px' }}>
                    <Send size={15} />
                  </button>
                </form>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
                  This agent has access to your live CRM data. Responses are AI-generated.
                </div>
              </div>
            </>
          )}

          {/* Default Agents View */}
          {view === 'agents' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Omoibo AI Assistant</div>
                <div style={{ color: 'var(--text3)', fontSize: 13 }}>Select an agent or use Quick Insights to get started</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {agents.map(agent => (
                  <div key={agent.id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', borderLeft: `4px solid ${DEPT_COLORS[agent.department] || 'var(--border)'}` }}
                    onClick={() => startConversation(agent)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                    <div style={{ padding: '16px' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 11, background: DEPT_BG[agent.department] || '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Bot size={22} color={DEPT_COLORS[agent.department] || '#64748B'} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{agent.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>{agent.description}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(agent.capabilities || []).slice(0, 3).map(cap => (
                          <span key={cap} style={{ fontSize: 10, background: DEPT_BG[agent.department] || '#F1F5F9', color: DEPT_COLORS[agent.department] || '#64748B', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{cap.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  );
}
