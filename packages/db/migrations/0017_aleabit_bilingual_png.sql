-- AleaBit: add per-locale rendered PNG hash columns (#135)

ALTER TABLE "aleabit_queue" ADD COLUMN "rendered_png_hash_zh" text;
ALTER TABLE "aleabit_queue" ADD COLUMN "rendered_png_hash_en" text;
