-- Storage bucket'ın var olup olmadığını kontrol et
SELECT * FROM storage.buckets WHERE id = 'user_uploads';

-- Storage politikalarını kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Auth kullanıcılarını kontrol et (test için)
SELECT id, email, email_confirmed_at, created_at FROM auth.users LIMIT 5;