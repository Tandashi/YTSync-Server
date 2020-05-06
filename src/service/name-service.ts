import { uniqueNamesGenerator, Config, colors, animals } from 'unique-names-generator';

const customConfig: Config = {
    dictionaries: [colors, animals],
    separator: ' ',
    length: 2,
};

export default class NameSerivce {

    /**
     * Get a random Name
     */
    public static getName(): string {
        return uniqueNamesGenerator(customConfig);
    }
}