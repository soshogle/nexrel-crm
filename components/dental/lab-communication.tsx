/**
 * Lab Communication Component
 * Two-way communication tracking between clinic and dental lab.
 * Message thread per lab order, status updates, delivery tracking.
 * Enhances existing lab-order-form.tsx with communication layer.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import {
  MessageSquare,
  Send,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  ArrowRight,
  RefreshCw,
  Plus,
  Phone,
  Bell,
} from 'lucide-react';

interface LabMessage {
  id: string;
  orderId: string;
  sender: 'clinic' | 'lab';
  senderName: string;
  message: string;
  timestamp: string;
  type: 'message' | 'status_update' | 'delivery_update' | 'alert';
}

interface LabOrderWithComms {
  id: string;
  orderNumber: string;
  labName: string;
  orderType: string;
  status: string;
  deliveryDate?: string;
  trackingNumber?: string;
  patientName: string;
  createdAt: string;
  messages: LabMessage[];
  unreadCount: number;
}

interface LabCommunicationProps {
  leadId?: string;
  compact?: boolean;
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  PENDING: { label: 'Pending', color: 'text-gray-600', icon: Clock, bg: 'bg-gray-100' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-600', icon: Send, bg: 'bg-blue-100' },
  RECEIVED: { label: 'Received', color: 'text-indigo-600', icon: CheckCircle2, bg: 'bg-indigo-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-600', icon: RefreshCw, bg: 'bg-amber-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-600', icon: CheckCircle2, bg: 'bg-green-100' },
  SHIPPED: { label: 'Shipped', color: 'text-purple-600', icon: Truck, bg: 'bg-purple-100' },
  DELIVERED: { label: 'Delivered', color: 'text-green-700', icon: Package, bg: 'bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600', icon: AlertCircle, bg: 'bg-red-100' },
};

export function LabCommunication({ leadId, compact = false }: LabCommunicationProps) {
  const { data: session } = useSession();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [orders, setOrders] = useState<LabOrderWithComms[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedView, setExpandedView] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = leadId ? `?leadId=${leadId}` : '';
      const res = await fetch(`/api/dental/lab-orders${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
        const mapped: LabOrderWithComms[] = items.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber || o.id?.substring(0, 8) || 'N/A',
          labName: o.labName || 'Unknown Lab',
          orderType: o.orderType || 'OTHER',
          status: o.status || 'PENDING',
          deliveryDate: o.deliveryDate || o.expectedDeliveryDate,
          trackingNumber: o.trackingNumber,
          patientName: o.lead?.contactPerson || o.patientName || 'Patient',
          createdAt: o.createdAt || new Date().toISOString(),
          messages: (o.messages || o.communications || []).map((m: any) => ({
            id: m.id || Math.random().toString(36),
            orderId: o.id,
            sender: m.sender || (m.fromLab ? 'lab' : 'clinic'),
            senderName: m.senderName || (m.fromLab ? o.labName : 'Clinic'),
            message: m.message || m.content || m.text || '',
            timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
            type: m.type || 'message',
          })),
          unreadCount: 0,
        }));
        setOrders(mapped);
        if (mapped.length > 0 && !selectedOrderId) setSelectedOrderId(mapped[0].id);
      }
    } catch (err) {
      console.error('Error fetching lab orders:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedOrderId, orders]);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedOrderId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/dental/lab-orders/${selectedOrderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          sender: 'clinic',
          senderName: session?.user?.name || 'Clinic Staff',
          type: 'message',
        }),
      });

      if (res.ok) {
        const msg: LabMessage = {
          id: Math.random().toString(36),
          orderId: selectedOrderId,
          sender: 'clinic',
          senderName: session?.user?.name || 'Clinic Staff',
          message: newMessage,
          timestamp: new Date().toISOString(),
          type: 'message',
        };
        setOrders(prev =>
          prev.map(o =>
            o.id === selectedOrderId
              ? { ...o, messages: [...o.messages, msg] }
              : o
          )
        );
        setNewMessage('');
        toast.success('Message sent to lab');
      } else {
        const localMsg: LabMessage = {
          id: Math.random().toString(36),
          orderId: selectedOrderId,
          sender: 'clinic',
          senderName: session?.user?.name || 'Clinic Staff',
          message: newMessage,
          timestamp: new Date().toISOString(),
          type: 'message',
        };
        setOrders(prev =>
          prev.map(o =>
            o.id === selectedOrderId
              ? { ...o, messages: [...o.messages, localMsg] }
              : o
          )
        );
        setNewMessage('');
        toast.info('Message saved locally (lab endpoint not yet configured)');
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (compact) {
    const active = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
    const totalUnread = orders.reduce((sum, o) => sum + o.unreadCount, 0);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
          <div className="flex items-center gap-1.5">
            <Package className="w-3 h-3 text-purple-600" />
            <span className="text-xs text-gray-700">Active Orders</span>
          </div>
          <Badge variant="outline" className="text-xs">{active.length}</Badge>
        </div>
        {totalUnread > 0 && (
          <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-blue-600" />
              <span className="text-xs text-gray-700">Unread Messages</span>
            </div>
            <Badge className="bg-blue-100 text-blue-700 text-xs">{totalUnread}</Badge>
          </div>
        )}
        {active.slice(0, 2).map(o => {
          const sc = ORDER_STATUS_CONFIG[o.status] || ORDER_STATUS_CONFIG.PENDING;
          return (
            <div key={o.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
              <div className="truncate flex-1">
                <span className="font-medium">{o.labName}</span>
                <span className="text-gray-400 ml-1">#{o.orderNumber}</span>
              </div>
              <Badge className={`${sc.bg} ${sc.color} text-[10px]`}>{sc.label}</Badge>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold">Lab Communication</span>
          <Badge variant="outline" className="text-xs">{orders.length} orders</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={fetchOrders} className="text-xs h-7">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No Lab Orders</p>
          <p className="text-xs text-gray-400 mt-1">Create a lab order first, then use this to communicate with the lab</p>
        </div>
      ) : (
        <div className="flex gap-3" style={{ minHeight: 400 }}>
          {/* Order List */}
          <div className="w-64 flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Orders</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {orders.map(order => {
                const sc = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
                const Icon = sc.icon;
                const isSelected = selectedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-purple-50 border-l-2 border-l-purple-600' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{order.labName}</span>
                      <Icon className={`w-3 h-3 ${sc.color} flex-shrink-0`} />
                    </div>
                    <div className="text-[10px] text-gray-500">
                      #{order.orderNumber} &middot; {order.orderType}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">{order.patientName}</span>
                      {order.messages.length > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <MessageSquare className="w-2.5 h-2.5" />{order.messages.length}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            {selectedOrder ? (
              <>
                {/* Order Header */}
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedOrder.labName}</span>
                        <Badge className={`${(ORDER_STATUS_CONFIG[selectedOrder.status] || ORDER_STATUS_CONFIG.PENDING).bg} ${(ORDER_STATUS_CONFIG[selectedOrder.status] || ORDER_STATUS_CONFIG.PENDING).color} text-[10px]`}>
                          {(ORDER_STATUS_CONFIG[selectedOrder.status] || ORDER_STATUS_CONFIG.PENDING).label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                        <span>Order #{selectedOrder.orderNumber}</span>
                        <span>{selectedOrder.orderType}</span>
                        <span>{selectedOrder.patientName}</span>
                        {selectedOrder.deliveryDate && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            Due: {new Date(selectedOrder.deliveryDate).toLocaleDateString()}
                          </span>
                        )}
                        {selectedOrder.trackingNumber && (
                          <span className="flex items-center gap-0.5">
                            <Truck className="w-2.5 h-2.5" />
                            {selectedOrder.trackingNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 280 }}>
                  {selectedOrder.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No messages yet. Start a conversation with the lab.</p>
                    </div>
                  ) : (
                    selectedOrder.messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'clinic' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-lg p-2.5 ${msg.sender === 'clinic' ? 'bg-purple-100 text-purple-900' : msg.type === 'status_update' ? 'bg-amber-50 border border-amber-200 text-amber-800' : msg.type === 'delivery_update' ? 'bg-green-50 border border-green-200 text-green-800' : msg.type === 'alert' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-medium">{msg.senderName}</span>
                            {msg.type !== 'message' && (
                              <Badge variant="outline" className="text-[8px] h-3 px-1">
                                {msg.type === 'status_update' ? 'Status' : msg.type === 'delivery_update' ? 'Delivery' : 'Alert'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs">{msg.message}</p>
                          <span className="text-[9px] text-gray-400 mt-1 block">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messageEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-3 bg-white">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message to the lab..."
                      className="text-xs h-8 flex-1"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    />
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="h-8 text-xs"
                    >
                      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-gray-400">Select an order to view communication</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
