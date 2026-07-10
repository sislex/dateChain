import type { Meta, StoryObj } from "@storybook/react";

import { ProfileDetails } from "./ProfileDetails";

const meta: Meta<typeof ProfileDetails> = {
  title: "Domain/ProfileDetails",
  component: ProfileDetails,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 360, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    profile: {
      name: "Alex",
      age: 27,
      bio: "Люблю горы, кофе по утрам и настольные игры по вечерам.",
      interests: ["Путешествия", "Кофе", "Настолки", "Горы"],
      job: "Продуктовый дизайнер в Studio",
      school: "МГУ",
      distanceKm: 3,
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileDetails>;

export const Default: Story = {};
