// FSD: widgets는 app을 import할 수 없다 (역방향)
// → @/app/api/_helpers/auth의 getSupabaseClient 대신 shared의 createClient 직접 사용
import { createClient } from '@/shared/config/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';

type ReaderProfilesProps = {
  isbn: string;
};

// 아바타로 노출할 최대 독자 수
const MAX_READERS = 10;
// 같은 사람이 같은 책을 여러 번 완독(재독)했을 수 있어, 중복 제거를 감안해 넉넉히 받는다
const FETCH_LIMIT = 60;

export const ReaderProfiles = async ({ isbn }: ReaderProfilesProps) => {
  const supabase = await createClient();

  // books.user_id 의 외래키는 auth.users 하나뿐이고 profiles 를 참조하지 않는다.
  // → PostgREST 가 books ↔ profiles 관계를 찾지 못해 중첩 select 조인은 PGRST200 으로 실패한다.
  //   그래서 user_id 를 먼저 모으고 profiles 를 따로 조회하는 2단계 방식을 쓴다.
  const { data: readerRows, error: readerError } = await supabase
    .from('books')
    .select('user_id')
    .eq('isbn', isbn)
    .eq('status', 'completed')
    // RLS 만 믿으면 로그인 사용자에게는 자기 비공개 기록까지 섞여 방문자와 목록이 달라진다.
    // "이 책을 완독한 사람들"은 누가 보든 같아야 하므로 공개 기록으로 명시해 좁힌다.
    .eq('is_public', true)
    // 완독일이 비어 있는 기록을 앞에 세우지 않도록 nullsFirst 를 끈다
    .order('completed_date', { ascending: false, nullsFirst: false })
    .limit(FETCH_LIMIT);

  // 에러를 버리면 "독자 없음"과 "쿼리가 깨졌음"이 구분되지 않는다.
  // 앱이 Supabase 생성 타입(Database 제네릭) 없이 클라이언트를 만들기 때문에
  // 없는 컬럼을 select 해도 tsc 가 못 잡는다 → 런타임 error 가 유일한 신호다.
  // (avatar_url 오타가 운영에서 오래 살아남은 이유)
  if (readerError) {
    console.warn(
      `[ReaderProfiles] 완독 독자 조회 실패 (isbn=${isbn}): ${readerError.message}`
    );
    return null;
  }

  if (!readerRows || readerRows.length === 0) return null;

  // 완독일 내림차순을 유지한 채 중복 user_id 제거 (Set 은 삽입 순서를 보존한다)
  const uniqueUserIds = [...new Set(readerRows.map((row) => row.user_id))];
  const visibleUserIds = uniqueUserIds.slice(0, MAX_READERS);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, nickname, photo_url')
    .in('id', visibleUserIds);

  if (profilesError) {
    console.warn(
      `[ReaderProfiles] 프로필 조회 실패 (isbn=${isbn}): ${profilesError.message}`
    );
    return null;
  }

  if (!profiles || profiles.length === 0) return null;

  // in() 결과 순서는 보장되지 않으므로 완독일 순서대로 다시 정렬한다
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const orderedProfiles = visibleUserIds
    .map((id) => profileById.get(id))
    .filter((profile) => profile !== undefined);

  if (orderedProfiles.length === 0) return null;

  return (
    <div className='space-y-4 pt-4 border-t'>
      <h3 className='text-lg font-semibold'>이 책을 완독한 사람들</h3>
      <div className='flex -space-x-3 overflow-hidden py-2'>
        {orderedProfiles.map((profile) => {
          // 닉네임 미설정 시 username 으로 대체 (익명 표기는 최후의 수단)
          const name = profile.nickname || profile.username || '익명 유저';

          return (
            <div key={profile.id} className='relative group' title={name}>
              <Avatar className='w-10 h-10 border-2 border-card cursor-pointer hover:z-10 hover:scale-110 transition-transform'>
                <AvatarImage src={profile.photo_url ?? undefined} />
                <AvatarFallback className='bg-primary/15 text-primary text-xs'>
                  {name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          );
        })}
        {uniqueUserIds.length > MAX_READERS && (
          <div className='flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground hover:bg-accent'>
            +
          </div>
        )}
      </div>
    </div>
  );
};
