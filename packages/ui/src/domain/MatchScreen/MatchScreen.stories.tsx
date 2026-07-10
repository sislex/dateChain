import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { MatchScreen } from "./MatchScreen";

const meta: Meta<typeof MatchScreen> = {
  title: "Domain/MatchScreen",
  component: MatchScreen,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    currentUserPhoto: "https://picsum.photos/seed/me/240",
    matchedUserPhoto: "https://picsum.photos/seed/them/240",
    matchedUserName: "Sam",
    onSendMessage: fn(),
    onKeepSwiping: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MatchScreen>;

export const Default: Story = {};

export const SendMessageAction: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Написать сообщение" }));
    await expect(args.onSendMessage).toHaveBeenCalledOnce();
  },
};
