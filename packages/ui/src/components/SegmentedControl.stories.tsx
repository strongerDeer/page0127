import { useState } from "react";

import { expect, userEvent, waitFor, within } from "storybook/test";

import { SegmentedControl, SegmentedControlItem } from "./SegmentedControl";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "UI/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

const FilterExample = () => {
  const [selected, setSelected] = useState("전체");
  return (
    <SegmentedControl aria-label="보기 선택">
      {["전체", "2026", "읽고 싶어요"].map((label) => (
        <SegmentedControlItem
          key={label}
          aria-pressed={selected === label}
          onClick={() => setSelected(label)}
        >
          {label}
        </SegmentedControlItem>
      ))}
      <SegmentedControlItem disabled>비활성</SegmentedControlItem>
    </SegmentedControl>
  );
};

export const Default: Story = {
  render: () => <FilterExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const all = canvas.getByRole("button", { name: "전체" });
    const year = canvas.getByRole("button", { name: "2026" });
    const selectedColor = getComputedStyle(all).backgroundColor;
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(year).toHaveAttribute("aria-pressed", "false");
    expect(selectedColor).not.toBe(getComputedStyle(year).backgroundColor);
    await userEvent.click(year);
    await expect(year).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => {
      expect(getComputedStyle(year).backgroundColor).toBe(selectedColor);
      expect(getComputedStyle(all).backgroundColor).not.toBe(selectedColor);
    });
    await expect(canvas.getByRole("button", { name: "비활성" })).toBeDisabled();
  },
};
