import os
import json
import webbrowser

def create_interactive_dashboard(title: str, chart_type: str, x_data: list, y_data: list, x_label: str, y_label: str) -> str:
    """Dynamically generates an HTML/JS dashboard using Plotly and opens it."""
    try:
        # Convert the Python lists to JSON strings so JavaScript can read them
        x_json = json.dumps(x_data)
        y_json = json.dumps(y_data)
        
        # Stark Industries Holographic UI Template
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <!-- Load Plotly.js -->
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        body {{
            background-color: #050505;
            color: #00FFFF;
            font-family: 'Courier New', Courier, monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }}
        h1 {{
            text-transform: uppercase;
            letter-spacing: 4px;
            text-shadow: 0 0 10px #00FFFF;
            margin-bottom: 20px;
        }}
        #chart-container {{
            width: 80%;
            height: 70%;
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 10px;
            box-shadow: 0 0 25px rgba(0, 255, 255, 0.1);
            padding: 20px;
            background: #0a0a0a;
        }}
    </style>
</head>
<body>

    <h1>{title}</h1>
    <div id="chart-container"></div>

    <script>
        var trace = {{
            x: {x_json},
            y: {y_json},
            type: '{chart_type}',
            marker: {{
                color: 'rgba(0, 255, 255, 0.6)',
                line: {{
                    color: '#00FFFF',
                    width: 2
                }}
            }}
        }};

        var data = [trace];

        var layout = {{
            plot_bgcolor: 'transparent',
            paper_bgcolor: 'transparent',
            font: {{ color: '#00FFFF', family: 'Courier New' }},
            xaxis: {{ title: '{x_label}', gridcolor: '#1a1a1a', zerolinecolor: '#00FFFF' }},
            yaxis: {{ title: '{y_label}', gridcolor: '#1a1a1a', zerolinecolor: '#00FFFF' }}
        }};

        // Render the graph
        Plotly.newPlot('chart-container', data, layout);
    </script>
</body>
</html>"""

        # Save the file to your Desktop
        desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
        filepath = os.path.join(desktop, 'Jarvis_Dashboard.html')
        
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(html_content)
            
        # Automatically open the generated HTML file in the default web browser
        webbrowser.open(f"file://{filepath}")
        
        return "Interactive dashboard generated and opened successfully in the browser."
    except Exception as e:
        return f"Failed to generate interactive dashboard: {e}"