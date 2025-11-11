-- 允许下载记录的PDF路径为空，以便异步生成后回填
ALTER TABLE download_records
    ALTER COLUMN question_pdf_path DROP NOT NULL;

ALTER TABLE download_records
    ALTER COLUMN answer_pdf_path DROP NOT NULL;


