import { Search } from "lucide-react";

import { Button } from "./button";
import { StatePanel } from "./StatePanel";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "UI/StatePanel",
  component: StatePanel,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { message: "아직 기록이 없어요." },
} satisfies Meta<typeof StatePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const SearchEmpty: Story = {
  args: {
    message: "닉네임 또는 사용자명으로 검색해보세요",
    icon: <Search className="size-10" />,
  },
};
export const Retry: Story = {
  args: {
    role: "alert",
    message: "기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    children: <Button variant="outline">다시 시도</Button>,
  },
};
