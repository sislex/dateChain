import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useRef } from "react";

import { ActionBar } from "../ActionBar/ActionBar";

import { SwipeCard } from "./SwipeCard";
import type { SwipeCardHandle, SwipeCardProfile, SwipeCardProps } from "./SwipeCard";

const profile: SwipeCardProfile = {
  id: "u1",
  name: "Alex",
  age: 27,
  photos: ["https://picsum.photos/seed/datechain/600/800"],
  distanceKm: 3,
  bio: "Кофе, горы и настолки.",
};

const meta: Meta<typeof SwipeCard> = {
  title: "Domain/SwipeCard",
  component: SwipeCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { profile, onSwipe: fn() },
};

export default meta;
type Story = StoryObj<typeof SwipeCard>;

export const Draggable: Story = {};

export const WithGender: Story = {
  args: { profile: { ...profile, gender: "WOMAN", name: "Мария", age: 26 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Женщина")).toBeInTheDocument();
  },
};

export const SuperLikedYou: Story = {
  args: { profile: { ...profile, gender: "MAN", superLikedYou: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("super-badge")).toBeInTheDocument();
  },
};

function SwipeWithActions(args: SwipeCardProps) {
  const ref = useRef<SwipeCardHandle>(null);
  return (
    <div style={{ width: 380 }}>
      <SwipeCard {...args} ref={ref} />
      <ActionBar
        onNope={() => ref.current?.swipe("nope")}
        onSuperLike={() => ref.current?.swipe("superlike")}
        onLike={() => ref.current?.swipe("like")}
      />
    </div>
  );
}

export const WithActionBar: Story = {
  render: (args) => <SwipeWithActions {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Нравится" }));
    await expect(args.onSwipe).toHaveBeenCalledWith("like", "u1");
  },
};

export const NopeViaButton: Story = {
  ...WithActionBar,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Не нравится" }));
    await expect(args.onSwipe).toHaveBeenCalledWith("nope", "u1");
  },
};

export const SuperLikeViaButton: Story = {
  ...WithActionBar,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Супер-лайк" }));
    await expect(args.onSwipe).toHaveBeenCalledWith("superlike", "u1");
  },
};
