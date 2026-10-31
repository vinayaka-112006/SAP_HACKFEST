import React from "react";
export default function ResourceState({ state, empty, children }) {
  if (state.loading)
    return (
      <div className="resource-message" role="status">
        Loading records...
      </div>
    );
  if (state.error)
    return (
      <div className="resource-message error" role="alert">
        <p>{state.error.message}</p>
        <button onClick={state.refresh}>Try again</button>
      </div>
    );
  if (Array.isArray(state.data) && !state.data.length)
    return (
      <div className="resource-message">{empty || "No records returned."}</div>
    );
  if (!state.data)
    return empty ? <div className="resource-message">{empty}</div> : null;
  return children;
}
