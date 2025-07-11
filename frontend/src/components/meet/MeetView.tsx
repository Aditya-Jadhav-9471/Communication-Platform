import React, { useState } from 'react';
import { Video, Users, Calendar, Plus, Search, X, Link as LinkIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';

const MeetView = () => {
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsCalendarExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scheduledMeetings = [
    {
      id: 1,
      title: 'Weekly Team Sync',
      time: '2025-01-15T15:00:00Z',
      duration: '1h',
      participants: [
        {
          id: 1,
          name: 'Sarah Johnson',
          avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150'
        },
        {
          id: 2,
          name: 'Michael Chen',
          avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
        },
        {
          id: 3,
          name: 'Emma Wilson',
          avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
        }
      ],
      description: 'Weekly team catch-up and project updates',
      organizer: 'Sarah Johnson',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 2,
      title: 'Project Review',
      time: '2025-01-15T16:30:00Z',
      duration: '45m',
      participants: [
        {
          id: 2,
          name: 'Michael Chen',
          avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
        },
        {
          id: 4,
          name: 'Alex Rodriguez',
          avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
        }
      ],
      description: 'Q1 project progress review and planning',
      organizer: 'Michael Chen',
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  ];

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: isMobile && !isCalendarExpanded ? 3 : 7 }, (_, i) => addDays(start, i));
  };

  const weekDays = getWeekDays();

  const WeeklyCalendar = () => (
    <div className="bg-white rounded-xl border border-gray-200 mb-4 md:mb-6 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <h2 className="font-semibold text-gray-800 text-sm md:text-base">{format(currentWeek, 'MMMM yyyy')}</h2>
          {isMobile && (
            <button
              onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              className="text-xs text-blue-600 hover:text-blue-700 underline px-2 py-1"
            >
              {isCalendarExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        <div className="flex items-center space-x-1 md:space-x-2">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 md:p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={isMobile ? 18 : 20} />
          </button>
          <button
            onClick={() => {
              setCurrentWeek(new Date());
              setSelectedDate(new Date());
            }}
            className="px-3 md:px-4 py-2 text-xs md:text-sm bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 md:p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={isMobile ? 18 : 20} />
          </button>
        </div>
      </div>
      
      <div className={`grid ${isMobile && !isCalendarExpanded ? 'grid-cols-3' : 'grid-cols-7'} divide-x divide-gray-200`}>
        {weekDays.map((day, index) => (
          <div key={index} className="min-h-[120px] md:min-h-[150px]">
            <div className="py-2.5 md:py-3 text-center border-b border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                {format(day, isMobile ? 'E' : 'EEE')}
              </div>
              <button
                onClick={() => setSelectedDate(day)}
                className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-sm transition-colors ${
                  isSameDay(day, selectedDate)
                    ? 'bg-blue-600 text-white font-medium'
                    : isSameDay(day, new Date())
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                {format(day, 'd')}
              </button>
            </div>
            <div className="px-1.5 py-2">
              {scheduledMeetings.map(meeting => {
                const meetingDate = parseISO(meeting.time);
                if (isSameDay(meetingDate, day)) {
                  return (
                    <div
                      key={meeting.id}
                      className="mb-1.5 px-2 md:px-2.5 py-1.5 md:py-2 text-xs bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      <div className="font-medium">{format(meetingDate, 'HH:mm')}</div>
                      <div className="truncate">{meeting.title}</div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MeetingCard = ({ meeting }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 flex-wrap">
            <div className="flex -space-x-2 flex-shrink-0">
              {meeting.participants.slice(0, 3).map((participant) => (
                <img
                  key={participant.id}
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-white"
                />
              ))}
              {meeting.participants.length > 3 && (
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{meeting.participants.length - 3}
                </div>
              )}
            </div>
            <h3 className="font-medium text-gray-900 text-base md:text-lg truncate flex-1">{meeting.title}</h3>
          </div>
          
          <div className="mt-3 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Clock size={16} className="mr-2 flex-shrink-0" />
              <span className="truncate">
                {format(parseISO(meeting.time), "MMM d, h:mm a")} · {meeting.duration}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{meeting.description}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center min-w-0">
          <img
            src={meeting.avatar}
            alt={meeting.organizer}
            className="w-6 h-6 md:w-7 md:h-7 rounded-full mr-2 flex-shrink-0"
          />
          <span className="text-sm text-gray-600 truncate">Organized by {meeting.organizer}</span>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            Edit
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Join
          </button>
        </div>
      </div>
    </div>
  );

  const NewMeetingModal = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowNewMeetingModal(false)}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-[340px] md:max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Meeting</h2>
          <button
            onClick={() => setShowNewMeetingModal(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          <button className="w-full flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
            <Video className="text-blue-600 mr-4" size={24} />
            <div className="text-left">
              <h3 className="font-medium text-gray-900">Start instant meeting</h3>
              <p className="text-sm text-gray-600">Start a meeting right now</p>
            </div>
          </button>

          <button className="w-full flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
            <Calendar className="text-purple-600 mr-4" size={24} />
            <div className="text-left">
              <h3 className="font-medium text-gray-900">Schedule for later</h3>
              <p className="text-sm text-gray-600">Schedule a meeting for later</p>
            </div>
          </button>

          <button className="w-full flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
            <LinkIcon className="text-green-600 mr-4" size={24} />
            <div className="text-left">
              <h3 className="font-medium text-gray-900">Create meeting link</h3>
              <p className="text-sm text-gray-600">Create a link to share with others</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Meet</h1>
            <button
              onClick={() => setShowNewMeetingModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-base"
            >
              <Plus size={20} className="mr-2" />
              New Meeting
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search meetings..."
              className="w-full px-4 py-2.5 pl-11 text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <WeeklyCalendar />
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-500">SCHEDULED MEETINGS</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1">View all</button>
          </div>
          
          <div className="grid gap-4">
            {scheduledMeetings.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      </div>

      {showNewMeetingModal && <NewMeetingModal />}
    </div>
  );
};

export default MeetView;