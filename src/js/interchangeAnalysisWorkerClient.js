const worker = new Worker(new URL('./interchangeAnalysisWorker.js', import.meta.url), { type: 'module' });
const pendingRequests = new Map();
let nextRequestId = 0;

worker.addEventListener('message', ({ data }) => {
    const pending = pendingRequests.get(data.id);
    if (!pending) return;

    pendingRequests.delete(data.id);
    if (data.error) {
        pending.reject(new Error(data.error));
    } else {
        pending.resolve(data.result);
    }
});

worker.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    pendingRequests.forEach(({ reject }) => reject(error));
    pendingRequests.clear();
});

export function analyzeInterchangeData(stopPoints, thresholdMeters) {
    const id = ++nextRequestId;
    return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ id, stopPoints, thresholdMeters });
    });
}