import "../scss/styles.scss";
import {utf8_to_b64, getCompanyImage, htmlToElement, b64_to_utf8} from './util.js';
import Modal from 'bootstrap/js/src/modal';
import Sortable from 'sortablejs';

const bookmarkListDiv = document.getElementById('bookmarkList');
const routeSeparator = '##';
const groupSeparator = '\n';
const addGroupModal = new Modal('#addGroupModal');

// functions
const toggleEditButton = (toEdit) => {
    if (toEdit) {
        [ document.getElementById("btnBookmarkEdit"), document.getElementById("btnBookmarkDownload"), document.getElementById("btnBookmarkUpload")].forEach((element, index, array) => {
            element.classList.add('d-none');
        });
        [ document.getElementById("btnBookmarkGroupAdd"), ...document.getElementsByClassName("btnBookmarkGroupEdit"), document.getElementById("btnBookmarkSave"), document.getElementById("btnBookmarkReset"), ...document.getElementsByClassName('btnBookmarkReorder'), ...document.getElementsByClassName('btnBookmarkRemove')].forEach((element, index, array) => {
            element.classList.remove('d-none');
        });
    } else {
        [ document.getElementById("btnBookmarkEdit"), document.getElementById("btnBookmarkDownload"), document.getElementById("btnBookmarkUpload")].forEach((element, index, array) => {
            element.classList.remove('d-none');
        });
        [ document.getElementById("btnBookmarkGroupAdd"), ...document.getElementsByClassName("btnBookmarkGroupEdit"), document.getElementById("btnBookmarkSave"), document.getElementById("btnBookmarkReset"), ...document.getElementsByClassName('btnBookmarkReorder'), ...document.getElementsByClassName('btnBookmarkRemove')].forEach((element, index, array) => {
            element.classList.add('d-none');
        })
    }
}
const addGroup = (name) => {
    if (document.getElementById('groupNameInput').value.length > 0) {
        name = document.getElementById('groupNameInput').value;
        document.getElementById('groupNameInput').value = '';
        addGroupModal.hide();
    }

    const div = htmlToElement(`<div class="list-group-item group" data-group-name="${name}">`+
        `<div class="d-flex flex-row align-items-center mb-2">`+
        `<div class="flex-shrink-0"><i class="d-none bi bi-list btnBookmarkReorder" role="img" aria-hidden="true"></i></div>`+
        `<div class="flex-grow-1 ms-2"><b class="groupName">${name}</b></div>`+
        `<div class="flex-shrink-0"><button id="btnBookmarkEdit" class="d-none btn btn-sm btn-outline-secondary" type="button"><i class="bi bi-pencil" role="img" aria-label="編輯群組名稱"></i></button><button class="d-none btn btn-sm btn-danger btnBookmarkRemove" type="button" onclick="removeGroup(event)"><i class="bi bi-bookmark-dash" role="img" aria-label="移除群組"></i></button></div>`+
        `</div>`+
        `</div>`);
    const routeListDiv = htmlToElement('<div class="list-group route"></div>');
    div.appendChild(routeListDiv);
    bookmarkListDiv.appendChild(div);

    // route list sorting
    new Sortable(routeListDiv, {
        handle: '.btnBookmarkReorder',
        group: 'route',
        animation: 150
    });
}
const removeGroup = (event) => {
    let routeRow = event.target.closest('div.list-group-item.group');
    routeRow.remove();
}
const addBookmark = (groupName, json, fromWebpageClick = false) => {
    if (fromWebpageClick) {
        json = JSON.parse(b64_to_utf8(json));
    }
    const div = htmlToElement(`<div class="list-group-item d-flex flex-row align-items-center" data-route-json="${utf8_to_b64(JSON.stringify(json))}" onclick="renderBookmarkStop(event)">` +
        `<div class="flex-shrink-0"><i class="d-none bi bi-list btnBookmarkReorder" role="img" aria-hidden="true"></i> <img class="logo" src="${getCompanyImage(json.company)}"/></div>` +
        `<div class="flex-grow-1 ms-3"><span class="badge text-bg-secondary">${json.route}</span> ${json.name}<br/><small class="text-secondary">${json.routeDesc}</small></div>` +
        `<div class="flex-shrink-0"><button class="d-none btn btn-sm btn-danger btnBookmarkRemove" type="button" onclick="removeBookmark(event)"><i class="bi bi-bookmark-dash" role="img" aria-label="移除已收藏路線"></i></button></div>` +
        `</div>`);
    const groupDiv = document.querySelectorAll(`div[data-group-name="${groupName}"] .list-group.route`)[0];
    groupDiv.appendChild(div);

    if (fromWebpageClick) {
        saveBookmark();
    }
}
const removeBookmark = (event) => {
    let routeRow = event.target.closest('div.list-group-item');
    routeRow.remove();
}
const editBookmark = () => {
    toggleEditButton(true);
}
const saveBookmark = () => {
    toggleEditButton(false);

    const newBookmarkList = [ ...document.getElementsByClassName('list-group-item') ].map(element => {
        const groupName = element.getAttribute('data-group-name');
        if (groupName) {
            const value = [ ...element.querySelectorAll('.list-group-item') ].map(routeDiv => b64_to_utf8(routeDiv.getAttribute('data-route-json'))).join(routeSeparator);
            return JSON.stringify({[groupName]: value})
        } else {
            return null;
        }
    })
        .filter(x => !!x)
        .join(groupSeparator);
    localStorage.setItem('bookmarkList', newBookmarkList);
}
const resetBookmark = () => {
    toggleEditButton(false);
    bookmarkListDiv.innerHTML = '';

    let bookmarkList = [];
    if (localStorage.hasOwnProperty('bookmarkList')) {
        bookmarkList = localStorage.getItem('bookmarkList').split(groupSeparator).map((row) => {
            const rowJson = JSON.parse(row);
            return Object.entries(rowJson).map(entry => {
                return {[entry[0]]: entry[1].split(routeSeparator).map(route => JSON.parse(route))}
            })
        });
    }
    bookmarkList.forEach(element => {
        const group = Object.entries(element[0])[0];
        addGroup(group[0]);
        group[1].forEach(json => addBookmark(group[0], json));
    });
}
const downloadBookmark = () => {
    let bookmark = '';
    if (localStorage.hasOwnProperty('bookmarkList')) {
        bookmark = localStorage.getItem('bookmarkList');
    }
    let a = document.createElement('a');
    let blob = new Blob([bookmark], {type: 'application/octet-stream'});
    let url = URL.createObjectURL(blob);
    a.setAttribute('href', url);
    a.setAttribute('download', 'group');
    a.click();
}
const uploadBookmark = (event) => {
    const reader = new FileReader()
    reader.onload = event => {
        localStorage.setItem('bookmarkList', event.target.result);
        resetBookmark();
    };
    reader.onerror = error => console.error(error)
    reader.readAsText(event.target.files[0]);
}

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
    animation: 150
});


window.addGroup = addGroup;
window.removeGroup = removeGroup;
window.addBookmark = addBookmark;
window.removeBookmark = removeBookmark;
