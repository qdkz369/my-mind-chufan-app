-- 为 invoices 表添加电子发票文件 URL 字段
-- 用于存储上传的 PDF/图片电子发票

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_file_url TEXT;
COMMENT ON COLUMN invoices.invoice_file_url IS '电子发票文件 URL（PDF 或图片）';
