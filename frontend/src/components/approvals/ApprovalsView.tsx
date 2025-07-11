import React from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const ApprovalsView = () => {
  const approvals = [
    {
      id: 1,
      title: 'Expense Report #123',
      type: 'expense',
      amount: '$250.00',
      requester: 'Sarah Johnson',
      status: 'pending',
      submitted: '2025-01-15T14:30:00Z',
      deadline: '2025-01-17T14:30:00Z'
    },
    {
      id: 2,
      title: 'Time Off Request',
      type: 'leave',
      requester: 'Michael Chen',
      status: 'approved',
      submitted: '2025-01-14T13:00:00Z',
      approvedBy: 'John Smith'
    },
    {
      id: 3,
      title: 'Purchase Order #456',
      type: 'purchase',
      amount: '$1,500.00',
      requester: 'Alex Rodriguez',
      status: 'rejected',
      submitted: '2025-01-13T15:30:00Z',
      rejectedBy: 'Jane Doe'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'approved':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold mb-4">Approvals</h1>
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search approvals..."
              className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
            <Filter size={18} className="mr-2" />
            Filter
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {approvals.map(approval => (
            <div
              key={approval.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{approval.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(approval.status)}`}>
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Requested by {approval.requester}
                  </p>
                  {approval.amount && (
                    <p className="text-sm font-medium mt-1">Amount: {approval.amount}</p>
                  )}
                </div>
                {getStatusIcon(approval.status)}
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Submitted {new Date(approval.submitted).toLocaleDateString()}
                </span>
                {approval.status === 'pending' ? (
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                      Approve
                    </button>
                    <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">
                    {approval.status === 'approved' 
                      ? `Approved by ${approval.approvedBy}`
                      : `Rejected by ${approval.rejectedBy}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApprovalsView;