import { COMPANY } from '../constant';

export default class GeneralUtil {
    static gtfsSpecialHandling(company: string, route: string) {
        // for MTR bus run by KMB
        if (company === COMPANY.KMB.CODE && ['K12', 'K14', 'K17', 'K18'].includes(route)) {
            company = COMPANY.MTR.CODE;
        }
        // for residents bus run by KMB
        if (company === 'PI' && ['NR331', 'NR331S'].includes(route)) {
            company = COMPANY.KMB.CODE;
            if (route === 'NR331') {
                route = '331';
            } else if (route === 'NR331S') {
                route = '331S';
            }
        }
        // for CTB 61R,88R, route number is different from TD
        if (company === COMPANY.CTB.CODE && ['NR61', 'NR88'].includes(route)) {
            if (route === 'NR61') {
                route = '61R';
            } else if (route === 'NR88') {
                route = '88R';
            }
        }
        return { company, route };
    }
}
