import dayjs from 'dayjs';

const getTime = () => {
    return dayjs().format('YYYY-MM-DD HH:mm:ss');
};

export default class logger {
    static debug(message: string, object?: any) {
        console.debug(`[${getTime()}][DEBUG] ${message}`);
        if (object) {
            console.debug(object);
        }
    }

    static info(message: string) {
        console.info(`[${getTime()}][INFO] ${message}`);
    }

    static warn(message: string) {
        console.info(`[${getTime()}][WARN] ${message}`);
    }

    static error(message: string, error: any) {
        console.error(`[${getTime()}][ERROR] ${message}`, error);
    }
}
