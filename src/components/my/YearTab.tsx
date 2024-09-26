import Button from '@components/shared/Button';

export default function YearTab({
  value,
  setValue,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  const years = ['All', '2024', '2023', '2022', '2021', '2020'];
  return (
    <div>
      {years.map((year) => (
        <Button
          variant={value === year ? 'solid' : 'outline'}
          size="sm"
          onClick={() => {
            setValue(year);
          }}
        >
          {year}
        </Button>
      ))}
    </div>
  );
}
