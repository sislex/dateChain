import type { Meta, StoryObj } from "@storybook/react";

import { ChatBubble } from "./ChatBubble";
import { MatchListItem } from "./MatchListItem";
import { TypingIndicator } from "./TypingIndicator";

const meta: Meta = {
  title: "Domain/Chat",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Conversation: Story = {
  render: () => (
    <div style={{ width: 360 }}>
      <ChatBubble own={false} text="Привет! Как дела?" time="12:01" />
      <ChatBubble own text="Отлично, спасибо 😄" time="12:02" status="read" />
      <ChatBubble own={false} text="Чем занимаешься на выходных?" time="12:03" />
      <TypingIndicator />
    </div>
  ),
};

export const Matches: Story = {
  render: () => (
    <div style={{ width: 360 }}>
      <MatchListItem name="Sam" isNewMatch />
      <MatchListItem name="Kate" preview="Договорились, до встречи!" unread />
      <MatchListItem name="Alex" preview="Ха-ха, точно" />
    </div>
  ),
};
