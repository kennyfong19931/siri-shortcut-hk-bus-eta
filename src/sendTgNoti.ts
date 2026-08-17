import { execSync } from 'node:child_process';
import path from 'path';
import { Route } from './class/Route';
import { Stop } from './class/Stop';
import { telegramPost } from './utils/requestUtil';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

(async function () {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('Error: Telegram config is missing');
        process.exit(1);
    }

    try {
        // 1. 自動取得上次 commit 中所有被修改/新增的 .json 檔案清單
        const gitDiffOutput = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf8' }).trim();

        if (!gitDiffOutput) {
            console.log('No file change in last commit');
            process.exit(0);
        }

        const jsonFiles = gitDiffOutput
            .split('\n')
            .map((file) => file.trim())
            .filter((file) => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            console.log('No json change in last commit');
            process.exit(0);
        }

        const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

        const summaryRoutes: string[] = [];
        const allUpdates: { company: string; route: string; changes: string }[] = [];

        // 2. 逐一處理每個修改過的 .json 檔案
        for (const filePath of jsonFiles) {
            let beforeJson: Route[] = [];
            let afterJson: Route[] = [];
            const routeNo = path.parse(filePath.replace(/\\/g, '/')).name;

            // 取得最新版本 (HEAD) 內容
            try {
                const afterRaw = execSync(`git show HEAD:"${filePath}"`, { encoding: 'utf8' });
                afterJson = loadRoute(afterRaw);
            } catch (e) {
                // 若檔案被刪除，afterJson 為空
            }

            // 取得修改前 (HEAD~1) 內容
            try {
                const beforeRaw = execSync(`git show HEAD~1:"${filePath}"`, { encoding: 'utf8' });
                beforeJson = loadRoute(beforeRaw);
            } catch (e) {
                // 若為全新檔案，beforeJson 為空
            }

            // 進行路線與站點差異比對
            const fileDiffs = compareRouteData(beforeJson, afterJson);
            if (fileDiffs.length > 0) {
                summaryRoutes.push(routeNo);
                allUpdates.push(...fileDiffs);
            }
        }

        if (allUpdates.length === 0) {
            console.log('No difference in json files');
            process.exit(0);
        }

        if (summaryRoutes.length > 0) {
            const message = `<b>🚌 巴士路線更新通知</b> (<code>${commitHash.substring(0, 8)}</code>)

<b>路線:</b> ${summaryRoutes.join(', ')}

<details><summary>詳情</summary>
${buildTableString(allUpdates)}
</details>`;

            telegramPost(message, commitHash);
        }
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('執行失敗:', errorMessage);
        process.exit(1);
    }
})();

function loadRoute(rawData: string): Route[] {
    return JSON.parse(rawData).map((route: Route) => {
        Object.setPrototypeOf(route, Route.prototype);
        route.getStopList().map((stop: Stop) => {
            Object.setPrototypeOf(stop, Stop.prototype);
            return stop;
        });
        return route;
    });
}

/**
 * 比對前後 JSON 陣列的路線與巴士站差異
 */
function compareRouteData(beforeJson: Route[], afterJson: Route[]) {
    if (!Array.isArray(beforeJson)) beforeJson = [];
    if (!Array.isArray(afterJson)) afterJson = [];

    const makeKey = (r: Route) => `${r.getCompany()}_${r.getRoute()}_${r.getRouteType()}_${r.getDir()}`;

    const beforeMap = new Map<string, Route>(beforeJson.map((r) => [makeKey(r), r]));
    const afterMap = new Map<string, Route>(afterJson.map((r) => [makeKey(r), r]));

    const allCompanies = new Set<string>([
        ...beforeJson.map((r) => r.getCompany()?.toUpperCase()).filter((b): b is string => Boolean(b)),
        ...afterJson.map((r) => r.getCompany()?.toUpperCase()).filter((b): b is string => Boolean(b)),
    ]);

    const tableRows: { company: string; route: string; changes: string }[] = [];

    for (const company of allCompanies) {
        // 1. 檢查刪除的路線
        for (const [key, beforeRoute] of beforeMap.entries()) {
            if (beforeRoute.getCompany()?.toUpperCase() === company && !afterMap.has(key)) {
                tableRows.push({
                    company,
                    route: beforeRoute.getRoute(),
                    changes: `🗑 刪除路線: ${beforeRoute.getOrig()} ➡️ ${beforeRoute.getDest()}`,
                });
            }
        }

        // 2. 檢查新增與修改的路線
        for (const [key, afterRoute] of afterMap.entries()) {
            if (afterRoute.getCompany()?.toUpperCase() !== company) continue;

            const beforeRoute = beforeMap.get(key);
            if (!beforeRoute) {
                tableRows.push({
                    company,
                    route: afterRoute.getRoute(),
                    changes: `✨ 新增路線: ${afterRoute.getOrig()} ➡️ ${afterRoute.getDest()}`,
                });
                continue;
            }

            const changes: string[] = [];

            // 比對起點 (orig)
            if (beforeRoute.getOrig() !== afterRoute.getOrig()) {
                changes.push(`🚩 起點: ${beforeRoute.getOrig()} ➡️ ${afterRoute.getOrig()}`);
            }

            // 比對終點 (dest)
            if (beforeRoute.getDest() !== afterRoute.getDest()) {
                changes.push(`🏁 終點: ${beforeRoute.getDest()} ➡️ ${afterRoute.getDest()}`);
            }

            // 比對車站 (stopList)
            const beforeStops = beforeRoute.getStopList() || [];
            const afterStops = afterRoute.getStopList() || [];

            const addedStops = afterStops.filter((a) => !beforeStops.some((b) => b.getId() === a.getId()));
            const removedStops = beforeStops.filter((b) => !afterStops.some((a) => a.getId() === b.getId()));

            const renamedStops: { oldName: string; newName: string }[] = [];
            for (const afterStop of afterStops) {
                const matchedBeforeStop = beforeStops.find((b) => b.getId() === afterStop.getId());
                if (matchedBeforeStop && matchedBeforeStop.getName() !== afterStop.getName()) {
                    renamedStops.push({
                        oldName: matchedBeforeStop.getName(),
                        newName: afterStop.getName(),
                    });
                }
            }

            if (addedStops.length > 0) {
                const names = [...new Set(addedStops.map((s) => s.getName()))];
                changes.push(`➕ 新增站: ${names.join(', ')}`);
            }
            if (removedStops.length > 0) {
                const names = [...new Set(removedStops.map((s) => s.getName()))];
                changes.push(`➖ 刪除站: ${names.join(', ')}`);
            }
            if (renamedStops.length > 0) {
                const renameTexts = renamedStops.map((s) => `${s.oldName} ➡️ ${s.newName}`);
                changes.push(`✏️ 改名站: ${renameTexts.join(', ')}`);
            }

            if (changes.length > 0) {
                tableRows.push({
                    company,
                    route: beforeRoute.getRoute(),
                    changes: changes.join('<br>'),
                });
            }
        }
    }

    return tableRows;
}

/**
 * 產生等寬表格 (Monospace Text Table)
 */
function buildTableString(rows: { company: string; route: string; changes: string }[]): string {
    const header = '|公司|路線|改動|';
    const divider = '|:---:|:---:|---|';

    const body = rows.map((r) => {
        return `| ${r.company} | ${r.route} | ${r.changes}`;
    });

    return [header, divider, ...body].join('\n');
}
