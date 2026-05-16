export type ApiError = { error: string; code?: string };

export type MeResponse = {
  nickname: string;
  journey_level: number | null;
  vip: boolean;
  prestige_level: number;
  tags: string[];
  selected_chat_tag: string;
  clicker_tag_holder: string | null;
};

export type ConversationSummary = {
  id: string;
  label: string;
  type: 'room' | 'dm';
  unread_count?: number;
};

export type ConversationsResponse = {
  conversations: ConversationSummary[];
};

export type ChatMessage = {
  id?: number;
  name: string;
  message: string;
  date: string;
  vip?: boolean;
  color?: string;
  decoration?: string;
  journey_level?: number;
  prestige_level?: number;
  selected_chat_tag?: string;
  all_tags?: string[];
  kind?: string;
  conversationId?: string;
  scope?: string;
};

export type MessagesResponse = {
  messages: ChatMessage[];
  announcements: ChatMessage[];
};

export type WsAuthResponse = { token: string };

export type LoginResponse = { success: true } | ApiError;
