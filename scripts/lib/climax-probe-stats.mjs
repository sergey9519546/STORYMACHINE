export function computeProbeStats(analysis) {
  const records = analysis.records;
  const sceneCount = records.length;
  if (sceneCount < 5) return null;

  const climaxIndexes = records
    .map((record, index) => record.purpose === 'climax' ? index : -1)
    .filter(index => index >= 0);
  const turnIndexes = records
    .map((record, index) => (record.dramaticTurn && record.dramaticTurn !== 'nothing') ? index : -1)
    .filter(index => index >= 0);
  let suspensePeakIndex = -1;
  let suspensePeakValue = -Infinity;
  records.forEach((record, index) => {
    const value = record.suspenseDelta ?? 0;
    if (value >= suspensePeakValue) {
      suspensePeakValue = value;
      suspensePeakIndex = index;
    }
  });

  return {
    n: sceneCount,
    lastClimaxPos: climaxIndexes.length ? climaxIndexes[climaxIndexes.length - 1] / sceneCount * 100 : -1,
    climaxCount: climaxIndexes.length,
    lastTurnPos: turnIndexes.length ? turnIndexes[turnIndexes.length - 1] / sceneCount * 100 : -1,
    climaxSpread: climaxIndexes.length >= 2
      ? (climaxIndexes[climaxIndexes.length - 1] - climaxIndexes[0]) / sceneCount * 100
      : 0,
    suspPeakPos: suspensePeakIndex >= 0 ? suspensePeakIndex / sceneCount * 100 : -1,
  };
}
