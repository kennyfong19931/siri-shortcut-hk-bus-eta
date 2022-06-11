import dayjs from "dayjs";

const getTime = () => {
    return dayjs().format("YYYY-MM-DD HH:mm:ss");
}

export default class logger {
    static info(message: string) {
        console.info(`[${getTime()}][INFO] ${message}`);
    }

    static error(message: string, error: Error) {
        console.error(`[${getTime()}][ERROR] ${message}`, error);
    }
}