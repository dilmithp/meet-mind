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
import {
    CreditCard,
    Download,
    Plus,
    RefreshCw,
    Search,
    Edit,
    Trash2,
    Zap,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Payment {
    id: string;
    polarPaymentId?: string;
    polarOrderId?: string;
    customerName: string;
    customerEmail: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod?: string;
    productName?: string;
    createdAt: string;
    updatedAt: string;
    syncedFromPolar: boolean;
    lastSyncAt?: string;
    metadata?: string;
}

export default function PaymentDashboard() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        amount: '',
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'manual',
        productName: '',
        metadata: ''
    });
    const [syncStats, setSyncStats] = useState<any>(null);

    useEffect(() => {
        fetchPayments();
    }, [searchTerm, statusFilter]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await fetch(`/api/payments?${params}`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data.payments || []);
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const syncFromPolar = async () => {
        try {
            setSyncing(true);
            console.log('🚀 Initiating Polar sync...');

            const response = await fetch('/api/payments/sync', {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                setSyncStats(result.stats);
                await fetchPayments(); // Refresh the list
                alert(`🎉 Sync successful! ${result.stats.totalProcessed} payments processed`);
            } else {
                alert(`❌ Sync failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('❌ Sync failed. Check console for details.');
        } finally {
            setSyncing(false);
        }
    };

    const handleAddPayment = async () => {
        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                    metadata: formData.metadata ? JSON.parse(formData.metadata) : null
                }),
            });

            if (response.ok) {
                await fetchPayments();
                setShowAddDialog(false);
                resetForm();
            }
        } catch (error) {
            console.error('Failed to add payment:', error);
            alert('Failed to add payment');
        }
    };

    const handleUpdatePayment = async () => {
        if (!editingPayment) return;

        try {
            const response = await fetch(`/api/payments/${editingPayment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                    metadata: formData.metadata ? JSON.parse(formData.metadata) : null
                }),
            });

            if (response.ok) {
                await fetchPayments();
                setEditingPayment(null);
                resetForm();
            }
        } catch (error) {
            console.error('Failed to update payment:', error);
            alert('Failed to update payment');
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm('Are you sure you want to delete this payment?')) return;

        try {
            const response = await fetch(`/api/payments/${paymentId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchPayments();
            }
        } catch (error) {
            console.error('Failed to delete payment:', error);
        }
    };

    const startEdit = (payment: Payment) => {
        setFormData({
            customerName: payment.customerName,
            customerEmail: payment.customerEmail,
            amount: (payment.amount / 100).toString(),
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.paymentMethod || 'manual',
            productName: payment.productName || '',
            metadata: payment.metadata || ''
        });
        setEditingPayment(payment);
    };

    const resetForm = () => {
        setFormData({
            customerName: '',
            customerEmail: '',
            amount: '',
            currency: 'USD',
            status: 'pending',
            paymentMethod: 'manual',
            productName: '',
            metadata: ''
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'succeeded': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'processing': return <Clock className="w-4 h-4 text-blue-500" />;
            case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />;
            case 'refunded': return <AlertCircle className="w-4 h-4 text-orange-500" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'succeeded': return 'bg-green-100 text-green-800';
            case 'processing': return 'bg-blue-100 text-blue-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            case 'refunded': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Calculate stats
    const totalPayments = payments.length;
    const succeededPayments = payments.filter(p => p.status === 'succeeded').length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const totalRevenue = payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0) / 100;
    const polarSyncedCount = payments.filter(p => p.syncedFromPolar).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <CreditCard className="w-8 h-8" />
                            Payment Dashboard
                        </h1>
                        {syncStats && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                Last sync: {syncStats.totalProcessed} processed
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={syncFromPolar}
                            disabled={syncing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {syncing ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4 mr-2" />
                            )}
                            {syncing ? 'Syncing...' : 'Sync from Polar'}
                        </Button>

                        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Payment
                                </Button>
                            </DialogTrigger>
                            <Button
                                variant="outline"
                                onClick={() => fetch('/api/payments/cleanup', { method: 'POST' })
                                    .then(() => { alert('Duplicates cleaned!'); fetchPayments(); })}
                            >
                                🧹 Clean Duplicates
                            </Button>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add Manual Payment</DialogTitle>
                                </DialogHeader>
                                <PaymentForm
                                    formData={formData}
                                    setFormData={setFormData}
                                    onSubmit={handleAddPayment}
                                    onCancel={() => {
                                        setShowAddDialog(false);
                                        resetForm();
                                    }}
                                />
                            </DialogContent>
                        </Dialog>

                        <Button variant="outline" onClick={fetchPayments}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalPayments}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Succeeded</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {succeededPayments}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pending</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {pendingPayments}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${totalRevenue.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Polar Synced</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {polarSyncedCount}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search payments..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="succeeded">Succeeded</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Payments Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="h-8 w-8 animate-spin" />
                                <span className="ml-2">Loading payments...</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-4">Customer</th>
                                        <th className="text-left p-4">Product</th>
                                        <th className="text-left p-4">Amount</th>
                                        <th className="text-left p-4">Status</th>
                                        <th className="text-left p-4">Source</th>
                                        <th className="text-left p-4">Date</th>
                                        <th className="text-left p-4">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4">
                                                <div>
                                                    <div className="font-medium">{payment.customerName}</div>
                                                    <div className="text-sm text-gray-500">{payment.customerEmail}</div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium">{payment.productName || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">{payment.paymentMethod}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium">
                                                    ${(payment.amount / 100).toFixed(2)}
                                                </div>
                                                <div className="text-sm text-gray-500">{payment.currency}</div>
                                            </td>
                                            <td className="p-4">
                                                <Badge className={`${getStatusColor(payment.status)} flex items-center gap-1 w-fit`}>
                                                    {getStatusIcon(payment.status)}
                                                    {payment.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={payment.syncedFromPolar ? "default" : "outline"}>
                                                    {payment.syncedFromPolar ? (
                                                        <>
                                                            <Zap className="w-3 h-3 mr-1" />
                                                            Polar
                                                        </>
                                                    ) : (
                                                        'Manual'
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                <div>{formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}</div>
                                                {payment.lastSyncAt && (
                                                    <div className="text-xs text-blue-500">
                                                        Synced: {formatDistanceToNow(new Date(payment.lastSyncAt), { addSuffix: true })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => startEdit(payment)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {payments.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <CreditCard className="w-8 h-8 text-gray-400" />
                                                    <p>No payments found</p>
                                                    <Button onClick={syncFromPolar} variant="outline" size="sm">
                                                        <Zap className="w-4 h-4 mr-2" />
                                                        Sync from Polar
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Payment Dialog */}
            <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Payment</DialogTitle>
                    </DialogHeader>
                    <PaymentForm
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleUpdatePayment}
                        onCancel={() => {
                            setEditingPayment(null);
                            resetForm();
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Payment Form Component
function PaymentForm({ formData, setFormData, onSubmit, onCancel }: any) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Customer Name</Label>
                    <Input
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        placeholder="John Doe"
                    />
                </div>
                <div>
                    <Label>Customer Email</Label>
                    <Input
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                        placeholder="john@example.com"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Amount</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="99.99"
                    />
                </div>
                <div>
                    <Label>Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="succeeded">Succeeded</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Payment Method</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="card">Credit Card</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="subscription">Subscription</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label>Product Name</Label>
                <Input
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    placeholder="Premium Package"
                />
            </div>

            <div>
                <Label>Metadata (JSON)</Label>
                <Textarea
                    value={formData.metadata}
                    onChange={(e) => setFormData({...formData, metadata: e.target.value})}
                    placeholder='{"key": "value"}'
                    rows={3}
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={onSubmit}>
                    Save Payment
                </Button>
            </div>
        </div>
    );
}
