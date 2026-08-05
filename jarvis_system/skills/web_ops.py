import webbrowser
import warnings
from ddgs import DDGS

# Ignore annoying third-party library warnings from cluttering the terminal
warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=ResourceWarning)

def open_website(url: str):
    """Opens a specified URL in the default web browser."""
    # Ensure the URL is properly formatted
    if not url.startswith("http"):
        url = "https://" + url
    webbrowser.open(url)

def search_google(query: str):
    """Opens a Google search in the default web browser."""
    url = f"https://www.google.com/search?q={query}"
    webbrowser.open(url)

def live_web_search(query: str) -> str:
    """Searches the web and returns the actual text results to Jarvis."""
    try:
        results = []
        # The 'with' statement ensures the network sockets are cleanly closed!
        with DDGS() as ddgs:
            # We safely iterate through the generator to fetch exactly 3 results
            for r in ddgs.text(query, max_results=3):
                results.append(r)
                
        if not results:
            return "No recent information found on the web."
        
        formatted_results = ""
        for res in results:
            # We use .get() to prevent crashes if a result is missing a body or title
            title = res.get('title', 'No Title')
            body = res.get('body', 'No snippet available.')
            formatted_results += f"- {title}: {body}\n"
        
        return f"Here is the latest live web data for '{query}':\n{formatted_results}"
    
    except Exception as e:
        return f"Web search failed: {e}"