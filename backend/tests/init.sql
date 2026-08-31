DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'research') THEN
        CREATE ROLE research WITH LOGIN PASSWORD 'research_pass';
    END IF;
END $$;

ALTER ROLE research WITH LOGIN SUPERUSER PASSWORD 'research_pass';
GRANT ALL PRIVILEGES ON DATABASE research_helper TO research;
\c research_helper
GRANT ALL ON SCHEMA public TO research;
GRANT ALL ON ALL TABLES IN SCHEMA public TO research;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO research;
