// Usage:
// - In the benchmark iframe page: instantiate `new BenchmarkMessage()` and implement
//   `runBenchmark(params)` to return a numeric result (or throw on error).
// - In the parent page: create a `BenchmarkController(iframeElement)` and call
//   `start(params)` to trigger the benchmark; handle results/errors by overriding
//   `_onComplete` and `_onError` as needed.
// ...existing code...
// Benchmark iframe side
class BenchmarkMessage {
    constructor() {
        this.isRunning = false;
        window.addEventListener('message', (event) => {
            if (event.data.type === 'BENCHMARK_START') {
                this.start(event.data.params);
            }
        });
    }

    async start(params) {
        this.isRunning = true;
        try {
            const result = await this.runBenchmark(params);
            window.parent.postMessage(
                { type: 'BENCHMARK_COMPLETE', value: result },
                '*'
            );
        } catch (error) {
            window.parent.postMessage(
                { type: 'BENCHMARK_ERROR', error: error.message },
                '*'
            );
        } finally {
            this.isRunning = false;
        }
    }

    async runBenchmark(params) {
        // Implement your benchmark logic here
        // Return the benchmark value
        return 0;
    }
}

// Main application side
class BenchmarkController {
    constructor(iframeElement) {
        this.iframe = iframeElement;
        window.addEventListener('message', (event) => {
            if (event.source === this.iframe.contentWindow) {
                this._handleMessage(event.data);
            }
        });
    }

    start(params = {}) {
        this.iframe.contentWindow.postMessage(
            { type: 'BENCHMARK_START', params },
            '*'
        );
    }

    _handleMessage(data) {
        if (data.type === 'BENCHMARK_COMPLETE') {
            this._onComplete(data.value);
        } else if (data.type === 'BENCHMARK_ERROR') {
            this._onError(data.error);
        }
    }

    _onComplete(value) {
        console.log('Benchmark result:', value);
    }

    _onError(error) {
        console.error('Benchmark error:', error);
    }
}