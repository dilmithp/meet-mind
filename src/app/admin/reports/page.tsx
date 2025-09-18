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
    ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, subDays, subMonths, startOfMonth } from 'date-fns';

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

interface ReportData {
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    avgOrderValue: number;
    topProducts: Array<{ name: string; count: number; revenue: number; }>;
    topCustomers: Array<{ name: string; email: string; totalSpent: number; orderCount: number; }>;
    ordersByStatus: Array<{ status: string; count: number; percentage: number; }>;
    paymentMethods: Array<{ method: string; count: number; revenue: number; }>;
}

export default function ReportsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');
    const [reportType, setReportType] = useState('overview');
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState('');
    const router = useRouter();

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('admin_authenticated');
        if (!isAuthenticated) {
            router.push('/admin');
            return;
        }
        fetchOrders();
    }, []);

    useEffect(() => {
        if (orders.length > 0) {
            generateReportData();
        }
    }, [orders, dateRange]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/orders');
            if (response.ok) {
                const data = await response.json();
                setOrders(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const filterOrdersByDateRange = (orders: Order[]) => {
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
                return orders;
        }

        return orders.filter(order => new Date(order.order_date) >= cutoffDate);
    };

    const generateReportData = () => {
        const filteredOrders = filterOrdersByDateRange(orders);

        const totalOrders = filteredOrders.length;
        const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
        const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
        const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;

        const totalRevenue = filteredOrders
            .filter(o => o.status === 'completed')
            .reduce((sum, order) => sum + order.amount, 0);

        const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

        // Top products
        const productStats = filteredOrders.reduce((acc, order) => {
            if (!acc[order.product_name]) {
                acc[order.product_name] = { count: 0, revenue: 0 };
            }
            acc[order.product_name].count++;
            if (order.status === 'completed') {
                acc[order.product_name].revenue += order.amount;
            }
            return acc;
        }, {} as Record<string, { count: number; revenue: number; }>);

        const topProducts = Object.entries(productStats)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Top customers
        const customerStats = filteredOrders.reduce((acc, order) => {
            if (!acc[order.customer_email]) {
                acc[order.customer_email] = {
                    name: order.customer_name,
                    email: order.customer_email,
                    totalSpent: 0,
                    orderCount: 0
                };
            }
            acc[order.customer_email].orderCount++;
            if (order.status === 'completed') {
                acc[order.customer_email].totalSpent += order.amount;
            }
            return acc;
        }, {} as Record<string, any>);

        const topCustomers = Object.values(customerStats)
            .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
            .slice(0, 5);

        // Orders by status
        const ordersByStatus = [
            {
                status: 'Completed',
                count: completedOrders,
                percentage: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
            },
            {
                status: 'Pending',
                count: pendingOrders,
                percentage: totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0
            },
            {
                status: 'Cancelled',
                count: cancelledOrders,
                percentage: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0
            },
        ];

        // Payment methods
        const paymentStats = filteredOrders.reduce((acc, order) => {
            const method = order.payment_method || 'Unknown';
            if (!acc[method]) {
                acc[method] = { count: 0, revenue: 0 };
            }
            acc[method].count++;
            if (order.status === 'completed') {
                acc[method].revenue += order.amount;
            }
            return acc;
        }, {} as Record<string, { count: number; revenue: number; }>);

        const paymentMethods = Object.entries(paymentStats)
            .map(([method, stats]) => ({ method, ...stats }))
            .sort((a, b) => b.revenue - a.revenue);

        setReportData({
            totalOrders,
            totalRevenue,
            completedOrders,
            pendingOrders,
            cancelledOrders,
            avgOrderValue,
            topProducts,
            topCustomers,
            ordersByStatus,
            paymentMethods,
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
# Sales Report - ${dateRangeText}
Generated on: ${format(new Date(), 'PPP')}

## Executive Summary
- Total Orders: ${reportData.totalOrders}
- Total Revenue: $${reportData.totalRevenue.toFixed(2)}
- Completed Orders: ${reportData.completedOrders}
- Pending Orders: ${reportData.pendingOrders}
- Cancelled Orders: ${reportData.cancelledOrders}
- Average Order Value: $${reportData.avgOrderValue.toFixed(2)}

## Order Status Breakdown
${reportData.ordersByStatus.map(item =>
                `- ${item.status}: ${item.count} orders (${item.percentage.toFixed(1)}%)`
            ).join('\n')}

## Top Products by Revenue
${reportData.topProducts.map((product, index) =>
                `${index + 1}. ${product.name}: ${product.count} orders, $${product.revenue.toFixed(2)} revenue`
            ).join('\n')}

## Top Customers
${reportData.topCustomers.map((customer, index) =>
                `${index + 1}. ${customer.name} (${customer.email}): ${customer.orderCount} orders, $${customer.totalSpent.toFixed(2)} total`
            ).join('\n')}

## Payment Methods
${reportData.paymentMethods.map(method =>
                `- ${method.method}: ${method.count} orders, $${method.revenue.toFixed(2)} revenue`
            ).join('\n')}
            `;
        } else if (reportType === 'financial') {
            report = `
# Financial Report - ${dateRangeText}
Generated on: ${format(new Date(), 'PPP')}

## Revenue Summary
- Total Revenue: $${reportData.totalRevenue.toFixed(2)}
- Completed Orders: ${reportData.completedOrders}
- Average Order Value: $${reportData.avgOrderValue.toFixed(2)}
- Conversion Rate: ${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%

## Revenue by Payment Method
${reportData.paymentMethods.map(method =>
                `- ${method.method}: $${method.revenue.toFixed(2)} (${method.count} orders)`
            ).join('\n')}

## Product Performance
${reportData.topProducts.map((product, index) =>
                `${index + 1}. ${product.name}
   - Orders: ${product.count}
   - Revenue: $${product.revenue.toFixed(2)}
   - Avg per order: $${product.count > 0 ? (product.revenue / product.count).toFixed(2) : '0.00'}`
            ).join('\n\n')}
            `;
        } else if (reportType === 'customer') {
            report = `
# Customer Report - ${dateRangeText}
Generated on: ${format(new Date(), 'PPP')}

## Customer Overview
- Total Unique Customers: ${reportData.topCustomers.length}
- Total Orders: ${reportData.totalOrders}
- Average Orders per Customer: ${reportData.topCustomers.length > 0 ? (reportData.totalOrders / reportData.topCustomers.length).toFixed(1) : '0'}

## Top Customers by Spend
${reportData.topCustomers.map((customer, index) =>
                `${index + 1}. ${customer.name}
   - Email: ${customer.email}
   - Orders: ${customer.orderCount}
   - Total Spent: $${customer.totalSpent.toFixed(2)}
   - Avg per order: $${customer.orderCount > 0 ? (customer.totalSpent / customer.orderCount).toFixed(2) : '0.00'}`
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

        const filteredOrders = filterOrdersByDateRange(orders);
        const csvContent = [
            ['Order ID', 'Customer Name', 'Customer Email', 'Product', 'Amount', 'Status', 'Payment Method', 'Order Date', 'Notes'],
            ...filteredOrders.map(order => [
                order.id,
                order.customer_name,
                order.customer_email,
                order.product_name,
                order.amount.toFixed(2),
                order.status,
                order.payment_method || '',
                format(new Date(order.order_date), 'yyyy-MM-dd'),
                order.notes || ''
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const element = document.createElement('a');
        const file = new Blob([csvContent], { type: 'text/csv' });
        element.href = URL.createObjectURL(file);
        element.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading reports...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin/dashboard')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={fetchOrders}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Data
                        </Button>
                        <Button variant="outline" onClick={downloadCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Report Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
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

                            <div>
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
                                    <FileText className="w-4 h-4 mr-2" />
                                    Generate Report
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Statistics Cards */}
                {reportData && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Total Orders
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.totalOrders}</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Total Revenue
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        ${reportData.totalRevenue.toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Avg Order Value
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        ${reportData.avgOrderValue.toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Conversion Rate
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {reportData.totalOrders > 0
                                            ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1)
                                            : 0
                                        }%
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Order Status Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Order Status Distribution</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {reportData.ordersByStatus.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={
                                                        item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                            item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                    }>
                                                        {item.status}
                                                    </Badge>
                                                    <span>{item.count} orders</span>
                                                </div>
                                                <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Methods */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Methods</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {reportData.paymentMethods.slice(0, 5).map((method, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="capitalize">{method.method}</span>
                                                    <Badge variant="outline">{method.count}</Badge>
                                                </div>
                                                <span className="font-medium">${method.revenue.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Tables Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Products */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Products</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {reportData.topProducts.map((product, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-sm text-gray-500">{product.count} orders</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">${product.revenue.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {reportData.topProducts.length === 0 && (
                                            <p className="text-gray-500 text-center py-4">No products found</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Customers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Customers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {reportData.topCustomers.map((customer, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{customer.name}</div>
                                                    <div className="text-sm text-gray-500">{customer.orderCount} orders</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">${customer.totalSpent.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {reportData.topCustomers.length === 0 && (
                                            <p className="text-gray-500 text-center py-4">No customers found</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                {/* Report Preview Dialog */}
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                                <span>Report Preview</span>
                                <Button onClick={downloadReport} size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <Textarea
                                value={previewData}
                                readOnly
                                className="min-h-[500px] font-mono text-sm"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
