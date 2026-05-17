-- 0002 added a check constraint to rag_assets.asset_type with a closed enum.
-- The LLM-generated rag_library uses free-form strings ('database_lookup',
-- 'spreadsheet', 'live_feed', 'document'…) that don't match the enum, so
-- every insert would fail.
--
-- Drop the constraint. asset_type stays text (no DDL change to the column
-- itself), but values are now LLM-defined. Display code already treats it
-- as a free string so this has no UI impact.

alter table rag_assets drop constraint if exists rag_assets_asset_type_check;
