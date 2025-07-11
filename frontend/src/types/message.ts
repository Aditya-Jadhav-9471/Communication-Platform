export interface Message {
  id: string;
  tempId?: string;
  channelId: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  attachments?: Array<{
    id: string;
    type: 'file' | 'image';
    name: string;
    url: string;
    size?: number;
  }>;
  replyTo?: {
    id: string;
    sender: {
      id: string;
      name: string;
    };
    content: string;
  };
  forwardedFrom?: {
    id: string;
    sender: {
      id: string;
      name: string;
    };
    content: string;
    attachments?: Array<{
      id: string;
      type: 'file' | 'image';
      name: string;
      url: string;
      size?: number;
    }>;
  };
  timestamp: string;
  status?: 'sent' | 'seen';
  isCurrentUser: boolean;
  edited?: boolean;
  seenBy?: string[];
  visibleTo: string[];
}