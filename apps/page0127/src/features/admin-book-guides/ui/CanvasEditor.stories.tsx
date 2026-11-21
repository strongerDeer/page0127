import { useState } from 'react';

import { bookGuideSectionsSchema } from '@/entities/book-guide';
import daeonsil from '@/entities/book-guide/model/__fixtures__/daeonsil.json';

import { CanvasEditor } from './CanvasEditor';

import type { PeopleSection } from '@/entities/book-guide';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const sample = bookGuideSectionsSchema.parse(daeonsil)[0] as PeopleSection;

/** 편집기는 상태를 바깥에서 받는다 — 스토리에서는 useState 로 감싼다 */
const Stateful = () => {
  const [section, setSection] = useState(sample);
  return <CanvasEditor section={section} onChange={setSection} />;
};

const meta = {
  title: 'Features/Admin/읽기 가이드 편집기',
  component: Stateful,
} satisfies Meta<typeof Stateful>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 영두_곁의_사람들: Story = {};
