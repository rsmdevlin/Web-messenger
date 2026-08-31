export interface User {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  status?: string;
  created_at?: string;
}

export interface Chat {
  id: number;
  name: string;
  type: string;
  created_by: number;
  created_at: string;
  avatar?: string;
  description?: string;
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  type: string;
  is_read: number;
  created_at: string;
  sender?: User;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface ChatResponse {
  chats: Chat[];
}

export interface MessageResponse {
  messages: Message[];
}