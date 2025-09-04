'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { DashboardStatsData } from '@/lib/types';
import { Award, Bolt, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  files: {
    label: 'ফাইল',
    color: 'hsl(var(--chart-1))',
  },
  certificates: {
    label: 'প্রত্যয়নপত্র',
    color: 'hsl(var(--chart-2))',
  },
  bills: {
    label: 'বিদ্যুৎ বিল',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

const toBengaliNumber = (num: number | string) => {
  const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).split('').map(digit => bengaliNumbers[parseInt(digit, 10)] || digit).join('');
};

export function DashboardStats({ stats, isLoading, description, chartTitle }: { stats: DashboardStatsData | null, isLoading: boolean, description: string, chartTitle: string }) {
    
    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>রিপোর্টস</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                    </div>
                    <Skeleton className="h-[350px]" />
                </CardContent>
            </Card>
        )
    }

    if (!stats || (stats.totalFiles === 0 && stats.totalCertificates === 0 && stats.totalBills === 0)) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>রিপোর্টস</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border rounded-lg">
                        <p className="text-lg font-semibold">রিপোর্ট প্রদর্শনের জন্য কোনো ডেটা নেই।</p>
                        <p className="text-sm mt-2">এই সময়সীমার মধ্যে কোনো কার্যক্রম পাওয়া যায়নি।</p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    const chartData = stats.chartData;
    const chartKeys = stats.chartKeys || { files: 'files', certificates: 'certificates', bills: 'bills' };

    return (
        <Card>
        <CardHeader>
            <CardTitle>রিপোর্টস</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট ফাইল</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{toBengaliNumber(stats.totalFiles)}</div>
                <p className="text-xs text-muted-foreground">নির্বাচিত সময়সীমার মধ্যে</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট প্রত্যয়নপত্র</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{toBengaliNumber(stats.totalCertificates)}</div>
                <p className="text-xs text-muted-foreground">নির্বাচিত সময়সীমার মধ্যে</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">মোট বিদ্যুৎ বিল</CardTitle>
                <Bolt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{toBengaliNumber(stats.totalBills)}</div>
                <p className="text-xs text-muted-foreground">নির্বাচিত সময়সীমার মধ্যে</p>
                </CardContent>
            </Card>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-2">{chartTitle}</h3>
                {stats.chartData.every(d => d[chartKeys.files] === 0 && d[chartKeys.certificates] === 0 && d[chartKeys.bills] === 0) ? (
                    <div className="flex items-center justify-center h-[350px] rounded-lg border border-dashed">
                        <p className="text-muted-foreground">চার্ট প্রদর্শনের জন্য কোনো ডেটা নেই।</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 10, bottom: 40, left: -10 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tickFormatter={(value) => value}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis allowDecimals={false} tickFormatter={(value) => toBengaliNumber(value as number)} tick={{ fontSize: 12 }} />
                        <ChartTooltipContent />
                        <Bar dataKey={chartKeys.files} name="ফাইল" fill="var(--color-files)" radius={4} />
                        <Bar dataKey={chartKeys.certificates} name="প্রত্যয়নপত্র" fill="var(--color-certificates)" radius={4} />
                        <Bar dataKey={chartKeys.bills} name="বিদ্যুৎ বিল" fill="var(--color-bills)" radius={4} />
                    </BarChart>
                    </ChartContainer>
                )}
            </div>
        </CardContent>
        </Card>
    );
}
