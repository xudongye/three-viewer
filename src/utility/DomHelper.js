function createElement(tag, className, html) {
    let el = document.createElement(tag);
    if (className) {
        el.className = className;
    }
    if (html) {
        el.innerHTML = html;
    }
    return el;
}

function getElementWidth(el) {
    if (el.getBoundingClientRect) {
        return el.getBoundingClientRect().width;
    } else {
        return el.clientWidth;
    }
}

function getElementHeight(el) {
    if (el.getBoundingClientRect) {
        return el.getBoundingClientRect().height;
    } else {
        return el.clientHeight;
    }
}

export {
    createElement,
    getElementWidth,
    getElementHeight
}