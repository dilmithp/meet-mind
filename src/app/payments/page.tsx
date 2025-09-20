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
    XCircle,
    FileText,
    BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

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

interface ReportData {
    report_type: string;
    generated_at: string;
    period: {
        start_date: string | null;
        end_date: string | null;
    };
    data: any;
}

export default function PaymentDashboard() {
    const router = useRouter();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
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

    // Enhanced report generation state
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportType, setReportType] = useState('summary');
    const [reportFormat, setReportFormat] = useState('json');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

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
                setPayments(Array.isArray(data.payments) ? data.payments : []);
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const syncFromPolar = async () => {
        try {
            setSyncing(true);
            console.log('Initiating Polar sync...');

            const response = await fetch('/api/payments/sync', {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                setSyncStats(result.stats);
                await fetchPayments();
                alert(`Sync successful! ${result.stats.totalProcessed} payments processed`);
            } else {
                alert(`Sync failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('Sync failed. Check console for details.');
        } finally {
            setSyncing(false);
        }
    };

    // Enhanced report generation function
    const generateAdvancedReport = async () => {
        setReportLoading(true);
        try {
            const params = new URLSearchParams({
                type: reportType,
                format: reportFormat,
                ...(startDate && { start_date: startDate }),
                ...(endDate && { end_date: endDate })
            });

            const response = await fetch(`/api/payments/reports?${params}`);

            if (reportFormat === 'pdf') {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `payment-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                alert('PDF report downloaded successfully!');
            } else {
                const data = await response.json();
                if (response.ok) {
                    setReportData(data);
                } else {
                    console.error('Failed to generate report:', data);
                    alert('Failed to generate report. Check console for details.');
                }
            }
        } catch (error) {
            console.error('Report generation error:', error);
            alert('Failed to generate report. Check console for details.');
        } finally {
            setReportLoading(false);
        }
    };

    // Download report function
    const downloadReport = () => {
        if (!reportData) return;

        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `payment-report-${reportData.report_type}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleAddPayment = async () => {
        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount) * 100, // Convert to cents
                    metadata: formData.metadata ? JSON.parse(formData.metadata) : null
                }),
            });

            if (response.ok) {
                await fetchPayments();
                setShowAddDialog(false);
                resetForm();
                alert('Payment added successfully!');
            } else {
                const error = await response.json();
                alert(`Failed to add payment: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to add payment:', error);
            alert('Failed to add payment. Please check your input.');
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
                    amount: parseFloat(formData.amount) * 100, // Convert to cents
                    metadata: formData.metadata ? JSON.parse(formData.metadata) : null
                }),
            });

            if (response.ok) {
                await fetchPayments();
                setEditingPayment(null);
                resetForm();
                alert('Payment updated successfully!');
            } else {
                const error = await response.json();
                alert(`Failed to update payment: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to update payment:', error);
            alert('Failed to update payment. Please check your input.');
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/payments/${paymentId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchPayments();
                alert('Payment deleted successfully!');
            } else {
                const error = await response.json();
                alert(`Failed to delete payment: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete payment:', error);
            alert('Failed to delete payment.');
        }
    };

    const startEdit = (payment: Payment) => {
        setFormData({
            customerName: payment.customerName,
            customerEmail: payment.customerEmail,
            amount: (payment.amount / 100).toString(), // Convert from cents
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
            case 'succeeded': return 'bg-green-100 text-green-800 border-green-200';
            case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'failed': return 'bg-red-100 text-red-800 border-red-200';
            case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'refunded': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Calculate stats with safety checks
    const totalPayments = payments.length;
    const succeededPayments = payments.filter(p => p.status === 'succeeded').length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const totalRevenue = payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
    const polarSyncedCount = payments.filter(p => p.syncedFromPolar).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <CreditCard className="w-8 h-8 text-blue-600" />
                            Payment Dashboard
                        </h1>
                        {syncStats && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                Last sync: {syncStats.totalProcessed} processed
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Advanced Reports Button */}
                        <Button
                            onClick={() => router.push('/payments/reports')}
                            variant="outline"
                            className="bg-green-50 text-green-700 hover:bg-green-100"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Reports
                        </Button>

                        {/* Quick Report Generation Button */}
                        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Quick Report
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Generate Payment Report
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6">
                                    {/* Report Type Selection */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Report Type</Label>
                                            <Select value={reportType} onValueChange={setReportType}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="summary">📊 Summary Report</SelectItem>
                                                    <SelectItem value="detailed">📋 Detailed Report</SelectItem>
                                                    <SelectItem value="analytics">📈 Analytics Report</SelectItem>
                                                    <SelectItem value="financial">💰 Financial Report</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Output Format</Label>
                                            <Select value={reportFormat} onValueChange={setReportFormat}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="json">📄 JSON Data</SelectItem>
                                                    <SelectItem value="pdf">📑 PDF Report</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Date Range Selection */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Date Range (Optional)</Label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                            >
                                                {showAdvancedOptions ? 'Hide Options' : 'Show Options'}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Start Date</Label>
                                                <Input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Date</Label>
                                                <Input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Date Presets */}
                                    {showAdvancedOptions && (
                                        <div className="space-y-3">
                                            <Label>Quick Date Ranges</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const today = new Date();
                                                        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                                                        setStartDate(lastWeek.toISOString().split('T')[0]);
                                                        setEndDate(today.toISOString().split('T')[0]);
                                                    }}
                                                >
                                                    Last 7 Days
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const today = new Date();
                                                        const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                                                        setStartDate(lastMonth.toISOString().split('T')[0]);
                                                        setEndDate(today.toISOString().split('T')[0]);
                                                    }}
                                                >
                                                    Last 30 Days
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const today = new Date();
                                                        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                                                        setStartDate(startOfMonth.toISOString().split('T')[0]);
                                                        setEndDate(today.toISOString().split('T')[0]);
                                                    }}
                                                >
                                                    This Month
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Report Preview */}
                                    {reportData && reportFormat === 'json' && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-medium">Report Generated Successfully</h4>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={downloadReport}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download JSON
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            const summaryText = JSON.stringify(reportData.data, null, 2);
                                                            navigator.clipboard.writeText(summaryText);
                                                            alert('Report data copied to clipboard!');
                                                        }}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        📋 Copy Data
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-600 mb-2">
                                                <strong>Type:</strong> {reportData.report_type} |
                                                <strong> Generated:</strong> {new Date(reportData.generated_at).toLocaleString()} |
                                                <strong> Period:</strong> {reportData.period.start_date || 'All time'} to {reportData.period.end_date || 'Now'}
                                            </div>

                                            <div className="max-h-64 overflow-auto bg-white p-3 rounded border text-xs font-mono">
                                                <pre>{JSON.stringify(reportData.data, null, 2)}</pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowReportDialog(false);
                                                setReportData(null);
                                            }}
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            onClick={generateAdvancedReport}
                                            disabled={reportLoading}
                                            className="bg-purple-600 hover:bg-purple-700 min-w-[140px]"
                                        >
                                            {reportLoading ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    {reportFormat === 'pdf' ? (
                                                        <Download className="w-4 h-4 mr-2" />
                                                    ) : (
                                                        <FileText className="w-4 h-4 mr-2" />
                                                    )}
                                                    Generate {reportFormat.toUpperCase()}
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Report Type Descriptions */}
                                    <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                                        <div><strong>Summary:</strong> Overview statistics, status distribution, success rates</div>
                                        <div><strong>Detailed:</strong> Transaction records, daily stats, failure analysis</div>
                                        <div><strong>Analytics:</strong> Customer insights, trends, hourly patterns</div>
                                        <div><strong>Financial:</strong> Revenue analysis, currency breakdown, profitability</div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

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
                                <Button className="bg-green-600 hover:bg-green-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Payment
                                </Button>
                            </DialogTrigger>
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

                        <Button
                            variant="outline"
                            onClick={() => fetch('/api/payments/cleanup', { method: 'POST' })
                                .then(() => { alert('Duplicates cleaned!'); fetchPayments(); })
                                .catch(() => alert('Cleanup failed!'))}
                        >
                            Clean Duplicates
                        </Button>

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
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalPayments}</div>
                            <div className="text-xs text-gray-500">All transactions</div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Succeeded</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {succeededPayments}
                            </div>
                            <div className="text-xs text-gray-500">
                                {totalPayments > 0 ? ((succeededPayments / totalPayments) * 100).toFixed(1) : 0}% success rate
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pending</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {pendingPayments}
                            </div>
                            <div className="text-xs text-gray-500">Awaiting processing</div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                ${totalRevenue.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">Succeeded payments</div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Polar Synced</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                {polarSyncedCount}
                            </div>
                            <div className="text-xs text-gray-500">
                                {totalPayments > 0 ? ((polarSyncedCount / totalPayments) * 100).toFixed(1) : 0}% automated
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
                                        placeholder="Search by customer name or email..."
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
                        <div className="flex items-center justify-between">
                            <CardTitle>Payment Transactions</CardTitle>
                            <Badge variant="outline">{payments.length} total</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                                    <p className="text-gray-600">Loading payment data...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-4 font-medium">Customer</th>
                                        <th className="text-left p-4 font-medium">Product</th>
                                        <th className="text-left p-4 font-medium">Amount</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                        <th className="text-left p-4 font-medium">Source</th>
                                        <th className="text-left p-4 font-medium">Date</th>
                                        <th className="text-left p-4 font-medium">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="border-b hover:bg-gray-50 transition-colors">
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
                                                <div className="font-semibold text-lg">
                                                    ${(payment.amount / 100).toFixed(2)}
                                                </div>
                                                <div className="text-sm text-gray-500">{payment.currency}</div>
                                            </td>
                                            <td className="p-4">
                                                <Badge className={`${getStatusColor(payment.status)} flex items-center gap-1 w-fit border`}>
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
                                                        className="hover:bg-blue-50"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        className="hover:bg-red-50 text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {payments.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <CreditCard className="w-16 h-16 text-gray-300" />
                                                    <div>
                                                        <p className="text-lg font-medium text-gray-600">No payments found</p>
                                                        <p className="text-sm text-gray-500 mb-4">
                                                            {searchTerm || statusFilter !== 'all'
                                                                ? 'Try adjusting your search filters'
                                                                : 'Get started by adding a payment or syncing from Polar'
                                                            }
                                                        </p>
                                                        <div className="flex gap-2 justify-center">
                                                            <Button onClick={syncFromPolar} variant="outline" size="sm">
                                                                <Zap className="w-4 h-4 mr-2" />
                                                                Sync from Polar
                                                            </Button>
                                                            <Button onClick={() => setShowAddDialog(true)} size="sm">
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Add Payment
                                                            </Button>
                                                        </div>
                                                    </div>
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

// Enhanced Payment Form Component
function PaymentForm({ formData, setFormData, onSubmit, onCancel }: any) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
        if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Customer email is required';
        if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';

        if (formData.customerEmail && !formData.customerEmail.includes('@')) {
            newErrors.customerEmail = 'Valid email is required';
        }

        if (formData.metadata) {
            try {
                JSON.parse(formData.metadata);
            } catch {
                newErrors.metadata = 'Valid JSON is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit();
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Customer Name *</Label>
                    <Input
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        placeholder="John Doe"
                        className={errors.customerName ? 'border-red-300' : ''}
                    />
                    {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                </div>
                <div>
                    <Label>Customer Email *</Label>
                    <Input
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                        placeholder="john@example.com"
                        className={errors.customerEmail ? 'border-red-300' : ''}
                    />
                    {errors.customerEmail && <p className="text-red-500 text-xs mt-1">{errors.customerEmail}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Amount *</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="99.99"
                        className={errors.amount ? 'border-red-300' : ''}
                    />
                    {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
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
                    className={errors.metadata ? 'border-red-300' : ''}
                />
                {errors.metadata && <p className="text-red-500 text-xs mt-1">{errors.metadata}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit}>
                    Save Payment
                </Button>
            </div>
        </div>
    );
}
