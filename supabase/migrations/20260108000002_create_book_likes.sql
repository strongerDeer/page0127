-- Create book_likes table
CREATE TABLE IF NOT EXISTS "public"."book_likes" (
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "book_id" uuid NOT NULL REFERENCES global_books(id) ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "book_id")
);

-- Enable RLS
ALTER TABLE "public"."book_likes" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own likes"
ON "public"."book_likes"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON "public"."book_likes"
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view likes"
ON "public"."book_likes"
FOR SELECT
USING (true);
