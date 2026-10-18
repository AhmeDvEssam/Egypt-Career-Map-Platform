export interface MetricCounts {
    cardsFound: number;
    jobsSaved: number;
    jobsMissingDescription: number;
    cardErrors: number;
    detailErrors: number;
    blockSignals: number;
    pagesVisited: number;
    emptyPages: number;
    errorTypes: Record<string, number>;
}

function createEmptyMetrics(): MetricCounts {
    return {
        cardsFound: 0,
        jobsSaved: 0,
        jobsMissingDescription: 0,
        cardErrors: 0,
        detailErrors: 0,
        blockSignals: 0,
        pagesVisited: 0,
        emptyPages: 0,
        errorTypes: {}
    };
}

export class MetricsReporter {
    private metrics = new Map<string, MetricCounts>();

    private getBucket(key: string): MetricCounts {
        if (!this.metrics.has(key)) {
            this.metrics.set(key, createEmptyMetrics());
        }
        return this.metrics.get(key)!;
    }

    recordCardsFound(key: string, count: number) {
        this.getBucket(key).cardsFound += count;
    }

    recordJobsSaved(key: string, count: number) {
        this.getBucket(key).jobsSaved += count;
    }

    recordMissingDescription(key: string) {
        this.getBucket(key).jobsMissingDescription += 1;
    }

    recordCardError(key: string, type: string) {
        const bucket = this.getBucket(key);
        bucket.cardErrors += 1;
        bucket.errorTypes[type] = (bucket.errorTypes[type] || 0) + 1;
    }

    recordDetailError(key: string, type: string) {
        const bucket = this.getBucket(key);
        bucket.detailErrors += 1;
        bucket.errorTypes[type] = (bucket.errorTypes[type] || 0) + 1;
    }

    recordBlockSignal(key: string) {
        this.getBucket(key).blockSignals += 1;
    }

    recordPageVisited(key: string) {
        this.getBucket(key).pagesVisited += 1;
    }

    recordEmptyPage(key: string) {
        this.getBucket(key).emptyPages += 1;
    }

    summary(): string {
        const lines: string[] = [];
        for (const [key, metric] of this.metrics.entries()) {
            lines.push(`${key} | cards=${metric.cardsFound} saved=${metric.jobsSaved} missing_desc=${metric.jobsMissingDescription} block=${metric.blockSignals} pages=${metric.pagesVisited}`);
        }
        return lines.join('\n');
    }
}
