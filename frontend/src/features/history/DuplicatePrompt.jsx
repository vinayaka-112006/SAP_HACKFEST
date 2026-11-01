import React, { useEffect, useState } from "react";
import { useStore } from "../../state/store";
import { loadIncidentEvaluations } from "./incident-context";
import IncidentEvaluation from "./IncidentEvaluation";
export default function DuplicatePrompt({ incidentId }) {
  const { client } = useStore();
  const [result, setResult] = useState({ duplicates: null, repeatFailures: null });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (!incidentId) {
      setResult({ duplicates: null, repeatFailures: null });
      setLoading(false);
      return () => { active = false; };
    }
    setResult({ duplicates: null, repeatFailures: null });
    setLoading(true);
    loadIncidentEvaluations(client, incidentId).then((value) => {
      if (active) {
        setResult(value);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [client, incidentId]);
  return (
    <IncidentEvaluation duplicates={result.duplicates} repeatFailures={result.repeatFailures} loading={loading} incidentId={incidentId} />
  );
}
