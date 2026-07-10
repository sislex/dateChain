import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: {
    items: [
      { id: "matches", label: "Мэтчи", content: "Список мэтчей" },
      { id: "messages", label: "Сообщения", content: "Список диалогов" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {};

export const SwitchesPanel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent("Список мэтчей");
    await userEvent.click(canvas.getByRole("tab", { name: "Сообщения" }));
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent("Список диалогов");
  },
};
