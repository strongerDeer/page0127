import Link from 'next/link';
import { UserCircle2 } from 'lucide-react';
import { getSupabaseClient } from '@/app/api/_helpers/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';

interface ReaderProfilesProps {
    isbn: string;
}

export default async function ReaderProfiles({ isbn }: ReaderProfilesProps) {
    const supabase = await getSupabaseClient();

    // Fetch users who completed this book
    // Needed to join with profiles table if exists, or just get user_id and maybe username if available in meta or profile table
    // Assuming 'profiles' table exists and linked by id. Or we might not have profiles yet?
    // Checking previous migrations: '20251228_add_username_to_profiles.sql' exists. So we have profiles.

    // Join books with profiles
    const { data: readers } = await supabase
        .from('books')
        .select(`
            user_id,
            profiles:user_id (
                username,
                avatar_url
            )
        `)
        .eq('isbn', isbn)
        .eq('status', 'completed')
        .order('completed_date', { ascending: false })
        .limit(10);

    if (!readers || readers.length === 0) return null;

    return (
        <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">이 책을 완독한 사람들</h3>
            <div className="flex -space-x-3 overflow-hidden py-2">
                {readers.map((reader: any, i) => {
                    const profile = reader.profiles; // Since it's a single relation (one-to-one usually on auth.id) or we treat it as object
                    // note: supabase query syntax above returns array if one-to-many, object if one-to-one defined.
                    // Usually auth.users -> profiles is 1:1.
                    // Let's assume profile is object or array. Safely handle it.
                    const profileData = Array.isArray(profile) ? profile[0] : profile;
                    const name = profileData?.username || '익명 유저';
                    const avatar = profileData?.avatar_url;

                    return (
                        <div key={reader.user_id} className="relative group" title={name}>
                             <Avatar className="w-10 h-10 border-2 border-white cursor-pointer hover:z-10 hover:scale-110 transition-transform">
                                <AvatarImage src={avatar} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                    {name.slice(0, 2)}
                                </AvatarFallback>
                             </Avatar>
                        </div>
                    );
                })}
                 {readers.length >= 10 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-500 hover:bg-gray-200">
                        +
                    </div>
                 )}
            </div>
        </div>
    );
}
