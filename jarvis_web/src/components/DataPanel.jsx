import React from 'react';
import Plot from 'react-plotly.js';

const DataPanel = ({ data }) => {
  if (!data) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
        No telemetry data available.
      </div>
    );
  }

  // Handle fully self-contained HTML rendering (Physics Simulations)
  if (data.type === 'html_view' && data.html_url) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: '#00f3ff', fontFamily: 'Orbitron', marginBottom: '10px' }}>Physics Engine Simulation</h3>
        <iframe 
          src={data.html_url} 
          style={{ width: '100%', flex: 1, border: '1px solid rgba(0, 243, 255, 0.2)', borderRadius: '8px', background: 'transparent' }}
          title="Physics Simulation"
        />
      </div>
    );
  }

  // Fallback for normal dashboard data
  const { title, chart_type, x_data, y_data, x_label, y_label } = data;

  const plotData = [
    {
      x: x_data,
      y: y_data,
      type: chart_type === 'bar' ? 'bar' : 'scatter',
      mode: chart_type === 'line' ? 'lines+markers' : 'markers',
      marker: { color: '#00f3ff' },
      line: { color: '#00f3ff' }
    }
  ];

  const plotLayout = {
    title: {
      text: title,
      font: { color: '#ffffff', family: 'Orbitron' }
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: {
      title: x_label,
      color: '#888888',
      gridcolor: '#333333'
    },
    yaxis: {
      title: y_label,
      color: '#888888',
      gridcolor: '#333333'
    },
    font: { color: '#ffffff' },
    margin: { t: 40, l: 40, r: 20, b: 40 }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Plot
        data={plotData}
        layout={plotLayout}
        useResizeHandler={true}
        style={{ width: '100%', height: '350px' }}
        config={{ displayModeBar: false }}
      />
    </div>
  );
};

export default DataPanel;
