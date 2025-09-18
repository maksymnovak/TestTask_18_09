'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  LinkIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface Meeting {
  id: string;
  title: string;
  description: string;
  type: 'pitch' | 'due-diligence' | 'follow-up' | 'term-sheet';
  duration: number;
  scheduledAt?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  meetingUrl?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

interface MeetingType {
  id: string;
  title: string;
  description: string;
  duration: number;
  icon: React.ComponentType<any>;
  color: string;
}

export default function SchedulingPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCalEmbed, setShowCalEmbed] = useState(false);

  const meetingTypes: MeetingType[] = [
    {
      id: 'pitch',
      title: 'Pitch Presentation',
      description: 'Present your company and business model to potential investors',
      duration: 30,
      icon: UserGroupIcon,
      color: 'blue',
    },
    {
      id: 'due-diligence',
      title: 'Due Diligence Session',
      description: 'Deep dive into your company financials and operations',
      duration: 60,
      icon: ClockIcon,
      color: 'green',
    },
    {
      id: 'follow-up',
      title: 'Follow-up Discussion',
      description: 'Address questions and discuss next steps with investors',
      duration: 20,
      icon: PhoneIcon,
      color: 'purple',
    },
    {
      id: 'term-sheet',
      title: 'Term Sheet Review',
      description: 'Review and negotiate investment terms with interested parties',
      duration: 45,
      icon: CheckCircleIcon,
      color: 'orange',
    },
  ];

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setIsLoading(true);
    try {
      // Try to load saved meetings from localStorage
      const savedMeetings = localStorage.getItem('scheduled_meetings');
      let loadedMeetings: Meeting[] = [];

      if (savedMeetings) {
        loadedMeetings = JSON.parse(savedMeetings);
        console.log('✅ Loaded saved meetings:', loadedMeetings.length);
      } else {
        // Default demo meetings if none saved
        const mockMeetings: Meeting[] = [
          {
            id: '1',
            title: 'Pitch Presentation',
            description: 'Present your company to Venture Capital Partners',
            type: 'pitch',
            duration: 30,
            scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            attendeeEmail: 'investor@vcpartners.com',
            attendeeName: 'Sarah Johnson',
            meetingUrl: 'https://meet.google.com/abc-defg-hij',
            status: 'scheduled',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            title: 'Due Diligence Session',
            description: 'Financial and technical review with Growth Capital',
            type: 'due-diligence',
            duration: 60,
            scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            attendeeEmail: 'dd@growthcapital.com',
            attendeeName: 'Michael Chen',
            meetingUrl: 'https://zoom.us/j/123456789',
            status: 'scheduled',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
        loadedMeetings = mockMeetings;
        // Save initial demo meetings
        saveMeetingsToStorage(mockMeetings);
      }

      setMeetings(loadedMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    }
    setIsLoading(false);
  };

  const saveMeetingsToStorage = (meetingsToSave: Meeting[]) => {
    try {
      localStorage.setItem('scheduled_meetings', JSON.stringify(meetingsToSave));
      console.log('✅ Saved meetings to localStorage:', meetingsToSave.length);
    } catch (error) {
      console.error('Error saving meetings:', error);
    }
  };

  const handleScheduleMeeting = (meetingType: MeetingType) => {
    // For demo purposes, create a new meeting with some random data
    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: meetingType.title,
      description: meetingType.description,
      type: meetingType.id as any,
      duration: meetingType.duration,
      scheduledAt: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random date within 7 days
      attendeeEmail: 'investor@example.com',
      attendeeName: 'John Investor',
      meetingUrl: `https://meet.google.com/${Math.random().toString(36).substring(7)}`,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    // Add to meetings list and save
    const updatedMeetings = [...meetings, newMeeting];
    setMeetings(updatedMeetings);
    saveMeetingsToStorage(updatedMeetings);

    toast.success(`${meetingType.title} scheduled successfully!`);

    // Show Cal embed for realistic UX
    setShowCalEmbed(true);
  };

  const handleCancelMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) {
      return;
    }

    try {
      // Update meeting status and save to localStorage
      const updatedMeetings = meetings.map(meeting =>
        meeting.id === meetingId
          ? { ...meeting, status: 'cancelled' as const }
          : meeting
      );

      setMeetings(updatedMeetings);
      saveMeetingsToStorage(updatedMeetings);
      toast.success('Meeting cancelled successfully');
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      toast.error('Failed to cancel meeting');
    }
  };

  const handleJoinMeeting = (meeting: Meeting) => {
    if (meeting.meetingUrl) {
      window.open(meeting.meetingUrl, '_blank');
    } else {
      toast.error('Meeting link not available');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    const meetingType = meetingTypes.find(mt => mt.id === type);
    return meetingType?.icon || CalendarIcon;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading meetings...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Scheduling Center</h1>
              <p className="text-gray-600">
                Manage your investor meetings and schedule new appointments
              </p>
            </div>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {meetings.filter(m => m.status === 'scheduled').length}
                </p>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {meetings.filter(m => m.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {meetings
                    .filter(m => m.status === 'scheduled')
                    .reduce((total, m) => total + m.duration, 0)
                  }
                </p>
                <p className="text-sm text-gray-500">Minutes Scheduled</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <UserGroupIcon className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(meetings.map(m => m.attendeeEmail).filter(Boolean)).size}
                </p>
                <p className="text-sm text-gray-500">Unique Investors</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Meeting Types */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Schedule New Meeting</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meetingTypes.map((type) => (
                  <motion.div
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() => handleScheduleMeeting(type)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 bg-${type.color}-100 rounded-lg flex items-center justify-center`}>
                        <type.icon className={`w-5 h-5 text-${type.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{type.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                        <div className="flex items-center space-x-4 mt-3">
                          <span className="flex items-center text-sm text-gray-500">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {type.duration} min
                          </span>
                          <span className="flex items-center text-sm text-gray-500">
                            <VideoCameraIcon className="w-4 h-4 mr-1" />
                            Video call
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Upcoming Meetings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Upcoming Meetings</h3>

              {meetings.filter(m => m.status === 'scheduled').length > 0 ? (
                <div className="space-y-4">
                  {meetings
                    .filter(m => m.status === 'scheduled')
                    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
                    .map((meeting) => {
                      const Icon = getTypeIcon(meeting.type);
                      return (
                        <div
                          key={meeting.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Icon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                                <p className="text-sm text-gray-600">{meeting.description}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="flex items-center text-sm text-gray-500">
                                    <CalendarIcon className="w-4 h-4 mr-1" />
                                    {formatDate(meeting.scheduledAt!)}
                                  </span>
                                  <span className="flex items-center text-sm text-gray-500">
                                    <ClockIcon className="w-4 h-4 mr-1" />
                                    {meeting.duration} min
                                  </span>
                                  {meeting.attendeeName && (
                                    <span className="flex items-center text-sm text-gray-500">
                                      <UserGroupIcon className="w-4 h-4 mr-1" />
                                      {meeting.attendeeName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(meeting.status)}`}>
                                {meeting.status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {meeting.meetingUrl && (
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinMeeting(meeting)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <VideoCameraIcon className="w-4 h-4 mr-1" />
                                  Join Meeting
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(meeting.meetingUrl || '');
                                  toast.success('Meeting link copied to clipboard');
                                }}
                              >
                                <LinkIcon className="w-4 h-4 mr-1" />
                                Copy Link
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelMeeting(meeting.id)}
                              className="text-red-600 hover:text-red-700 border-red-300"
                            >
                              <XMarkIcon className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Meetings</h4>
                  <p className="text-gray-500 mb-4">
                    Schedule your first investor meeting to get started
                  </p>
                  <Button onClick={() => handleScheduleMeeting(meetingTypes[0])}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Schedule First Meeting
                  </Button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => setShowCalEmbed(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  View Calendar
                </Button>
                <Button
                  onClick={() => {
                    const mailtoUrl = `mailto:?subject=Meeting%20Invitation&body=I'd%20like%20to%20schedule%20a%20meeting%20to%20discuss%20my%20startup.%20Please%20let%20me%20know%20your%20availability.`;
                    window.location.href = mailtoUrl;
                  }}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Invite Investor
                </Button>
                <Button
                  onClick={() => window.open('https://cal.com', '_blank')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Cal.com Settings
                </Button>
              </div>
            </motion.div>

            {/* Meeting History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {meetings.slice(0, 5).map((meeting) => (
                  <div key={meeting.id} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      meeting.status === 'scheduled' ? 'bg-blue-500' :
                      meeting.status === 'completed' ? 'bg-green-500' :
                      'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(meeting.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-50 rounded-xl border border-blue-200 p-6"
            >
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Meeting Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Prepare your pitch deck and have it ready to share
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Research the investor beforehand to personalize your approach
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Follow up within 24 hours with relevant documents
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Always test your tech setup before the meeting
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Cal.com Integration Modal/Embed */}
        {showCalEmbed && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto m-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Schedule Meeting</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalEmbed(false)}
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </div>

              {/* Simulated Cal.com embed */}
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <CalendarIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Cal.com Integration
                </h4>
                <p className="text-gray-600 mb-6">
                  In a production environment, this would embed the actual Cal.com booking widget.
                  For this demo, we'll simulate the booking process.
                </p>

                <div className="max-w-md mx-auto space-y-4">
                  <Input placeholder="Investor's email address" type="email" />
                  <Input placeholder="Investor's name" />
                  <Button
                    className="w-full"
                    onClick={() => {
                      toast.success('Meeting scheduled successfully! (Demo)');
                      setShowCalEmbed(false);

                      // Add a mock meeting to the list
                      const newMeeting: Meeting = {
                        id: Date.now().toString(),
                        title: 'Investor Meeting',
                        description: 'Scheduled via Cal.com integration',
                        type: 'pitch',
                        duration: 30,
                        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                        attendeeEmail: 'new@investor.com',
                        attendeeName: 'New Investor',
                        meetingUrl: 'https://meet.google.com/demo-link',
                        status: 'scheduled',
                        createdAt: new Date().toISOString(),
                      };

                      setMeetings(prev => [newMeeting, ...prev]);
                    }}
                  >
                    Schedule Meeting (Demo)
                  </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Production integration would include:<br />
                    • Real-time availability checking<br />
                    • Automatic calendar invites<br />
                    • Video conferencing setup<br />
                    • Email notifications
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}