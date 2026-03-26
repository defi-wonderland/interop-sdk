export class UnsupportedAction extends Error {
    constructor(action: string) {
        super(`Non-supported action: ${action}`);
    }
}
