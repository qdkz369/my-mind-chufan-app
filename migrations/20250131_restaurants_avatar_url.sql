-- 为 restaurants 表添加 avatar_url 字段，用于存储用户自定义头像
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS avatar_url TEXT;
COMMENT ON COLUMN restaurants.avatar_url IS '用户头像 URL（自定义上传）';
