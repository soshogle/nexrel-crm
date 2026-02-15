import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Link, useParams } from 'wouter';
import {
  BarChart3, Package, ShoppingCart, Users, DollarSign,
  ChevronRight, Eye, Truck, CheckCircle, Clock, XCircle,
  Search, ArrowLeft, Settings, Pencil, X
} from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  shipped: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-gray-500/20 text-gray-400',
  paid: 'bg-green-500/20 text-green-400',
};

function ProductEditModal({
  product,
  onClose,
  onSave,
  isSaving,
}: {
  product: { id: number; name: string; price: string; salePrice?: string | null; description?: string | null; metaTitle?: string | null; metaDescription?: string | null };
  onClose: () => void;
  onSave: (data: { name?: string; price?: string; salePrice?: string; description?: string; metaTitle?: string | null; metaDescription?: string | null }) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price || '');
  const [salePrice, setSalePrice] = useState(product.salePrice || '');
  const [description, setDescription] = useState(product.description || '');
  const [metaTitle, setMetaTitle] = useState(product.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(product.metaDescription || '');

  useEffect(() => {
    setName(product.name);
    setPrice(product.price || '');
    setSalePrice(product.salePrice || '');
    setDescription(product.description || '');
    setMetaTitle(product.metaTitle || '');
    setMetaDescription(product.metaDescription || '');
  }, [product.id, product.name, product.price, product.salePrice, product.description, product.metaTitle, product.metaDescription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name || undefined,
      price: price || undefined,
      salePrice: salePrice || undefined,
      description: description || undefined,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#C9A84C]/20 flex items-center justify-between">
          <h3 className="text-lg font-serif text-[#C9A84C]">Edit Product</h3>
          <button onClick={onClose} className="p-2 text-[#FAF3E0]/60 hover:text-[#FAF3E0] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-[#FAF3E0]/70 mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#FAF3E0]/70 mb-1">Price</label>
              <input
                type="text"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[#FAF3E0]/70 mb-1">Sale Price</label>
              <input
                type="text"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
                className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#FAF3E0]/70 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm"
            />
          </div>
          <div className="border-t border-[#C9A84C]/20 pt-4">
            <h4 className="text-sm font-medium text-[#C9A84C] mb-3">SEO Meta</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#FAF3E0]/70 mb-1">Meta Title</label>
                <input
                  value={metaTitle}
                  onChange={e => setMetaTitle(e.target.value)}
                  placeholder="Custom page title for search engines"
                  className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#FAF3E0]/70 mb-1">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  placeholder="Short description for search results (max ~160 chars)"
                  rows={2}
                  className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#C9A84C]/20 text-[#FAF3E0]/80 rounded hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#C9A84C] text-[#0D0D0D] font-medium rounded hover:bg-[#d4b85c] disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ tab?: string }>();
  const activeTab = params.tab || 'overview';
  const [orderPage, setOrderPage] = useState(1);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });

  const ordersQuery = trpc.admin.orders.list.useQuery(
    { page: orderPage, limit: 20, status: orderStatusFilter || undefined },
    { enabled: user?.role === 'admin' && (activeTab === 'orders' || activeTab === 'overview') }
  );

  const productsQuery = trpc.admin.products.list.useQuery(
    { page: productPage, limit: 20, search: productSearch || undefined },
    { enabled: user?.role === 'admin' && activeTab === 'products' }
  );

  const orderDetailQuery = trpc.admin.orders.getById.useQuery(
    { id: selectedOrderId! },
    { enabled: !!selectedOrderId && user?.role === 'admin' }
  );

  const updateStatusMutation = trpc.admin.orders.updateStatus.useMutation({
    onSuccess: () => {
      ordersQuery.refetch();
      if (selectedOrderId) orderDetailQuery.refetch();
    },
  });

  const addTrackingMutation = trpc.admin.orders.addTracking.useMutation({
    onSuccess: () => {
      ordersQuery.refetch();
      if (selectedOrderId) orderDetailQuery.refetch();
    },
  });

  const productDetailQuery = trpc.admin.products.getById.useQuery(
    { id: selectedProductId! },
    { enabled: !!selectedProductId && user?.role === 'admin' }
  );

  const updateProductMutation = trpc.admin.products.update.useMutation({
    onSuccess: () => {
      productsQuery.refetch();
      setSelectedProductId(null);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-[#FAF3E0]">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-serif text-[#C9A84C] mb-2">Access Denied</h1>
          <p className="text-[#FAF3E0]/60 mb-6">You need admin privileges to access this page.</p>
          <Link href="/" className="text-[#C9A84C] hover:underline">Return to Homepage</Link>
        </div>
      </div>
    );
  }

  const stats = statsQuery.data;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#FAF3E0] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#0A0A0A] border-r border-[#C9A84C]/20 flex flex-col">
        <div className="p-6 border-b border-[#C9A84C]/20">
          <Link href="/" className="flex items-center gap-2 text-[#C9A84C] hover:opacity-80">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Store</span>
          </Link>
          <h1 className="text-xl font-serif text-[#C9A84C] mt-4">Admin Panel</h1>
          <p className="text-xs text-[#FAF3E0]/40 mt-1">Darksword Armory</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.id}
              href={item.id === 'overview' ? '/admin' : `/admin/${item.id}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                  : 'text-[#FAF3E0]/60 hover:text-[#FAF3E0] hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#C9A84C]/20">
          <p className="text-xs text-[#FAF3E0]/40">Logged in as</p>
          <p className="text-sm text-[#FAF3E0] truncate">{user.name || user.email}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-8 space-y-8">
            <h2 className="text-2xl font-serif text-[#C9A84C]">Dashboard Overview</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 text-[#C9A84C]" />
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-[#FAF3E0]">${stats?.totalRevenue?.toLocaleString() || '0'}</p>
                <p className="text-sm text-[#FAF3E0]/40 mt-1">Total Revenue</p>
              </div>

              <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <ShoppingCart className="w-8 h-8 text-[#C9A84C]" />
                  <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Orders</span>
                </div>
                <p className="text-2xl font-bold text-[#FAF3E0]">{stats?.totalOrders || 0}</p>
                <p className="text-sm text-[#FAF3E0]/40 mt-1">Total Orders</p>
              </div>

              <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <Package className="w-8 h-8 text-[#C9A84C]" />
                  <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded">Products</span>
                </div>
                <p className="text-2xl font-bold text-[#FAF3E0]">{stats?.totalProducts || 0}</p>
                <p className="text-sm text-[#FAF3E0]/40 mt-1">Active Products</p>
              </div>

              <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-[#C9A84C]" />
                  <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">Customers</span>
                </div>
                <p className="text-2xl font-bold text-[#FAF3E0]">{stats?.totalCustomers || 0}</p>
                <p className="text-sm text-[#FAF3E0]/40 mt-1">Unique Customers</p>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg">
              <div className="p-6 border-b border-[#C9A84C]/10 flex items-center justify-between">
                <h3 className="text-lg font-serif text-[#C9A84C]">Recent Orders</h3>
                <Link href="/admin/orders" className="text-sm text-[#C9A84C] hover:underline flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#C9A84C]/10">
                      <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Order</th>
                      <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Customer</th>
                      <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Status</th>
                      <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Payment</th>
                      <th className="text-right p-4 text-sm text-[#FAF3E0]/50 font-medium">Total</th>
                      <th className="text-right p-4 text-sm text-[#FAF3E0]/50 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentOrders || []).map((order: any) => (
                      <tr key={order.id} className="border-b border-[#C9A84C]/5 hover:bg-white/5 cursor-pointer" onClick={() => { setSelectedOrderId(order.id); }}>
                        <td className="p-4 text-sm font-mono text-[#C9A84C]">{order.orderNumber}</td>
                        <td className="p-4 text-sm text-[#FAF3E0]">{order.customerName}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[order.paymentStatus] || 'bg-gray-500/20 text-gray-400'}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-right text-[#FAF3E0] font-semibold">${order.total}</td>
                        <td className="p-4 text-sm text-right text-[#FAF3E0]/50">{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#FAF3E0]/40">No orders yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && !selectedOrderId && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif text-[#C9A84C]">Orders</h2>
              <div className="flex items-center gap-3">
                <select
                  value={orderStatusFilter}
                  onChange={e => { setOrderStatusFilter(e.target.value); setOrderPage(1); }}
                  className="px-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm focus:border-[#C9A84C] focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#C9A84C]/10">
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Order</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Customer</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Email</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Status</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Payment</th>
                    <th className="text-right p-4 text-sm text-[#FAF3E0]/50 font-medium">Total</th>
                    <th className="text-right p-4 text-sm text-[#FAF3E0]/50 font-medium">Date</th>
                    <th className="text-right p-4 text-sm text-[#FAF3E0]/50 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordersQuery.data?.orders || []).map((order: any) => (
                    <tr key={order.id} className="border-b border-[#C9A84C]/5 hover:bg-white/5">
                      <td className="p-4 text-sm font-mono text-[#C9A84C]">{order.orderNumber}</td>
                      <td className="p-4 text-sm text-[#FAF3E0]">{order.customerName}</td>
                      <td className="p-4 text-sm text-[#FAF3E0]/60">{order.customerEmail}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[order.paymentStatus] || ''}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-right text-[#FAF3E0] font-semibold">${order.total}</td>
                      <td className="p-4 text-sm text-right text-[#FAF3E0]/50">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="p-2 text-[#C9A84C] hover:bg-[#C9A84C]/20 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!ordersQuery.data?.orders || ordersQuery.data.orders.length === 0) && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#FAF3E0]/40">No orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {ordersQuery.data && ordersQuery.data.total > 20 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#FAF3E0]/40">
                  Showing {((orderPage - 1) * 20) + 1}-{Math.min(orderPage * 20, ordersQuery.data.total)} of {ordersQuery.data.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                    disabled={orderPage === 1}
                    className="px-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-sm text-[#FAF3E0] disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setOrderPage(p => p + 1)}
                    disabled={orderPage * 20 >= ordersQuery.data.total}
                    className="px-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-sm text-[#FAF3E0] disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Detail View */}
        {activeTab === 'orders' && selectedOrderId && orderDetailQuery.data && (
          <div className="p-8 space-y-6">
            <button
              onClick={() => setSelectedOrderId(null)}
              className="flex items-center gap-2 text-[#C9A84C] hover:underline text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Orders
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif text-[#C9A84C]">Order {orderDetailQuery.data.orderNumber}</h2>
                <p className="text-sm text-[#FAF3E0]/40 mt-1">
                  Placed on {new Date(orderDetailQuery.data.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={orderDetailQuery.data.status}
                  onChange={e => updateStatusMutation.mutate({ id: selectedOrderId, status: e.target.value })}
                  className="px-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Items */}
              <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                <h3 className="text-lg font-serif text-[#C9A84C] mb-4">Items</h3>
                <div className="space-y-4">
                  {(orderDetailQuery.data.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center border-b border-[#C9A84C]/10 pb-3">
                      <div>
                        <p className="text-[#FAF3E0]">{item.productName}</p>
                        {item.variationDetails && Object.entries(item.variationDetails).map(([k, v]) => (
                          <p key={k} className="text-xs text-[#FAF3E0]/40">{k}: {String(v)}</p>
                        ))}
                        <p className="text-xs text-[#FAF3E0]/40">Qty: {item.quantity} x ${item.price}</p>
                      </div>
                      <p className="text-[#C9A84C] font-semibold">${item.total}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#C9A84C]/20 mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#FAF3E0]/60">Subtotal</span>
                    <span>${orderDetailQuery.data.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#FAF3E0]/60">Shipping</span>
                    <span>${orderDetailQuery.data.shippingCost}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#FAF3E0]/60">Tax</span>
                    <span>${orderDetailQuery.data.taxAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-[#C9A84C]/20 pt-2">
                    <span className="text-[#FAF3E0]">Total</span>
                    <span className="text-[#C9A84C]">${orderDetailQuery.data.total}</span>
                  </div>
                </div>
              </div>

              {/* Customer & Shipping Info */}
              <div className="space-y-6">
                <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                  <h3 className="text-sm text-[#FAF3E0]/50 mb-3">Customer</h3>
                  <p className="text-[#FAF3E0] font-medium">{orderDetailQuery.data.customerName}</p>
                  <p className="text-sm text-[#FAF3E0]/60">{orderDetailQuery.data.customerEmail}</p>
                  {orderDetailQuery.data.customerPhone && (
                    <p className="text-sm text-[#FAF3E0]/60">{orderDetailQuery.data.customerPhone}</p>
                  )}
                </div>

                <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                  <h3 className="text-sm text-[#FAF3E0]/50 mb-3">Shipping Address</h3>
                  {orderDetailQuery.data.shippingAddress && (
                    <div className="text-sm text-[#FAF3E0]/80 space-y-1">
                      <p>{(orderDetailQuery.data.shippingAddress as any).firstName} {(orderDetailQuery.data.shippingAddress as any).lastName}</p>
                      <p>{(orderDetailQuery.data.shippingAddress as any).address1}</p>
                      {(orderDetailQuery.data.shippingAddress as any).address2 && <p>{(orderDetailQuery.data.shippingAddress as any).address2}</p>}
                      <p>{(orderDetailQuery.data.shippingAddress as any).city}, {(orderDetailQuery.data.shippingAddress as any).state} {(orderDetailQuery.data.shippingAddress as any).postalCode}</p>
                      <p>{(orderDetailQuery.data.shippingAddress as any).country}</p>
                    </div>
                  )}
                </div>

                <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                  <h3 className="text-sm text-[#FAF3E0]/50 mb-3">Payment</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#FAF3E0]/60">Method</span>
                      <span className="text-[#FAF3E0] capitalize">{orderDetailQuery.data.paymentMethod || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#FAF3E0]/60">Status</span>
                      <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[orderDetailQuery.data.paymentStatus] || ''}`}>
                        {orderDetailQuery.data.paymentStatus}
                      </span>
                    </div>
                    {orderDetailQuery.data.transactionId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#FAF3E0]/60">Transaction</span>
                        <span className="text-[#FAF3E0] font-mono text-xs">{orderDetailQuery.data.transactionId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {orderDetailQuery.data.notes && (
                  <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
                    <h3 className="text-sm text-[#FAF3E0]/50 mb-3">Order Notes</h3>
                    <p className="text-sm text-[#FAF3E0]/80">{orderDetailQuery.data.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif text-[#C9A84C]">Products</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FAF3E0]/40" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setProductPage(1); }}
                  placeholder="Search products..."
                  className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm focus:border-[#C9A84C] focus:outline-none w-64"
                />
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#C9A84C]/10">
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Image</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Product</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">SKU</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Price</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Stock</th>
                    <th className="text-left p-4 text-sm text-[#FAF3E0]/50 font-medium">Categories</th>
                    <th className="text-right p-4 text-sm text-[#FAF3E0]/50 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(productsQuery.data?.products || []).map((product: any) => (
                    <tr key={product.id} className="border-b border-[#C9A84C]/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="w-12 h-12 bg-[#2A2A2A] rounded overflow-hidden">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-[#FAF3E0]">{product.name}</td>
                      <td className="p-4 text-sm text-[#FAF3E0]/50 font-mono">{product.sku || '-'}</td>
                      <td className="p-4 text-sm text-[#C9A84C] font-semibold">
                        ${product.price}
                        {product.salePrice && <span className="text-red-400 ml-2 line-through text-xs">${product.salePrice}</span>}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded capitalize ${
                          product.stockStatus === 'instock' ? 'bg-green-500/20 text-green-400' :
                          product.stockStatus === 'outofstock' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {product.stockStatus}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-[#FAF3E0]/50 max-w-[200px] truncate">{product.categories}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedProductId(product.id)}
                          className="p-2 text-[#C9A84C] hover:bg-[#C9A84C]/20 rounded transition-colors"
                          title="Edit product"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {productsQuery.data && productsQuery.data.total > 20 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#FAF3E0]/40">
                  Showing {((productPage - 1) * 20) + 1}-{Math.min(productPage * 20, productsQuery.data.total)} of {productsQuery.data.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setProductPage(p => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                    className="px-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-sm text-[#FAF3E0] disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setProductPage(p => p + 1)}
                    disabled={productPage * 20 >= productsQuery.data.total}
                    className="px-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-sm text-[#FAF3E0] disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Edit Modal */}
        {activeTab === 'products' && selectedProductId && productDetailQuery.data && (
          <ProductEditModal
            product={productDetailQuery.data}
            onClose={() => setSelectedProductId(null)}
            onSave={(data) => updateProductMutation.mutate({ id: selectedProductId, ...data })}
            isSaving={updateProductMutation.isPending}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-8 space-y-6">
            <h2 className="text-2xl font-serif text-[#C9A84C]">Settings</h2>

            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg text-[#FAF3E0] mb-2">Payment Gateway</h3>
                <p className="text-sm text-[#FAF3E0]/50 mb-4">Configure your Elavon Converge payment credentials</p>
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">Merchant ID</label>
                    <input type="text" placeholder="Enter Merchant ID" className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm" disabled />
                  </div>
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">User ID</label>
                    <input type="text" placeholder="Enter User ID" className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm" disabled />
                  </div>
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">PIN</label>
                    <input type="password" placeholder="Enter PIN" className="w-full px-4 py-2 bg-[#0D0D0D] border border-[#C9A84C]/20 rounded text-[#FAF3E0] text-sm" disabled />
                  </div>
                  <p className="text-xs text-[#FAF3E0]/30">Payment credentials are managed via environment variables. Contact admin to update.</p>
                </div>
              </div>

              <div className="border-t border-[#C9A84C]/10 pt-6">
                <h3 className="text-lg text-[#FAF3E0] mb-2">QuickBooks Integration</h3>
                <p className="text-sm text-[#FAF3E0]/50 mb-4">Connect to QuickBooks for automatic invoice creation</p>
                <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded p-4">
                  <p className="text-sm text-[#C9A84C]">QuickBooks integration will be configured once API credentials are provided.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
