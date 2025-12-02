'use client';

import { useState } from 'react';

import { createClient } from '@/shared/config/supabase/client';

import type { Book, BookInput } from '@/entities/book/types';

/**
 * 도서 CRUD Custom Hook
 *
 * 학습 포인트:
 * - Supabase Client로 CRUD 작업
 * - TypeScript 타입 안전성
 * - 에러 핸들링
 */
export const useBookCRUD = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  /**
   * 도서 추가
   */
  const createBook = async (bookData: BookInput): Promise<Book | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const { data, error: insertError } = await supabase
        .from('books')
        .insert({
          ...bookData,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 추가 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 내 도서 목록 조회
   */
  const getMyBooks = async (status?: string): Promise<Book[]> => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('books').select('*').order('created_at', {
        ascending: false,
      });

      // 상태별 필터링
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 목록 조회 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 도서 상세 조회
   */
  const getBookById = async (id: string): Promise<Book | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 조회 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 도서 정보 수정
   */
  const updateBook = async (
    id: string,
    updates: Partial<BookInput>
  ): Promise<Book | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('books')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 수정 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 도서 삭제
   */
  const deleteBook = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 삭제 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createBook,
    getMyBooks,
    getBookById,
    updateBook,
    deleteBook,
  };
};
