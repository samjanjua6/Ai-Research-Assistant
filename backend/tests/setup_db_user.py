import psycopg2
conn = psycopg2.connect(dbname="postgres", user="postgres", host="/var/run/postgresql")
conn.autocommit = True
cur = conn.cursor()
try:
    cur.execute("CREATE USER research WITH PASSWORD 'research_pass';")
    print("Created user research")
except Exception as e:
    print("User might exist:", e)

cur.execute("ALTER USER research WITH SUPERUSER PASSWORD 'research_pass';")
cur.execute("GRANT ALL PRIVILEGES ON DATABASE research_helper TO research;")
cur.execute("GRANT ALL ON SCHEMA public TO research;")
print("Postgres permissions configured successfully!")
conn.close()
