"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, TrendingUp, DollarSign, Activity, Users } from "lucide-react";

interface ReportData {
    report_type: string;
    generated_at: string;
    period: {
        start_date: string | null;
        end_date: string | null;
    };
    data: any;
}

export default function ReportsPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState("summary");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const generateReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: reportType,
                ...(startDate && { start_date: startDate }),
                ...(endDate && { end_date: endDate })
            });

            const response = await fetch(`/api/polar/reports?${params}`);
            const data = await response.json();

            if (response.ok) {
                setReportData(data);
            } else {
                console.error("Failed to generate report:", data);
            }
        } catch (error) {
            console.error("Report generation error:", error);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = () => {
        if (!reportData) return;

        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `polar-report-${reportData.report_type}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount: number, currency: string = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase()
        }).format(amount);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Polar Payment Reports</h1>
                <Badge variant="outline">Real-time Data</Badge>
            </div>

            {/* Report Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Report Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="summary">Summary</SelectItem>
                                    <SelectItem value="detailed">Detailed</SelectItem>
                                    <SelectItem value="analytics">Analytics</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

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

                        <div className="flex items-end gap-2">
                            <Button
                                onClick={generateReport}
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    "Generate Report"
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Report Results */}
            {reportData && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Report Results</h2>
                        <Button onClick={downloadReport} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download JSON
                        </Button>
                    </div>

                    {/* Summary Cards */}
                    {reportData.report_type === "summary" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-8 w-8 text-green-600" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                                            <p className="text-2xl font-bold">
                                                {formatCurrency(reportData.data.total_revenue)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-8 w-8 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Transactions</p>
                                            <p className="text-2xl font-bold">
                                                {reportData.data.total_transactions}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-8 w-8 text-purple-600" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Payment Methods</p>
                                            <p className="text-2xl font-bold">
                                                {reportData.data.payment_summary.length}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Data Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Data</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Generated at: {new Date(reportData.generated_at).toLocaleString()}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted rounded-lg p-4">
                <pre className="text-sm overflow-auto max-h-96">
                  {JSON.stringify(reportData.data, null, 2)}
                </pre>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
