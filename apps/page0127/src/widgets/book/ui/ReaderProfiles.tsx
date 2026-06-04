// FSD: widgets는 app을 import할 수 없다 (역방향)
// → @/app/api/_helpers/auth의 getSupabaseClient 대신 shared의 createClient 직접 사용
import { createClient } from '@/shared/config/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';

type ReaderProfilesProps = {
  isbn: string;
};

// supabase join 결과 타입 — profiles는 단일 객체 또는 배열로 올 수 있음
type ProfileData = { username: string | null; avatar_url: string | null };
type ReaderRow = {
  user_id: string;
  profiles: ProfileData | ProfileData[] | null;
};

export const ReaderProfiles = async ({ isbn }: ReaderProfilesProps) => {
  const supabase = await createClient();

  const { data: readers } = await supabase
    .from('books')
    .select(
      `
            user_id,
            profiles:user_id (
                username,
                avatar_url
            )
        `
    )
    .eq('isbn', isbn)
    .eq('status', 'completed')
    .order('completed_date', { ascending: false })
    .limit(10);

  if (!readers || readers.length === 0) return null;

  return (
    <div className='space-y-4 pt-4 border-t'>
      <h3 className='text-lg font-semibold'>이 책을 완독한 사람들</h3>
      <div className='flex -space-x-3 overflow-hidden py-2'>
        {(readers as ReaderRow[]).map((reader) => {
          // supabase 쿼리 결과: 1:1 관계면 객체, 1:N이면 배열로 옴
          const profile = reader.profiles;
          const profileData = Array.isArray(profile) ? profile[0] : profile;
          const name = profileData?.username || '익명 유저';
          const avatar = profileData?.avatar_url ?? undefined;

          return (
            <div key={reader.user_id} className='relative group' title={name}>
              <Avatar className='w-10 h-10 border-2 border-card cursor-pointer hover:z-10 hover:scale-110 transition-transform'>
                <AvatarImage src={avatar} />
                <AvatarFallback className='bg-primary/15 text-primary text-xs'>
                  {name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          );
        })}
        {readers.length >= 10 && (
          <div className='flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground hover:bg-accent'>
            +
          </div>
        )}
      </div>
    </div>
  );
};
