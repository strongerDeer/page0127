'use client';
import Input from '@components/form/Input';
import InputRadio from '@components/form/InputRadio';
import Button from '@components/shared/Button';
export default function page() {
  return (
    <form>
      <Input label="제목" id="club-title" name="club-title" />

      <Input
        label="모임 한줄 소개"
        id="club-description"
        name="club-description"
      />
      <InputRadio
        title="club-type"
        name="club-type"
        list={[
          { value: 'online', label: '온라인' },
          { value: 'online', label: '오프라인' },
        ]}
        setValue={() => {}}
      />

      {/* 모임 상세 */}
      {/* 기간 / 모임일 / 장소 / 인원수 */}

      {/* 모임 참여자 */}

      <Button type="submit">모임 생성</Button>
    </form>
  );
}
