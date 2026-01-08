-- Add spine_image column to global_books table
ALTER TABLE "public"."global_books" ADD COLUMN "spine_image" text;

-- Add spine_image column to books table if it doesn't exist (it seemed to exist intypes but maybe not in DB)
-- Using IF NOT EXISTS safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'spine_image') THEN
        ALTER TABLE "public"."books" ADD COLUMN "spine_image" text;
    END IF;
END $$;
