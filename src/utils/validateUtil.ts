export default class ValidationUtil {
    static containsAllKey(json: {}, keyList: string[]) {
        return keyList.every(key => json.hasOwnProperty(key));
    }
}