import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

const FixifyAdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [animatedStats, setAnimatedStats] = useState({ 
    totalIssues: 0, 
    resolved: 0, 
    pending: 0, 
    escalated: 0,
    revenue: 0,
    technicians: 0
  });

  // Mock data
  const mockIssues = [
    {
      id: 'ISS-001',
      title: 'Water leakage in bathroom',
      category: 'Plumbing',
      status: 'Open',
      severity: 'High',
      location: 'Block A, Apt 205',
      community: 'Green Valley Apartments',
      reportedBy: 'John Doe',
      reportedAt: '2025-08-01 09:30',
      image: '🚿',
      description: 'Severe water leakage from bathroom ceiling causing damage to floor below',
      votes: 12,
      slaRemaining: '4h 30m',
      technician: null
    },
    {
      id: 'ISS-002', 
      title: 'Power outage in common area',
      category: 'Electrical',
      status: 'Assigned',
      severity: 'Critical',
      location: 'Block B, Ground Floor',
      community: 'Green Valley Apartments',
      reportedBy: 'Jane Smith',
      reportedAt: '2025-08-01 08:15',
      image: '⚡',
      description: 'Complete power failure in lobby and parking area',
      votes: 25,
      slaRemaining: '2h 15m',
      technician: 'Mike Johnson'
    },
    {
      id: 'ISS-003',
      title: 'Broken elevator',
      category: 'Mechanical',
      status: 'Resolved',
      severity: 'Medium',
      location: 'Block C, Elevator 2',
      community: 'Sunrise Heights',
      reportedBy: 'Robert Wilson',
      reportedAt: '2025-07-31 14:20',
      image: '🛗',
      description: 'Elevator stuck between floors 3 and 4',
      votes: 8,
      slaRemaining: 'Completed',
      technician: 'Sarah Davis'
    }
  ];

  const categoryData = [
    { name: 'Plumbing', value: 45, color: '#3B82F6' },
    { name: 'Electrical', value: 30, color: '#EF4444' },
    { name: 'Civil', value: 15, color: '#10B981' },
    { name: 'HVAC', value: 10, color: '#F59E0B' }
  ];

  const statusData = [
    { name: 'Open', value: 25, color: '#EF4444' },
    { name: 'Assigned', value: 35, color: '#F59E0B' },
    { name: 'Resolved', value: 35, color: '#10B981' },
    { name: 'Escalated', value: 5, color: '#8B5CF6' }
  ];

  const monthlyData = [
    { month: 'Jan', issues: 45, resolved: 40, revenue: 25000 },
    { month: 'Feb', issues: 52, resolved: 48, revenue: 28000 },
    { month: 'Mar', issues: 38, resolved: 35, revenue: 22000 },
    { month: 'Apr', issues: 61, resolved: 58, revenue: 32000 },
    { month: 'May', issues: 55, resolved: 52, revenue: 29000 },
    { month: 'Jun', issues: 67, resolved: 63, revenue: 35000 },
    { month: 'Jul', issues: 71, resolved: 68, revenue: 38000 }
  ];

  const communities = [
    { 
      id: 1, 
      name: 'Green Valley Apartments', 
      blocks: 5, 
      residents: 450, 
      activeIssues: 12, 
      monthlyBill: 45000,
      slaHours: 24
    },
    { 
      id: 2, 
      name: 'Sunrise Heights', 
      blocks: 3, 
      residents: 280, 
      activeIssues: 8, 
      monthlyBill: 28000,
      slaHours: 12
    },
    { 
      id: 3, 
      name: 'Royal Gardens', 
      blocks: 7, 
      residents: 620, 
      activeIssues: 15, 
      monthlyBill: 62000,
      slaHours: 48
    }
  ];

  const technicians = [
    {
      id: 1,
      name: 'Mike Johnson',
      category: 'Electrical',
      rating: 4.8,
      completedJobs: 156,
      activeJobs: 3,
      earnings: 28500,
      status: 'Active'
    },
    {
      id: 2,
      name: 'Sarah Davis',
      category: 'Plumbing',
      rating: 4.9,
      completedJobs: 203,
      activeJobs: 2,
      earnings: 35200,
      status: 'Active'
    },
    {
      id: 3,
      name: 'Tom Wilson',
      category: 'Civil',
      rating: 4.6,
      completedJobs: 89,
      activeJobs: 1,
      earnings: 18700,
      status: 'Inactive'
    }
  ];

  // Animate stats on load
  useEffect(() => {
    const targets = { totalIssues: 156, resolved: 134, pending: 17, escalated: 5, revenue: 285000, technicians: 24 };
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setAnimatedStats({
        totalIssues: Math.floor(targets.totalIssues * progress),
        resolved: Math.floor(targets.resolved * progress),
        pending: Math.floor(targets.pending * progress),
        escalated: Math.floor(targets.escalated * progress),
        revenue: Math.floor(targets.revenue * progress),
        technicians: Math.floor(targets.technicians * progress)
      });
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats(targets);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return 'bg-red-100 text-red-800';
      case 'Assigned': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Escalated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const StatCard = ({ title, value, icon, gradient, change }) => (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{typeof value === 'string' ? value : value.toLocaleString()}</p>
          {change && (
            <p className="text-white/90 text-sm mt-1">
              <span className="text-green-200">↗ {change}</span> from last month
            </p>
          )}
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard 
          title="Total Issues" 
          value={animatedStats.totalIssues} 
          icon="📊" 
          gradient="from-blue-500 to-blue-600"
          change="+12%"
        />
        <StatCard 
          title="Resolved" 
          value={animatedStats.resolved} 
          icon="✅" 
          gradient="from-green-500 to-green-600"
          change="+8%"
        />
        <StatCard 
          title="Pending" 
          value={animatedStats.pending} 
          icon="⏳" 
          gradient="from-yellow-500 to-yellow-600"
          change="-5%"
        />
        <StatCard 
          title="Escalated" 
          value={animatedStats.escalated} 
          icon="🚨" 
          gradient="from-red-500 to-red-600"
          change="+2%"
        />
        <StatCard 
          title="Revenue" 
          value={`₹${animatedStats.revenue}`} 
          icon="💰" 
          gradient="from-purple-500 to-purple-600"
          change="+15%"
        />
        <StatCard 
          title="Technicians" 
          value={animatedStats.technicians} 
          icon="👷" 
          gradient="from-indigo-500 to-indigo-600"
          change="+3%"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Issues by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {categoryData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full`} style={{backgroundColor: item.color}}></div>
                <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Issues by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly trends */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Monthly Trends</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="issues" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="resolved" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Severity Heatmap by Location</h3>
        <div className="grid grid-cols-5 gap-2 max-w-md">
          {Array.from({length: 25}, (_, i) => (
            <div 
              key={i} 
              className={`w-8 h-8 rounded ${
                Math.random() > 0.7 ? 'bg-red-500' : 
                Math.random() > 0.5 ? 'bg-yellow-400' : 
                Math.random() > 0.3 ? 'bg-blue-400' : 'bg-gray-200'
              }`}
              title={`Block ${Math.floor(i/5) + 1}, Unit ${(i%5) + 1}`}
            ></div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span>Low/None</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIssueManagement = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>All Categories</option>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>Civil</option>
            <option>HVAC</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>All Status</option>
            <option>Open</option>
            <option>Assigned</option>
            <option>Resolved</option>
            <option>Escalated</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>All Communities</option>
            <option>Green Valley Apartments</option>
            <option>Sunrise Heights</option>
            <option>Royal Gardens</option>
          </select>
          <input 
            type="text" 
            placeholder="Search issues..." 
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="grid grid-cols-1 gap-6">
        {mockIssues.map((issue) => (
          <div key={issue.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Issue Info */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{issue.image}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{issue.title}</h3>
                        <p className="text-sm text-gray-500">#{issue.id}</p>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">{issue.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                        {issue.status}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {issue.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(issue.severity)}`}></div>
                        <span className="text-xs text-gray-600">{issue.severity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{issue.location}</p>
                  <p className="text-sm text-gray-600">{issue.community}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reported by</p>
                  <p className="font-medium">{issue.reportedBy}</p>
                  <p className="text-sm text-gray-600">{issue.reportedAt}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Community Votes</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600">{issue.votes}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${i < Math.floor(issue.votes/5) ? 'text-yellow-400' : 'text-gray-300'}`}>⭐</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">SLA Timer</p>
                  <p className={`font-bold ${issue.status === 'Resolved' ? 'text-green-600' : 'text-red-600'}`}>
                    {issue.slaRemaining}
                  </p>
                </div>
                {issue.technician && (
                  <div>
                    <p className="text-sm text-gray-500">Assigned to</p>
                    <p className="font-medium">{issue.technician}</p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    View Details
                  </button>
                  {issue.status !== 'Resolved' && (
                    <>
                      <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">
                        Assign Technician
                      </button>
                      <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors">
                        Escalate
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCommunityManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Community Management</h2>
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all">
          Add Community
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {communities.map((community) => (
          <div key={community.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
              <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{community.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Blocks</p>
                    <p className="font-semibold">{community.blocks}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Residents</p>
                    <p className="font-semibold">{community.residents}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 text-sm">Active Issues</p>
                <p className="text-2xl font-bold text-red-600">{community.activeIssues}</p>
              </div>

              <div className="text-center">
                <p className="text-gray-500 text-sm">Monthly Bill</p>
                <p className="text-2xl font-bold text-green-600">₹{community.monthlyBill.toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-gray-500 text-sm">SLA Hours</p>
                  <p className="font-semibold">{community.slaHours}h</p>
                </div>
                <div className="flex gap-2">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    View Details
                  </button>
                  <button className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFinanceManagement = () => (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₹${animatedStats.revenue}`} 
          icon="💰" 
          gradient="from-green-500 to-green-600"
        />
        <StatCard 
          title="Pending Payments" 
          value="₹45,000" 
          icon="⏳" 
          gradient="from-yellow-500 to-yellow-600"
        />
        <StatCard 
          title="Technician Payouts" 
          value="₹125,000" 
          icon="👷" 
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard 
          title="Profit Margin" 
          value="₹160,000" 
          icon="📈" 
          gradient="from-purple-500 to-purple-600"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Revenue Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
            <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Community Billing */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Community Billing Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Community</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">This Month</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Month</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {communities.map((community) => (
                <tr key={community.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">{community.name}</td>
                  <td className="py-4 px-4 font-semibold text-green-600">
                    ₹{community.monthlyBill.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    ₹{(community.monthlyBill * 0.9).toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      Math.random() > 0.3 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {Math.random() > 0.3 ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-600">Aug 15, 2025</td>
                  <td className="py-4 px-4">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">Generate Invoice</button>
                    <button className="text-green-600 hover:text-green-800">Send Reminder</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technician Payouts */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Technician Payouts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Technician</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Completed Jobs</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Earnings</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((technician) => (
                <tr key={technician.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-semibold">{technician.name}</p>
                      <p className="text-sm text-gray-600">{technician.category}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-sm">{technician.rating}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-semibold">{technician.completedJobs}</p>
                    <p className="text-sm text-gray-600">{technician.activeJobs} active</p>
                  </td>
                  <td className="py-4 px-4 font-semibold text-green-600">
                    ₹{technician.earnings.toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      technician.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {technician.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">View Profile</button>
                    <button className="text-green-600 hover:text-green-800">Pay Now</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTechnicianManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Technician Management</h2>
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all">
          Add Technician
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {technicians.map((technician) => (
          <div key={technician.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                {technician.name.split(' ').map(n => n[0]).join('')}
              </div>
              <h3 className="text-lg font-bold text-gray-800">{technician.name}</h3>
              <p className="text-gray-600 mb-2">{technician.category}</p>
              <div className="flex items-center justify-center gap-1 mb-4">
                <span className="text-yellow-400">⭐</span>
                <span className="font-semibold">{technician.rating}</span>
                <span className="text-gray-500">({technician.completedJobs} jobs)</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Jobs:</span>
                <span className="font-semibold">{technician.activeJobs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Earnings:</span>
                <span className="font-semibold text-green-600">₹{technician.earnings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  technician.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {technician.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                View Profile
              </button>
              <button className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">
                Assign Job
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">Fixify Admin</h1>
                <p className="text-sm text-gray-500">Community Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>
              <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                <span className="text-xl">🔔</span>
              </button>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                A
              </div>
              <button
                className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                onClick={() => navigate('/login')}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'issues', label: 'Issue Management', icon: '🔧' },
              { id: 'communities', label: 'Communities', icon: '🏘️' },
              { id: 'technicians', label: 'Technicians', icon: '👷' },
              { id: 'finance', label: 'Finance', icon: '💰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'issues' && renderIssueManagement()}
        {activeTab === 'communities' && renderCommunityManagement()}
        {activeTab === 'technicians' && renderTechnicianManagement()}
        {activeTab === 'finance' && renderFinanceManagement()}
      </div>
    </div>
  );
};

export default FixifyAdminDashboard;