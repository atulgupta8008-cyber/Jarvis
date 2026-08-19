import json
import os
import time
import uuid
import base64
import asyncio
from supabase import create_client, Client

import config

class SocraticCloudEngine:
    def __init__(self):
        url = config.SUPABASE_URL or os.getenv("SUPABASE_URL", "")
        key = config.SUPABASE_KEY or os.getenv("SUPABASE_KEY", "")
        
        # Only initialize if keys are present to prevent crashes before setup
        if url and key:
            try:
                self.client: Client = create_client(url, key)
            except Exception as e:
                print(f"[Supabase] Init error: {e}")
                self.client = None
        else:
            self.client = None

        self.media_cache_dir = os.path.join(os.path.dirname(__file__), "..", "temp", "media_cache")
        os.makedirs(self.media_cache_dir, exist_ok=True)

    async def fetch_professor_dossier(self) -> str:
        """Fetches the Master Socratic Prompt. Uses asyncio.to_thread to prevent event loop blocking."""
        if not self.client: return "You are a Socratic MIT Professor. Guide the student using first principles."
        
        def _fetch():
            try:
                response = self.client.table("professor_dossier").select("dossier_text").order("updated_at", desc=True).limit(1).execute()
                if response.data:
                    return response.data[0]["dossier_text"]
            except Exception as e:
                print(f"[Supabase] Dossier fetch notice: {e}")
            return "You are a Socratic MIT Professor. Guide the student using first principles."
            
        return await asyncio.to_thread(_fetch)

    async def save_professor_message(self, session_id: str, role: str, content: str):
        """Saves a single turn of conversation to Supabase."""
        if not self.client: return
        
        def _save():
            try:
                data = {"session_id": session_id, "role": role, "content": content}
                self.client.table("professor_chat_history").insert(data).execute()
            except Exception as e:
                print(f"[Supabase] Save message notice: {e}")
            
        await asyncio.to_thread(_save)

    async def load_professor_session(self, session_id: str) -> list:
        """Loads a full session history from Supabase."""
        if not self.client: return []
        
        def _load():
            try:
                response = self.client.table("professor_chat_history").select("role, content").eq("session_id", session_id).order("timestamp").execute()
                return [{"role": row["role"], "content": row["content"]} for row in response.data]
            except Exception as e:
                print(f"[Supabase] Load session notice: {e}")
                return []
            
        return await asyncio.to_thread(_load)

    async def create_new_session(self, initial_title: str = "New Session", mode: str = "professor") -> str:
        """Creates a new session and returns its UUID."""
        if not self.client: return str(uuid.uuid4())
        def _create():
            try:
                res = self.client.table("professor_sessions").insert({"session_title": initial_title, "mode": mode}).execute()
                if res.data:
                    return res.data[0]["id"]
            except Exception as e:
                print(f"[Supabase] Create session notice: {e}")
            return str(uuid.uuid4())
        return await asyncio.to_thread(_create)

    async def get_or_create_empty_session(self, initial_title: str = "New Session", mode: str = "professor") -> str:
        """Returns the most recent empty session if one exists, otherwise creates a new one."""
        if not self.client: return str(uuid.uuid4())
        def _get_or_create():
            try:
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
            except Exception as e:
                print(f"[Supabase] Get/create session notice: {e}")
            return str(uuid.uuid4())
        return await asyncio.to_thread(_get_or_create)

    async def fetch_all_sessions(self, mode: str = "professor") -> list:
        """Fetches all sessions for the sidebar, ordered by most recently created."""
        if not self.client: return []
        def _fetch():
            try:
                res = self.client.table("professor_sessions").select("id, session_title, created_at").eq("mode", mode).order("created_at", desc=True).execute()
                return res.data
            except Exception as e:
                print(f"[Supabase] Fetch sessions notice: {e}")
                return []
        return await asyncio.to_thread(_fetch)

    async def update_session_title(self, session_id: str, title: str):
        """Updates the title of a specific session."""
        if not self.client: return
        def _update():
            try:
                self.client.table("professor_sessions").update({"session_title": title, "updated_at": "now()"}).eq("id", session_id).execute()
            except Exception as e:
                print(f"[Supabase] Update title notice: {e}")
        await asyncio.to_thread(_update)

    async def delete_session(self, session_id: str):
        """Deletes a session, its chat history, and its uploaded media files."""
        def _delete():
            # Delete from Supabase
            if self.client:
                try:
                    self.client.table("session_media").delete().eq("session_id", session_id).execute()
                except Exception:
                    pass
                try:
                    self.client.table("professor_sessions").delete().eq("id", session_id).execute()
                except Exception as e:
                    print(f"[Supabase] Delete session notice: {e}")
            
            # Clean local media cache
            sess_dir = os.path.join(self.media_cache_dir, str(session_id))
            if os.path.exists(sess_dir):
                import shutil
                try:
                    shutil.rmtree(sess_dir)
                except Exception:
                    pass

        await asyncio.to_thread(_delete)

    # -------------------------------------------------------------
    # PER-SESSION MEDIA VAULT METHODS (Supabase + Local Cache)
    # -------------------------------------------------------------

    async def save_session_media(self, session_id: str, name: str, mime: str, size: int, base64_data: str, text_content: str = "") -> dict:
        """
        Saves an uploaded file to Supabase table `session_media` and caches locally.
        Guarantees strict session partitioning (media of session A never mixes with session B).
        """
        media_id = str(uuid.uuid4())
        created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Ensure session local cache directory
        sess_dir = os.path.join(self.media_cache_dir, str(session_id))
        os.makedirs(sess_dir, exist_ok=True)

        local_file_path = os.path.join(sess_dir, name)
        
        # Save raw binary locally if base64 provided
        if base64_data:
            clean_b64 = base64_data.split(",")[1] if "," in base64_data else base64_data
            try:
                raw_bytes = base64.b64decode(clean_b64)
                with open(local_file_path, "wb") as f:
                    f.write(raw_bytes)
                if not size or size <= 0:
                    size = len(raw_bytes)
            except Exception as e:
                print(f"[MediaVault] Error decoding local file {name}: {e}")

        media_item = {
            "id": media_id,
            "session_id": session_id,
            "name": name,
            "mime_type": mime or "application/octet-stream",
            "size": size or 0,
            "local_path": local_file_path,
            "text_content": text_content[:5000] if text_content else "",
            "created_at": created_at
        }

        # Save metadata to local session index
        meta_path = os.path.join(sess_dir, f"meta_{media_id}.json")
        try:
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(media_item, f, indent=2)
        except Exception as e:
            print(f"[MediaVault] Error writing meta cache: {e}")

        # Save to Supabase (if table exists)
        def _save_supabase():
            if not self.client: return
            try:
                data_payload = {
                    "id": media_id,
                    "session_id": session_id,
                    "file_name": name,
                    "mime_type": mime or "application/octet-stream",
                    "file_size": size or 0,
                    "text_summary": text_content[:2000] if text_content else "",
                    "created_at": created_at
                }
                self.client.table("session_media").insert(data_payload).execute()
            except Exception:
                # Table session_media may not be created in Supabase yet; local cache is active
                pass

        await asyncio.to_thread(_save_supabase)
        return media_item

    async def fetch_session_media(self, session_id: str) -> list:
        """
        Fetches all media items uploaded for a specific session ID.
        """
        if not session_id: return []

        # 1. Try Supabase
        def _fetch_from_supabase():
            if not self.client: return None
            try:
                res = self.client.table("session_media").select("*").eq("session_id", session_id).order("created_at", desc=True).execute()
                if res.data is not None:
                    items = []
                    sess_dir = os.path.join(self.media_cache_dir, str(session_id))
                    for row in res.data:
                        items.append({
                            "id": row.get("id"),
                            "session_id": row.get("session_id"),
                            "name": row.get("file_name") or row.get("name"),
                            "mime_type": row.get("mime_type", "application/pdf"),
                            "size": row.get("file_size") or row.get("size", 0),
                            "local_path": os.path.join(sess_dir, row.get("file_name") or row.get("name", "")),
                            "created_at": row.get("created_at")
                        })
                    return items
            except Exception:
                # Table not found or connection offline; fallback to local cache
                return None
            return None

        items = await asyncio.to_thread(_fetch_from_supabase)
        if items is not None:
            return items

        # 2. Fallback to local session media cache
        sess_dir = os.path.join(self.media_cache_dir, str(session_id))
        if not os.path.exists(sess_dir):
            return []

        local_items = []
        try:
            for fname in os.listdir(sess_dir):
                if fname.startswith("meta_") and fname.endswith(".json"):
                    with open(os.path.join(sess_dir, fname), "r", encoding="utf-8") as f:
                        local_items.append(json.load(f))
        except Exception as e:
            print(f"[MediaVault] Error loading local cache for session {session_id}: {e}")

        return sorted(local_items, key=lambda x: x.get("created_at", ""), reverse=True)

    async def delete_session_media(self, session_id: str, media_id: str):
        """
        Deletes a specific media item from Supabase and local cache.
        """
        def _delete():
            # Delete from Supabase
            if self.client:
                try:
                    self.client.table("session_media").delete().eq("id", media_id).eq("session_id", session_id).execute()
                except Exception as e:
                    print(f"[Supabase] delete_session_media notice: {e}")

            # Delete from local cache
            sess_dir = os.path.join(self.media_cache_dir, str(session_id))
            meta_path = os.path.join(sess_dir, f"meta_{media_id}.json")
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    file_path = meta.get("local_path")
                    if file_path and os.path.exists(file_path):
                        os.remove(file_path)
                    os.remove(meta_path)
                except Exception as e:
                    print(f"[MediaVault] Error removing local cache file: {e}")

        await asyncio.to_thread(_delete)

# Singleton instance
cloud_engine = SocraticCloudEngine()
