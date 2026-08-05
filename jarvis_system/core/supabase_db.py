import json
import os
import asyncio
from supabase import create_client, Client

import config

class SocraticCloudEngine:
    def __init__(self):
        url = config.SUPABASE_URL or os.getenv("SUPABASE_URL", "")
        key = config.SUPABASE_KEY or os.getenv("SUPABASE_KEY", "")
        
        # Only initialize if keys are present to prevent crashes before setup
        if url and key:
            self.client: Client = create_client(url, key)
        else:
            self.client = None

    async def fetch_professor_dossier(self) -> str:
        """Fetches the Master Socratic Prompt. Uses asyncio.to_thread to prevent event loop blocking."""
        if not self.client: return "Socratic Engine Offline. Missing API keys."
        
        def _fetch():
            response = self.client.table("professor_dossier").select("dossier_text").order("updated_at", desc=True).limit(1).execute()
            if response.data:
                return response.data[0]["dossier_text"]
            return "You are a Socratic MIT Professor. Guide the student using first principles."
            
        return await asyncio.to_thread(_fetch)

    async def save_professor_message(self, session_id: str, role: str, content: str):
        """Saves a single turn of conversation to Supabase."""
        if not self.client: return
        
        def _save():
            data = {"session_id": session_id, "role": role, "content": content}
            self.client.table("professor_chat_history").insert(data).execute()
            
        await asyncio.to_thread(_save)

    async def load_professor_session(self, session_id: str) -> list:
        """Loads a full session history from Supabase."""
        if not self.client: return []
        
        def _load():
            response = self.client.table("professor_chat_history").select("role, content").eq("session_id", session_id).order("timestamp").execute()
            return [{"role": row["role"], "content": row["content"]} for row in response.data]
            
        return await asyncio.to_thread(_load)

    async def create_new_session(self, initial_title: str = "New Session", mode: str = "professor") -> str:
        """Creates a new session and returns its UUID."""
        if not self.client: return ""
        def _create():
            res = self.client.table("professor_sessions").insert({"session_title": initial_title, "mode": mode}).execute()
            if res.data:
                return res.data[0]["id"]
            return ""
        return await asyncio.to_thread(_create)

    async def get_or_create_empty_session(self, initial_title: str = "New Session", mode: str = "professor") -> str:
        """Returns the most recent empty session if one exists, otherwise creates a new one."""
        if not self.client: return ""
        def _get_or_create():
            # Fetch the most recent session for this mode
            res = self.client.table("professor_sessions").select("id").eq("mode", mode).order("created_at", desc=True).limit(1).execute()
            if res.data:
                latest_id = res.data[0]["id"]
                # Check if it has any messages
                msg_res = self.client.table("professor_chat_history").select("id").eq("session_id", latest_id).limit(1).execute()
                if not msg_res.data:
                    return latest_id # Reuse empty session
            
            # Create a new one
            new_res = self.client.table("professor_sessions").insert({"session_title": initial_title, "mode": mode}).execute()
            if new_res.data:
                return new_res.data[0]["id"]
            return ""
        return await asyncio.to_thread(_get_or_create)

    async def fetch_all_sessions(self, mode: str = "professor") -> list:
        """Fetches all sessions for the sidebar, ordered by most recently created."""
        if not self.client: return []
        def _fetch():
            res = self.client.table("professor_sessions").select("id, session_title, created_at").eq("mode", mode).order("created_at", desc=True).execute()
            return res.data
        return await asyncio.to_thread(_fetch)

    async def update_session_title(self, session_id: str, title: str):
        """Updates the title of a specific session."""
        if not self.client: return
        def _update():
            self.client.table("professor_sessions").update({"session_title": title, "updated_at": "now()"}).eq("id", session_id).execute()
        await asyncio.to_thread(_update)

    async def delete_session(self, session_id: str):
        """Deletes a session and its cascaded chat history."""
        if not self.client: return
        def _delete():
            self.client.table("professor_sessions").delete().eq("id", session_id).execute()
        await asyncio.to_thread(_delete)

# Singleton instance
cloud_engine = SocraticCloudEngine()
