-- Migration: Create the "media" storage bucket for image and video uploads
-- This bucket is used by the page builder, media library, and section editors.

-- Create the media bucket (public read, auth write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files (public bucket)
CREATE POLICY "Public read media files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media');

-- Also allow anon key uploads (for clients authenticated via session)
CREATE POLICY "Anon can upload media"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'media');

CREATE POLICY "Anon can update media"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'media');

CREATE POLICY "Anon can delete media"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'media');
