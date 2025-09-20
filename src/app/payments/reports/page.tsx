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
    BarChart3,
    Download,
    FileText,
    Calendar,
    TrendingUp,
    Users,
    DollarSign,
    RefreshCw,
    Filter,
    Eye,
    ArrowLeft,
    CreditCard,
    PieChart,
    Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, subDays, subMonths, startOfMonth } from 'date-fns';

interface Payment {
    id: string;
    customerName: string;
    customerEmail: string;
    productName?: string;
    amount: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed' | 'processing' | 'cancelled' | 'refunded';
    paymentMethod?: string;
    createdAt: string;
    updatedAt?: string;
    syncedFromPolar: boolean;
    metadata?: string;
}

interface ReportData {
    totalPayments: number;
    totalRevenue: number;
    succeededPayments: number;
    pendingPayments: number;
    failedPayments: number;
    avgPaymentValue: number;
    topProducts: Array<{ name: string; count: number; revenue: number; }>;
    topCustomers: Array<{ name: string; email: string; totalSpent: number; paymentCount: number; }>;
    paymentsByStatus: Array<{ status: string; count: number; percentage: number; }>;
    paymentMethods: Array<{ method: string; count: number; revenue: number; }>;
    polarVsManual: { polar: number; manual: number; polarRevenue: number; manualRevenue: number; };
    dailyStats: Array<{ date: string; count: number; revenue: number; }>;
}

export default function PaymentReportsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');
    const [reportType, setReportType] = useState('overview');
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchPayments();
    }, []);

    useEffect(() => {
        if (payments.length > 0) {
            generateReportData();
        }
    }, [payments, dateRange]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/payments');
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

    const filterPaymentsByDateRange = (payments: Payment[]) => {
        const now = new Date();
        let cutoffDate;

        switch (dateRange) {
            case '7':
                cutoffDate = subDays(now, 7);
                break;
            case '30':
                cutoffDate = subDays(now, 30);
                break;
            case '90':
                cutoffDate = subDays(now, 90);
                break;
            case 'thisMonth':
                cutoffDate = startOfMonth(now);
                break;
            case '6months':
                cutoffDate = subMonths(now, 6);
                break;
            case '1year':
                cutoffDate = subMonths(now, 12);
                break;
            default:
                return payments;
        }

        return payments.filter(payment => new Date(payment.createdAt) >= cutoffDate);
    };

    const generateReportData = () => {
        const filteredPayments = filterPaymentsByDateRange(payments);

        const totalPayments = filteredPayments.length;
        const succeededPayments = filteredPayments.filter(p => p.status === 'succeeded').length;
        const pendingPayments = filteredPayments.filter(p => p.status === 'pending').length;
        const failedPayments = filteredPayments.filter(p => p.status === 'failed').length;

        const totalRevenue = filteredPayments
            .filter(p => p.status === 'succeeded')
            .reduce((sum, payment) => sum + payment.amount, 0);

        const avgPaymentValue = succeededPayments > 0 ? totalRevenue / succeededPayments : 0;

        // Top products
        const productStats = filteredPayments.reduce((acc, payment) => {
            const productName = payment.productName || 'Unknown Product';
            if (!acc[productName]) {
                acc[productName] = { count: 0, revenue: 0 };
            }
            acc[productName].count++;
            if (payment.status === 'succeeded') {
                acc[productName].revenue += payment.amount;
            }
            return acc;
        }, {} as Record<string, { count: number; revenue: number }>);

        const topProducts = Object.entries(productStats)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Top customers
        const customerStats = filteredPayments.reduce((acc, payment) => {
            if (!acc[payment.customerEmail]) {
                acc[payment.customerEmail] = {
                    name: payment.customerName,
                    email: payment.customerEmail,
                    totalSpent: 0,
                    paymentCount: 0
                };
            }
            acc[payment.customerEmail].paymentCount++;
            if (payment.status === 'succeeded') {
                acc[payment.customerEmail].totalSpent += payment.amount;
            }
            return acc;
        }, {} as Record<string, any>);

        const topCustomers = Object.values(customerStats)
            .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
            .slice(0, 5);

        // Payments by status
        const paymentsByStatus = [
            {
                status: 'Succeeded',
                count: succeededPayments,
                percentage: totalPayments > 0 ? (succeededPayments / totalPayments) * 100 : 0
            },
            {
                status: 'Pending',
                count: pendingPayments,
                percentage: totalPayments > 0 ? (pendingPayments / totalPayments) * 100 : 0
            },
            {
                status: 'Failed',
                count: failedPayments,
                percentage: totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0
            },
            {
                status: 'Processing',
                count: filteredPayments.filter(p => p.status === 'processing').length,
                percentage: totalPayments > 0 ? (filteredPayments.filter(p => p.status === 'processing').length / totalPayments) * 100 : 0
            }
        ];

        // Payment methods
        const paymentStats = filteredPayments.reduce((acc, payment) => {
            const method = payment.paymentMethod || 'Unknown';
            if (!acc[method]) {
                acc[method] = { count: 0, revenue: 0 };
            }
            acc[method].count++;
            if (payment.status === 'succeeded') {
                acc[method].revenue += payment.amount;
            }
            return acc;
        }, {} as Record<string, { count: number; revenue: number }>);

        const paymentMethods = Object.entries(paymentStats)
            .map(([method, stats]) => ({ method, ...stats }))
            .sort((a, b) => b.revenue - a.revenue);

        // Polar vs Manual
        const polarPayments = filteredPayments.filter(p => p.syncedFromPolar);
        const manualPayments = filteredPayments.filter(p => !p.syncedFromPolar);
        const polarRevenue = polarPayments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0);
        const manualRevenue = manualPayments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0);

        const polarVsManual = {
            polar: polarPayments.length,
            manual: manualPayments.length,
            polarRevenue,
            manualRevenue
        };

        // Daily stats for the last 14 days
        const dailyStats = Array.from({ length: 14 }, (_, i) => {
            const date = subDays(new Date(), i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayPayments = filteredPayments.filter(p =>
                format(new Date(p.createdAt), 'yyyy-MM-dd') === dateStr
            );

            return {
                date: format(date, 'MMM dd'),
                count: dayPayments.length,
                revenue: dayPayments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0)
            };
        }).reverse();

        setReportData({
            totalPayments,
            totalRevenue,
            succeededPayments,
            pendingPayments,
            failedPayments,
            avgPaymentValue,
            topProducts,
            topCustomers,
            paymentsByStatus,
            paymentMethods,
            polarVsManual,
            dailyStats
        });
    };

    const generateReport = () => {
        if (!reportData) return;

        const dateRangeText = {
            '7': 'Last 7 days',
            '30': 'Last 30 days',
            '90': 'Last 90 days',
            'thisMonth': 'This month',
            '6months': 'Last 6 months',
            '1year': 'Last year'
        }[dateRange] || 'All time';

        let report = '';

        if (reportType === 'overview') {
            report = `
# Payment Report - ${dateRangeText}
Generated on: ${format(new Date(), 'PPP')}

## Executive Summary
- Total Payments: ${reportData.totalPayments}
- Total Revenue: $${(reportData.totalRevenue / 100).toFixed(2)}
- Successful Payments: ${reportData.succeededPayments}
- Pending Payments: ${reportData.pendingPayments}
- Failed Payments: ${reportData.failedPayments}
- Average Payment Value: $${(reportData.avgPaymentValue / 100).toFixed(2)}

## Payment Status Breakdown
${reportData.paymentsByStatus.map(item =>
                `- ${item.status}: ${item.count} payments (${item.percentage.toFixed(1)}%)`
            ).join('\n')}

## Top Products by Revenue
${reportData.topProducts.map((product, index) =>
                `${index + 1}. ${product.name}: ${product.count} payments, $${(product.revenue / 100).toFixed(2)} revenue`
            ).join('\n')}

## Top Customers
${reportData.topCustomers.map((customer, index) =>
                `${index + 1}. ${customer.name} (${customer.email}): ${customer.paymentCount} payments, $${(customer.totalSpent / 100).toFixed(2)} total`
            ).join('\n')}

## Payment Source Analysis
- Polar Synced: ${reportData.polarVsManual.polar} payments ($${(reportData.polarVsManual.polarRevenue / 100).toFixed(2)})
- Manual Entry: ${reportData.polarVsManual.manual} payments ($${(reportData.polarVsManual.manualRevenue / 100).toFixed(2)})

## Payment Methods
${reportData.paymentMethods.map(method =>
                `- ${method.method}: ${method.count} payments, $${(method.revenue / 100).toFixed(2)} revenue`
            ).join('\n')}
`;

        } else if (reportType === 'financial') {
            report = `
# Financial Report - ${dateRangeText}
Generated on: ${format(new Date(), 'PPP')}

## Revenue Summary
- Total Revenue: $${(reportData.totalRevenue / 100).toFixed(2)}
- Successful Payments: ${reportData.succeededPayments}
- Average Payment Value: $${(reportData.avgPaymentValue / 100).toFixed(2)}
- Success Rate: ${reportData.totalPayments > 0 ? ((reportData.succeededPayments / reportData.totalPayments) * 100).toFixed(1) : 0}%

## Revenue by Payment Method
${reportData.paymentMethods.map(method =>
                `- ${method.method}: $${(method.revenue / 100).toFixed(2)} (${method.count} payments)`
            ).join('\n')}

## Product Performance
${reportData.topProducts.map((product, index) =>
                `${index + 1}. ${product.name}
   - Payments: ${product.count}
   - Revenue: $${(product.revenue / 100).toFixed(2)}
   - Avg per payment: $${product.count > 0 ? ((product.revenue / product.count) / 100).toFixed(2) : '0.00'}`
            ).join('\n\n')}

## Source Performance
- Polar Integration: $${(reportData.polarVsManual.polarRevenue / 100).toFixed(2)} (${reportData.polarVsManual.polar} payments)
- Manual Processing: $${(reportData.polarVsManual.manualRevenue / 100).toFixed(2)} (${reportData.polarVsManual.manual} payments)
`;

        } else if (reportType === 'customer') {
            report = `
# Customer Report - ${dateRangeText}
Generated on: ${format(new Date(), 'PPP')}

## Customer Overview
- Total Unique Customers: ${reportData.topCustomers.length}
- Total Payments: ${reportData.totalPayments}
- Average Payments per Customer: ${reportData.topCustomers.length > 0 ? (reportData.totalPayments / reportData.topCustomers.length).toFixed(1) : '0'}

## Top Customers by Spend
${reportData.topCustomers.map((customer, index) =>
                `${index + 1}. ${customer.name}
   - Email: ${customer.email}
   - Payments: ${customer.paymentCount}
   - Total Spent: $${(customer.totalSpent / 100).toFixed(2)}
   - Avg per payment: $${customer.paymentCount > 0 ? ((customer.totalSpent / customer.paymentCount) / 100).toFixed(2) : '0.00'}`
            ).join('\n\n')}
`;
        }

        setPreviewData(report);
        setShowPreview(true);
    };

    const downloadReport = () => {
        const element = document.createElement('a');
        const file = new Blob([previewData], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const downloadCSV = () => {
        if (!reportData) return;

        const filteredPayments = filterPaymentsByDateRange(payments);
        const csvContent = [
            ['Payment ID', 'Customer Name', 'Customer Email', 'Product', 'Amount', 'Currency', 'Status', 'Payment Method', 'Source', 'Date', 'Notes'],
            ...filteredPayments.map(payment => [
                payment.id,
                payment.customerName,
                payment.customerEmail,
                payment.productName || '',
                (payment.amount / 100).toFixed(2),
                payment.currency,
                payment.status,
                payment.paymentMethod || '',
                payment.syncedFromPolar ? 'Polar' : 'Manual',
                format(new Date(payment.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                payment.metadata || ''
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const element = document.createElement('a');
        const file = new Blob([csvContent], { type: 'text/csv' });
        element.href = URL.createObjectURL(file);
        element.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span>Loading reports...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/payments')}
                            className="flex items-center space-x-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to Dashboard</span>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <BarChart3 className="h-8 w-8" />
                                Payment Reports & Analytics
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" onClick={fetchPayments}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Data
                        </Button>
                        <Button onClick={downloadCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Report Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Date Range</Label>
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">Last 7 days</SelectItem>
                                    <SelectItem value="30">Last 30 days</SelectItem>
                                    <SelectItem value="90">Last 90 days</SelectItem>
                                    <SelectItem value="thisMonth">This month</SelectItem>
                                    <SelectItem value="6months">Last 6 months</SelectItem>
                                    <SelectItem value="1year">Last year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="overview">Overview Report</SelectItem>
                                    <SelectItem value="financial">Financial Report</SelectItem>
                                    <SelectItem value="customer">Customer Report</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button onClick={generateReport} className="w-full">
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Statistics Cards */}
                {reportData && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Total Payments
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.totalPayments}</div>
                                    <Badge variant="outline" className="mt-1">
                                        All Status
                                    </Badge>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Total Revenue
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">${(reportData.totalRevenue / 100).toFixed(2)}</div>
                                    <Badge variant="default" className="mt-1">
                                        Succeeded Only
                                    </Badge>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Avg Payment Value
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">${(reportData.avgPaymentValue / 100).toFixed(2)}</div>
                                    <Badge variant="secondary" className="mt-1">
                                        Per Transaction
                                    </Badge>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Success Rate
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {reportData.totalPayments > 0
                                            ? ((reportData.succeededPayments / reportData.totalPayments) * 100).toFixed(1)
                                            : 0
                                        }%
                                    </div>
                                    <Badge
                                        variant={
                                            reportData.totalPayments > 0 &&
                                            (reportData.succeededPayments / reportData.totalPayments) > 0.8
                                                ? "default" : "destructive"
                                        }
                                        className="mt-1"
                                    >
                                        Conversion Rate
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Payment Status Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PieChart className="h-5 w-5" />
                                        Payment Status Distribution
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {reportData.paymentsByStatus.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-3 h-3 rounded-full ${
                                                        item.status === 'Succeeded' ? 'bg-green-500' :
                                                            item.status === 'Pending' ? 'bg-yellow-500' :
                                                                item.status === 'Failed' ? 'bg-red-500' :
                                                                    'bg-blue-500'
                                                    }`} />
                                                    <span className="font-medium">{item.status}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{item.count} payments</div>
                                                    <div className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Polar vs Manual */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        Source Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                <span className="font-medium">Polar Synced</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">{reportData.polarVsManual.polar} payments</div>
                                                <div className="text-sm text-gray-600">${(reportData.polarVsManual.polarRevenue / 100).toFixed(2)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                                <span className="font-medium">Manual Entry</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">{reportData.polarVsManual.manual} payments</div>
                                                <div className="text-sm text-gray-600">${(reportData.polarVsManual.manualRevenue / 100).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Payment Methods Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Methods
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Method</th>
                                            <th className="text-left p-3">Payments</th>
                                            <th className="text-left p-3">Revenue</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {reportData.paymentMethods.slice(0, 5).map((method, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{method.method}</td>
                                                <td className="p-3">{method.count}</td>
                                                <td className="p-3 font-semibold">${(method.revenue / 100).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {reportData.paymentMethods.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-gray-500">
                                                    No payment methods found
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tables Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Products */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Top Products
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {reportData.topProducts.map((product, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-sm text-gray-500">{product.count} payments</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">${(product.revenue / 100).toFixed(2)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {reportData.topProducts.length === 0 && (
                                            <div className="p-8 text-center text-gray-500">
                                                No products found
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Customers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Top Customers
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {reportData.topCustomers.map((customer, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <div className="font-medium">{customer.name}</div>
                                                    <div className="text-sm text-gray-500">{customer.paymentCount} payments</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">${(customer.totalSpent / 100).toFixed(2)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {reportData.topCustomers.length === 0 && (
                                            <div className="p-8 text-center text-gray-500">
                                                No customers found
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>

            {/* Report Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Report Preview
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="max-h-96 overflow-y-auto">
              <pre className="text-sm bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {previewData}
              </pre>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={downloadReport}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
