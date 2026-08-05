import asyncio
from core.supabase_db import cloud_engine

async def main():
    res = cloud_engine.client.table('professor_chat_history').select('*').limit(20).execute()
    for row in res.data:
        print(f"ROLE: {row['role']}")
        print(f"CONTENT: {row['content']}")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(main())
