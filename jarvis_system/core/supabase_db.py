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
        
        if url and key:
            try:
                self.client: Client = create_client(url, key)
            except Exception as e:
                print(f"[Supabase] Init notice: {e}")
                self.client = None
        else:
            self.client = None

        self.media_cache_dir = os.path.join(os.path.dirname(__file__), "..", "temp", "media_cache")
        os.makedirs(self.media_cache_dir, exist_ok=True)
        self.local_db_file = os.path.join(os.path.dirname(__file__), "..", "temp", "local_sessions.json")
        self._init_local_db()

    def _init_local_db(self):
        if not os.path.exists(self.local_db_file):
            try:
                with open(self.local_db_file, "w", encoding="utf-8") as f:
                    json.dump({"sessions": [], "messages": {}}, f, indent=2)
            except Exception:
                pass

    def _read_local_db(self) -> dict:
        try:
            if os.path.exists(self.local_db_file):
                with open(self.local_db_file, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return {"sessions": [], "messages": {}}

    def _write_local_db(self, data: dict):
        try:
            with open(self.local_db_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    async def fetch_professor_dossier(self) -> str:
        """Fetches the Master Socratic Prompt from system_prompts or professor_dossier table."""
        if not self.client: 
            return "You are a Socratic MIT Professor. Guide the student using first principles."
        
        def _fetch():
            try:
                # 1. Try modern system_prompts table
                res = self.client.table("system_prompts").select("prompt_text").eq("mode", "professor").limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]["prompt_text"]
            except Exception:
                pass
            
            try:
                # 2. Try legacy professor_dossier table
                res = self.client.table("professor_dossier").select("dossier_text").order("updated_at", desc=True).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]["dossier_text"]
            except Exception:
                pass
                
            return "You are a Socratic MIT Professor. Guide the student using first principles."
            
        return await asyncio.to_thread(_fetch)

    def _clean_user_id(self, user_id: str) -> str:
        if not user_id or str(user_id).strip() in ["", "null", "undefined", "guest", "guest_local"]:
            return "user_default"
        if user_id in ["admin", "admin_master"]:
            return "admin_master"
        return str(user_id).strip()

    def _clean_session_id(self, session_id: str) -> str:
        """Ensures session_id is always a valid UUID string compatible with Postgres UUID columns."""
        if not session_id or str(session_id).strip() in ["", "null", "undefined", "default_academic_session"]:
            return str(uuid.uuid4())
        raw = str(session_id).strip()
        try:
            val = uuid.UUID(raw)
            return str(val)
        except (ValueError, AttributeError):
            # Deterministically transform non-UUID string into a valid UUID
            return str(uuid.uuid5(uuid.NAMESPACE_DNS, raw))

    async def save_professor_message(self, session_id: str, role: str, content: str, user_id: str = None, teaching_score: dict = None):
        """Saves a single turn of conversation to Supabase or local cache."""
        effective_user = self._clean_user_id(user_id)
        clean_sid = self._clean_session_id(session_id)

        # 1. Always save to local fallback cache
        local_data = self._read_local_db()
        local_messages = local_data.get("messages", {})
        if clean_sid not in local_messages:
            local_messages[clean_sid] = []
        local_messages[clean_sid].append({
            "id": str(uuid.uuid4()),
            "session_id": clean_sid,
            "role": role,
            "content": content,
            "user_id": effective_user,
            "teaching_score": teaching_score,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        })
        local_data["messages"] = local_messages
        
        # Ensure session exists and has correct user_id in local sessions
        sessions = local_data.get("sessions", [])
        sess_found = False
        for s in sessions:
            if s.get("id") == clean_sid:
                s["user_id"] = effective_user
                sess_found = True
                break
        if not sess_found:
            sessions.insert(0, {
                "id": clean_sid,
                "session_title": "New Session",
                "mode": "professor",
                "user_id": effective_user,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            })
        local_data["sessions"] = sessions
        self._write_local_db(local_data)

        # 2. Sync to Supabase if connected
        if not self.client: return
        
        def _save():
            # Ensure the session row exists in chat_sessions so foreign keys don't fail
            try:
                chk = self.client.table("chat_sessions").select("id").eq("id", clean_sid).execute()
                if not chk.data or len(chk.data) == 0:
                    self.client.table("chat_sessions").insert({
                        "id": clean_sid,
                        "session_title": "New Session",
                        "mode": "professor",
                        "user_id": effective_user
                    }).execute()
            except Exception as e:
                print(f"[Supabase] Ensure session exists notice: {e}")

            # Try chat_messages table
            try:
                data = {
                    "session_id": clean_sid, 
                    "role": role, 
                    "content": content,
                    "teaching_score": teaching_score
                }
                self.client.table("chat_messages").insert(data).execute()
                return
            except Exception:
                pass

            # Fallback to legacy professor_chat_history table
            try:
                data = {"session_id": clean_sid, "role": role, "content": content}
                self.client.table("professor_chat_history").insert(data).execute()
            except Exception:
                pass
            
        await asyncio.to_thread(_save)

    async def load_professor_session(self, session_id: str, user_id: str = None) -> list:
        """Loads a full session history from Supabase or local cache."""
        clean_sid = self._clean_session_id(session_id)
        def _load_supabase():
            if not self.client: return None
            # 1. Try chat_messages table
            try:
                res = self.client.table("chat_messages").select("role, content, teaching_score, created_at").eq("session_id", clean_sid).order("created_at").execute()
                if res.data is not None and len(res.data) > 0:
                    return [{"role": row["role"], "content": row["content"], "teaching_score": row.get("teaching_score")} for row in res.data]
            except Exception:
                pass

            # 2. Try legacy professor_chat_history table
            try:
                res = self.client.table("professor_chat_history").select("role, content").eq("session_id", clean_sid).order("timestamp").execute()
                if res.data is not None and len(res.data) > 0:
                    return [{"role": row["role"], "content": row["content"]} for row in res.data]
            except Exception:
                pass
            return None

        supa_res = await asyncio.to_thread(_load_supabase)
        if supa_res is not None:
            return supa_res

        # Fallback to local cache
        local_data = self._read_local_db()
        return local_data.get("messages", {}).get(clean_sid, [])

    async def create_new_session(self, initial_title: str = "New Session", mode: str = "professor", user_id: str = None, session_id: str = None) -> str:
        """Creates a new session and returns its UUID."""
        new_id = self._clean_session_id(session_id) if session_id else str(uuid.uuid4())
        created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        effective_user = self._clean_user_id(user_id)

        # Save to local cache
        local_data = self._read_local_db()
        sessions = local_data.get("sessions", [])
        # Check if already in local
        already = False
        for s in sessions:
            if s.get("id") == new_id:
                s["user_id"] = effective_user
                already = True
                break
        if not already:
            sessions.insert(0, {
                "id": new_id,
                "session_title": initial_title,
                "mode": mode,
                "user_id": effective_user,
                "created_at": created_at
            })
        local_data["sessions"] = sessions
        self._write_local_db(local_data)

        if not self.client: 
            return new_id

        def _create():
            try:
                chk = self.client.table("chat_sessions").select("id").eq("id", new_id).execute()
                if chk.data and len(chk.data) > 0:
                    return new_id
                payload = {
                    "id": new_id,
                    "session_title": initial_title, 
                    "mode": mode,
                    "user_id": effective_user
                }
                res = self.client.table("chat_sessions").insert(payload).execute()
                if res.data:
                    return res.data[0]["id"]
            except Exception:
                pass

            return new_id

        return await asyncio.to_thread(_create)

    async def get_or_create_empty_session(self, initial_title: str = "New Session", mode: str = "professor", user_id: str = None, session_id: str = None) -> str:
        """Reuses the most recent empty session if one exists for this user and mode, otherwise creates a new one."""
        effective_user = self._clean_user_id(user_id)

        if session_id:
            return await self.create_new_session(initial_title=initial_title, mode=mode, user_id=effective_user, session_id=session_id)

        # Check local DB first for an empty session by this user and mode
        local_data = self._read_local_db()
        local_messages = local_data.get("messages", {})
        for s in local_data.get("sessions", []):
            if s.get("mode") == mode and self._clean_user_id(s.get("user_id")) == effective_user:
                if len(local_messages.get(s["id"], [])) == 0:
                    return s["id"]

        def _get_or_create():
            if not self.client: return None
            try:
                query = self.client.table("chat_sessions").select("id").eq("mode", mode).eq("user_id", effective_user)
                res = query.order("created_at", desc=True).limit(1).execute()
                
                if res.data and len(res.data) > 0:
                    latest_id = res.data[0]["id"]
                    msg_res = self.client.table("chat_messages").select("id").eq("session_id", latest_id).limit(1).execute()
                    if not msg_res.data or len(msg_res.data) == 0:
                        return latest_id
            except Exception:
                pass
            return None

        supa_id = await asyncio.to_thread(_get_or_create)
        if supa_id:
            return supa_id

        return await self.create_new_session(initial_title=initial_title, mode=mode, user_id=effective_user)

    async def fetch_all_sessions(self, mode: str = "professor", user_id: str = None) -> list:
        """Fetches ONLY populated sessions (sessions with conversation) strictly isolated for this user."""
        effective_user = self._clean_user_id(user_id)

        def _fetch():
            if not self.client: return None
            try:
                query = self.client.table("chat_sessions").select("id, session_title, created_at, user_id, chat_messages(id)").eq("mode", mode).eq("user_id", effective_user)
                res = query.order("created_at", desc=True).execute()
                if res.data is not None:
                    # Keep only sessions that have at least 1 message
                    populated = []
                    for row in res.data:
                        msgs = row.get("chat_messages", [])
                        if msgs and len(msgs) > 0:
                            populated.append({
                                "id": row["id"],
                                "session_title": row.get("session_title", "Session"),
                                "created_at": row.get("created_at")
                            })
                    return populated
            except Exception as e:
                print(f"[Supabase] fetch_all_sessions notice: {e}")

            return None

        supa_sessions = await asyncio.to_thread(_fetch)
        if supa_sessions is not None:
            return supa_sessions

        # Local cache fallback (ONLY used when Supabase is completely offline/disconnected):
        local_data = self._read_local_db()
        local_messages = local_data.get("messages", {})
        all_sess = local_data.get("sessions", [])
        
        populated_local = []
        for s in all_sess:
            s_user = self._clean_user_id(s.get("user_id"))
            if s.get("mode") == mode and s_user == effective_user:
                if len(local_messages.get(s["id"], [])) > 0:
                    populated_local.append({
                        "id": s["id"],
                        "session_title": s.get("session_title", "Session"),
                        "created_at": s.get("created_at")
                    })
        return populated_local

    async def update_session_title(self, session_id: str, title: str):
        """Updates the title of a specific session."""
        clean_sid = self._clean_session_id(session_id)
        # Update local
        local_data = self._read_local_db()
        for s in local_data.get("sessions", []):
            if s["id"] == clean_sid:
                s["session_title"] = title
                break
        self._write_local_db(local_data)

        if not self.client: return
        def _update():
            try:
                self.client.table("chat_sessions").update({"session_title": title, "updated_at": "now()"}).eq("id", clean_sid).execute()
                return
            except Exception:
                pass
            try:
                self.client.table("professor_sessions").update({"session_title": title, "updated_at": "now()"}).eq("id", clean_sid).execute()
            except Exception:
                pass
        await asyncio.to_thread(_update)

    async def delete_session(self, session_id: str):
        """Deletes a session, its chat history, and its uploaded media files."""
        clean_sid = self._clean_session_id(session_id)
        # Delete local
        local_data = self._read_local_db()
        local_data["sessions"] = [s for s in local_data.get("sessions", []) if s["id"] != clean_sid]
        if clean_sid in local_data.get("messages", {}):
            del local_data["messages"][clean_sid]
        self._write_local_db(local_data)

        def _delete():
            if self.client:
                try:
                    self.client.table("session_media").delete().eq("session_id", clean_sid).execute()
                except Exception:
                    pass
                try:
                    self.client.table("chat_messages").delete().eq("session_id", clean_sid).execute()
                except Exception:
                    pass
                try:
                    self.client.table("chat_sessions").delete().eq("id", clean_sid).execute()
                except Exception:
                    pass
                try:
                    self.client.table("professor_chat_history").delete().eq("session_id", clean_sid).execute()
                except Exception:
                    pass
                try:
                    self.client.table("professor_sessions").delete().eq("id", clean_sid).execute()
                except Exception:
                    pass
            
            # Clean local media cache
            sess_dir = os.path.join(self.media_cache_dir, str(clean_sid))
            if os.path.exists(sess_dir):
                import shutil
                try:
                    shutil.rmtree(sess_dir)
                except Exception:
                    pass

        await asyncio.to_thread(_delete)

    # -------------------------------------------------------------
    # PER-SESSION MEDIA VAULT METHODS
    # -------------------------------------------------------------

    async def save_session_media(self, session_id: str, name: str, mime: str, size: int, base64_data: str, user_id: str = None, text_content: str = "") -> dict:
        clean_sid = self._clean_session_id(session_id)
        media_id = str(uuid.uuid4())
        created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        sess_dir = os.path.join(self.media_cache_dir, str(clean_sid))
        os.makedirs(sess_dir, exist_ok=True)

        local_file_path = os.path.join(sess_dir, name)
        
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
            "session_id": clean_sid,
            "name": name,
            "mime_type": mime or "application/octet-stream",
            "size": size or 0,
            "local_path": local_file_path,
            "text_content": text_content[:5000] if text_content else "",
            "created_at": created_at
        }

        meta_path = os.path.join(sess_dir, f"meta_{media_id}.json")
        try:
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(media_item, f, indent=2)
        except Exception:
            pass

        def _save_supabase():
            if not self.client: return
            try:
                data_payload = {
                    "id": media_id,
                    "session_id": clean_sid,
                    "file_name": name,
                    "mime_type": mime or "application/octet-stream",
                    "file_size": size or 0,
                    "text_summary": text_content[:2000] if text_content else "",
                    "created_at": created_at,
                    "user_id": user_id if user_id and user_id != "guest_local" else None
                }
                self.client.table("session_media").insert(data_payload).execute()
            except Exception:
                pass

        await asyncio.to_thread(_save_supabase)
        return media_item

    async def fetch_session_media(self, session_id: str, user_id: str = None) -> list:
        clean_sid = self._clean_session_id(session_id)
        if not clean_sid: return []

        def _fetch_from_supabase():
            if not self.client: return None
            try:
                res = self.client.table("session_media").select("*").eq("session_id", clean_sid).order("created_at", desc=True).execute()
                if res.data is not None and len(res.data) > 0:
                    items = []
                    sess_dir = os.path.join(self.media_cache_dir, str(clean_sid))
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
                pass
            return None

        items = await asyncio.to_thread(_fetch_from_supabase)
        if items is not None and len(items) > 0:
            return items

        # Fallback to local session media cache
        sess_dir = os.path.join(self.media_cache_dir, str(clean_sid))
        local_items = []
        if os.path.exists(sess_dir):
            for file_name in os.listdir(sess_dir):
                if file_name.startswith("meta_") and file_name.endswith(".json"):
                    try:
                        with open(os.path.join(sess_dir, file_name), "r", encoding="utf-8") as f:
                            local_items.append(json.load(f))
                    except Exception:
                        pass
        return local_items

    async def delete_session_media(self, session_id: str, media_id: str):
        clean_sid = self._clean_session_id(session_id)
        sess_dir = os.path.join(self.media_cache_dir, str(clean_sid))
        meta_path = os.path.join(sess_dir, f"meta_{media_id}.json")
        
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                real_file = meta.get("local_path")
                if real_file and os.path.exists(real_file):
                    os.remove(real_file)
                os.remove(meta_path)
            except Exception as e:
                print(f"[MediaVault] Error deleting local media: {e}")

        def _delete():
            if self.client:
                try:
                    self.client.table("session_media").delete().eq("id", media_id).execute()
                except Exception:
                    pass
        await asyncio.to_thread(_delete)

# Singleton instance
cloud_engine = SocraticCloudEngine()
