import fs from "fs";
import path from "path";

const cacheFolder = path.join("cache");

export default class CacheUtil {
    static getCache(key: string) {
        if (!fs.existsSync(cacheFolder)) {
            fs.mkdirSync(cacheFolder);
        }
        
        let file = path.join(cacheFolder, key + ".json");
        let json = null;
        if (fs.existsSync(file)) {
            let rawdata = fs.readFileSync(file, 'utf8');
            json = JSON.parse(rawdata);
        }
    
        return json;
    }

    static setCache(key: string, data: Object) {
        if (!fs.existsSync(cacheFolder)) {
            fs.mkdirSync(cacheFolder);
        }
        
        let file = path.join(cacheFolder, key + ".json");
        fs.writeFileSync(file, JSON.stringify(data));
    }
}