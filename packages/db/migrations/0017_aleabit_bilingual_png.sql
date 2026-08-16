-- AleaBit: add rendered_png_hash for bilingual PNG dedup (#135)

ALTER TABLE "aleabit_queue" ADD COLUMN "rendered_png_hash" text;
