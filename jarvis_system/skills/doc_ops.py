import os

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import docx
except ImportError:
    docx = None

def extract_snippets(text: str, query_terms: list, max_length: int = 3000) -> str:
    """Extracts relevant chunks around the matched keywords to save LLM token space."""
    if not query_terms:
        return text[:max_length] + ("..." if len(text) > max_length else "")
        
    text_lower = text.lower()
    snippets = []
    for term in query_terms:
        idx = text_lower.find(term)
        if idx != -1:
            # Grab 200 characters before and 800 characters after the keyword match
            start = max(0, idx - 200)
            end = min(len(text), idx + 800)
            snippets.append(text[start:end].strip())
            
    if not snippets:
        return text[:max_length] + ("..." if len(text) > max_length else "")
        
    combined = "\n...\n".join(snippets)
    return combined[:max_length] + ("..." if len(combined) > max_length else "")

def search_knowledge_base(query: str) -> str:
    """Searches local text files in the knowledge_base folder for relevant info."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kb_path = os.path.join(base_dir, "knowledge_base")
    
    print(f"\n[System]: Scanning folder path -> {kb_path}")
    
    # 1. Auto-create folder if it doesn't exist
    if not os.path.exists(kb_path):
        os.makedirs(kb_path)
        return f"The knowledge base folder was missing, so I created it at: {kb_path}. It is currently empty."
    
    # Check exactly what files Python sees inside this folder
    all_files = os.listdir(kb_path)
    print(f"[System]: Files physically seen by Python -> {all_files}")
    
    if not all_files:
        return f"I checked the folder at {kb_path} and it is completely empty. Please make sure the file is saved exactly there."

    results = []
    query_terms = query.lower().split() if query else []
    readable_files_found = False
    
    # 2. Iterate through ALL files, processing PDFs, DOCX, and TXT
    for filename in all_files:
        file_path = os.path.join(kb_path, filename)
        
        if os.path.isfile(file_path):
            readable_files_found = True
            content = ""
            ext = filename.lower().split('.')[-1]
            
            try:
                # Handle PDF files
                if ext == 'pdf':
                    if not PyPDF2:
                        results.append(f"--- File: {filename} (Error: PyPDF2 not installed. Run 'pip install PyPDF2') ---")
                        continue
                    with open(file_path, 'rb') as f:
                        reader = PyPDF2.PdfReader(f)
                        for page in reader.pages:
                            page_text = page.extract_text()
                            if page_text:
                                content += page_text + "\n"
                                
                # Handle Word documents
                elif ext in ['docx', 'doc']:
                    if not docx:
                        results.append(f"--- File: {filename} (Error: python-docx not installed. Run 'pip install python-docx') ---")
                        continue
                    doc = docx.Document(file_path)
                    content = "\n".join([para.text for para in doc.paragraphs])
                    
                # Handle standard text files
                else:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        
                # Check if any query word matches the text
                if not query_terms or any(term in content.lower() for term in query_terms):
                    # Extract only the relevant parts to prevent crashing the LLM context window
                    snippet = extract_snippets(content, query_terms)
                    results.append(f"--- File: {filename} ---\n{snippet}")
                    
            except Exception as e:
                print(f"[Doc Ops Error] Could not read {filename}: {e}")
    
    # 3. Give detailed feedback based on what happened
    if not readable_files_found:
        return f"The folder contains {all_files}, but none of them are readable documents."
        
    if not results:
        return f"I successfully read these files: {all_files}, but could not find any information matching your request. The file might be empty."
    
    return "\n\n".join(results)