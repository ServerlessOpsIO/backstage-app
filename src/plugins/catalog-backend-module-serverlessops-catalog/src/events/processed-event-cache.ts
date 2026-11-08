export class ProcessedEventCache {
    private readonly processedKeys = new Set<string>()

    has(eventId: string, entityRef: string): boolean {
        return this.processedKeys.has(this.toKey(eventId, entityRef))
    }

    markProcessed(eventId: string, entityRef: string): void {
        this.processedKeys.add(this.toKey(eventId, entityRef))
    }

    clear(): void {
        this.processedKeys.clear()
    }

    private toKey(eventId: string, entityRef: string): string {
        return `${eventId}::${entityRef}`
    }
}
