import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { BottomNav, SideNav } from "./Nav";
import type { NavItem } from "./Nav";

const items: NavItem[] = [
  { id: "discovery", label: "Discovery", icon: "🔥" },
  { id: "likes", label: "Лайки", icon: "★", count: 5 },
  { id: "chats", label: "Чаты", icon: "💬", count: 2 },
  { id: "profile", label: "Профиль", icon: "👤" },
];

const meta: Meta = {
  title: "Components/Navigation",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

function Demo({ kind }: { kind: "bottom" | "side" }) {
  const [active, setActive] = useState("discovery");
  const Comp = kind === "bottom" ? BottomNav : SideNav;
  return <Comp items={items} activeId={active} onSelect={setActive} />;
}

export const Bottom: Story = { render: () => <Demo kind="bottom" /> };
export const Side: Story = { render: () => <Demo kind="side" /> };

export const SelectionUpdatesCurrent: Story = {
  render: () => <Demo kind="side" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chats = canvas.getByRole("button", { name: "Чаты" });
    await userEvent.click(chats);
    await expect(chats).toHaveAttribute("aria-current", "page");
  },
};
