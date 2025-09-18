'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  data?: any;
  readAt?: string;
  createdAt: string;
}

const notificationTypeIcons = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
};

const notificationTypeColors = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    icon: 'text-blue-600',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    icon: 'text-green-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    icon: 'text-yellow-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    icon: 'text-red-600',
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Get company from session
      const currentCompany = sessionStorage.getItem('current_company');
      if (currentCompany) {
        const companyData = JSON.parse(currentCompany);

        console.log('📧 Notifications: Loading for user ID:', companyData.userId);
        const result = await api.getNotifications(companyData.userId);
        console.log('📧 Notifications: Loaded', result.notifications.length, 'notifications');
        setNotifications(result.notifications || []);
      } else {
        toast.error('No company data found. Please visit dashboard first.');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    }
    setIsLoading(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const currentCompany = sessionStorage.getItem('current_company');
      if (currentCompany) {
        const companyData = JSON.parse(currentCompany);
        await api.markNotificationRead(companyData.userId, notificationId);
        setNotifications(prev => prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        ));
        toast.success('Marked as read');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };


  const handleDelete = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      const currentCompany = sessionStorage.getItem('current_company');
      if (currentCompany) {
        const companyData = JSON.parse(currentCompany);
        await api.deleteNotification(companyData.userId, notificationId);
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const currentCompany = sessionStorage.getItem('current_company');
      if (currentCompany) {
        const companyData = JSON.parse(currentCompany);
        const result = await api.markAllNotificationsRead(companyData.userId);
        const readAt = new Date().toISOString();
        setNotifications(prev => prev.map(notification => ({
          ...notification,
          readAt: notification.readAt || readAt,
        })));
        toast.success(`Marked ${result.markedCount} notifications as read`);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      return;
    }

    try {
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    // Read/unread filter
    if (filter === 'unread' && notification.readAt) return false;
    if (filter === 'read' && !notification.readAt) return false;

    // Type filter
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

    return true;
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                Stay updated with your fundraising activities
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {unreadCount} unread
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Stats and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <BellIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                <p className="text-sm text-gray-500">Unread</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => n.type === 'success').length}
                </p>
                <p className="text-sm text-gray-500">Success</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => n.type === 'warning' || n.type === 'error').length}
                </p>
                <p className="text-sm text-gray-500">Alerts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filters
                <ChevronDownIcon className={`w-4 h-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>

              <div className="flex items-center space-x-2">
                {['all', 'unread', 'read'].map((filterOption) => (
                  <Button
                    key={filterOption}
                    variant={filter === filterOption ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter(filterOption as any)}
                  >
                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  variant="outline"
                  size="sm"
                >
                  Mark All Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 border-red-300"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <div className="flex items-center space-x-2">
                    {['all', 'info', 'success', 'warning', 'error'].map((type) => (
                      <Button
                        key={type}
                        variant={typeFilter === type ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTypeFilter(type as any)}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification, index) => {
                const Icon = notificationTypeIcons[notification.type];
                const colors = notificationTypeColors[notification.type];

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border rounded-xl p-6 transition-all hover:shadow-md ${
                      notification.readAt
                        ? 'bg-white border-gray-200'
                        : 'bg-blue-50 border-blue-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            {notification.title && (
                              <h4 className={`font-semibold ${notification.readAt ? 'text-gray-900' : 'text-gray-900'} mb-1`}>
                                {notification.title}
                                {!notification.readAt && (
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2" />
                                )}
                              </h4>
                            )}
                            <p className={`${notification.readAt ? 'text-gray-600' : 'text-gray-700'} leading-relaxed`}>
                              {notification.message}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              {formatRelativeTime(notification.createdAt)}
                              {notification.readAt && (
                                <span className="ml-2">
                                  • Read {formatRelativeTime(notification.readAt)}
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.readAt && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkAsRead(notification.id)}
                                title="Mark as read"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(notification.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete notification"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
              >
                <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No notifications found
                </h3>
                <p className="text-gray-600 mb-4">
                  {filter === 'unread'
                    ? "You're all caught up! No unread notifications."
                    : filter === 'read'
                    ? "No read notifications to show."
                    : "You don't have any notifications yet."}
                </p>
                {filter !== 'all' && (
                  <Button
                    onClick={() => setFilter('all')}
                    variant="outline"
                  >
                    View All Notifications
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Real-time Demo Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Real-time Notifications</h3>
              <p className="text-blue-100">
                In production, this system would provide real-time updates via WebSockets,
                push notifications, and email alerts for important events.
              </p>
            </div>
            <div className="text-right">
              <Button
                variant="secondary"
                onClick={() => {
                  // Simulate a new notification
                  const newNotification: Notification = {
                    id: Date.now().toString(),
                    type: 'info',
                    title: 'Demo Notification',
                    message: 'This is a simulated real-time notification!',
                    createdAt: new Date().toISOString(),
                  };
                  setNotifications(prev => [newNotification, ...prev]);
                  toast.success('New notification received!');
                }}
              >
                Simulate Notification
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}