import '../scss/styles.scss';
import { utf8_to_b64, getCompanyImage, getHtmlTemplate, b64_to_utf8 } from './util.js';
import Modal from 'bootstrap/js/src/modal';
import Sortable from 'sortablejs';
import { getMtrColor } from './util.js';

const bookmarkListDiv = document.getElementById('bookmarkList');
const routeSeparator = '##';
const groupSeparator = '\n';
const addGroupModal = new Modal('#addGroupModal');

// functions
const toggleEditButton = (toEdit) => {
    if (toEdit) {
        [
            document.getElementById('btnBookmarkEdit'),
            document.getElementById('btnBookmarkDownload'),
            document.getElementById('btnBookmarkUpload'),
        ].forEach((element, index, array) => {
            element.classList.add('d-none');
        });
        [
            document.getElementById('btnBookmarkGroupAdd'),
            ...document.getElementsByClassName('btnBookmarkGroupEdit'),
            document.getElementById('btnBookmarkSave'),
            document.getElementById('btnBookmarkReset'),
            ...document.getElementsByClassName('btnBookmarkReorder'),
            ...document.getElementsByClassName('btnBookmarkRemove'),
        ].forEach((element, index, array) => {
            element.classList.remove('d-none');
        });
    } else {
        [
            document.getElementById('btnBookmarkEdit'),
            document.getElementById('btnBookmarkDownload'),
            document.getElementById('btnBookmarkUpload'),
        ].forEach((element, index, array) => {
            element.classList.remove('d-none');
        });
        [
            document.getElementById('btnBookmarkGroupAdd'),
            ...document.getElementsByClassName('btnBookmarkGroupEdit'),
            document.getElementById('btnBookmarkSave'),
            document.getElementById('btnBookmarkReset'),
            ...document.getElementsByClassName('btnBookmarkReorder'),
            ...document.getElementsByClassName('btnBookmarkRemove'),
        ].forEach((element, index, array) => {
            element.classList.add('d-none');
        });
    }
};
const addGroup = (name) => {
    if (document.getElementById('groupNameInput').value.length > 0) {
        name = document.getElementById('groupNameInput').value;
        document.getElementById('groupNameInput').value = '';
        addGroupModal.hide();
    }

    const div = getHtmlTemplate('bookmarkGroup', {
        '{{name}}': name,
    });
    const routeListDiv = getHtmlTemplate('bookmarkRoute');
    div.appendChild(routeListDiv);
    bookmarkListDiv.appendChild(div);

    // route list sorting
    new Sortable(routeListDiv, {
        handle: '.btnBookmarkReorder',
        group: 'route',
        animation: 150,
    });
};
const removeGroup = (event) => {
    let routeRow = event.target.closest('div.list-group-item.group');
    routeRow.remove();
};
const addBookmark = (groupName, json, fromWebpageClick = false) => {
    if (fromWebpageClick) {
        json = JSON.parse(b64_to_utf8(json));
    }
    let routeCss = '',
        routeClass = '';
    if (json.company === 'mtr_hr') {
        routeCss = `background-color: ${getMtrColor('route-hr', json.routeId)}!important;`;
    } else if (json.company === 'mtr_lr') {
        routeCss = `--border-color: ${getMtrColor('route-lr', json.routeId)}; background-color: #fff!important;`;
        routeClass = 'mtrLrRoute p-0';
    }
    const div = getHtmlTemplate('bookmarkRow', {
        '{{dataRouteJson}}': utf8_to_b64(JSON.stringify(json)),
        '{{href}}': getRouteUrl(json, true),
        '{{companyLogo}}': getCompanyImage(json.company),
        '{{route}}': json.route,
        '{{name}}': json.name,
        '{{routeDesc}}': json.routeDesc,
        '{{routeCss}}': routeCss,
        '{{routeClass}}': routeClass,
    });
    const groupDiv = document.querySelectorAll(`div[data-group-name="${groupName}"] .list-group.route`)[0];
    groupDiv.appendChild(div);

    if (fromWebpageClick) {
        saveBookmark();
    }
    reloadRouter();
};
const removeBookmark = (event) => {
    let routeRow = event.target.closest('div.list-group-item');
    routeRow.remove();
};
const editBookmark = () => {
    toggleEditButton(true);
};
const saveBookmark = () => {
    toggleEditButton(false);

    const newBookmarkList = [...document.getElementsByClassName('group')]
        .map((element) => {
            const groupName = element.getAttribute('data-group-name');
            if (groupName) {
                const value = [...element.querySelectorAll('.list-group-item')]
                    .map((routeDiv) => b64_to_utf8(routeDiv.getAttribute('data-route-json')))
                    .join(routeSeparator);
                return JSON.stringify({ [groupName]: value });
            } else {
                return null;
            }
        })
        .filter((x) => !!x)
        .join(groupSeparator);
    localStorage.setItem('bookmarkList', newBookmarkList);
};
const resetBookmark = () => {
    toggleEditButton(false);
    bookmarkListDiv.innerHTML = '';

    let bookmarkList = [];
    if (localStorage.hasOwnProperty('bookmarkList')) {
        bookmarkList = localStorage
            .getItem('bookmarkList')
            .split(groupSeparator)
            .map((row) => {
                const rowJson = JSON.parse(row);
                return Object.entries(rowJson).map((entry) => {
                    return {
                        [entry[0]]: entry[1].split(routeSeparator).map((route) => JSON.parse(route)),
                    };
                });
            });
    }
    bookmarkList.forEach((element) => {
        const group = Object.entries(element[0])[0];
        addGroup(group[0]);
        group[1].forEach((json) => addBookmark(group[0], json));
    });
};
const downloadBookmark = () => {
    let bookmark = '';
    if (localStorage.hasOwnProperty('bookmarkList')) {
        bookmark = localStorage.getItem('bookmarkList');
    }
    let a = document.createElement('a');
    let blob = new Blob([bookmark], { type: 'text/plain' });
    let url = URL.createObjectURL(blob);
    a.setAttribute('href', url);
    a.setAttribute('download', 'group.txt');
    a.click();
};
const uploadBookmark = (event) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        localStorage.setItem('bookmarkList', event.target.result);
        resetBookmark();
    };
    reader.onerror = (error) => console.error(error);
    reader.readAsText(event.target.files[0]);
};
const isBoomarked = (stop) => {
    if (localStorage.hasOwnProperty('bookmarkList')) {
        return localStorage
            .getItem('bookmarkList')
            .split(groupSeparator)
            .some((row) => {
                const rowJson = JSON.parse(row);
                return Object.entries(rowJson).some((entry) => {
                    return entry[1].split(routeSeparator).some((bookmarkRow) => {
                        const bookmarkRowJson = JSON.parse(bookmarkRow);
                        let exist =
                            bookmarkRowJson.company === stop.company &&
                            bookmarkRowJson.routeId === stop.routeId &&
                            bookmarkRowJson.stop === stop.stop;
                        switch (stop.company) {
                            case 'kmb':
                                exist =
                                    exist &&
                                    bookmarkRowJson.routeType === stop.routeType &&
                                    bookmarkRowJson.dir === stop.dir;
                                break;
                            case 'ctb':
                            case 'nwfb':
                            case 'mtr':
                            case 'mtr_hr':
                            case 'mtr_lr':
                                exist = exist && bookmarkRowJson.dir === stop.dir;
                                break;
                            case 'gmb':
                                exist = exist && bookmarkRowJson.routeType === stop.routeType;
                                break;
                        }
                        return exist;
                    });
                });
            });
    }
    return false;
};

// events
document.getElementById('btnBookmarkEdit').onclick = editBookmark;
document.getElementById('btnBookmarkSave').onclick = saveBookmark;
document.getElementById('btnBookmarkReset').onclick = resetBookmark;
document.getElementById('btnBookmarkGroupAddSubmit').onclick = addGroup;
document.getElementById('btnBookmarkDownload').onclick = downloadBookmark;
document.getElementById('fileUploadInput').addEventListener('change', uploadBookmark, false);

// init show stored bookmark
resetBookmark();
// Bookmark list sorting
new Sortable(document.getElementById('bookmarkList'), {
    handle: '.btnBookmarkReorder',
    group: 'group',
    animation: 150,
});

window.addGroup = addGroup;
window.removeGroup = removeGroup;
window.addBookmark = addBookmark;
window.removeBookmark = removeBookmark;
window.isBoomarked = isBoomarked;
