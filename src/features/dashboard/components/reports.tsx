import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  FileText,
  Download,
  Search,
  MoreHorizontal,
  Eye,
  Share,
  Printer,
  Clock,
  TrendingUp,

  Globe,

  DollarSign,

} from 'lucide-react'
import { useState } from 'react'

interface Report {
  id: string
  title: string
  description: string
  type: 'analytics' | 'finance' | 'marketing' | 'operations' | 'custom'
  category: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  status: 'scheduled' | 'completed' | 'failed' | 'in-progress'
  lastGenerated: string
  size: string
  format: 'PDF' | 'CSV' | 'Excel' | 'JSON'
  favorite: boolean
  views: number
  downloads: number
  lastAccessed: string
  tags: string[]
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    day?: number
    time: string
  }
}

export default function Reports() {
  const [reports, ] = useState<Report[]>([
    {
      id: '1',
      title: 'Monthly Traffic Analysis',
      description: 'Comprehensive overview of website traffic, user behavior, and conversion metrics',
      type: 'analytics',
      category: 'monthly',
      status: 'completed',
      lastGenerated: '2025-11-15',
      size: '2.4 MB',
      format: 'PDF',
      favorite: true,
      views: 42,
      downloads: 18,
      lastAccessed: '2 hours ago',
      tags: ['traffic', 'conversion', 'behavior'],
      schedule: { frequency: 'monthly', day: 15, time: '09:00' }
    },
    {
      id: '2',
      title: 'E-commerce Performance',
      description: 'Sales metrics, product performance, and customer acquisition analysis',
      type: 'finance',
      category: 'weekly',
      status: 'completed',
      lastGenerated: '2025-11-12',
      size: '1.8 MB',
      format: 'Excel',
      favorite: true,
      views: 28,
      downloads: 12,
      lastAccessed: '1 day ago',
      tags: ['sales', 'revenue', 'products'],
      schedule: { frequency: 'weekly', time: '08:30' }
    },
    {
      id: '3',
      title: 'Social Media ROI',
      description: 'Campaign performance, engagement metrics, and ROI analysis across platforms',
      type: 'marketing',
      category: 'weekly',
      status: 'in-progress',
      lastGenerated: '2025-11-19',
      size: '0.9 MB',
      format: 'PDF',
      favorite: false,
      views: 15,
      downloads: 5,
      lastAccessed: '5 hours ago',
      tags: ['social', 'campaigns', 'roi'],
    },
    {
      id: '4',
      title: 'User Engagement Trends',
      description: 'Weekly analysis of user retention, session duration, and content engagement',
      type: 'analytics',
      category: 'weekly',
      status: 'completed',
      lastGenerated: '2025-11-12',
      size: '1.2 MB',
      format: 'CSV',
      favorite: false,
      views: 32,
      downloads: 8,
      lastAccessed: '2 days ago',
      tags: ['engagement', 'retention', 'content'],
    },
    {
      id: '5',
      title: 'Customer Acquisition Cost',
      description: 'Analysis of marketing spend vs. new customer acquisition across channels',
      type: 'marketing',
      category: 'monthly',
      status: 'completed',
      lastGenerated: '2025-11-10',
      size: '1.5 MB',
      format: 'PDF',
      favorite: true,
      views: 24,
      downloads: 14,
      lastAccessed: '3 days ago',
      tags: ['acquisition', 'cost', 'marketing'],
    },
    {
      id: '6',
      title: 'Quarterly Financial Summary',
      description: 'Revenue, expenses, and profit analysis for Q4 2025',
      type: 'finance',
      category: 'quarterly',
      status: 'scheduled',
      lastGenerated: '2025-08-30',
      size: '3.2 MB',
      format: 'Excel',
      favorite: false,
      views: 12,
      downloads: 3,
      lastAccessed: '1 month ago',
      tags: ['financial', 'revenue', 'expenses'],
      schedule: { frequency: 'quarterly', day: 30, time: '10:00' }
    },
    {
      id: '7',
      title: 'Website Performance Report',
      description: 'Page load times, server response, and user experience metrics',
      type: 'operations',
      category: 'weekly',
      status: 'completed',
      lastGenerated: '2025-11-12',
      size: '0.8 MB',
      format: 'PDF',
      favorite: false,
      views: 18,
      downloads: 7,
      lastAccessed: '2 days ago',
      tags: ['performance', 'speed', 'ux'],
    },
    {
      id: '8',
      title: 'Custom Audience Segmentation',
      description: 'Detailed analysis of user segments based on behavior and demographics',
      type: 'analytics',
      category: 'custom',
      status: 'completed',
      lastGenerated: '2025-11-18',
      size: '2.1 MB',
      format: 'CSV',
      favorite: true,
      views: 21,
      downloads: 9,
      lastAccessed: '1 day ago',
      tags: ['segments', 'behavior', 'demographics'],
    },
  ])

  const [selectedTab, setSelectedTab] = useState<'all' | 'favorites' | 'scheduled'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter reports based on filters
  const filteredReports = reports
    .filter((report) => {
      if (selectedTab === 'favorites') return report.favorite
      if (selectedTab === 'scheduled') return report.schedule !== undefined
      return true
    })
    .filter((report) => {
      if (categoryFilter !== 'all') return report.category === categoryFilter
      return true
    })
    .filter((report) => {
      if (typeFilter !== 'all') return report.type === typeFilter
      return true
    })
    .filter((report) => {
      if (statusFilter !== 'all') return report.status === statusFilter
      return true
    })
    .filter((report) =>
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )

  // Get report type icon
  const getTypeIcon = (type: string) => {
    const icons = {
      analytics: <BarChart3 className="h-4 w-4" />,
      finance: <DollarSign className="h-4 w-4" />,
      marketing: <TrendingUp className="h-4 w-4" />,
      operations: <Globe className="h-4 w-4" />,
      custom: <FileText className="h-4 w-4" />,
    }
    return icons[type as keyof typeof icons]
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statuses = {
      scheduled: { text: 'Scheduled', variant: 'secondary' as const },
      completed: { text: 'Completed', variant: 'default' as const },
      failed: { text: 'Failed', variant: 'destructive' as const },
      'in-progress': { text: 'In Progress', variant: 'secondary' as const },
    }
    const statusObj = statuses[status as keyof typeof statuses]
    return <Badge variant={statusObj.variant}>{statusObj.text}</Badge>
  }

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const categories = {
      daily: { text: 'Daily', color: 'bg-blue-500' },
      weekly: { text: 'Weekly', color: 'bg-green-500' },
      monthly: { text: 'Monthly', color: 'bg-amber-500' },
      quarterly: { text: 'Quarterly', color: 'bg-purple-500' },
      yearly: { text: 'Yearly', color: 'bg-red-500' },
      custom: { text: 'Custom', color: 'bg-gray-500' },
    }
    const cat = categories[category as keyof typeof categories]
    return <Badge className={`${cat.color} text-white`}>{cat.text}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Access, generate, and schedule comprehensive business reports
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Create New Report
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as 'all' | 'favorites' | 'scheduled')}
          className="flex-shrink-0"
        >
          <TabsList>
            <TabsTrigger value="all">All Reports</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            <option value="analytics">Analytics</option>
            <option value="finance">Finance</option>
            <option value="marketing">Marketing</option>
            <option value="operations">Operations</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No reports found</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Create your first report or adjust your filters"}
          </p>
          <Button className="mt-4">Create New Report</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-lg">
                      {getTypeIcon(report.type)}
                    </div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="line-clamp-2">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {report.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  {getCategoryBadge(report.category)}
                  {getStatusBadge(report.status)}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Generated</span>
                    <span>{report.lastGenerated}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format</span>
                    <span>{report.format}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size</span>
                    <span>{report.size}</span>
                  </div>
                </div>
                
                <Separator className="mb-4" />
                
                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{report.views} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{report.downloads} downloads</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{report.lastAccessed}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Scheduled Reports Section */}
      {selectedTab !== 'scheduled' && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Scheduled Reports</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports
              .filter(r => r.schedule)
              .slice(0, 2)
              .map((report) => (
                <Card key={`scheduled-${report.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Next run: {report.schedule?.day ? `${report.schedule.day} ${report.schedule.frequency}` : report.schedule?.frequency} at {report.schedule?.time}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Report Generation Options */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
          <CardDescription>Customize and create your own report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <BarChart3 className="h-12 w-12 mx-auto text-primary mb-3" />
              <h3 className="font-medium mb-1">Analytics Report</h3>
              <p className="text-sm text-muted-foreground">Traffic, user behavior, and conversion metrics</p>
            </div>
            <div className="text-center p-6 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <DollarSign className="h-12 w-12 mx-auto text-primary mb-3" />
              <h3 className="font-medium mb-1">Financial Report</h3>
              <p className="text-sm text-muted-foreground">Revenue, expenses, and profit analysis</p>
            </div>
            <div className="text-center p-6 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <TrendingUp className="h-12 w-12 mx-auto text-primary mb-3" />
              <h3 className="font-medium mb-1">Marketing Report</h3>
              <p className="text-sm text-muted-foreground">Campaign performance and ROI metrics</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Create Custom Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}