import re

def update_env(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'POSTGRES_USER=.*', 'POSTGRES_USER=research', content)
        content = re.sub(r'POSTGRES_PASSWORD=.*', 'POSTGRES_PASSWORD=research_pass', content)
        content = re.sub(r'POSTGRES_DB=.*', 'POSTGRES_DB=research_helper', content)
        content = re.sub(r'POSTGRES_PORT=.*', 'POSTGRES_PORT=5432', content)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    except Exception as e:
        print(f"Error {path}: {e}")

update_env('.env')
update_env('backend/.env')
update_env('backend_new/.env')
