'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface Order {
    id: string;
    customer_name: string;
    customer_email: string;
    product_name: string;
    amount: number;
    status: 'pending' | 'completed' | 'cancelled';
    payment_method?: string;
    order_date: string;
    updated_at?: string;
    notes?: string;
}

export default function AdminDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_email: '',
        product_name: '',
        amount: '',
        status: 'pending' as const,
        payment_method: 'cash',
        notes: '',
    });
    const router = useRouter();

    // Check authentication
    useEffect(() => {
        const isAuthenticated = localStorage.getItem('admin_authenticated');
        if (!isAuthenticated) {
            router.push('/admin');
            return;
        }
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/orders');
            if (response.ok) {
                const data = await response.json();
                setOrders(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch orders');
                setOrders([]);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOrder = async () => {
        try {
            const response = await fetch('/api/admin/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                }),
            });

            if (response.ok) {
                fetchOrders();
                setShowAddDialog(false);
                resetForm();
            }
        } catch (error) {
            console.error('Failed to add order:', error);
        }
    };

    const handleUpdateOrder = async () => {
        if (!editingOrder) return;

        try {
            const response = await fetch(`/api/admin/orders/${editingOrder.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                }),
            });

            if (response.ok) {
                fetchOrders();
                setEditingOrder(null);
                resetForm();
            }
        } catch (error) {
            console.error('Failed to update order:', error);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order?')) return;

        try {
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Failed to delete order:', error);
        }
    };

    const startEdit = (order: Order) => {
        setFormData({
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            product_name: order.product_name,
            amount: order.amount.toString(),
            status: order.status,
            payment_method: order.payment_method || 'cash',
            notes: order.notes || '',
        });
        setEditingOrder(order);
    };

    const resetForm = () => {
        setFormData({
            customer_name: '',
            customer_email: '',
            product_name: '',
            amount: '',
            status: 'pending',
            payment_method: 'cash',
            notes: '',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Calculate statistics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const totalRevenue = orders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.amount, 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Order Management System</h1>
                    <div className="flex items-center gap-2">
                        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Order
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add New Order</DialogTitle>
                                </DialogHeader>
                                <OrderForm
                                    formData={formData}
                                    setFormData={setFormData}
                                    onSubmit={handleAddOrder}
                                    onCancel={() => {
                                        setShowAddDialog(false);
                                        resetForm();
                                    }}
                                />
                            </DialogContent>
                        </Dialog>

                        <Button variant="outline" onClick={fetchOrders}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                localStorage.removeItem('admin_authenticated');
                                router.push('/admin');
                            }}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalOrders}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pending</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {pendingOrders}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Completed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {completedOrders}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${totalRevenue.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Orders Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b">
                                    <th className="text-left p-4">Customer</th>
                                    <th className="text-left p-4">Product</th>
                                    <th className="text-left p-4">Amount</th>
                                    <th className="text-left p-4">Status</th>
                                    <th className="text-left p-4">Date</th>
                                    <th className="text-left p-4">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div>
                                                <div className="font-medium">{order.customer_name}</div>
                                                <div className="text-sm text-gray-500">{order.customer_email}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">{order.product_name}</td>
                                        <td className="p-4 font-medium">${order.amount.toFixed(2)}</td>
                                        <td className="p-4">
                                            <Badge className={getStatusColor(order.status)}>
                                                {order.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {formatDistanceToNow(new Date(order.order_date), { addSuffix: true })}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => startEdit(order)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-500">
                                            No orders found. Add your first order!
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Order Dialog */}
            <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Order</DialogTitle>
                    </DialogHeader>
                    <OrderForm
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleUpdateOrder}
                        onCancel={() => {
                            setEditingOrder(null);
                            resetForm();
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Order Form Component
function OrderForm({ formData, setFormData, onSubmit, onCancel }: any) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Customer Name</Label>
                    <Input
                        value={formData.customer_name}
                        onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                        placeholder="John Doe"
                    />
                </div>
                <div>
                    <Label>Customer Email</Label>
                    <Input
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                        placeholder="john@example.com"
                    />
                </div>
            </div>

            <div>
                <Label>Product Name</Label>
                <Input
                    value={formData.product_name}
                    onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                    placeholder="Premium Package"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Amount ($)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="99.99"
                    />
                </div>
                <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label>Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Notes</Label>
                <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Optional notes..."
                    rows={3}
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={onSubmit}>
                    Save Order
                </Button>
            </div>
        </div>
    );
}
