export default class QueueEntry {
    /**
     * @param videoId The videoId
     * @param title The title of the video
     * @param byline The byline of the video
     */
    constructor(
        public videoId: string,
        public title: string,
        public byline: string
    ) { }
}