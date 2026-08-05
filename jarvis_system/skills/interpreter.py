import sys
import io
import traceback
import contextlib

def execute_python_code(code: str) -> str:
    """
    Executes Python code dynamically and captures the printed output.
    Jarvis will use this to do math, analyze data, or perform custom logic.
    """
    # Clean up the code if the LLM wraps it in markdown backticks by accident
    if code.startswith("```python"):
        code = code[9:]
    elif code.startswith("```"):
        code = code[3:]
    
    if code.endswith("```"):
        code = code[:-3]
        
    code = code.strip()

    print(f"\n[System]: Jarvis is executing background code...\n--- CODE ---\n{code}\n------------")

    output_buffer = io.StringIO()
    try:
        # We redirect stdout so we can capture Jarvis's print() statements
        with contextlib.redirect_stdout(output_buffer):
            exec(code, {})
            
        output = output_buffer.getvalue()
        
        if not output.strip():
            return "Code executed successfully, but nothing was printed. Please rewrite the code and use print() to output the final result."
            
        return f"Execution Output:\n{output}"
        
    except Exception as e:
        # If Jarvis makes a coding mistake, we feed the error back to him so he can learn!
        error_trace = traceback.format_exc()
        return f"Execution Error. You made a mistake in your code:\n{error_trace}"